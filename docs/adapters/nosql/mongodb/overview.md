---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.MongoDB** translates a `ValiFlow<T>` expression tree into a MongoDB `BsonDocument` filter. The output is accepted natively wherever MongoDB expects a filter — `FilterDefinition<T>` has an implicit conversion from `BsonDocument`, so no explicit cast is needed.

<Drawio content={nosqlFlow} />

The package depends only on `MongoDB.Bson`, not the full `MongoDB.Driver`. It is a pure query builder with no connection or execution concerns.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.MongoDB
```

`Vali-Flow.Core` is included as a transitive dependency.

---

## Quick Start

```csharp
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.MongoDB.Extensions;

var filter = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .GreaterThan(x => x.Age, 18);

BsonDocument mongoFilter = filter.ToMongo();
var users = await collection.Find(mongoFilter).ToListAsync();
```

---

## More Examples

```csharp
// Range query
var filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .LessThan(o => o.Total, 500m)
    .ToMongo();
```
