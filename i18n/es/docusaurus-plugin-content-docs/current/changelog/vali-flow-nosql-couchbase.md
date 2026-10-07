---
id: vali-flow-nosql-couchbase
title: Vali-Flow.NoSql.Couchbase
sidebar_label: Couchbase
---

# Changelog — Vali-Flow.NoSql.Couchbase

Todos los cambios notables de este paquete se documentan aquí.  
Formato: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versionado: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.1.0] — 2026-10-06

### Corregido
- Los valores `decimal` se vinculaban como literales string de N1QL en vez de numeros nativos.

---

## [1.0.0] — Lanzamiento inicial

### Agregado

- `CouchbaseFilterExpression` — clase sellada que expone `WhereClause` (string, sin `WHERE` inicial) y `Parameters` (`IReadOnlyDictionary<string, object?>`, nombrados `$p0`, `$p1`, …)
- `ValiFlowCouchbaseExtensions.ToCouchbase<T>()` — método de extensión sobre `ValiFlow<T>` y sobre una `Expression<Func<T, bool>>` ya construida
- Soporte para: igualdad, comparación (`GreaterThan`/`GreaterThanOrEqualTo`/`LessThan`/`LessThanOrEqualTo`), AND/OR/NOT, IN (enlazado como un único parámetro array), LIKE (`Contains`/`StartsWith`/`EndsWith`), verificaciones de nulos
- Hook `customConverter` para mapear tipos CLR no manejados por el switch de resolución de valores incorporado
- Sin dependencia del SDK .NET de Couchbase — constructor puro de texto/parámetros N1QL, sin preocupaciones de conexión ni ejecución
