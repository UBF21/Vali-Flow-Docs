---
title: Limitations
---

Este paquete solo produce `WhereClause` + `Parameters` — no construye ni ejecuta un `QueryDefinition`, no abre un `Container`, ni recorre un `FeedIterator`. Eso queda enteramente a cargo del consumidor, a diferencia de los traductores de Mongo/Elasticsearch/DynamoDB que apuntan más directamente a los tipos nativos de request/filtro de su SDK. Tampoco hay dependencia del propio SDK `Microsoft.Azure.Cosmos`.

Una lista vacía pasada a `.In(...)` lanza `InvalidOperationException` — Cosmos DB SQL no acepta una lista `IN (...)` vacía. Filtra el caso vacío antes de construir la consulta.

No hay un límite de tamaño impuesto en las listas `In` (a diferencia del límite de 100 valores del SDK de DynamoDB), pero listas muy grandes igual cuentan contra los límites propios de Cosmos DB de longitud y complejidad de la consulta — mantén las listas en un tamaño razonable. Cada valor de `In` recibe su propio marcador (`IN (@p0, @p1, @p2, …)`), ya que Cosmos SQL no acepta un único parámetro de tipo array para `IN`.

---
