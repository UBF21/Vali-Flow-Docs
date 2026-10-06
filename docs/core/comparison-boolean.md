# Comparison & Boolean Methods

This page documents all boolean checks, null checks, equality comparisons, type checks, and cross-field comparisons available on `ValiFlow<T>`.

**Examples:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

---

## Boolean Checks

### `IsTrue(selector)`

The selected property must evaluate to `true`.

```csharp
var rule = new ValiFlow<User>()
    .IsTrue(u => u.IsActive);
```

### `IsFalse(selector)`

The selected property must evaluate to `false`.

```csharp
var rule = new ValiFlow<User>()
    .IsFalse(u => u.IsDeleted);
```

---

## Null Checks

### `NotNull(selector)`

The selected member must not be `null`. Throws if the selector always produces a non-nullable value type.

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId);
```

### `IsNotNull(selector)`

Alias for `NotNull`. Prefer this name for consistency with the `Is*` naming convention.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNull(p => p.Name);
```

### `Null(selector)`

The selected member must be `null`.

```csharp
var rule = new ValiFlow<User>()
    .Null(u => u.DeletedAt);
```

### `IsNull(selector)`

Alias for `Null`.

```csharp
var rule = new ValiFlow<Order>()
    .IsNull(o => o.CancelledAt);
```

---

## Equality

### `EqualTo(selector, value)`

The selected property must equal `value`. `TValue` must implement `IEquatable<TValue>`.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(o => o.Status, "Active");
```

### `NotEqualTo(selector, value)`

The selected property must not equal `value`.

```csharp
var rule = new ValiFlow<Order>()
    .NotEqualTo(o => o.Status, "Cancelled");
```

---

## Type Checks

### `IsInEnum(selector)`

The selected value must be a defined member of its enum type. This check uses `Enum.IsDefined` and is evaluated in memory.

> **Note:** In-memory only. This method is not translatable to SQL by EF Core. Use `ValiFlow<T>` (not `ValiFlowQuery<T>`) when this condition is required.

```csharp
var rule = new ValiFlow<Order>()
    .IsInEnum(o => o.PaymentMethod);
```

### `IsDefault(selector)`

The selected value must equal `default(TValue)` — i.e., `null` for reference types, `0` for numeric types, `DateTime.MinValue` for `DateTime`, etc.

> **Note:** In-memory only. Not translatable to SQL by EF Core.

```csharp
var rule = new ValiFlow<Booking>()
    .IsDefault(b => b.CheckOutDate); // true when CheckOutDate == default(DateTime)
```

### `IsNotDefault(selector)`

The selected value must not equal `default(TValue)`.

> **Note:** In-memory only. Not translatable to SQL by EF Core.

```csharp
var rule = new ValiFlow<Booking>()
    .IsNotDefault(b => b.Id); // ensures Id has been assigned
```

---

## Cross-Field Comparisons

These methods compare two properties of the same entity against each other. The selector type `TValue` must implement `IComparable<TValue>`, which includes `DateTime`, `decimal`, `int`, `string`, `DateOnly`, `TimeOnly`, `DateTimeOffset`, and any other comparable type.

### `GreaterThan(leftSelector, rightSelector)`

`left > right` — the left property must be strictly greater than the right property.

```csharp
var rule = new ValiFlow<Booking>()
    .GreaterThan(b => b.CheckOut, b => b.CheckIn);
```

### `GreaterThanOrEqualTo(leftSelector, rightSelector)`

`left >= right`.

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThanOrEqualTo(p => p.MaxPrice, p => p.MinPrice);
```

### `LessThan(leftSelector, rightSelector)`

`left < right`.

```csharp
var rule = new ValiFlow<Order>()
    .LessThan(o => o.DiscountedPrice, o => o.OriginalPrice);
```

### `LessThanOrEqualTo(leftSelector, rightSelector)`

`left <= right`.

```csharp
var rule = new ValiFlow<Warehouse>()
    .LessThanOrEqualTo(w => w.CurrentStock, w => w.Capacity);
```

---

## Practical Example

The following rule combines boolean, null, equality, type, and cross-field comparisons to validate a `Booking` entity:

```csharp
var rule = new ValiFlow<Booking>()
    // Id must have been assigned (not default)
    .IsNotDefault(b => b.Id)
    // Guest name must not be null
    .IsNotNull(b => b.GuestName)
    // Only confirmed bookings are accepted
    .EqualTo(b => b.Status, BookingStatus.Confirmed)
    // PaymentMethod must be a valid enum value
    .IsInEnum(b => b.PaymentMethod)
    // Booking must not be cancelled
    .IsFalse(b => b.IsCancelled)
    // Check-out must come after check-in
    .GreaterThan(b => b.CheckOut, b => b.CheckIn);

var result = rule.Validate(booking);
if (!result.IsValid)
    Console.WriteLine($"Booking invalid: {result.ErrorMessage}");
```

> **Note:** `IsNotDefault` and `IsInEnum` are in-memory only. If you pass this rule's `Build()` output to an EF Core query, those conditions will throw a translation exception. In that scenario, evaluate them separately in memory after the database query, or replace them with EF Core-translatable equivalents.

---

## Mini Examples

### 1) Soft-delete + status check

```csharp
var rule = new ValiFlow<Order>()
    .IsFalse(o => o.IsDeleted)
    .EqualTo(o => o.Status, OrderStatus.Confirmed);
```

### 2) Cross-field date guard

```csharp
var rule = new ValiFlow<Booking>()
    .IsNotNull(b => b.CheckIn)
    .IsNotNull(b => b.CheckOut)
    .GreaterThan(b => b.CheckOut, b => b.CheckIn);
```
