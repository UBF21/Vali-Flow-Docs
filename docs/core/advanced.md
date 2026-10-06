# Advanced Features

This page covers the advanced capabilities of `BaseExpression<TBuilder, T>`: building and compiling expressions, validation helpers, message attachment, logical operators, conditional conditions, sub-group grouping, and thread safety.

**Examples:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

---

## Building Expressions

### `Build()`

Returns the composed `Expression<Func<T, bool>>` expression tree. The tree is recompiled each time unless cached.

```csharp
Expression<Func<Order, bool>> expr = rule.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```

### `BuildCached()`

Returns a compiled `Func<T, bool>` delegate. The compiled delegate is cached internally after the first call — subsequent calls return the same instance.

```csharp
Func<Order, bool> predicate = rule.BuildCached();
var valid = orders.Where(predicate).ToList();
```

### `BuildNegated()`

Returns a negated expression tree — the logical complement of `Build()`.

```csharp
Expression<Func<Order, bool>> notExpr = rule.BuildNegated();
var invalid = await dbContext.Orders.Where(notExpr).ToListAsync();
```

---

## Validation Helpers

### `IsValid`

Returns `true` when the entity satisfies all conditions.

```csharp
bool ok = rule.IsValid(entity);
```

### `IsNotValid`

Returns `true` when the entity fails at least one condition.

```csharp
bool failed = rule.IsNotValid(entity);
```

### `Validate`

Returns a `ValidationResult` for the entity, containing structured error information.

```csharp
ValidationResult result = rule.Validate(entity);

Console.WriteLine(result.IsValid);        // bool
Console.WriteLine(result.ErrorMessage);   // string — first failing message
Console.WriteLine(result.PropertyPath);   // string — attached via WithError()
Console.WriteLine(result.Severity);       // Severity enum
```

> **OR-group short-circuit:** `Validate()` evaluates OR groups one at a time. As soon as one group passes (all its AND conditions are satisfied), `Validate()` returns `Ok()` immediately without evaluating remaining groups. Only when all groups fail are errors collected and returned.

### `ValidateAll`

Returns an `IEnumerable<ValidationResult>` for a collection of entities.

```csharp
IEnumerable<ValidationResult> all = rule.ValidateAll(entities);

var errors = all.Where(r => !r.IsValid).ToList();
```

### `Explain`

Returns a human-readable string describing which conditions passed or failed for a given entity. Useful for debugging and logging.

```csharp
string explanation = rule.Explain(entity);
Console.WriteLine(explanation);
```

---

## WithMessage / WithError

Attach a descriptive message or property path to the **most recently added condition**.

### `WithMessage(string)`

Attaches a static error message.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage("Name must be at least 3 characters.");
```

### `WithMessage(Func<string>)`

Attaches a lazily-evaluated or localized message.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage(() => Resources.NameTooShort);
```

> **Note:** The factory function must not return `null`. If the factory returns `null`, the condition is treated as having no message and will be silently excluded from `ValidationResult` even if the condition failed.

### `WithError(string)`

Attaches a property path used to identify which field failed.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage("Name is too short")
    .WithError("Name");
```

Combining all three:

```csharp
rule.NotNull(x => x.CustomerId)
    .WithMessage(() => Resources.CustomerRequired)
    .WithError(nameof(Order.CustomerId));
```

---

## Logical Operators (And / Or)

### And (default)

Conditions are combined with `AND` by default. You do not need to call `And()` explicitly.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")   // AND
    .GreaterThan(x => x.Total, 0m);     // AND
```

### `Or()`

Inserts a logical `OR` between the previous condition and the next.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .Or()
    .EqualTo(x => x.Status, "Pending");
// Produces: Status == "Active" OR Status == "Pending"
```

Mixing `And` and `Or`:

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)       // AND
    .Or()
    .EqualTo(x => x.Status, "Pending")   // OR
    .GreaterThan(x => x.Total, 0m);      // AND (applies to Pending branch)
```

> **Note:** `And`-connected conditions are evaluated before `Or`-separated groups. The builder groups consecutive `And` conditions before combining groups with `Or` — consistent with standard boolean operator precedence.

---

## When / Unless (Conditional Conditions)

Apply conditions only when a runtime flag is true or false.

### `When`

Adds the inner conditions only when the predicate is `true`.

```csharp
rule.When(order.IsInternational, r =>
    r.IsNotNullOrEmpty(x => x.CustomsCode));
```

### `Unless`

Adds the inner conditions only when the predicate is `false`.

```csharp
rule.Unless(order.IsDraft, r =>
    r.NotNull(x => x.CustomerId));
```

Combining both:

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(x => x.Total)
    .When(order.IsInternational, r =>
        r.IsNotNullOrEmpty(x => x.CustomsCode)
         .IsNotNullOrEmpty(x => x.DestinationCountry))
    .Unless(order.IsDraft, r =>
        r.NotNull(x => x.CustomerId)
         .GreaterThan(x => x.Total, 0m));
```

---

## AddSubGroup — Grouped Logic

Use `AddSubGroup` to create explicitly grouped sub-expressions. This is the explicit equivalent of chaining `.Or()` between conditions, but wraps an entire sub-rule as a single grouped unit.

```csharp
// (Type == "A" AND Amount > 100) OR (Type == "B" AND Amount < 50)
var rule = new ValiFlow<Order>()
    .AddSubGroup(g => g
        .EqualTo(x => x.Type, "A")
        .GreaterThan(x => x.Amount, 100))
    .Or()
    .AddSubGroup(g => g
        .EqualTo(x => x.Type, "B")
        .LessThan(x => x.Amount, 50));
```

> **Design note:** `AddSubGroup(g => ...)` and `Add().Or().Add()` produce equivalent expression trees. Keep them consistent when writing composite rules.

---

## Freeze / Clone — Thread Safety

### `Freeze()`

Seals the builder so that no further conditions can be added to it. Any `Add()` call after `Freeze()` returns a **fork** (a new independent copy) instead of mutating the original. Useful for sharing a base rule across threads.

```csharp
var baseRule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active");

baseRule.Freeze(); // seal it

// Further additions return a fork, not a mutation
var extendedRule = baseRule.GreaterThan(x => x.Total, 1000m);
// baseRule is unchanged; extendedRule is a new instance
```

### `Clone()`

Creates an O(1) shallow copy of the builder. The clone recompiles on its first use. Useful for creating per-request or per-thread variants.

```csharp
var baseRule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active");

var premiumRule = baseRule.Clone();
premiumRule.GreaterThan(x => x.Total, 1000m); // only affects premiumRule

bool isRegular = baseRule.IsValid(order);
bool isPremium = premiumRule.IsValid(order);
```

---

## Severity

Conditions default to `Severity.Error`. You can attach `Severity.Warning` to a condition to indicate a non-blocking failure.

`Severity.Info` — Informational. A condition with this severity only appears in `ValidationResult` when it **fails** and has an attached message (via `WithMessage` or `WithError`). A failing `Info` condition without a message is silently excluded from all result collections. This is intentional: `Info` represents a hint, not a blocking failure.

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(x => x.Name)
        .WithMessage("Name is required")
        // Severity.Error is the default
    .MinLength(x => x.Name, 2)
        .WithMessage("Name is very short — consider a longer name")
        .WithSeverity(Severity.Warning);

ValidationResult result = rule.Validate(order);

if (!result.IsValid && result.Severity == Severity.Error)
{
    // hard failure
}
else if (!result.IsValid && result.Severity == Severity.Warning)
{
    // soft failure — warn the user
}
```

---

## Mini Examples

### 1) Cached predicate reuse

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0)
    .IsTrue(p => p.IsActive);

Func<Product, bool> predicate = rule.BuildCached();
var available = products.Where(predicate).ToList();
```

### 2) Negated filter for “failed” items

```csharp
var rule = new ValiFlow<Order>()
    .IsTrue(o => o.IsPaid)
    .GreaterThan(o => o.Total, 0m);

Expression<Func<Order, bool>> failed = rule.BuildNegated();
var notPaid = await dbContext.Orders.Where(failed).ToListAsync();
```
