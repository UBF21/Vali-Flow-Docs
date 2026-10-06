---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Elasticsearch** traduce un árbol de expresiones `ValiFlow<T>` en un objeto `Query` de Elasticsearch (`Elastic.Clients.Elasticsearch.QueryDsl.Query`). La salida se conecta directamente a cualquier operación que acepte una consulta — `Search`, `Count`, `DeleteByQuery`, y más.

<Drawio content={nosqlFlow} />

El paquete depende únicamente de `Elastic.Clients.Elasticsearch` para los tipos de consulta. No tiene preocupaciones de conexión o ejecución.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.Elasticsearch
```

`Vali-Flow.Core` se incluye como dependencia transitiva.

---

## Inicio rapido

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

## Más ejemplos

```csharp
var query = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 100m)
    .ToElasticsearch();
```
