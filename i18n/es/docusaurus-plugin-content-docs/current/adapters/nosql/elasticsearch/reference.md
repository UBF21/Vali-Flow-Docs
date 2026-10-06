---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.Elasticsearch.Extensions.ValiFlowElasticsearchExtensions`.

### `ToElasticsearch<T>(this ValiFlow<T> flow, Func<object?, FieldValue?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en una `Query` de Elasticsearch.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, FieldValue?>?` | No | Hook para mapear tipos CLR no manejados por el switch incorporado. Retornar `null` para caer al conversor por defecto. |

**Retorna:** `Query` — pásalo directamente a `Search`, `Count`, `DeleteByQuery`, etc.

### `ToElasticsearch<T>(this Expression<Func<T, bool>> expression, Func<object?, FieldValue?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<Product, bool>> expr = p => p.Category == "Electronics" && p.Price < 500m;
Query filter = expr.ToElasticsearch();
```


## Operaciones soportadas

| Método ValiFlow | Nodo IR | Consulta Elasticsearch |
|----------------|---------|------------------------|
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

Las consultas de rango usan `NumberRangeQuery`, que requiere un campo numérico. El valor se convierte a `double` mediante `Convert.ToDouble`. Pasar un valor no numérico a una comparación de rango lanza `NotSupportedException`.

Los caracteres especiales de comodín (`*`, `?`, `\`) en las cadenas de patrón se escapan antes de construir el patrón de Elasticsearch.


## Mapeo de tipos

El switch `ToFieldValue` incorporado maneja estos tipos CLR para consultas term y terms:

| Tipo CLR | `FieldValue` producido |
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
| cualquier otro | `FieldValue.String(v.ToString())` |


## Conversor de valores personalizado

Usa `customConverter` cuando tus tipos de dominio no están en la tabla anterior, o cuando necesitas una representación `FieldValue` diferente a la por defecto.

El conversor se llama **antes** del switch incorporado. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: representar Money como FieldValue de double
Query filter = new ValiFlow<Product>()
    .LessThan(x => x.Price, new Money(500m, "USD"))
    .ToElasticsearch(value =>
    {
        if (value is Money m)
            return FieldValue.Double((double)m.Amount);
        return null;
    });
```

Forzar que `decimal` use representación de cadena en un campo keyword:

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

## Ejemplo avanzado

```csharp
var query = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 100m)
    .ToElasticsearch();
```
