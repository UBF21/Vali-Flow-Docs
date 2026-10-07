---
id: vali-flow-nosql-firestore
title: Vali-Flow.NoSql.Firestore
sidebar_label: Firestore
---

# Changelog — Vali-Flow.NoSql.Firestore

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

- `FirestoreFilterTranslator` — traduce nodos IR de Vali-Flow a un `Google.Cloud.Firestore.Filter` nativo (Google.Cloud.Firestore 4.4.0)
- `ValiFlowFirestoreExtensions.ToFirestore<T>()` — métodos de extensión sobre `ValiFlow<T>` y `Expression<Func<T, bool>>`
- Soporte para: igualdad, comparación, IN, chequeos de null, AND/OR
- Mapeo de tipos CLR incorporado con hook de conversor personalizado
- Documentación XML en todos los tipos y miembros públicos

### Limitaciones conocidas

- `Contains`/`StartsWith`/`EndsWith` lanzan `NotSupportedException` — no hay operador de pattern-matching en Firestore
- `.Not(inner)` lanza `NotSupportedException` — el SDK no expone negación genérica de filtros
- `.In(...)` negado todavía no es alcanzable
