---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.DynamoDB** translates a `ValiFlow<T>` expression tree into a DynamoDB `FilterExpression` string together with the `ExpressionAttributeNames` and `ExpressionAttributeValues` dictionaries required by `ScanRequest` and `QueryRequest`.

<Drawio content={nosqlFlow} />

The package depends only on `AWSSDK.DynamoDBv2`. It is a pure query builder with no connection or execution concerns.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.DynamoDB
```

`Vali-Flow.Core` is included as a transitive dependency.

---

## Quick Start

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

## More Examples

```csharp
var filter = new ValiFlow<User>()
    .IsNotNullOrEmpty(x => x.Email)
    .ToDynamoDB();
```
