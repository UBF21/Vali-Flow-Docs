---
id: vali-flow-nosql-redis
title: Vali-Flow.NoSql.Redis
sidebar_label: Redis
---

# Changelog — Vali-Flow.NoSql.Redis

All notable changes to this package are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.2.0] — 2026-10-06

### Added
- `ValiFlowDiagnostics` Activity tracing wrapped around `Translate(...)`.

### Fixed
- **Security — RediSearch query injection**: query-syntax special characters (e.g. `)`/`|`) in `LIKE`-translated patterns weren't escaped before wrapping in wildcards, allowing query-structure injection. Now escaped first.
- `customConverter` wasn't applied in `VisitComparison`/numeric `VisitIn`, silently ignoring custom type mappings for comparison and `IN` conditions.

---

## [1.0.0] — Initial release

### Added

- `RedisSearchFilterTranslator` — translates Vali-Flow IR nodes into RediSearch query strings
- Support for: numeric range filters (`@field:[min max]`), text search (`@field:value`), tag filters (`@field:{value}`), AND/OR/NOT logic, IN list as tag union
- Automatic type routing: numeric types → range query, strings → text/tag query, enums → tag query by name, Guids → tag query
- `ValiFlowRedisSearchExtensions.ToRedisQuery<T>()` — extension method on `ValiFlow<T>`
- XML documentation on all public types and members
