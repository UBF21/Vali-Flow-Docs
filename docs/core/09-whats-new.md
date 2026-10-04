---
sidebar_position: 9
---

# What's New

## v2.0.3

### Fixed
- **`IsLastDayOfMonth()`** on `DateTimeExpressionQuery`, `DateTimeOffsetExpressionQuery`,
  and `DateOnlyExpressionQuery` built `DateTime.DaysInMonth(...)`, which no
  EF Core relational provider (SQL Server, PostgreSQL, SQLite, MySQL) can
  translate to SQL — any call inside `IQueryable` threw
  `InvalidOperationException`. Replaced with a provider-agnostic
  `Year`/`Month`/`Day` integer formula, translatable on every relational
  provider. Verified against real SQLite and PostgreSQL. See the
  [case study](architecture/06-ef-core-safety.md#case-study-islastdayofmonth-and-the-ef-core-safe-contract)
  for the full writeup.

### Added
- `EfCoreRelationalTranslationTests`: regression tests that verify
  `ValiFlowQuery<T>`'s EF-Core-safe methods actually translate against a
  real relational provider (SQLite), not just `UseInMemoryDatabase`.

## v2.0.2

### Fixed
- `ComparisonExpression.Null()`/`NotNull()`: fixed a `WHERE 0=1` bug when
  used together with EF Core `GlobalQueryFilter`.

## v2.0.1

### Infrastructure
- New companion packages: `Vali-Flow.Core.Analyzers` and
  `Vali-Flow.Core.Generator`, both requiring `Vali-Flow.Core >= 2.0.0`.

---

See the full [CHANGELOG.md](https://github.com/UBF21/Vali-Flow.Core/blob/main/CHANGELOG.md)
on GitHub for the complete version history, including v1.x and v2.0.0.
