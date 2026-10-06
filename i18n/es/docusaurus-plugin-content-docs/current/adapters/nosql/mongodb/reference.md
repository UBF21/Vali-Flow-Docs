---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.MongoDB.Extensions.ValiFlowMongoExtensions`.

### `ToMongo<T>(this ValiFlow<T> flow, Func<object?, BsonValue?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en un filtro `BsonDocument`.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, BsonValue?>?` | No | Hook para mapear tipos CLR no manejados por el switch incorporado. Retornar `null` para caer al conversor por defecto. |

**Retorna:** `BsonDocument` — pásalo directamente a `Find`, `CountDocuments`, `DeleteMany`, etc.

### `ToMongo<T>(this Expression<Func<T, bool>> expression, Func<object?, BsonValue?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending" && o.Total > 50m;
BsonDocument filter = expr.ToMongo();
```


## Operaciones soportadas

| Método ValiFlow | Nodo IR | Salida MongoDB |
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

Todas las coincidencias de patrón de cadena usan el flag de regex `i` (insensible a mayúsculas/minúsculas). Los caracteres especiales de regex en el patrón se escapan antes de insertarse.


## Mapeo de tipos

El switch `ToBsonValue` incorporado maneja estos tipos CLR:

| Tipo CLR | `BsonValue` producido |
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
| `Enum` | `BsonInt32` (valor entero subyacente) |
| cualquier otro | `BsonValue.Create(v)` |


## Conversor de valores personalizado

Usa `customConverter` cuando tus tipos de dominio no están en la tabla anterior, o cuando necesitas serialización diferente a la por defecto (por ejemplo, almacenar un `decimal` como `BsonDouble` en lugar de `BsonDecimal128`).

El conversor se llama **antes** del switch incorporado. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: almacena Money como BsonDecimal128 del monto
BsonDocument filter = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToMongo(value =>
    {
        if (value is Money m)
            return new BsonDecimal128(m.Amount);
        return null; // caer al default para todos los demás tipos
    });
```

Otro caso común — forzar que `decimal` se almacene como `BsonDouble`:

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

## Ejemplo avanzado

```csharp
// Rango de precios
var filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .LessThan(o => o.Total, 500m)
    .ToMongo();
```
