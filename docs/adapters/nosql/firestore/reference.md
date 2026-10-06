---
title: Reference
---

## Reference

Both overloads live in `Vali_Flow.NoSql.Firestore.Extensions.ValiFlowFirestoreExtensions`.

### `ToFirestore<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Translates the conditions accumulated in a `ValiFlow<T>` builder into a native `Filter`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `flow` | `ValiFlow<T>` | Yes | The builder containing the conditions. Throws `ArgumentNullException` if `null`. |
| `customConverter` | `Func<object?, object?>?` | No | Hook for mapping CLR types not handled by the built-in switch. Return `null` to fall through to the default conversion. Scoped to this call only (thread-safe). |

**Returns:** `Filter` — pass directly to `Query.Where(filter)`.

### `ToFirestore<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Same translation for a pre-built `Expression<Func<T, bool>>`.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending" && o.Total > 50m;
Filter filter = expr.ToFirestore();
```

Both overloads are thin wrappers over `FirestoreFilterTranslator.Translate(IConditionNode, Func<object?, object?>?)` — the `ValiFlow<T>` overload calls `flow.ToNoSqlIR()` first, the expression overload calls `expression.ToNoSqlIR()` first.

---

## Supported Operations

| ValiFlow method | IR node | Firestore `Filter` call |
|----------------|---------|--------------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `Filter.EqualTo(field, value)` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `Filter.NotEqualTo(field, value)` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GreaterThan)` | `Filter.GreaterThan(field, value)` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GreaterThanOrEqual)` | `Filter.GreaterThanOrEqualTo(field, value)` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LessThan)` | `Filter.LessThan(field, value)` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LessThanOrEqual)` | `Filter.LessThanOrEqualTo(field, value)` |
| `.In(x => x.Field, list)` | `InNode` | `Filter.InArray(field, values)` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `Filter.EqualTo(field, null)` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `Filter.NotEqualTo(field, null)` |
| `.And(a, b)` | `AndNode` | `Filter.And(left, right)` |
| `.Or(a, b)` | `OrNode` | `Filter.Or(left, right)` |
| `.Contains` / `.StartsWith` / `.EndsWith` | `LikeNode` | **throws** `NotSupportedException` |
| `.Not(inner)` | `NotNode` | **throws** `NotSupportedException` |

`And`/`Or` nest recursively, exactly mirroring the shape of the IR tree — there is no flattening into a single `Filter.And(a, b, c, ...)` call even if the source expression chains more than two conditions; each binary node becomes one nested `Filter.And`/`Filter.Or` call.

---

## Type Mapping

The built-in switch inside `FirestoreFilterTranslator` (method `ToValue`) handles these CLR types before handing the value to `Filter.*`:

| CLR type | Value passed to `Filter.*` |
|----------|------------------------------|
| `null` | `null` |
| `Enum` | `int` (via `Convert.ToInt32(e)`) |
| `DateTimeOffset` | `Timestamp.FromDateTimeOffset(dto)` |
| `DateTime` | `Timestamp.FromDateTime(...)` — converted to UTC first if `dt.Kind != DateTimeKind.Utc` |
| anything else (`string`, `int`, `long`, `double`, `bool`, `decimal`, ...) | passed through unchanged — the Firestore SDK serializes these natively |

Resolution order: `customConverter` (if provided) runs first via `ConditionValueResolver.Resolve`; if it returns `null`, the built-in switch above applies.

---

## Custom Value Converter

Use `customConverter` for domain types the built-in switch doesn't know about, or to override a default (for example, storing a `decimal` as `double` instead of letting the SDK serialize it as-is).

The converter runs **before** the built-in switch. Return `null` to let the default handle the value.

```csharp
// Domain type
record Money(decimal Amount, string Currency);

// Converter: store Money as a double amount
Filter filter = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToFirestore(value =>
    {
        if (value is Money m)
            return (double)m.Amount;
        return null; // fall through for everything else
    });
```

---

## Advanced Example

```csharp
// Custom converter for Money type
Filter filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .ToFirestore(obj => obj is Money m ? (double)m.Amount : null);
```
