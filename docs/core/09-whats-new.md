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

- **VF001 analyzer false positive**: `EqualToIgnoreCase`, `IsTrimmed`,
  `IsLowerCase`, and `IsUpperCase` were incorrectly flagged as non-EF-safe —
  each has its own EF Core-translatable reimplementation and has been
  EF-safe since v1.7.0. See the
  [EF Core safety guide](architecture/06-ef-core-safety.md) for the full list.
- **`NotNull<TValue>()` / `Null<TValue>()`**: no longer throw when `TValue`
  closes over a non-nullable value type (`int`, `DateTime`, `bool`, `Guid`,
  `decimal`, any `enum`) — the condition is now built as a trivially
  true/false expression instead of attempting an inapplicable null check.
- **`BaseExpression.Add<TValue>()`**: selector body is now cloned before
  parameter substitution, preventing node-aliasing when a predicate
  references its parameter more than once.

### Added
- `EfCoreRelationalTranslationTests`: regression tests that verify
  `ValiFlowQuery<T>`'s EF-Core-safe methods actually translate against a
  real relational provider (SQLite), not just `UseInMemoryDatabase`.
- **`VFGEN001`/`VFGEN002` generator diagnostics**: compile-time warnings when
  a `[ForwardInterface]`-marked field is misconfigured. See the
  [source generator guide](architecture/05-source-generator.md#diagnostics-vfgen001-and-vfgen002).
- **CI/CD pipeline**: GitHub Actions build + test matrix (Windows/Linux ×
  .NET 8/9) with a coverage gate, plus a manual-dispatch Release workflow
  for NuGet publishing.

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
