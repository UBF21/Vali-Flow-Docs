---
id: vali-flow-nosql-cosmosdb
title: Vali-Flow.NoSql.CosmosDb
sidebar_label: CosmosDb
---

# Changelog — Vali-Flow.NoSql.CosmosDb

Todos los cambios notables de este paquete se documentan aquí.  
Formato: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versionado: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.1.0] — 2026-10-06

Bump de version como parte de la ola de release de adaptadores NoSQL de octubre 2026; sin cambios funcionales mas alla del lanzamiento inicial.

---

## [1.0.0] — Lanzamiento inicial

### Agregado

- `CosmosFilterExpression` — traduce nodos IR de Vali-Flow a un fragmento de cláusula WHERE de Azure Cosmos DB SQL API más un diccionario de parámetros, sin dependencia del SDK `Microsoft.Azure.Cosmos`
- Soporte para: igualdad, comparación, AND/OR/NOT, lista IN, CONTAINS/STARTSWITH/ENDSWITH (funciones nativas de Cosmos SQL), IS_NULL/NOT IS_NULL
- `ValiFlowCosmosDbExtensions.ToCosmosDb<T>()` — métodos de extensión sobre `ValiFlow<T>` y `Expression<Func<T, bool>>`
- Hook de conversor de valores personalizado para tipos de dominio no cubiertos por el mapeo de tipos CLR incorporado
- Documentación XML en todos los tipos y miembros públicos
