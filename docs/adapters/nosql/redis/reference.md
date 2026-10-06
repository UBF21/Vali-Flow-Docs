---
title: Reference
---

## Reference

Both overloads are in `Vali_Flow.NoSql.Redis.Extensions.ValiFlowRedisSearchExtensions`.

### `ToRedisSearch<T>(this ValiFlow<T> flow, Func<object?, string?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a RediSearch query string.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. |
| `customConverter` | `Func<object?, string?>?` | No | Hook for mapping CLR types to their tag-value string. Return `null` to fall through to the default conversion. |

**Returns:** `string` — pass to `new Query(result)` or use directly in `FT().Search(...)`.

### `ToRedisSearch<T>(this Expression<Func<T, bool>> expression, Func<object?, string?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending";
string query = expr.ToRedisSearch();
```

---

## Supported Operations

| ValiFlow method | IR node | RediSearch output |
|----------------|---------|-------------------|
| `.EqualTo(x => x.NumField, 42)` | `EqualNode` (numeric) | `@NumField:[42 42]` |
| `.EqualTo(x => x.StrField, "v")` | `EqualNode` (string) | `@StrField:{"v"}` |
| `.NotEqualTo(x => x.NumField, 42)` | `EqualNode(IsNegated, numeric)` | `(-@NumField:[42 42])` |
| `.NotEqualTo(x => x.StrField, "v")` | `EqualNode(IsNegated, string)` | `-@StrField:{"v"}` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `@Field:[(v +inf]` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `@Field:[v +inf]` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `@Field:[-inf (v]` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `@Field:[-inf v]` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `@Field:*txt*` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `@Field:pre*` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `@Field:*suf` |
| `.In(x => x.Field, [1, 2, 3])` | `InNode` (numeric) | `(@Field:[1 1]\|@Field:[2 2]\|@Field:[3 3])` |
| `.In(x => x.Field, ["a", "b"])` | `InNode` (string) | `@Field:{"a"\|"b"}` |
| `.And(a, b)` | `AndNode` | `(a b)` |
| `.Or(a, b)` | `OrNode` | `(a \| b)` |
| `.Not(inner)` | `NotNode` | `-(inner)` |

**Exclusive range bounds:** RediSearch uses `(value` (opening parenthesis before the number) to express strict inequality. `GreaterThan` emits `[(v +inf]` and `LessThan` emits `[-inf (v]`.

**Tag escaping:** `\` and `"` inside quoted tag values are escaped to `\\` and `\"`.

**Mixed IN list:** If an `InNode` contains a mix of numeric and non-numeric values, `InvalidOperationException` is thrown. All non-null values in an `In` list must be of the same kind (all numeric/bool, or all strings).

---

## Type Mapping

Values are classified as either numeric (mapped to range queries) or string (mapped to tag queries).

**Numeric/bool types** (use range query syntax `@field:[v v]`):

| CLR type | RediSearch representation |
|----------|--------------------------|
| `bool` | `1` (true) or `0` (false) |
| `int` | string representation |
| `long` | string representation |
| `double` | string representation (InvariantCulture) |
| `float` | string representation (InvariantCulture) |
| `decimal` | converted to `double`, then string |

**String/other types** (use tag query syntax `@field:{"value"}`):

| CLR type | Tag value |
|----------|-----------|
| `string` | the string itself |
| `Enum` | `.ToString()` (name, not number) |
| anything else | `.ToString()` |

---

## Custom Value Converter

Use `customConverter` to control how domain types appear in the query string. The converter is called **before** the built-in classification. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: use the numeric amount so it lands in a range query
string query = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToRedisSearch(value =>
    {
        if (value is Money m)
            return m.Amount.ToString(CultureInfo.InvariantCulture);
        return null;
    });

// query → "@Price:[(100 +inf]"
```

Returning a string from the converter always produces a tag query for equality, and is used as-is for range queries (so return an invariant-culture number string for numeric fields).

---

## Advanced Example

```csharp
var query = new ValiFlow<User>()
    .EqualTo(x => x.Country, "PE")
    .GreaterThan(x => x.Age, 18)
    .ToRedisSearch();
```
