---
id: vali-flow-inmemory
title: Vali-Flow.InMemory
sidebar_label: Vali-Flow.InMemory
---

# Changelog — Vali-Flow.InMemory

All notable changes to this package are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.2.0] — 2026-10-06

### Added
- Optional `tag` parameter across read/write/grouped methods, wired to `ValiFlowDiagnostics` Activity tracing.

### Changed
- `ValiFlowEvaluator<T, TProperty>` (904 lines) split into `Bridge`/`Read`/`Write`/`Grouped` partial files — no public API change.

### Fixed
- `Update(entity, externalList)` could leak the updated entity into the internal store on a later bare `SaveChanges()` call.

---

## [1.1.5] — 2026-04-15

### Fixed

- Updated Vali-Flow.Core dependency to 2.0.2 which fixes IsNull/NotNull WHERE 0=1 bug with EF Core GlobalQueryFilter.

---

## [1.1.1]

### Changed

- `ValiFlowEvaluator<T, TProperty>` is now inheritable — removed `sealed` modifier to enable clean repository pattern

### Fixed

- Improved extensibility for repository implementations

---

## [1.0.0] — Initial release

### Added

- `ValiFlowEvaluator<T, TProperty>` — synchronous in-memory evaluator over `IEnumerable<T>`
- **Read methods**: `Evaluate`, `EvaluateAny`, `EvaluateCount`, `GetFirst`, `GetLast`, `EvaluateAll`, `EvaluateAllFailed`, `EvaluatePaged`, `EvaluatePagedResult`, `EvaluateTop`, `EvaluateDistinct`, `EvaluateDuplicates`, `GetFirstMatchIndex`, `GetLastMatchIndex`
- **Aggregate methods**: `EvaluateMin`, `EvaluateMax`, `EvaluateAverage`, `EvaluateSum`, `EvaluateAggregate`
- **Grouped methods**: `EvaluateGrouped`, `EvaluateCountByGroup`, `EvaluateSumByGroup`, `EvaluateMinByGroup`, `EvaluateMaxByGroup`, `EvaluateAverageByGroup`, `EvaluateDuplicatesByGroup`, `EvaluateUniquesByGroup`, `EvaluateTopByGroup`
- **Write methods**: `Add`, `Update`, `Delete`, `AddRange`, `UpdateRange`, `DeleteRange`, `Upsert`, `UpsertRange`, `DeleteByCondition`, `SaveChanges`
- `SetValiFlow` — replace the active filter at runtime without creating a new evaluator
- `InMemoryWriteStore<T>` — extracted write store for testability and SRP compliance
- Interfaces: `IInMemoryEvaluatorRead<T>`, `IInMemoryEvaluatorWrite<T>`, `IInMemoryQueryable<T>`, `IInMemoryGrouping<T>`, `IInMemoryAggregator<T>`, `IInMemoryEvaluatorCore<T>`
- `PagedResult<T>` — pagination result model
- XML documentation on all public types and members
