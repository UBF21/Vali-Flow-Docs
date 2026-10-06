---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Redis** translates a `ValiFlow<T>` expression tree into a RediSearch query string. The output is passed directly to `db.FT().Search(indexName, new Query(result))`.

<Drawio content={nosqlFlow} />

The package depends only on `NRedisStack` for the query type. It is a pure query builder with no connection or execution concerns.

> NRedisStack 1.3.0 and later automatically appends `DIALECT 2` to search commands. DIALECT 2 is required for quoted tag values (used by string equality and IN queries). If you use an older version of NRedisStack, append `DIALECT 2` manually.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.Redis
```

`Vali-Flow.Core` is included as a transitive dependency.

---

## Quick Start

```csharp
using NRedisStack;
using NRedisStack.Search;
using StackExchange.Redis;
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.Redis.Extensions;

var filter = new ValiFlow<Product>()
    .EqualTo(x => x.IsActive, true)
    .GreaterThan(x => x.Price, 50m);

string query = filter.ToRedisSearch();
// query → "(@IsActive:[1 1] @Price:[(50 +inf])"

IDatabase db = redis.GetDatabase();
SearchResult results = db.FT().Search("idx:products", new Query(query));
```

---

## More Examples

```csharp
var query = new ValiFlow<User>()
    .EqualTo(x => x.Role, "Admin")
    .ToRedisSearch();
```
