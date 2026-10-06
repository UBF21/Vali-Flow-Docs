---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.Couchbase.Extensions.ValiFlowCouchbaseExtensions`.

### `ToCouchbase<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en un `CouchbaseFilterExpression`.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, object?>?` | No | Hook para mapear tipos CLR no manejados por el switch incorporado. Se invoca **antes** de la conversión por defecto. Retorna `null` para caer en ella. |

Lanza `ArgumentNullException` si `flow` es `null`.

**Retorna:** `CouchbaseFilterExpression` — combina `WhereClause` con una sentencia N1QL completa y enlaza `Parameters`.

### `ToCouchbase<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age >= 21;
CouchbaseFilterExpression f = expr.ToCouchbase();
```

Lanza `ArgumentNullException` si `expression` es `null`.

---

## CouchbaseFilterExpression

`CouchbaseFilterExpression` es una clase sellada que encapsula los dos valores que necesita una consulta N1QL:

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `WhereClause` | `string` | El fragmento de cláusula WHERE, **sin** la palabra clave `WHERE` inicial, p.ej. `` "`Name` = $p0" ``. |
| `Parameters` | `IReadOnlyDictionary<string, object?>` | Parámetros N1QL con nombre (`$p0`, `$p1`, …) a enlazar en la consulta. |

El traductor genera marcadores secuenciales `$p0`, `$p1`, … para cada valor literal del filtro, sin importar el tipo de nodo (igualdad, comparación, patrón de `LIKE` o lista de `IN`).

---

## Operaciones soportadas

| Método ValiFlow | Nodo IR | Fragmento N1QL |
|----------------|---------|----------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `` `Field` = $p0 `` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `` `Field` <> $p0 `` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `` `Field` > $p0 `` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `` `Field` >= $p0 `` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `` `Field` < $p0 `` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `` `Field` <= $p0 `` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `` `Field` LIKE $p0 `` con `$p0 = "%txt%"` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `` `Field` LIKE $p0 `` con `$p0 = "pre%"` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `` `Field` LIKE $p0 `` con `$p0 = "%suf"` |
| `.In(x => x.Field, list)` | `InNode` | `` `Field` IN $p0 `` con `$p0` enlazado al **array completo** |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `` `Field` IS NULL `` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `` `Field` IS NOT NULL `` |
| `.And(a, b)` | `AndNode` | `(a AND b)` |
| `.Or(a, b)` | `OrNode` | `(a OR b)` |
| `.Not(inner)` | `NotNode` | `NOT (inner)` |

Los identificadores van entre backticks (`` `Field` ``) — la convención de quoting de N1QL/MySQL.

Fijate en la fila de `In`: a diferencia de DynamoDB (que expande a `#f0 IN (:v0, :v1, …)`), Couchbase enlaza **toda la lista como un único parámetro array** — `` `Field` IN $p0 `` con `Parameters["$p0"]` apuntando a un `List<object?>`. N1QL evalúa el `IN` directamente contra el array enlazado.

`EndsWith` está completamente soportado acá — a diferencia de DynamoDB, el `LIKE` de N1QL no tiene ninguna restricción sobre comodines al final.

---

## Mapeo de tipos

El switch de resolución de valores incorporado maneja estos tipos CLR:

| Tipo CLR | Valor de parámetro producido |
|----------|-------------------------------|
| `null` | `null` |
| `bool` | `b` (sin cambios) |
| `string` | `s` (sin cambios) |
| `int` | `i` (sin cambios) |
| `long` | `l` (sin cambios) |
| `double` | `d` (sin cambios) |
| `float` | `(double)f` |
| `decimal` | `m.ToString(CultureInfo.InvariantCulture)` — se enlaza como **string**, no como número nativo |
| `Guid` | `g.ToString()` |
| `Enum` | `Convert.ToInt64(e)` — el valor entero subyacente |
| cualquier otro | `v.ToString()` |

La conversión `decimal → string` es deliberada: los números de N1QL/JSON son doubles IEEE-754, que pierden precisión en valores con forma de dinero. Si tu esquema en Couchbase almacena el campo como un número N1QL nativo, castea en la consulta (`TONUMBER($p0)`) o pasá un `customConverter` que retorne el `decimal` crudo (serializable como número por el SDK).

---

## Conversor de valores personalizado

Usa `customConverter` cuando tus tipos de dominio no están en la tabla anterior, o cuando necesitas una representación de parámetro distinta a la por defecto.

El conversor se llama **antes** del switch incorporado. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: almacena Money como número nativo (solo el monto)
CouchbaseFilterExpression f = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, new Money(500m, "USD"))
    .ToCouchbase(value =>
    {
        if (value is Money m)
            return m.Amount; // se enlaza como decimal/número nativo, no como string
        return null;
    });
```

Almacenando un `DateTimeOffset` como cadena ISO-8601:

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

## Ejemplo avanzado

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
