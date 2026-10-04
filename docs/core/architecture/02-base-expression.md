---
sidebar_position: 2
---

# Architecture — BaseExpression: The Central Engine

## What BaseExpression Is

`BaseExpression<TBuilder, T>` is the class that makes everything work. No user instantiates this class directly; it is the base class of `ValiFlow<T>` and `ValiFlowQuery<T>`. Its responsibilities are:

1. Accumulate conditions as the user chains methods
2. Manage the logical operator between conditions (AND / OR)
3. Build the final expression tree when `Build()` is called
4. Evaluate the tree against concrete instances (`IsValid`, `Validate`)
5. Manage the builder lifecycle (mutable → frozen → fork)

---

## CRTP: The Trick That Makes Typed Method Chaining Possible

The generic parameter `TBuilder` in `BaseExpression<TBuilder, T>` is not arbitrary. It follows the **CRTP** pattern (Curiously Recurring Template Pattern): the concrete type passes itself as a generic argument to its own base class.

```csharp
// ValiFlow<T> passes itself as TBuilder
public partial class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>
//                                               ^^^^^^^^^^^
//                                               "myself"
```

Without CRTP, the problem would be this: `BaseExpression` needs its methods to return the concrete type of the builder (so that chaining works), but it does not know what that concrete type is.

```csharp
// Without CRTP: methods return BaseExpression, losing the type
public BaseExpression<TBuilder, T> Or()  // returns BaseExpression, not ValiFlow
{
    _nextIsAnd = 0;
    return this;  // caller receives BaseExpression, not ValiFlow
}

// With CRTP: methods return TBuilder (which in practice is ValiFlow<T>)
public TBuilder Or()
{
    _nextIsAnd = 0;
    return (TBuilder)this;  // caller receives ValiFlow<T>
}
```

The result is that the entire method chain maintains the correct type:

```csharp
ValiFlow<User> rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)   // returns ValiFlow<User>
    .Or()                           // returns ValiFlow<User>
    .IsTrue(u => u.IsAdmin);        // returns ValiFlow<User>
//  ^^^^^^^^^^^^^^^^^^^^^^^^ the compiler always knows it is ValiFlow<User>
```

---

## Internal State of the Builder

```csharp
public class BaseExpression<TBuilder, T>
{
    // Immutable list of accumulated conditions.
    // ImmutableList allows Fork without deep copies.
    private volatile ImmutableList<ConditionEntry<T>> _conditions
        = ImmutableList<ConditionEntry<T>>.Empty;

    // Operator for the NEXT Add: 1=AND (default), 0=OR
    // Changes to 0 when the user calls .Or()
    // Resets to 1 after being consumed
    private int _nextIsAnd = 1;

    // Compiled delegate cache (post-freeze)
    private Func<T, bool>? _cachedFunc;
    private Func<T, bool>? _cachedNegatedFunc;

    // Compiled expression cache (post-freeze)
    private Expression<Func<T, bool>>? _cachedExpression;

    // Lifecycle state: 0=mutable, 1=frozen
    // int instead of bool to use Interlocked.CompareExchange
    private int _frozen;

    // Lock dedicated only to Validate() (condition iteration with delegates)
    private readonly object _validateLock = new();
}
```

### Why ImmutableList

`ImmutableList<T>` allows **Fork** (cloning a builder) to not require copying all elements. When a fork is created, the new builder receives the same reference to the list. The first mutation in the fork internally creates a new list.

This also allows the builder to be read concurrently (after freeze) without locks.

---

## How AND / OR Works

The AND/OR logic is designed to be intuitive: everything defaults to AND, and OR can be inserted explicitly.

```csharp
builder
    .GreaterThan(u => u.Age, 18)     // _nextIsAnd=1 → isAnd=true
    .IsTrue(u => u.IsActive)         // _nextIsAnd=1 → isAnd=true
    .Or()                            // _nextIsAnd=0
    .IsTrue(u => u.IsAdmin);         // _nextIsAnd=0 → isAnd=false, then _nextIsAnd=1
```

Each condition stored in `ConditionEntry<T>` carries an `IsAnd` flag that records which operator links it to the previous condition.

The internal list ends up like this:

```
[
  ConditionEntry { Condition = Age > 18,    IsAnd = true  },
  ConditionEntry { Condition = IsActive,    IsAnd = true  },
  ConditionEntry { Condition = IsAdmin,     IsAnd = false },
]
```

---

## The Build() Algorithm

`Build()` converts the flat list of conditions into a single `Expression<Func<T, bool>>`. The algorithm has three steps.

### Step 1: Group by OR

The list is traversed. Each time a condition with `IsAnd = false` appears, a new group is started. Conditions with `IsAnd = true` are added to the current group.

```
Input: [A(and=T), B(and=T), C(and=F), D(and=T), E(and=F)]

Group 1: [A, B]      ← A is first, B has IsAnd=true → same group
Group 2: [C, D]      ← C has IsAnd=false → new group; D has IsAnd=true → same group
Group 3: [E]         ← E has IsAnd=false → new group
```

### Step 2: AND Within Each Group

Within each group, conditions are combined with `Expression.AndAlso` (the `&&` of LINQ):

```
Group 1: A AndAlso B
Group 2: C AndAlso D
Group 3: E
```

### Step 3: OR Between Groups

Groups are combined with each other using `Expression.OrElse` (the `||` of LINQ):

```
(A AndAlso B) OrElse (C AndAlso D) OrElse E
```

The final result respects standard precedence: AND has higher precedence than OR, just like in C#.

### Algorithm Code (simplified)

```csharp
public Expression<Func<T, bool>> Build()
{
    if (_conditions.Count == 0)
        return _ => true;  // no conditions: everything passes

    var parameter = Expression.Parameter(typeof(T), "x");

    // Step 1: group by OR
    var groups = new List<List<Expression>>();
    List<Expression>? currentGroup = null;

    foreach (var entry in _conditions)
    {
        // Replace the original parameter of the expression with the unified parameter
        var body = new ParameterReplacer(entry.Condition.Parameters[0], parameter)
            .Visit(entry.Condition.Body);

        if (!entry.IsAnd || currentGroup == null)
        {
            currentGroup = new List<Expression>();
            groups.Add(currentGroup);
        }
        currentGroup.Add(body);
    }

    // Steps 2 and 3: AND within group, OR between groups
    Expression? result = null;
    foreach (var group in groups)
    {
        Expression? groupExpr = null;
        foreach (var expr in group)
            groupExpr = groupExpr == null ? expr : Expression.AndAlso(groupExpr, expr);

        result = result == null ? groupExpr : Expression.OrElse(result, groupExpr!);
    }

    return Expression.Lambda<Func<T, bool>>(result!, parameter);
}
```

### Concrete Example

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)      // A
    .IsTrue(u => u.IsActive)          // B
    .Or()
    .IsTrue(u => u.IsAdmin);          // C

// Build() produces:
//   x => (x.Age > 18 && x.IsActive) || x.IsAdmin
```

---

## Why ParameterReplacer Is Needed

Every lambda the user writes has its own `ParameterExpression` (the `u =>` in `u => u.Age > 18`). They are distinct objects even though they all represent the same concept ("the T object being evaluated").

When `Build()` combines multiple conditions into a single tree, all nodes must share **exactly the same** `ParameterExpression` object. Otherwise the tree is invalid.

```
Condition A: parameter_A => parameter_A.Age > 18
Condition B: parameter_B => parameter_B.IsActive
                ^^^^^^^^^^^   ^^^^^^^^^^^
                Are distinct ParameterExpression objects

Build() unifies:
  unified_parameter => unified_parameter.Age > 18
                    && unified_parameter.IsActive
```

`ParameterReplacer` traverses the tree of each condition and replaces the original parameter with the unified parameter. See [03-expression-visitors.md](../internals/03-expression-visitors.md) for the implementation details.

---

## BuildNegated

`BuildNegated()` returns the logical complement: `Expression.Not(Build())`. Useful for building exclusion filters.

```csharp
var activeRule = new ValiFlow<User>().IsTrue(u => u.IsActive);
var inactiveFilter = activeRule.BuildNegated();
// Produces: x => !x.IsActive
```

---

## IsValid vs Validate vs ValidateAll

These three methods evaluate conditions against a concrete instance, but with different levels of detail.

### IsValid

The simplest. Compiles the tree to a delegate and executes it. Returns `true` or `false`.

```csharp
bool ok = rule.IsValid(user);
```

Internally uses the cached delegate (`_cachedFunc`) to avoid recompiling the tree on each call.

### Validate

Evaluates each condition **individually** and returns a `ValidationResult` with the list of errors.

```csharp
var result = rule.Validate(user);
if (!result.IsValid)
{
    foreach (var error in result.Errors)
        Console.WriteLine($"[{error.ErrorCode}] {error.Message}");
}
```

To do this, it needs to run each `ConditionEntry<T>` separately. Each `ConditionEntry` has its own `Lazy<Func<T, bool>>` that compiles the delegate for that specific condition.

**OR-group short-circuit (v2.0.0):** `Validate()` evaluates OR groups one at a time. The moment a group passes — all of its AND conditions are satisfied — `Validate()` returns `ValidationResult.Ok()` without evaluating remaining groups. Error details are collected only for groups that have already failed. This matches the short-circuit semantics of `Build()`.

### ValidateAll

Same as `Validate`, but evaluates all conditions **without short-circuiting**: even if early conditions fail, it continues evaluating the remaining ones to accumulate all possible errors.

`Validate` stops at the first failed condition in an AND group. `ValidateAll` does not stop.

---

## The Freeze/Fork Lifecycle

This is one of the most important designs in the library. It is explained in depth in [02-thread-safety.md](../internals/02-thread-safety.md), but the essential concept is:

```
MUTABLE state:  the builder is being constructed
                conditions can be added, .Or() and .WithMessage() can be called
                NOT thread-safe

                ↓ (first call to IsValid, Build, or Freeze)

FROZEN state:   the builder is sealed
                any call to mutation methods returns a NEW builder (fork)
                the original builder is NEVER modified
                IsValid, Build, Validate are thread-safe
```

Example:

```csharp
var baseRule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18);

baseRule.IsValid(user);  // <- implicit freeze here

// Now baseRule is frozen.
// Adding conditions does NOT modify baseRule, creates a fork:
var adminRule   = baseRule.IsTrue(u => u.IsAdmin);    // independent fork
var activeRule  = baseRule.IsTrue(u => u.IsActive);   // another independent fork

// baseRule is still: only Age > 18
// adminRule  is: Age > 18 AND IsAdmin
// activeRule is: Age > 18 AND IsActive
```

---

## BuildCached

`BuildCached()` compiles the expression tree to a `Func<T, bool>` delegate and caches it. After the first compilation, subsequent calls return the cached delegate without recompiling.

Cache publication uses `Volatile.Read/Write` and `Interlocked.CompareExchange` to be thread-safe without a lock, following the safe publication pattern.

```csharp
// Compilation is expensive (~1ms). Caching guarantees it is done only once.
var compiled = rule.BuildCached();  // compiles if no cache exists
bool ok1 = compiled(user1);        // direct, without recompiling
bool ok2 = compiled(user2);        // direct, without recompiling
```

---

## Explain

`Explain()` returns a human-readable representation of the expression tree:

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

Console.WriteLine(rule.Explain());
// Output: "(x.Age > 18) AND (x.IsActive == True)"
```

Useful for debugging and logging. Implemented by `ExpressionExplainer` in `Utils/`. See [03-expression-visitors.md](../internals/03-expression-visitors.md).

---

## Generic Type Constraint

```csharp
public class BaseExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
```

The constraint `where TBuilder : BaseExpression<TBuilder, T>, new()` has two parts:

1. `BaseExpression<TBuilder, T>`: guarantees CRTP — `TBuilder` must inherit from the same base class.
2. `new()`: guarantees that `TBuilder` has a parameterless constructor, needed to create forks in `Clone()`.

Without `new()`, `Clone()` could not create a new instance of the concrete type without reflection.

`CreateNestedBuilder<TProperty>()` is `virtual` (since v2.0.0) with a default implementation of `new ValiFlow<TProperty>()`. External subclasses of `BaseExpression` do not need to override it unless they require a different nested builder type. `ValiFlowQuery<T>` overrides it to throw `UnreachableException` — its `ValidateNested` override never delegates to this factory.
