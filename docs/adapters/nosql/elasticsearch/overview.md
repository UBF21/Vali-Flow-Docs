---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Elasticsearch** translates a `ValiFlow<T>` expression tree into an Elasticsearch `Query` object (`Elastic.Clients.Elasticsearch.QueryDsl.Query`). The output plugs directly into any operation that accepts a query — `Search`, `Count`, `DeleteByQuery`, and more.

<Drawio content={nosqlFlow} />

The package depends only on `Elastic.Clients.Elasticsearch` for query types. It has no connection or execution concerns.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.Elasticsearch
```

`Vali-Flow.Core` is included as a transitive dependency.

---

## Quick Start

```csharp
using Elastic.Clients.Elasticsearch;
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.Elasticsearch.Extensions;

var filter = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .GreaterThan(x => x.Age, 18);

Query esFilter = filter.ToElasticsearch();
var results = await client.SearchAsync<User>(s => s.Query(esFilter));
```

---

## More Examples

```csharp
var query = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 100m)
    .ToElasticsearch();
```
