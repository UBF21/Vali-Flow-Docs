---
title: Limitations
---

This package only produces `WhereClause` + `Parameters` — it does not build or run a `QueryDefinition`, open a `Container`, or page through a `FeedIterator`. That's entirely up to the consumer, unlike the Mongo/Elasticsearch/DynamoDB translators which target their SDK's native request/filter types more directly. There is also no dependency on the `Microsoft.Azure.Cosmos` SDK itself.

An empty list passed to `.In(...)` throws `InvalidOperationException` — Cosmos DB SQL does not accept an empty `IN (...)` list. Filter the empty case before building the query.

There's no enforced size limit on `In` lists (unlike DynamoDB's 100-value SDK limit), but very large lists still count against Cosmos DB's own query text length and complexity limits — keep lists reasonably small. Each `In` value gets its own placeholder (`IN (@p0, @p1, @p2, …)`), since Cosmos SQL does not accept a single array parameter for `IN`.

---
