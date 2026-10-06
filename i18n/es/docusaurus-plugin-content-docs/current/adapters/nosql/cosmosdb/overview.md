---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.CosmosDb** traduce un árbol de expresiones `ValiFlow<T>` en un fragmento de cláusula WHERE de Azure Cosmos DB SQL API (un `string`) junto con el diccionario de parámetros necesario para vincularlo a un `QueryDefinition`.

<Drawio content={nosqlFlow} />

El paquete depende únicamente de `Vali-Flow.NoSql` (la capa de IR). A diferencia de los traductores de Mongo/Elasticsearch/DynamoDB, **no depende del SDK `Microsoft.Azure.Cosmos`** — es un constructor puro de string/parámetros, sin conexión ni preocupaciones de ejecución. El resultado se integra en tu propio `QueryDefinition`.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.CosmosDb
```

`Vali-Flow.Core` se incluye como dependencia transitiva. El SDK `Microsoft.Azure.Cosmos` **no** es una dependencia — agrégalo tú mismo para ejecutar la consulta.

---

## Inicio rapido

```csharp
using Microsoft.Azure.Cosmos;
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.CosmosDb.Extensions;
using Vali_Flow.NoSql.CosmosDb.Models;

var filter = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 100m);

CosmosFilterExpression f = filter.ToCosmosDb();

var queryText = $"SELECT * FROM c WHERE {f.WhereClause}";
var query = new QueryDefinition(queryText);
foreach (var kv in f.Parameters)
    query = query.WithParameter(kv.Key, kv.Value);

using FeedIterator<Order> iterator = container.GetItemQueryIterator<Order>(query);
while (iterator.HasMoreResults)
{
    FeedResponse<Order> response = await iterator.ReadNextAsync();
    foreach (Order order in response) { /* ... */ }
}
```

---

## Más ejemplos

```csharp
// Combinar con ORDER BY / TOP — CosmosFilterExpression solo produce el fragmento WHERE
var queryText = $"SELECT TOP 20 * FROM c WHERE {f.WhereClause} ORDER BY c.CreatedAt DESC";
var query = new QueryDefinition(queryText);
foreach (var kv in f.Parameters)
    query = query.WithParameter(kv.Key, kv.Value);
```
