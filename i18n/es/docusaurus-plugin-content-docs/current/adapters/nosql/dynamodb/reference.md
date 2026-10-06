---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.DynamoDB.Extensions.ValiFlowDynamoExtensions`.

### `ToDynamoDB<T>(this ValiFlow<T> flow, Func<object?, AttributeValue?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en un `DynamoFilterExpression`.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, AttributeValue?>?` | No | Hook para mapear tipos CLR no manejados por el switch incorporado. Retornar `null` para caer al conversor por defecto. |

**Retorna:** `DynamoFilterExpression` — aplícalo a `ScanRequest` o `QueryRequest`.

### `ToDynamoDB<T>(this Expression<Func<T, bool>> expression, Func<object?, AttributeValue?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
DynamoFilterExpression f = expr.ToDynamoDB();
```


## DynamoFilterExpression

`DynamoFilterExpression` es una clase sellada que encapsula los tres valores que DynamoDB necesita:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `FilterExpression` | `string` | La cadena de expresión, p.ej. `"(#f0 = :v0 AND #f1 > :v1)"`. |
| `ExpressionAttributeNames` | `IReadOnlyDictionary<string, string>` | Mapea marcadores de posición (`#f0`, `#f1`, …) a nombres de atributo reales. |
| `ExpressionAttributeValues` | `IReadOnlyDictionary<string, AttributeValue>` | Mapea marcadores de posición (`:v0`, `:v1`, …) a instancias de `AttributeValue`. |

El traductor genera marcadores secuenciales (`#f0`, `#f1`, … para nombres; `:v0`, `:v1`, … para valores) para evitar colisiones y eludir conflictos con palabras reservadas de DynamoDB.

`IReadOnlyDictionary<K,V>` no implementa `IDictionary<K,V>` directamente. Llama a `.ToDictionary()` cuando el SDK requiere `Dictionary<string, string>` o `Dictionary<string, AttributeValue>`.


## Operaciones soportadas

| Método ValiFlow | Nodo IR | FilterExpression DynamoDB |
|----------------|---------|---------------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `#f0 = :v0` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `#f0 <> :v0` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `#f0 > :v0` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `#f0 >= :v0` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `#f0 < :v0` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `#f0 <= :v0` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `contains(#f0, :v0)` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `begins_with(#f0, :v0)` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | lanza `NotSupportedException` |
| `.In(x => x.Field, list)` | `InNode` | `#f0 IN (:v0, :v1, …)` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `attribute_not_exists(#f0)` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `attribute_exists(#f0)` |
| `.And(a, b)` | `AndNode` | `(a AND b)` |
| `.Or(a, b)` | `OrNode` | `(a OR b)` |
| `.Not(inner)` | `NotNode` | `NOT (inner)` |


## Mapeo de tipos

El switch `ToAttributeValue` incorporado maneja estos tipos CLR:

| Tipo CLR | `AttributeValue` producido |
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
| cualquier otro | `{ S = v.ToString() }` |


## Conversor de valores personalizado

Usa `customConverter` cuando tus tipos de dominio no están en la tabla anterior o cuando necesitas una representación `AttributeValue` diferente a la por defecto.

El conversor se llama **antes** del switch incorporado. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: almacena Money como número (solo el monto)
DynamoFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToDynamoDB(value =>
    {
        if (value is Money m)
            return new AttributeValue { N = m.Amount.ToString(CultureInfo.InvariantCulture) };
        return null;
    });
```

Almacenando un `DateTimeOffset` como cadena ISO-8601 en DynamoDB:

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

## Ejemplo avanzado

```csharp
var filter = new ValiFlow<User>()
    .IsNotNullOrEmpty(x => x.Email)
    .ToDynamoDB();
```
