---
title: Limitations
---

| Limitación | Detalle |
|-----------|---------|
| Sin dependencia del SDK de Couchbase | Este paquete solo construye `WhereClause` + `Parameters`. A diferencia de `.Mongo`, `.Elasticsearch` o `.DynamoDB` — que dependen de y retornan objetos de sus respectivos SDKs de proveedor —, `Vali-Flow.NoSql.Couchbase` no depende de nada específico de Couchbase. Vos sos responsable de conectar el resultado a una consulta real mediante el SDK oficial `CouchbaseNetClient` (o cualquier otro cliente capaz de ejecutar N1QL). |
| Lista `In` vacía | Lanza `InvalidOperationException`: *"IN condition with empty list is not supported in Couchbase N1QL expressions."* Filtrala antes de llamar a `.In(...)`. |
| `decimal` enlazado como string | Ver [Mapeo de tipos](./reference.md#mapeo-de-tipos). Pasá un `customConverter` si necesitás un parámetro numérico nativo. |
| Operadores de comparación | Solo están mapeados `GreaterThan`, `GreaterThanOrEqualTo`, `LessThan`, `LessThanOrEqualTo`. Cualquier otro `ComparisonOp` lanza `NotSupportedException`. |
| Cobertura de `LikeOp` | Solo están mapeados `Contains`, `StartsWith`, `EndsWith`. Cualquier otro `LikeOp` lanza `NotSupportedException`. |
