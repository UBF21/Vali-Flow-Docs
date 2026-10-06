---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.MongoDB** traduce un árbol de expresiones `ValiFlow<T>` en un filtro MongoDB `BsonDocument`. La salida se acepta nativamente en cualquier lugar donde MongoDB espera un filtro — `FilterDefinition<T>` tiene una conversión implícita desde `BsonDocument`, por lo que no se necesita un cast explícito.

<Drawio content={nosqlFlow} />

El paquete depende únicamente de `MongoDB.Bson`, no del driver completo `MongoDB.Driver`. Es un constructor de consultas puro sin preocupaciones de conexión o ejecución.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.MongoDB
```

`Vali-Flow.Core` se incluye como dependencia transitiva.

---

## Inicio rapido

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

## Más ejemplos

```csharp
// Rango de precios
var filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .LessThan(o => o.Total, 500m)
    .ToMongo();
```
