---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.CosmosDb.Extensions.ValiFlowCosmosDbExtensions`.

### `ToCosmosDb<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a `CosmosFilterExpression`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, object?>?` | No | Hook for mapping CLR types not handled by the built-in switch into the raw value stored in the parameters dictionary. Return `null` to fall through to the default conversion. |

**Returns:** `CosmosFilterExpression` — append `WhereClause` to your query text and bind `Parameters` to a `QueryDefinition`.

### `ToCosmosDb<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
CosmosFilterExpression f = expr.ToCosmosDb();
```

---

## CosmosFilterExpression

`CosmosFilterExpression` is a sealed class that encapsulates the two values a Cosmos SQL query needs:

| Property | Type | Description |
|----------|------|-------------|
| `WhereClause` | `string` | The WHERE clause fragment, **without** the leading `WHERE` keyword, e.g. `"c.Age > @p0"`. |
| `Parameters` | `IReadOnlyDictionary<string, object?>` | Maps placeholders (`@p0`, `@p1`, …) to their raw values. |

Field references use the standard Cosmos SQL container alias `c` (e.g. `c.Status`), so there is no attribute-name placeholder layer like DynamoDB's `#f0` — only value placeholders are generated.

`Parameters` is used directly with `QueryDefinition.WithParameter(name, value)` in a `foreach` loop — no `.ToDictionary()` call is required, since the SDK's `WithParameter` takes one key/value pair at a time rather than a dictionary constructor argument.

---

## Supported Operations

| ValiFlow method | IR node | Cosmos SQL fragment |
|----------------|---------|---------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `c.Field = @p0` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `c.Field != @p0` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `c.Field > @p0` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `c.Field >= @p0` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `c.Field < @p0` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `c.Field <= @p0` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `CONTAINS(c.Field, @p0)` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `STARTSWITH(c.Field, @p0)` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `ENDSWITH(c.Field, @p0)` |
| `.In(x => x.Field, list)` | `InNode` | `c.Field IN (@p0, @p1, …)` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `IS_NULL(c.Field)` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `NOT IS_NULL(c.Field)` |
| `.And(a, b)` | `AndNode` | `(a AND b)` |
| `.Or(a, b)` | `OrNode` | `(a OR b)` |
| `.Not(inner)` | `NotNode` | `NOT (inner)` |

All three `LikeNode` operators map to **native** Cosmos SQL functions — unlike DynamoDB, Cosmos supports `ENDSWITH` directly, so there is no client-side fallback needed for that case. `IS_NULL` is also native — it is a true null check against the JSON document, not an attribute-existence check.

---

## Type Mapping

The built-in conversion switch handles these CLR types:

| CLR type | Parameter value produced |
|----------|---------------------------|
| `null` | `null` |
| `bool` | `b` (as-is) |
| `string` | `s` (as-is) |
| `int` | `i` (as-is) |
| `long` | `l` (as-is) |
| `double` | `d` (as-is) |
| `float` | `f` (as-is) |
| `decimal` | `m` (as-is) |
| `Guid` | `g.ToString()` |
| `Enum` | underlying value as `long` (InvariantCulture) |
| anything else | `v.ToString()` |

Unlike DynamoDB's `AttributeValue` wrapper, Cosmos parameters are plain CLR values — `QueryDefinition.WithParameter` accepts them directly and the Cosmos SQL API handles JSON-native typing (numbers, strings, booleans) on its own.

---

## Custom Value Converter

Use `customConverter` when your domain types are not in the table above or when you need a different raw value than the default.

The converter is called **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: store Money as a number (amount only)
CosmosFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToCosmosDb(value =>
    {
        if (value is Money m)
            return m.Amount;
        return null;
    });
```

Storing a `DateTimeOffset` as an ISO-8601 string:

```csharp
CosmosFilterExpression f = new ValiFlow<Event>()
    .GreaterThan(x => x.StartsAt, DateTimeOffset.UtcNow)
    .ToCosmosDb(value =>
    {
        if (value is DateTimeOffset dto)
            return dto.ToString("O");
        return null;
    });
```

---

## Advanced Example

A realistic filter combining equality, range, membership, and null checks, applied through the `Microsoft.Azure.Cosmos` SDK:

```csharp
using Microsoft.Azure.Cosmos;
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.CosmosDb.Extensions;
using Vali_Flow.NoSql.CosmosDb.Models;

CosmosClient client = new CosmosClient(connectionString);
Container container = client.GetContainer("myDb", "Orders");

var filter = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Processing")
    .GreaterThanOrEqualTo(x => x.Total, 100m)
    .LessThan(x => x.Total, 5000m)
    .In(x => x.RegionCode, new[] { "US", "CA", "MX" })
    .IsNotNull(x => x.CustomerId);

CosmosFilterExpression f = filter.ToCosmosDb();

// f.WhereClause:
// "(((c.Status = @p0 AND c.Total >= @p1) AND c.Total < @p2) AND c.RegionCode IN (@p3, @p4, @p5)) AND NOT IS_NULL(c.CustomerId)"

var queryText = $"SELECT * FROM c WHERE {f.WhereClause}";
var query = new QueryDefinition(queryText);
foreach (var kv in f.Parameters)
    query = query.WithParameter(kv.Key, kv.Value);

using FeedIterator<Order> iterator = container.GetItemQueryIterator<Order>(query);
var results = new List<Order>();
while (iterator.HasMoreResults)
{
    FeedResponse<Order> page = await iterator.ReadNextAsync();
    results.AddRange(page);
}
```

Handling the empty `In` list case (Cosmos SQL does not accept an empty `IN (...)`):

```csharp
var regionCodes = GetRegionCodesFromRequest(); // might be empty

var builder = new ValiFlow<Order>().EqualTo(x => x.Status, "Active");

if (regionCodes.Count > 0)
    builder = builder.And(builder, new ValiFlow<Order>().In(x => x.RegionCode, regionCodes));

CosmosFilterExpression f = builder.ToCosmosDb(); // safe — In() only called when the list is non-empty
```
