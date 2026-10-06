---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Couchbase** traduce un árbol de expresiones `ValiFlow<T>` en un fragmento de cláusula WHERE de N1QL (SQL++) de Couchbase, junto con un diccionario de parámetros con nombre.

<Drawio content={nosqlFlow} />

A diferencia de MongoDB, Elasticsearch o DynamoDB, el N1QL de Couchbase es texto parametrizado plano — el mismo enfoque que SQL. No existe un objeto de filtro "nativo" para construir (no hay `BsonDocument`, no hay `AttributeValue`): el resultado es simplemente un `string` más un `Dictionary<string, object?>` de parámetros con nombre (`$p0`, `$p1`, …).

El paquete depende únicamente de `Vali-Flow.NoSql`. **No tiene ninguna dependencia del SDK .NET de Couchbase** — es un constructor puro de texto/parámetros, sin preocupaciones de conexión ni de ejecución. Ejecutar la consulta resultante contra un cluster queda enteramente del lado del consumidor.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.Couchbase
```

`Vali-Flow.Core` se incluye como dependencia transitiva.

---

## Inicio rapido

```csharp
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.Couchbase.Extensions;
using Vali_Flow.NoSql.Couchbase.Models;

var filter = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 100m);

CouchbaseFilterExpression f = filter.ToCouchbase();

var query = $"SELECT * FROM `orders` WHERE {f.WhereClause}";

var options = new QueryOptions();
foreach (var (name, value) in f.Parameters)
    options.Parameter(name, value);

IQueryResult<Order> result = await cluster.QueryAsync<Order>(query, options);
```

---

## Más ejemplos

```csharp
// La lista IN se enlaza como un único parámetro array
var filter = new ValiFlow<Order>()
    .In(o => o.RegionCode, new[] { "US", "CA", "MX" })
    .ToCouchbase();
```
