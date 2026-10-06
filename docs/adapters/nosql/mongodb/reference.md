---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.MongoDB.Extensions.ValiFlowMongoExtensions`.

### `ToMongo<T>(this ValiFlow<T> flow, Func<object?, BsonValue?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a `BsonDocument` filter.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, BsonValue?>?` | No | Hook for mapping CLR types not handled by the built-in switch. Return `null` to fall through to the default conversion. |

**Returns:** `BsonDocument` — pass directly to `Find`, `CountDocuments`, `DeleteMany`, etc.

### `ToMongo<T>(this Expression<Func<T, bool>> expression, Func<object?, BsonValue?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending" && o.Total > 50m;
BsonDocument filter = expr.ToMongo();
```

---

## Supported Operations

| ValiFlow method | IR node | MongoDB output |
|----------------|---------|----------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `{ field: value }` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `{ field: { $ne: value } }` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `{ field: { $gt: value } }` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `{ field: { $gte: value } }` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `{ field: { $lt: value } }` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `{ field: { $lte: value } }` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `{ field: { $regex: /txt/i } }` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `{ field: { $regex: /^pre/i } }` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `{ field: { $regex: /suf$/i } }` |
| `.In(x => x.Field, list)` | `InNode` | `{ field: { $in: [...] } }` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `{ field: null }` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `{ field: { $ne: null } }` |
| `.And(a, b)` | `AndNode` | `{ $and: [a, b] }` |
| `.Or(a, b)` | `OrNode` | `{ $or: [a, b] }` |
| `.Not(inner)` | `NotNode` | `{ $nor: [inner] }` |

All string pattern matches use the `i` regex flag (case-insensitive). Special regex characters in the pattern are escaped before embedding.

---

## Type Mapping

The built-in `ToBsonValue` switch handles these CLR types:

| CLR type | `BsonValue` produced |
|----------|----------------------|
| `null` | `BsonNull.Value` |
| `bool` | `BsonBoolean` |
| `int` | `BsonInt32` |
| `long` | `BsonInt64` |
| `double` | `BsonDouble` |
| `float` | `BsonDouble` |
| `decimal` | `BsonDecimal128` |
| `string` | `BsonString` |
| `DateTime` | `BsonDateTime` (UTC) |
| `DateTimeOffset` | `BsonDateTime` (.UtcDateTime) |
| `Guid` | `BsonBinaryData` (GuidRepresentation.Standard) |
| `Enum` | `BsonInt32` (underlying integer value) |
| anything else | `BsonValue.Create(v)` |

---

## Custom Value Converter

Use `customConverter` when your domain types are not in the table above, or when you need different serialization than the default (for example, storing a `decimal` as `BsonDouble` instead of `BsonDecimal128`).

The converter is called **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: store Money as a BsonDecimal128 of the amount
BsonDocument filter = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToMongo(value =>
    {
        if (value is Money m)
            return new BsonDecimal128(m.Amount);
        return null; // fall through for all other types
    });
```

Another common case — force `decimal` to store as `BsonDouble`:

```csharp
BsonDocument filter = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 250.00m)
    .ToMongo(value =>
    {
        if (value is decimal d)
            return new BsonDouble((double)d);
        return null;
    });
```

---

## Advanced Example

```csharp
// Custom converter for Money type
var filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .ToMongo(obj => obj is Money m ? new BsonDecimal128(m.Amount) : null);
```
