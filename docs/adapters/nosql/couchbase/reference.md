---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.Couchbase.Extensions.ValiFlowCouchbaseExtensions`.

### `ToCouchbase<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a `CouchbaseFilterExpression`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, object?>?` | No | Hook for mapping CLR types not handled by the built-in switch. Called **before** the default conversion. Return `null` to fall through to it. |

Throws `ArgumentNullException` if `flow` is `null`.

**Returns:** `CouchbaseFilterExpression` — combine `WhereClause` with a full N1QL statement and bind `Parameters`.

### `ToCouchbase<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
CouchbaseFilterExpression f = expr.ToCouchbase();
```

Throws `ArgumentNullException` if `expression` is `null`.

---

## CouchbaseFilterExpression

`CouchbaseFilterExpression` is a sealed class that encapsulates the two values a N1QL query needs:

| Property | Type | Description |
|----------|------|-------------|
| `WhereClause` | `string` | The WHERE clause fragment, **without** the leading `WHERE` keyword, e.g. `` "`Name` = $p0" ``. |
| `Parameters` | `IReadOnlyDictionary<string, object?>` | Named N1QL parameters (`$p0`, `$p1`, …) to bind to the query. |

The translator generates sequential `$p0`, `$p1`, … placeholders for every literal value in the filter, regardless of node type (equality, comparison, `LIKE` pattern, or `IN` list).

---

## Supported Operations

| ValiFlow method | IR node | N1QL fragment |
|----------------|---------|----------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `` `Field` = $p0 `` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `` `Field` <> $p0 `` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `` `Field` > $p0 `` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `` `Field` >= $p0 `` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `` `Field` < $p0 `` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `` `Field` <= $p0 `` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `` `Field` LIKE $p0 `` with `$p0 = "%txt%"` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `` `Field` LIKE $p0 `` with `$p0 = "pre%"` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `` `Field` LIKE $p0 `` with `$p0 = "%suf"` |
| `.In(x => x.Field, list)` | `InNode` | `` `Field` IN $p0 `` with `$p0` bound to the **whole array** |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `` `Field` IS NULL `` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `` `Field` IS NOT NULL `` |
| `.And(a, b)` | `AndNode` | `(a AND b)` |
| `.Or(a, b)` | `OrNode` | `(a OR b)` |
| `.Not(inner)` | `NotNode` | `NOT (inner)` |

Identifiers are wrapped in backticks (`` `Field` ``) — the N1QL/MySQL quoting convention.

Note the `In` row: unlike DynamoDB (which expands to `#f0 IN (:v0, :v1, …)`), Couchbase binds the **entire list as a single array parameter** — `` `Field` IN $p0 `` with `Parameters["$p0"]` set to a `List<object?>`. N1QL evaluates `IN` against the bound array directly.

`EndsWith` is fully supported here — unlike DynamoDB, N1QL's `LIKE` has no restriction on trailing wildcards.

---

## Type Mapping

The built-in value-resolution switch handles these CLR types:

| CLR type | Parameter value produced |
|----------|---------------------------|
| `null` | `null` |
| `bool` | `b` (unchanged) |
| `string` | `s` (unchanged) |
| `int` | `i` (unchanged) |
| `long` | `l` (unchanged) |
| `double` | `d` (unchanged) |
| `float` | `(double)f` |
| `decimal` | `m.ToString(CultureInfo.InvariantCulture)` — bound as a **string**, not a native number |
| `Guid` | `g.ToString()` |
| `Enum` | `Convert.ToInt64(e)` — the underlying integer value |
| anything else | `v.ToString()` |

The `decimal → string` conversion is deliberate: N1QL/JSON numbers are IEEE-754 doubles, which lose precision for money-shaped values. If your Couchbase schema stores the field as a native N1QL number, cast in the query (`TONUMBER($p0)`) or supply a `customConverter` that returns the raw `decimal` (JSON-serializable as a number by the SDK).

---

## Custom Value Converter

Use `customConverter` when your domain types are not in the table above, or when you need a different parameter representation than the default.

The converter is called **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: store Money as a native number (amount only)
CouchbaseFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToCouchbase(value =>
    {
        if (value is Money m)
            return m.Amount; // bound as a native decimal/number, not a string
        return null;
    });
```

Storing a `DateTimeOffset` as an ISO-8601 string:

```csharp
CouchbaseFilterExpression f = new ValiFlow<Event>()
    .GreaterThan(x => x.StartsAt, DateTimeOffset.UtcNow)
    .ToCouchbase(value =>
    {
        if (value is DateTimeOffset dto)
            return dto.ToString("O");
        return null;
    });
```

---

## Advanced Example

```csharp
var filter = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Processing")
    .GreaterThanOrEqualTo(x => x.Total, 100m)
    .LessThan(x => x.Total, 5000m)
    .In(x => x.RegionCode, new[] { "US", "CA", "MX" })
    .IsNotNull(x => x.CustomerId);

CouchbaseFilterExpression f = filter.ToCouchbase();

var query = $"SELECT META(o).id, o.* FROM `orders` o WHERE {f.WhereClause}";

var options = new QueryOptions();
foreach (var (name, value) in f.Parameters)
    options.Parameter(name, value);

IQueryResult<Order> result = await cluster.QueryAsync<Order>(query, options);
```
