---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Redis** traduce un árbol de expresiones `ValiFlow<T>` en una cadena de consulta RediSearch. La salida se pasa directamente a `db.FT().Search(indexName, new Query(result))`.

<Drawio content={nosqlFlow} />

El paquete depende únicamente de `NRedisStack` para el tipo de consulta. Es un constructor de consultas puro sin preocupaciones de conexión o ejecución.

> NRedisStack 1.3.0 y posteriores agregan automáticamente `DIALECT 2` a los comandos de búsqueda. DIALECT 2 es necesario para valores de tag con comillas (usado por igualdad de cadenas y consultas IN). Si usas una versión anterior de NRedisStack, agrega `DIALECT 2` manualmente.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.Redis
```

`Vali-Flow.Core` se incluye como dependencia transitiva.

---

## Inicio rapido

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

## Más ejemplos

```csharp
var query = new ValiFlow<User>()
    .EqualTo(x => x.Role, "Admin")
    .ToRedisSearch();
```
