---
id: vali-flow-nosql-firestore
title: Vali-Flow.NoSql.Firestore
sidebar_label: Firestore
---

# Changelog — Vali-Flow.NoSql.Firestore

All notable changes to this package are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.1.0] — 2026-10-06

Version bump as part of the October 2026 NoSQL adapters release wave; no functional changes beyond the initial release.

---

## [1.0.0] — Initial release

### Added

- `FirestoreFilterTranslator` — translates Vali-Flow IR nodes into a native `Google.Cloud.Firestore.Filter` (Google.Cloud.Firestore 4.4.0)
- `ValiFlowFirestoreExtensions.ToFirestore<T>()` — extension methods on `ValiFlow<T>` and on `Expression<Func<T, bool>>`
- Support for: equality, comparison, IN, null checks, AND/OR
- Built-in CLR type mapping with `customConverter` override hook
- XML documentation on all public types and members

### Known limitations

- `Contains`/`StartsWith`/`EndsWith` throw `NotSupportedException` — no pattern-matching query operator
- `.Not(inner)` throws `NotSupportedException` — no generic filter negation in the SDK
- Negated `.In(...)` not yet reachable
