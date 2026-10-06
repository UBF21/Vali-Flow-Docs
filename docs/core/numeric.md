# Numeric Methods

This page covers all numeric-related methods available in `ValiFlow<T>`. They are defined in `NumericExpression<TBuilder, T>` and `ComparisonExpression<TBuilder, T>`, and are accessible directly from your `ValiFlow<T>` builder instance.

**Examples:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

Unless stated otherwise, each method supports **6 numeric overloads**: `int`, `long`, `float`, `double`, `decimal`, and `short`. Examples below use `int` and `decimal` for brevity — the same signatures apply for all supported types.

---

## Zero

### `Zero`

Passes when the value equals `0`.

```csharp
var rule = new ValiFlow<Order>()
    .Zero(x => x.Quantity);
```

### `NotZero`

Passes when the value is not equal to `0`.

```csharp
var rule = new ValiFlow<Product>()
    .NotZero(x => x.Price);
```

---

## Sign

### `Positive`

Passes when the value is strictly greater than `0`.

```csharp
var rule = new ValiFlow<Product>()
    .Positive(x => x.Amount);
```

### `Negative`

Passes when the value is strictly less than `0`.

```csharp
var rule = new ValiFlow<Order>()
    .Negative(x => x.Balance);
```

---

## Comparison (value)

### `GreaterThan`

Passes when the property value is strictly greater than the given constant. Supports 6 numeric overloads.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 0m);

var rule = new ValiFlow<Product>()
    .GreaterThan(x => x.Stock, 0);
```

### `GreaterThanOrEqualTo`

Passes when the property value is greater than or equal to the given constant.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThanOrEqualTo(x => x.Quantity, 1);
```

### `LessThan`

Passes when the property value is strictly less than the given constant.

```csharp
var rule = new ValiFlow<Product>()
    .LessThan(x => x.Price, 1000m);
```

### `LessThanOrEqualTo`

Passes when the property value is less than or equal to the given constant.

```csharp
var rule = new ValiFlow<User>()
    .LessThanOrEqualTo(x => x.Age, 120);
```

### `EqualTo`

Passes when the numeric value equals the given constant exactly. This is the numeric-specific equality overload (as opposed to the general `==` predicate).

```csharp
var rule = new ValiFlow<Product>()
    .EqualTo(x => x.Score, 100);
```

---

## Cross-field Comparison

These overloads compare two properties of the same entity against each other. They accept any type that implements `IComparable<T>`, making them suitable for `DateTime`, `decimal`, `int`, and similar types.

### `GreaterThan` (cross-field)

Passes when the first property's value is strictly greater than the second property's value.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThan(x => x.EndDate, x => x.StartDate);
```

### `GreaterThanOrEqualTo` (cross-field)

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThanOrEqualTo(x => x.Max, x => x.Min);
```

### `LessThan` (cross-field)

```csharp
var rule = new ValiFlow<Product>()
    .LessThan(x => x.Price, x => x.Cap);
```

### `LessThanOrEqualTo` (cross-field)

```csharp
var rule = new ValiFlow<Order>()
    .LessThanOrEqualTo(x => x.Quantity, x => x.Stock);
```

---

## Range

### `InRange`

Passes when the value falls within the inclusive range `[min, max]`. Supports 6 numeric overloads and a cross-property variant.

```csharp
// Constant bounds
var rule = new ValiFlow<Product>()
    .InRange(x => x.Score, 0, 100);

// Cross-property bounds
var rule = new ValiFlow<Product>()
    .InRange(x => x.Value, x => x.Min, x => x.Max);
```

### `Between`

Alias / variant of `InRange` with inclusive semantics. Use when the intent reads more naturally as a range description.

```csharp
var rule = new ValiFlow<User>()
    .Between(x => x.Age, 18, 65);
```

### `IsBetweenExclusive`

Passes when the value is strictly inside the open interval `(min, max)` — both bounds are excluded. Supports 6 numeric overloads.

```csharp
// 0 < Discount < 100
var rule = new ValiFlow<Product>()
    .IsBetweenExclusive(x => x.Discount, 0, 100);
```

---

## Tolerance

### `IsCloseTo`

Passes when `|value - target| <= tolerance`. Useful for floating-point comparisons. Supports `float` and `double`.

```csharp
var rule = new ValiFlow<Product>()
    .IsCloseTo(x => x.Weight, 0.5, 0.01);   // within ±0.01 of 0.5

var rule = new ValiFlow<Order>()
    .IsCloseTo(x => x.Latitude, 40.7128, 0.001);
```

---

## Parity

### `IsEven`

Passes when the value is divisible by 2. Supports `int` and `long`.

```csharp
var rule = new ValiFlow<Order>()
    .IsEven(x => x.Quantity);
```

### `IsOdd`

Passes when the value is not divisible by 2. Supports `int` and `long`.

```csharp
var rule = new ValiFlow<Product>()
    .IsOdd(x => x.Id);
```

### `IsMultipleOf`

Passes when the value is an exact multiple of the given divisor. Supports `int` and `long`.

```csharp
var rule = new ValiFlow<Order>()
    .IsMultipleOf(x => x.Quantity, 5);
```

---

## Extremes

### `MinValue`

Passes when the property value equals the minimum representable value for the type (e.g., `int.MinValue`, `decimal.MinValue`). Supports 6 numeric overloads.

```csharp
var rule = new ValiFlow<Product>()
    .MinValue(x => x.Priority);
```

### `MaxValue`

Passes when the property value equals the maximum representable value for the type. Supports 6 numeric overloads.

```csharp
var rule = new ValiFlow<Product>()
    .MaxValue(x => x.Priority);
```

---

## Nullable Numeric

These methods handle nullable numeric properties (`int?`, `long?`, `decimal?`, `double?`, `float?`).

### `IsNullOrZero`

Passes when the nullable value is `null` or `0`.

```csharp
var rule = new ValiFlow<Product>()
    .IsNullOrZero(x => x.Discount);
```

### `IsNotNullOrZero`

Passes when the nullable value is neither `null` nor `0`.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNullOrZero(x => x.Price);
```

---

## Combined Example

The following rule validates a `Product` entity with a variety of numeric constraints:

```csharp
var rule = new ValiFlow<Product>()
    .NotZero(x => x.Price)
    .Positive(x => x.Price)
    .InRange(x => x.Stock, 0, 10000)
    .IsBetweenExclusive(x => x.Discount, 0, 100)   // 0 < Discount < 100
    .IsCloseTo(x => x.Weight, 0.5, 0.01);           // within ±0.01 of 0.5

bool isValid = rule.Evaluate(product);

// Build the expression for LINQ/EF Core
Expression<Func<Product, bool>> expr = rule.Build();
var availableProducts = dbContext.Products.Where(expr).ToList();
```

---

## Mini Examples

### 1) Price range + discount bound

```csharp
var rule = new ValiFlow<Product>()
    .InRange(p => p.Price, 10m, 500m)
    .IsBetweenExclusive(p => p.Discount, 0m, 60m);
```

### 2) Tolerance for floating values

```csharp
var rule = new ValiFlow<SensorReading>()
    .IsCloseTo(x => x.Temperature, 20.0, 0.25);
```
