---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.CosmosDb.Extensions.ValiFlowCosmosDbExtensions`.

### `ToCosmosDb<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en un `CosmosFilterExpression`.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, object?>?` | No | Hook para mapear tipos CLR no manejados por el switch incorporado hacia el valor crudo guardado en el diccionario de parámetros. Retorna `null` para caer al conversor por defecto. |

**Retorna:** `CosmosFilterExpression` — agrega `WhereClause` a tu texto de consulta y vincula `Parameters` a un `QueryDefinition`.

### `ToCosmosDb<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
CosmosFilterExpression f = expr.ToCosmosDb();
```

---

## CosmosFilterExpression

`CosmosFilterExpression` es una clase sellada que encapsula los dos valores que necesita una consulta Cosmos SQL:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `WhereClause` | `string` | El fragmento de cláusula WHERE, **sin** la palabra clave `WHERE` al inicio, p.ej. `"c.Age > @p0"`. |
| `Parameters` | `IReadOnlyDictionary<string, object?>` | Mapea marcadores de posición (`@p0`, `@p1`, …) a sus valores crudos. |

Las referencias a campos usan el alias estándar de contenedor de Cosmos SQL `c` (p.ej. `c.Status`), por lo que no existe una capa de marcadores de nombre de atributo como los `#f0` de DynamoDB — solo se generan marcadores de valor.

`Parameters` se usa directamente con `QueryDefinition.WithParameter(name, value)` dentro de un `foreach` — no se necesita llamar a `.ToDictionary()`, ya que `WithParameter` del SDK recibe un par clave/valor a la vez en lugar de un diccionario completo como argumento del constructor.

---

## Operaciones soportadas

| Método ValiFlow | Nodo IR | Fragmento Cosmos SQL |
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

Los tres operadores `LikeNode` se mapean a funciones **nativas** de Cosmos SQL — a diferencia de DynamoDB, Cosmos soporta `ENDSWITH` directamente, así que no hace falta fallback del lado del cliente para ese caso. `IS_NULL` también es nativo — es una verificación real de nulo sobre el documento JSON, no una verificación de existencia de atributo.

---

## Mapeo de tipos

El switch de conversión incorporado maneja estos tipos CLR:

| Tipo CLR | Valor de parámetro producido |
|----------|-------------------------------|
| `null` | `null` |
| `bool` | `b` (tal cual) |
| `string` | `s` (tal cual) |
| `int` | `i` (tal cual) |
| `long` | `l` (tal cual) |
| `double` | `d` (tal cual) |
| `float` | `f` (tal cual) |
| `decimal` | `m` (tal cual) |
| `Guid` | `g.ToString()` |
| `Enum` | valor subyacente como `long` (InvariantCulture) |
| cualquier otro | `v.ToString()` |

A diferencia del wrapper `AttributeValue` de DynamoDB, los parámetros de Cosmos son valores CLR planos — `QueryDefinition.WithParameter` los acepta directamente y la API SQL de Cosmos maneja el tipado nativo de JSON (números, strings, booleanos) por su cuenta.

---

## Conversor de valores personalizado

Usa `customConverter` cuando tus tipos de dominio no están en la tabla anterior o cuando necesitas un valor crudo distinto al que produce el conversor por defecto.

El conversor se llama **antes** del switch incorporado. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: almacena Money como número (solo el monto)
CosmosFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToCosmosDb(value =>
    {
        if (value is Money m)
            return m.Amount;
        return null;
    });
```

Almacenando un `DateTimeOffset` como cadena ISO-8601:

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

Un filtro realista que combina igualdad, rango, membresía y verificaciones de nulos, aplicado a través del SDK `Microsoft.Azure.Cosmos`:

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

Manejando el caso de lista `In` vacía (Cosmos SQL no acepta un `IN (...)` vacío):

```csharp
var regionCodes = GetRegionCodesFromRequest(); // puede venir vacía

var builder = new ValiFlow<Order>().EqualTo(x => x.Status, "Active");

if (regionCodes.Count > 0)
    builder = builder.And(builder, new ValiFlow<Order>().In(x => x.RegionCode, regionCodes));

CosmosFilterExpression f = builder.ToCosmosDb(); // seguro — In() solo se llama cuando la lista no está vacía
```
