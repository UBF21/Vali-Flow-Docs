# Internals — ConditionEntry: The Condition Model

## What ConditionEntry Is

`ConditionEntry<T>` is the object that represents a single condition inside a builder. Every time the user calls a validation method (`.NotNull(...)`, `.GreaterThan(...)`, `.IsEmail(...)`), a `ConditionEntry<T>` is created and added to the builder's internal list.

It is the "atom" of the library: the minimum unit of information the engine needs to build, evaluate, and report.

---

## The Complete Structure

```csharp
internal sealed record ConditionEntry<T>
{
    // The expression tree for this specific condition
    public Expression<Func<T, bool>> Condition { get; init; }

    // Is this condition combined with the previous one using AND (true) or OR (false)?
    public bool IsAnd { get; init; }

    // Machine-readable error code (e.g.: "USER_EMAIL_REQUIRED")
    public string? ErrorCode { get; init; }

    // Static error message (e.g.: "Email is required")
    public string? Message { get; init; }

    // Lazy message factory (for dynamic localization)
    public Func<string>? MessageFactory { get; init; }

    // Path of the affected property (e.g.: "Address.City")
    public string? PropertyPath { get; init; }

    // Severity of the error if this condition fails
    public Severity Severity { get; init; }

    // Compiled delegate, lazy and thread-safe
    public Lazy<Func<T, bool>> CompiledFunc { get; init; }
}
```

---

## Why It Is a Record

`ConditionEntry<T>` is a `record` for two concrete technical reasons:

### 1. The `with` Syntax

The methods `WithMessage`, `WithError`, `WithSeverity`, and `WithPropertyPath` need to modify the last condition in the list. If `ConditionEntry` were a mutable `class`, the object would be modified directly. If it were an immutable `class`, a new object would have to be constructed manually with 7 parameters.

With `record`, the `with` syntax allows creating a copy with only the modified field:

```csharp
// Internal implementation of WithMessage:
private TBuilder MutateLastCondition(Func<ConditionEntry<T>, ConditionEntry<T>> mutate)
{
    // Take the last condition, apply the mutation, replace it in the list
    var index = _conditions.Count - 1;
    var updated = mutate(_conditions[index]);
    _conditions = _conditions.SetItem(index, updated);
    return (TBuilder)this;
}

// WithMessage uses MutateLastCondition:
public TBuilder WithMessage(string message)
    => MutateLastCondition(entry => entry with { Message = message });
//                                          ^^^^^^^^^^^^^^^^^^^
//                                          The `with` syntax creates a new copy
//                                          with only Message modified
```

Without `record`, this operation would require a constructor with 7 parameters or its own builder for `ConditionEntry`.

### 2. Immutability with `init`

`init` setters guarantee that fields cannot change after construction. This is crucial for thread safety: if multiple threads read the same `ConditionEntry` concurrently, there is no risk of a data race because the object never changes.

---

## The CompiledFunc Field and Deferred Compilation

```csharp
public Lazy<Func<T, bool>> CompiledFunc { get; init; }

// Initialized in the constructor:
CompiledFunc = new Lazy<Func<T, bool>>(() => condition.Compile());
```

`Lazy<T>` defers delegate compilation until it is needed for the first time. This is important because:

1. **`Build()` does not need delegates**: `Build()` works with expression trees directly. Delegates are only needed in `Validate()`.

2. **Compilation is expensive**: `Expression.Compile()` can take ~1ms. If an object has 10 conditions but only the first fails, the remaining 9 are never compiled.

3. **Thread safety without locks**: `Lazy<T>` with the default mode (`LazyThreadSafetyMode.ExecutionAndPublication`) guarantees that even if multiple threads call `Validate()` simultaneously on the same builder, each condition's compilation happens exactly once.

```csharp
// Thread A and Thread B call Validate() at the same time
// Both attempt to access CompiledFunc.Value

// Without Lazy: possible double-compilation (benign but inefficient)
// With Lazy(ExecutionAndPublication): one thread compiles, the other waits and uses the result
```

---

## The Three Message Fields

`ConditionEntry` has three fields related to the error message. Only one is used per condition:

### Message (static string)

```csharp
.NotNull(u => u.Email).WithMessage("Email is required")
// Stores: Message = "Email is required"
// Used directly when building ValidationError
```

### ErrorCode + Message (from WithError)

```csharp
.NotNull(u => u.Email).WithError("EMAIL_REQUIRED", "Email is required")
// Stores: ErrorCode = "EMAIL_REQUIRED", Message = "Email is required"
```

### MessageFactory (lazy, for localization)

```csharp
.NotNull(u => u.Email).WithMessageFactory(() => _localizationService.Get("email.required"))
// Stores: MessageFactory = () => _localizationService.Get("email.required")
// The function executes only when the ValidationError is built
```

**Contract:** The factory must not return `null`. If it does, the resolved message is treated as absent — `Message` will be `null` in the resulting `ValidationError`, which may cause unexpected behavior. Always return a non-null string from the factory.

When `Validate()` builds the `ValidationError`, the message resolution logic is:

```csharp
// Pseudocode for how the message is resolved:
string? resolvedMessage = entry.Message
    ?? entry.MessageFactory?.Invoke();
// If there is a static Message, it is used. If not, the factory is invoked.
// If neither is defined, the error message is null.
```

---

## The Create Factory Method

For the common case where only the condition and operator are needed (without error metadata), a factory method exists that avoids passing four nulls:

```csharp
// Without the factory method:
_conditions = _conditions.Add(new ConditionEntry<T>(
    condition: expr,
    isAnd: true,
    errorCode: null,
    message: null,
    messageFactory: null,
    propertyPath: null,
    severity: Severity.Error
));

// With the factory method:
_conditions = _conditions.Add(ConditionEntry<T>.Create(expr, isAnd: true));
```

This is what `BaseExpression.Add(Expression<Func<T,bool>>)` calls internally. Only when `.WithMessage()`, `.WithError()`, etc. are called, is the condition mutated with `with` to add the metadata.

---

## Relationship with ValidationError

When `Validate()` detects that a condition fails, it builds a `ValidationError` from the `ConditionEntry`:

```csharp
public sealed record ValidationError
{
    public string? ErrorCode { get; init; }
    public string? Message { get; init; }
    public string? PropertyPath { get; init; }
    public Severity Severity { get; init; }
}
```

```csharp
// Pseudocode for error construction:
var error = new ValidationError
{
    ErrorCode    = entry.ErrorCode,
    Message      = entry.Message ?? entry.MessageFactory?.Invoke(),
    PropertyPath = entry.PropertyPath,
    Severity     = entry.Severity
};
```

---

## Internal Visibility

`ConditionEntry<T>` is `internal` — it is not part of the library's public API. Consumers interact with condition metadata through:
- The builder's `WithMessage`, `WithError`, `WithSeverity`, `WithPropertyPath` methods
- The `ValidationResult` and `ValidationError` returned by `Validate()`

This design decision preserves the freedom to change the internal structure of `ConditionEntry` without breaking the public API.
