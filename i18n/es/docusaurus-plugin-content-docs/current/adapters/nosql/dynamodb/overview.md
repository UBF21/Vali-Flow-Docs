---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.DynamoDB** traduce un árbol de expresiones `ValiFlow<T>` en una cadena `FilterExpression` de DynamoDB junto con los diccionarios `ExpressionAttributeNames` y `ExpressionAttributeValues` requeridos por `ScanRequest` y `QueryRequest`.

<Drawio content={nosqlFlow} />

El paquete depende únicamente de `AWSSDK.DynamoDBv2`. Es un constructor de consultas puro sin preocupaciones de conexión o ejecución.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.DynamoDB
```

`Vali-Flow.Core` se incluye como dependencia transitiva.

---

## Inicio rapido

```csharp
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.DynamoDB.Extensions;
using Vali_Flow.NoSql.DynamoDB.Models;

var filter = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 100m);

DynamoFilterExpression f = filter.ToDynamoDB();

var request = new ScanRequest
{
    TableName                 = "Orders",
    FilterExpression          = f.FilterExpression,
    ExpressionAttributeNames  = f.ExpressionAttributeNames.ToDictionary(),
    ExpressionAttributeValues = f.ExpressionAttributeValues.ToDictionary()
};

ScanResponse response = await client.ScanAsync(request);
```

---

## Más ejemplos

```csharp
var filter = new ValiFlow<User>()
    .IsNotNullOrEmpty(x => x.Email)
    .ToDynamoDB();
```
