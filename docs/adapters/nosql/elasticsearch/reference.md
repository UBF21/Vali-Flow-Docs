---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.Elasticsearch.Extensions.ValiFlowElasticsearchExtensions`.

### `ToElasticsearch<T>(this ValiFlow<T> flow, Func<object?, FieldValue?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into an Elasticsearch `Query`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, FieldValue?>?` | No | Hook for mapping CLR types not handled by the built-in switch. Return `null` to fall through to the default conversion. |

**Returns:** `Query` — pass directly to `Search`, `Count`, `DeleteByQuery`, etc.

### `ToElasticsearch<T>(this Expression<Func<T, bool>> expression, Func<object?, FieldValue?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<Product, bool>> expr = p => p.Category == "Electronics" && p.Price < 500m;
Query filter = expr.ToElasticsearch();
```

---

## Supported Operations

| ValiFlow method | IR node | Elasticsearch query |
|----------------|---------|---------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `term { field: value }` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `bool { must_not: [term { field: value }] }` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `range { field: { gt: value } }` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `range { field: { gte: value } }` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `range { field: { lt: value } }` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `range { field: { lte: value } }` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `wildcard { field: "*txt*", case_insensitive: true }` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `wildcard { field: "pre*", case_insensitive: true }` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `wildcard { field: "*suf", case_insensitive: true }` |
| `.In(x => x.Field, list)` | `InNode` | `terms { field: [...] }` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `bool { must_not: [exists { field }] }` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `exists { field }` |
| `.And(a, b)` | `AndNode` | `bool { must: [a, b] }` |
| `.Or(a, b)` | `OrNode` | `bool { should: [a, b], minimum_should_match: 1 }` |
| `.Not(inner)` | `NotNode` | `bool { must_not: [inner] }` |

Range queries use `NumberRangeQuery`, which requires a numeric field. The value is converted to `double` via `Convert.ToDouble`. Passing a non-numeric value to a range comparison throws `NotSupportedException`.

Wildcard special characters (`*`, `?`, `\`) in pattern strings are escaped before building the Elasticsearch pattern.

---

## Type Mapping

The built-in `ToFieldValue` switch handles these CLR types for term and terms queries:

| CLR type | `FieldValue` produced |
|----------|-----------------------|
| `null` | `FieldValue.Null` |
| `bool` | `FieldValue.Boolean(b)` |
| `int` | `FieldValue.Long(i)` |
| `long` | `FieldValue.Long(l)` |
| `double` | `FieldValue.Double(d)` |
| `float` | `FieldValue.Double(f)` |
| `decimal` | `FieldValue.Double((double)dec)` |
| `string` | `FieldValue.String(s)` |
| `Enum` | `FieldValue.Long(Convert.ToInt64(e))` |
| anything else | `FieldValue.String(v.ToString())` |

---

## Custom Value Converter

Use `customConverter` when your domain types are not in the table above, or when you need a different `FieldValue` representation than the default.

The converter is called **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: represent Money as a double FieldValue
Query filter = new ValiFlow<Product>()
    .LessThan(x => x.Price, new Money(500m, "USD"))
    .ToElasticsearch(value =>
    {
        if (value is Money m)
            return FieldValue.Double((double)m.Amount);
        return null;
    });
```

Forcing `decimal` to use string representation in a keyword field:

```csharp
Query filter = new ValiFlow<Invoice>()
    .EqualTo(x => x.TaxRate, 0.21m)
    .ToElasticsearch(value =>
    {
        if (value is decimal d)
            return FieldValue.String(d.ToString("G", CultureInfo.InvariantCulture));
        return null;
    });
```

---

## Advanced Example

```csharp
var query = new ValiFlow<Product>()
    .IsNotNullOrEmpty(x => x.Category)
    .GreaterThan(x => x.Price, 25m)
    .ToElasticsearch();
```
