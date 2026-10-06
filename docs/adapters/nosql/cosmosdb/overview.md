---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.CosmosDb** translates a `ValiFlow<T>` expression tree into an Azure Cosmos DB SQL API WHERE clause fragment (a `string`) together with the parameter dictionary required to bind it to a `QueryDefinition`.

<Drawio content={nosqlFlow} />

The package depends only on `Vali-Flow.NoSql` (the IR layer). Unlike the Mongo/Elasticsearch/DynamoDB translators, it has **no dependency on the `Microsoft.Azure.Cosmos` SDK** — it is a pure string/parameter builder with no connection or execution concerns. You wire the result into your own `QueryDefinition`.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.CosmosDb
```

`Vali-Flow.Core` is included as a transitive dependency. The `Microsoft.Azure.Cosmos` SDK is **not** a dependency — add it yourself to actually execute the query.

---

## Quick Start

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

## More Examples

```csharp
// Combine with ORDER BY / TOP — CosmosFilterExpression only produces the WHERE fragment
var queryText = $"SELECT TOP 20 * FROM c WHERE {f.WhereClause} ORDER BY c.CreatedAt DESC";
var query = new QueryDefinition(queryText);
foreach (var kv in f.Parameters)
    query = query.WithParameter(kv.Key, kv.Value);
```
