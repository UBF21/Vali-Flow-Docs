---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.DynamoDB.Extensions.ValiFlowDynamoExtensions`.

### `ToDynamoDB<T>(this ValiFlow<T> flow, Func<object?, AttributeValue?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a `DynamoFilterExpression`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, AttributeValue?>?` | No | Hook for mapping CLR types not handled by the built-in switch. Return `null` to fall through to the default conversion. |

**Returns:** `DynamoFilterExpression` — apply to `ScanRequest` or `QueryRequest`.

### `ToDynamoDB<T>(this Expression<Func<T, bool>> expression, Func<object?, AttributeValue?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
DynamoFilterExpression f = expr.ToDynamoDB();
```

---

## DynamoFilterExpression

`DynamoFilterExpression` is a sealed class that encapsulates the three values DynamoDB needs:

| Property | Type | Description |
|----------|------|-------------|
| `FilterExpression` | `string` | The expression string, e.g. `"(#f0 = :v0 AND #f1 > :v1)"`. |
| `ExpressionAttributeNames` | `IReadOnlyDictionary<string, string>` | Maps placeholders (`#f0`, `#f1`, …) to actual attribute names. |
| `ExpressionAttributeValues` | `IReadOnlyDictionary<string, AttributeValue>` | Maps placeholders (`:v0`, `:v1`, …) to `AttributeValue` instances. |

The translator generates sequential placeholders (`#f0`, `#f1`, … for names; `:v0`, `:v1`, … for values) to avoid collisions and to sidestep DynamoDB reserved word conflicts.

`IReadOnlyDictionary<K,V>` does not implement `IDictionary<K,V>` directly. Call `.ToDictionary()` when the SDK requires `Dictionary<string, string>` or `Dictionary<string, AttributeValue>`.

---

## Supported Operations

| ValiFlow method | IR node | DynamoDB FilterExpression |
|----------------|---------|---------------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `#f0 = :v0` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `#f0 <> :v0` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `#f0 > :v0` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `#f0 >= :v0` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `#f0 < :v0` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `#f0 <= :v0` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `contains(#f0, :v0)` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `begins_with(#f0, :v0)` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | throws `NotSupportedException` |
| `.In(x => x.Field, list)` | `InNode` | `#f0 IN (:v0, :v1, …)` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `attribute_not_exists(#f0)` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `attribute_exists(#f0)` |
| `.And(a, b)` | `AndNode` | `(a AND b)` |
| `.Or(a, b)` | `OrNode` | `(a OR b)` |
| `.Not(inner)` | `NotNode` | `NOT (inner)` |

---

## Type Mapping

The built-in `ToAttributeValue` switch handles these CLR types:

| CLR type | `AttributeValue` produced |
|----------|---------------------------|
| `null` | `{ NULL = true }` |
| `bool` | `{ BOOL = b }` |
| `string` | `{ S = s }` |
| `int` | `{ N = "value" }` |
| `long` | `{ N = "value" }` |
| `double` | `{ N = "value" }` (InvariantCulture) |
| `float` | `{ N = "value" }` (InvariantCulture) |
| `decimal` | `{ N = "value" }` (InvariantCulture) |
| `Guid` | `{ S = g.ToString() }` |
| `Enum` | `{ N = "underlying_int64" }` |
| anything else | `{ S = v.ToString() }` |

---

## Custom Value Converter

Use `customConverter` when your domain types are not in the table above or when you need different `AttributeValue` representation than the default.

The converter is called **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: store Money as a number (amount only)
DynamoFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToDynamoDB(value =>
    {
        if (value is Money m)
            return new AttributeValue { N = m.Amount.ToString(CultureInfo.InvariantCulture) };
        return null;
    });
```

Storing a `DateTimeOffset` as an ISO-8601 string in DynamoDB:

```csharp
DynamoFilterExpression f = new ValiFlow<Event>()
    .GreaterThan(x => x.StartsAt, DateTimeOffset.UtcNow)
    .ToDynamoDB(value =>
    {
        if (value is DateTimeOffset dto)
            return new AttributeValue { S = dto.ToString("O") };
        return null;
    });
```

---

## Advanced Example

```csharp
var filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 500m)
    .EqualTo(o => o.Status, "Pending")
    .ToDynamoDB();
```
