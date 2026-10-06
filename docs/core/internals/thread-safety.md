# Internals — Thread Safety and the Freeze/Fork Cycle

## The Problem

An expression builder has two radically different phases of life:

1. **Construction phase**: the user adds conditions, calls `.Or()`, `.WithMessage()`, etc. This phase requires mutation of the internal state. It is inherently sequential (one thread at a time).

2. **Use phase**: the builder is already defined. `IsValid()`, `Build()`, `Validate()` may be called from multiple concurrent threads (e.g.: multiple HTTP requests using the same static rule).

The challenge is making the transition between phases safe, without requiring the user to manage it explicitly.

---

## The Freeze/Fork Model

The implemented solution is called **Freeze/Fork** and is inspired by how `IQueryable<T>` works in LINQ.

### Freeze: Sealing the Builder

When the builder enters the use phase (the first time `IsValid`, `Build`, `Validate` is called, or explicitly `Freeze()`), the builder is "sealed". Internally, this means changing the `_frozen` field from `0` to `1`:

```csharp
private int _frozen; // 0 = mutable, 1 = frozen

public TBuilder Freeze()
{
    Interlocked.CompareExchange(ref _frozen, 1, 0);
    // CompareExchange: if _frozen is 0, atomically changes it to 1
    // If it was already 1 (already frozen), does nothing
    return (TBuilder)this;
}
```

`Interlocked.CompareExchange` is used instead of a simple assignment to guarantee the change is atomic and immediately visible to all threads.

### Fork: Safe Mutation After Freeze

After freeze, any call to a mutation method detects that the builder is frozen and instead of modifying it, creates a **fork**: a copy of the builder with the new condition added.

```csharp
// Pseudocode of the Add() flow:
internal TBuilder Add(Expression<Func<T, bool>> condition, bool isAnd = true)
{
    var entry = ConditionEntry<T>.Create(condition, isAnd);

    if (Volatile.Read(ref _frozen) == 1)
    {
        // The builder is frozen: create a fork
        var fork = new TBuilder();               // new builder (empty)
        fork._conditions = _conditions.Add(entry); // conditions: existing + new
        // The fork starts as mutable (fork._frozen = 0)
        return fork;
    }

    // The builder is mutable: add directly
    _conditions = _conditions.Add(entry);
    return (TBuilder)this;
}
```

The fork is completely independent. It has the same condition list as the original (thanks to `ImmutableList`, which does not copy elements), plus the new condition.

---

## Why ImmutableList Makes the Fork Efficient

`ImmutableList<T>` from .NET is internally implemented as a balanced AVL tree. When `.Add(item)` is called:
- The entire list is not copied
- Only the new tree nodes that are needed are created
- The previous nodes are shared between the old and new list

```
Original list: [A, B, C]      (internally: AVL tree)
Fork list:     [A, B, C, D]   (shares the [A,B,C] subtree with the original)
```

This means `_conditions.Add(entry)` is O(log n) in time and space, not O(n). It does not matter how many conditions the base builder has.

---

## Volatile.Read and Cache Publication

After freeze, `IsValid` uses a compiled cached delegate (`_cachedFunc`). The first time `IsValid` is called, it compiles and stores:

```csharp
private Func<T, bool>? _cachedFunc;

public Func<T, bool> BuildCached()
{
    // Read the cache with Volatile to guarantee cross-thread visibility
    var cached = Volatile.Read(ref _cachedFunc);
    if (cached != null)
        return cached;

    // Compile
    var compiled = Build().Compile();

    // Publish the cache with Volatile to guarantee other threads see it
    Volatile.Write(ref _cachedFunc, compiled);

    return compiled;
}
```

`Volatile.Read` and `Volatile.Write` guarantee that reads and writes are immediately visible to all threads, without requiring a lock. This implements the safe publication pattern.

In theory, two threads could compile the delegate simultaneously if both read `_cachedFunc == null` before either writes. This is **benign**: the result is the same logical delegate, and one of the results will simply be discarded. This strategy is preferred over a lock because:
- Locks are expensive when there is high contention
- Duplicate compilation is extremely rare (only on first use)
- The result is deterministic (same tree → same behavior)

---

## Validate and the _validateLock

`Validate()` and `ValidateAll()` have logic different from `IsValid`. They do not use the global compiled delegate; they use the `CompiledFunc` of each `ConditionEntry` individually to report which condition failed.

The evaluation loop needs to iterate the condition list. Although `ImmutableList` is thread-safe for concurrent reading, `Validate` needs to build the `ValidationResult` atomically with respect to the list:

```csharp
private readonly object _validateLock = new();

public ValidationResult Validate(T instance)
{
    // Implicit freeze
    Freeze();

    lock (_validateLock)
    {
        var errors = new List<ValidationError>();

        foreach (var entry in _conditions)
        {
            // Evaluate this condition's delegate
            bool passes = entry.CompiledFunc.Value(instance);

            if (!passes && entry.HasMetadata)
            {
                errors.Add(new ValidationError
                {
                    ErrorCode    = entry.ErrorCode,
                    Message      = entry.Message ?? entry.MessageFactory?.Invoke(),
                    PropertyPath = entry.PropertyPath,
                    Severity     = entry.Severity
                });
            }
        }

        return new ValidationResult(errors);
    }
}
```

The `_validateLock` lock does not protect the condition list (which is immutable and thread-safe), but the construction of the result. This prevents two threads from building a `ValidationResult` simultaneously with inconsistent intermediate states.

---

## Concrete Thread Safety Guarantees

### During Construction (Before Freeze)

- **NOT thread-safe**: all construction methods (`Add`, `Or`, `WithMessage`, etc.) must be called from a single thread.
- This is intentional: imposing synchronization during construction would add overhead without real benefit (builders are constructed locally before being shared).

As of v2.0.0, `Add`, `Add<TValue>`, `When`, and `Unless` use `ArgumentNullException.ThrowIfNull` (C# 10+) instead of manual `if`/`throw` patterns — consistent with the rest of the codebase.

### During Use (After Freeze)

| Method | Thread-safe | Notes |
|---|---|---|
| `IsValid(instance)` | Yes | Uses the cached delegate |
| `IsNotValid(instance)` | Yes | Same as IsValid |
| `Build()` | Yes | Read-only; returns a new expression each time |
| `BuildCached()` | Yes | Safe publication with Volatile |
| `BuildNegated()` | Yes | Read-only |
| `Validate(instance)` | Yes | Uses `_validateLock` |
| `ValidateAll(instance)` | Yes | Uses `_validateLock` |
| `Explain()` | Yes | Read-only |
| `Clone()` | Yes | Creates a new mutable builder |

### Mutation Methods on a Frozen Builder

Return a **new builder** (fork). The original builder is not modified. The fork is mutable until it is first frozen.

---

## Example: Static Rule Shared Between Threads

This is the correct pattern for using a builder as a static rule in an application with multiple concurrent requests:

```csharp
// Defined once (e.g.: as a static field of a service)
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// In the service constructor (or in startup), do an explicit freeze:
static MyService()
{
    _userRule.Freeze();  // explicit freeze; also caches the delegate
    _ = _userRule.BuildCached();  // pre-compiles the delegate
}

// In the request method (called from multiple threads):
public bool ValidateUser(User user)
{
    return _userRule.IsValid(user);  // thread-safe after freeze
}
```

---

## Example: Fork to Extend a Base Rule

```csharp
// Base rule: built and frozen once
var baseRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Explicit freeze (the first IsValid would also do it implicitly)
baseRule.Freeze();

// Create forks (each fork is independent and starts as mutable)
// This is safe to call from multiple threads:
var adminRule  = baseRule.IsTrue(u => u.IsAdmin);    // fork
var activeRule = baseRule.IsTrue(u => u.IsActive);   // different fork

// baseRule: Email + Age                  (unchanged)
// adminRule:  Email + Age + IsAdmin      (independent fork)
// activeRule: Email + Age + IsActive     (independent fork)
```

If two threads execute `baseRule.IsTrue(u => u.IsAdmin)` simultaneously, each gets its own independent fork. There is no interference because `ImmutableList.Add` creates a new instance without modifying the original.

---

**v2.0.0:** `And()` and `Or()` no longer call `Volatile.Write(null)` on cache fields. Those were dead stores: `And()` and `Or()` can only be called on unfrozen builders, and caches are only populated after freeze. Removing them eliminates 4 unnecessary memory barrier operations per call.

---

## Why Freeze Is int and Not bool

The `_frozen` field is `int` (not `bool`) in order to use `Interlocked.CompareExchange`, which only operates on 32-bit types:

```csharp
// With int: can use Interlocked.CompareExchange (atomic)
Interlocked.CompareExchange(ref _frozen, 1, 0);

// With bool: there is no Interlocked.CompareExchange for bool
// A lock or a workaround would be needed
```

`Interlocked.CompareExchange(ref location, value, comparand)` means: "if `location` has the value `comparand`, replace it with `value`, all atomically." It is the fundamental primitive for CAS (Compare-And-Swap) in .NET.
