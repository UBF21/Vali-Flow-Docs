---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Couchbase** translates a `ValiFlow<T>` expression tree into a Couchbase N1QL (SQL++) WHERE clause fragment together with a named-parameter dictionary.

<Drawio content={nosqlFlow} />

Unlike MongoDB, Elasticsearch, or DynamoDB, Couchbase's N1QL is plain parameterized text — the same approach as SQL. There is no "native" filter object to build (no `BsonDocument`, no `AttributeValue`), so the output is simply a `string` fragment plus a `Dictionary<string, object?>` of named parameters (`$p0`, `$p1`, …).

The package depends only on `Vali-Flow.NoSql`. **It has no dependency on the Couchbase .NET SDK** — it is a pure text/parameter builder with no connection or execution concerns. Running the resulting query against a cluster is entirely up to the consumer.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.Couchbase
```

`Vali-Flow.Core` is included as a transitive dependency.

---

## Quick Start

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

## More Examples

```csharp
// IN list binds as a single array parameter
var filter = new ValiFlow<Order>()
    .In(o => o.RegionCode, new[] { "US", "CA", "MX" })
    .ToCouchbase();
```
