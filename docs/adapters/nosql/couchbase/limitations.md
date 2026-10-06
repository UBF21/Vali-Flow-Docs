---
title: Limitations
---

| Limitation | Detail |
|-----------|--------|
| No Couchbase SDK dependency | This package only builds `WhereClause` + `Parameters`. Unlike `.Mongo`, `.Elasticsearch`, or `.DynamoDB` — which depend on and return objects from their respective provider SDKs — `Vali-Flow.NoSql.Couchbase` depends on nothing Couchbase-specific. You are responsible for wiring the result into a real query via the official `CouchbaseNetClient` SDK (or any other client capable of running N1QL). |
| Empty `In` list | Throws `InvalidOperationException`: *"IN condition with empty list is not supported in Couchbase N1QL expressions."* Filter the empty case out before calling `.In(...)`. |
| `decimal` bound as string | See [Type Mapping](./reference.md#type-mapping). Supply a `customConverter` if you need a native numeric parameter. |
| Comparison operators | Only `GreaterThan`, `GreaterThanOrEqualTo`, `LessThan`, `LessThanOrEqualTo` are mapped. Any other `ComparisonOp` throws `NotSupportedException`. |
| `LikeOp` coverage | Only `Contains`, `StartsWith`, `EndsWith` are mapped. Any other `LikeOp` throws `NotSupportedException`. |
