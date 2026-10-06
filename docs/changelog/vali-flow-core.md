---
id: vali-flow-core
title: Vali-Flow.Core
sidebar_label: Vali-Flow.Core
---

# Changelog — Vali-Flow.Core

All notable changes to this package are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [2.0.2] — 2026-04-15

### Fixed

- **`ComparisonExpression.Null()` and `NotNull()`**: Fixed WHERE 0=1 bug when used with EF Core `GlobalQueryFilter`. Now uses `Expression.Equal()` / `Expression.NotEqual()` instead of C# operators to ensure consistent expression tree structure for SQL translation.

### Added

- **EfCoreIsNullIntegrationTests**: 6 integration tests verifying `IsNull()` and `NotNull()` work correctly with EF Core GlobalQueryFilter.

---

## [2.0.0] — 2026-04-05

### Architecture

- **Source generator** (`Vali-Flow.Core.Generator`): Roslyn `IIncrementalGenerator` that reads `[ForwardInterface]`-marked fields in `partial` classes and emits a sibling `.g.cs` file with one forwarding method per interface member. Traverses the full interface inheritance hierarchy and generates explicit interface implementations when two interfaces declare conflicting signatures. Eliminates ~468 manually-maintained delegation methods from `ValiFlow<T>` and `ValiFlowQuery<T>`.
- **`ValiFlow<T>` and `ValiFlowQuery<T>`** reduced from ~893 / ~808 lines to ~110 lines each — now thin `partial` facades; all method bodies live in their respective `*Expression` / `*ExpressionQuery` classes.
- **9 query-specific interfaces** added (`IBooleanExpressionQuery`, `IStringExpressionQuery`, `ICollectionExpressionQuery`, `INumericExpressionQuery`, `IDateTimeExpressionQuery`, `IDateTimeOffsetExpressionQuery`, `IDateOnlyExpressionQuery`, `ITimeOnlyExpressionQuery`) — complete the interface hierarchy for the EF Core-safe variant.
- **`BaseExpression.ValidateNested` DIP fix**: extracted `protected virtual CreateNestedBuilder<TProperty>()` factory method — decouples `BaseExpression` from the concrete `ValiFlow<T>` type.

### Infrastructure

- **`Vali-Flow.Core.Analyzers`**: Roslyn diagnostic analyzer (`ValiFlowNonEfMethodAnalyzer`) that reports `VFCORE001` when a method not supported by EF Core providers is called on a `ValiFlowQuery<T>` instance inside an `IQueryable<T>` expression context.
- **Bilingual technical documentation** added under `docs/` (Spanish + English): architecture overview, builder lifecycle, expression tree internals, EF Core compatibility guide, source generator guide, and full API reference.

### Breaking Changes

- **Removed deprecated methods**: `BeforeDate`, `AfterDate` (use `IsBefore`/`IsAfter`), `CountEquals` (use `Count`).
- **`IStringExpression<TBuilder,T>`** now inherits from 4 focused sub-interfaces:
  - `IStringLengthExpression` — MinLength, MaxLength, ExactLength, LengthBetween
  - `IStringContentExpression` — StartsWith, EndsWith, Contains, EqualToIgnoreCase, IsOneOf
  - `IStringStateExpression` — IsNullOrEmpty, IsNullOrWhiteSpace, IsTrimmed, IsLowerCase, IsUpperCase, HasOnlyDigits, HasOnlyLetters, HasLettersAndNumbers, HasSpecialCharacters
  - `IStringFormatExpression` — IsEmail, IsUrl, IsGuid, IsJson, IsBase64, RegexMatch, MatchesWildcard, IsCreditCard, IsIPv4, IsIPv6, IsHexColor, IsSlug
- **`ValidationResult.ErrorsAbove()`** renamed to `ErrorsAtOrAbove()` — the method uses `>=` semantics.
- **`ValidationResult.ErrorsAtOrAbove()`** now returns `.AsReadOnly()`.
- **`BaseExpression.CreateNestedBuilder<TProperty>()`** changed from `abstract` to `virtual` with default `new ValiFlow<TProperty>()`.
- **`BuildCached()` no longer allows post-call mutation** — throws `InvalidOperationException` (introduced in 1.6.0, now documented as stable contract).

### Performance

- `ConditionEntry<T>` compiles predicates lazily via `Lazy<Func<T,bool>>` — thread-safe without explicit locking.
- `Validate()` short-circuits OR groups: returns `Ok()` as soon as one group passes.
- `ValidateResult.Warnings` and `CriticalErrors` changed from eager `List<T>` to `Lazy<IReadOnlyList<T>>`.
- `StringExpression._regexCache` moved to non-generic `StringExpressionCache` — the 1,000-entry cap applies globally.
- `BuildWithGlobal()` caches the result of `Build()` internally.
- `CollectionExpression._enumerableCountMethod` now `static readonly`.

### Migration Guide

| v1.x | v2.0 |
|---|---|
| `BeforeDate(selector, date)` | `IsBefore(selector, date)` |
| `AfterDate(selector, date)` | `IsAfter(selector, date)` |
| `CountEquals(selector, n)` | `Count(selector, n)` |

---

## [1.7.0] — 2026-04-04

### Architecture

- **ValiFlowQuery\<T\> God Class eliminated**: reduced from 2,329 lines to ~530 lines by extracting all method bodies into 9 domain-specific composition classes. `ValiFlowQuery<T>` is now a thin wrapper identical in structure to `ValiFlow<T>`. Public API unchanged.
- Deleted `Constant.cs` and `Util.cs` (dead code).
- Consolidated `ExpressionDeepCloner` into `ForceCloneVisitor`.

### New Features — ValiFlowQuery\<T\> (EF Core-safe)

**String**
- `IsTrimmed`, `IsLowerCase`, `IsUpperCase`, `EqualToIgnoreCase`
- `StartsWithIgnoreCase`, `EndsWithIgnoreCase`, `ContainsIgnoreCase`
- `NotContains`, `NotStartsWith`, `NotEndsWith`

**Numeric (int and long)**
- `IsEven`, `IsOdd`, `IsMultipleOf(n)` — translatable via modulo

**DateTime / DateTimeOffset / DateOnly**
- `IsWeekend` / `IsWeekday` / `IsDayOfWeek`
- `IsToday` / `IsYesterday` / `IsTomorrow`
- `InLastDays(n)` / `InNextDays(n)` — sliding UTC windows captured at build time
- `IsFirstDayOfMonth` / `IsLastDayOfMonth` / `IsInQuarter(q)`

### Bug Fixes

- `ComparisonExpression.EqualTo` / `NotEqualTo`: removed incorrect null guard — fixes nullable value type comparisons.
- `StringExpression`: replaced private `ReplaceParamVisitor` with canonical `ParameterReplacer`.

### Test Coverage

- xUnit test project added with **961 tests** (net9.0). All pass.

---

## [1.6.1] — 2026-03-28

### New Features

- `BaseExpression<TBuilder,T>`: **`Clone()`** — creates a new, independent builder pre-populated with all conditions from the source. The clone starts unfrozen regardless of source freeze state. Added to `IExpression<TBuilder,T>` interface.

### Test Coverage

- Added 3 new Clone tests. Total: **790 tests**.

---

## [1.6.0] — 2026-03-28

### New Features

- **Freeze pattern**: builder is permanently sealed on first call to `BuildCached()`, `IsValid()`, `IsNotValid()`, or `Validate()`. Mutation after freeze throws `InvalidOperationException`.
- `BaseExpression<TBuilder,T>`: new public `Freeze()` method for explicit sealing at DI/startup phase.
- `IExpression<TBuilder,T>`: `Freeze()` added to the public interface.

### Breaking Change

- **`BuildCached()` no longer allows post-call mutation.** If you need different conditions, create a new instance.

### Bug Fix

- Eliminated silent data-corruption when a shared builder was mutated after use.

### Test Coverage

- Added 7 new freeze tests. Total: **787 tests**.

---

## [1.5.0] — 2026-03-28

### Documentation

- ValiFlowQuery: XML docs added to all previously undocumented numeric, DateTime, DateTimeOffset, DateOnly, and TimeOnly methods.

### Test Coverage

- Total: **782 tests** (unchanged).

---

## [1.4.9] — 2026-03-28

### Bug Fixes

- `NumericExpression` nullable overloads: added missing selector null guard.
- `NumericExpression` nullable `InRange`: selector null guard now runs before max \< min validation.

### New Features

- Full nullable comparison parity for `double?`, `float?`, `short?` — GreaterThan, LessThan, InRange.
- `ValiFlowQuery`: added `FutureDate(DateTimeOffset)` and `PastDate(DateTimeOffset)`.

### Test Coverage

- Total: **782 tests**.

---

## [1.4.8] — 2026-03-28

### Bug Fixes

- `NumericExpression` scalar InRange (all 6 typed overloads): selector null guard now runs before max \< min validation.
- `NumericExpression` 50+ scalar overloads: explicit selector null guard added for consistent API contract.
- `ValiFlowQuery` StartsWith, EndsWith, Contains: selector null guard added.

### New Features

- `ValiFlowQuery`: added `CountBetween<TValue>` — completes API parity with `CollectionExpression.CountBetween`.

### Test Coverage

- Added 4 new tests. Total: **780 tests**.

---

## [1.4.7] — 2026-03-28

### Bug Fixes

- `NumericExpression InRange<TValue>(IComparable)`: added missing selector null guard.
- `DateTimeExpression BetweenDates` cross-property: replaced fragile Convert fallback with CloneExpression helper.

### New Features

- `ValiFlowQuery`: nullable `float?` overloads — GreaterThan, LessThan, InRange.
- `ValiFlowQuery`: nullable `short?` overloads — IsNullOrZero, HasValue, GreaterThan, LessThan, InRange.

### Test Coverage

- Added 9 new tests. Total: **778 tests**.

---

## [1.4.5] — 2026-03-28

### Bug Fixes

- `ValiFlowQuery ValidateNested`: added ForceCloneVisitor for null-check node.
- `NumericExpression` cross-property `IComparable<TValue>`: added CloneSelectorBody helper.
- `StringExpression ExpressionDeepCloner.VisitMethodCall`: added null guard for static method calls.
- `ValiFlowQuery MaxCount`: null collection now returns `true` (was `false`).

### Test Coverage

- Added 20 new tests. Total: **759 tests**.

---

## [1.4.4] — 2026-03-28

### New Features

- `NumericExpression`/`ValiFlow`/`ValiFlowQuery`: added `HasValue(float?)` overload.

### Bug Fixes

- `BaseExpression IsNotValid`: replaced plain field read post-CompareExchange with atomic return.
- `BaseExpression ValidateNested`: replaced no-op ParameterReplacer with ForceCloneVisitor.
- `CollectionExpression All/Any/None/EachItem/AnyItem`: null-check now uses its own clone of `selectorBody`.
- `StringExpression RegexMatch`: cache-full guard now uses `Volatile.Read`.
- `DateTimeOffsetExpression InLastDays/InNextDays`: guard aligned to `days <= 0`.

### Test Coverage

- Added 11 new tests. Total: **741 tests**.

---

## [1.4.3] — 2026-03-28

### Bug Fixes

- `BaseExpression BuildCached`: replaced plain field read with atomic return — eliminates stale-read risk on ARM64.
- `BaseExpression ValidateNested`: cloned selector body to eliminate expression tree node aliasing.
- `NumericExpression` cross-property `IComparable<TValue>`: fixed node aliasing in all 4 overloads.
- `DateTimeOffsetExpression InLastDays/InNextDays`: date now evaluated inside lambda (was stale when reused across day boundary).
- `StringExpression RegexMatch`: `Interlocked.Increment` now fires only on successful `TryAdd`.
- `RegularExpression PhonePattern`: `+` prefix now mandatory (strict E.164 format).
- `ValiFlowQuery IsTrue`: added null guard on selector.
- `ValiFlowQuery IsLastDayOfMonth(DateOnly)`: removed from EF-safe builder (uses `DateTime.DaysInMonth`, not EF Core translatable).

### Test Coverage

- Added 25 new tests. Total: **730 tests**.

---

## [1.4.2] — 2026-03-28

### New Features

- `NumericExpression`/`ValiFlowQuery`: added `IsNullOrZero(float?)` overload.

### Bug Fixes

- `NumericExpression EqualTo<TValue>`: added null guard.
- `ValiFlowQuery IsInMonth/IsInYear (DateTimeOffset)`: added EF Core UTC-vs-offset divergence warning in XML docs.

---

## [1.4.1] — 2026-03-28

### Bug Fixes

- `StringExpression RegexMatch`: cache cap now enforced with atomic `Interlocked` counter.
- `ValiFlowQuery DateTime/DateTimeOffset`: added null guard on selector in all 22 delegating methods.
- `ValiFlowQuery IsNullOrWhiteSpace/IsNotNullOrWhiteSpace`: corrected EF Core remarks (Pomelo \< 5.0 unsupported).

---

## [1.4.0] — 2026-03-28

### New Features

- `ValiFlowQuery`: `GreaterThan(double?)`, `LessThan(double?)`, `InRange(double?)` for nullable double columns.
- `ValiFlowQuery`: `IsLastDayOfMonth(DateOnly)`.
- `ValiFlowQuery`: `BeforeDate`/`AfterDate` for DateTime now normalize to `date.Date`.

### Bug Fixes

- `StringExpression RegexMatch`: cache capped at 1,000 entries.
- `CollectionExpression All/Any/None/EachItem/AnyItem`: fixed shared `selector.Body` node aliasing.
- `CollectionExpression MaxCount`: null collection now correctly returns `true`.
- `ValiFlowQuery Contains`: rejects empty string.
- `RegularExpression`: E.164 phone pattern minimum raised to 7 digits; email pattern rejects leading/trailing dots.
- `DateTimeOffsetExpression InLastDays/InNextDays`: `UtcNow` captured once per call.

### Test Coverage

- Added 41 new tests. Total: **711 tests**.

---

## [1.3.0] — 2025-09-01

### New Features

- `DateTimeOffsetExpression`: added `IsYesterday` and `IsTomorrow` (in-memory only).

### Bug Fixes

- `Combine()` / `&` / `|` operators: short-circuit when either builder is empty.
- `IComparable<TValue>` cross-property overloads: null guard skipped for value types.
- `AddSubGroup` empty action: throws `ArgumentException` with clear message.
- `ValidateNested` empty configure: throws `ArgumentException` instead of silently producing a null-only check.
- `ComparisonExpression EqualTo/NotEqualTo`: throws `ArgumentNullException` with `"Use Null() to check for null values."`.
- `Base64Pattern` regex: enforces groups-of-4 (length multiple of 4).
- `UrlPattern` regex: removed unescaped dot.

### Test Coverage

- Added `ValiFlowQueryTests`: 65 tests covering all `ValiFlowQuery<T>` method groups. Total: **665 tests**.

---

## [1.2.0] — 2025-06-01

### New Features

- **`ValiFlowQuery<T>`**: new EF Core-safe builder that only exposes methods translatable to SQL — Boolean, Comparison, String (11 methods), Collection (7), Numeric (typed overloads for int/long/double/decimal/float/short + nullable), DateTime (14), DateTimeOffset (8), DateOnly (9), TimeOnly (7).
- Excludes all in-memory-only methods: RegexMatch, IsEmail, IsUrl, IsPhoneNumber, IsGuid, IsJson, IsBase64, IsEven, IsOdd, IsMultipleOf, IsToday, IsYesterday, IsTomorrow, InLastDays, InNextDays, IsLeapYear, IsLastDayOfMonth, All, Any, None, AnyItem, EachItem, HasDuplicates, DistinctCount, IComparable\<T\> generic overloads.
- Static operators `&`, `|`, `!` and `Combine()` for composing `ValiFlowQuery<T>` expressions.

---

## [1.1.0] — 2025-01-01

### New Features

- `ValidateNested<TProperty>`: validate nested objects with automatic null check.
- `AnyItem<TValue>` / `EachItem<TValue>`: per-element collection validation.
- `BuildCached()`: compile expression once and reuse (thread-safe).
- `BuildWithGlobal()`: combine local conditions with ambient `ValiFlowGlobal` filters.
- `ValiSort<T>`: fluent sort builder with `By`/`ThenBy`, applies to `IQueryable` and `IEnumerable`.
- `ValiFlowGlobal`: static ambient filter registry (thread-safe).
- `When`/`Unless`: conditional condition blocks evaluated at runtime.
- `AddIf`: conditionally add conditions based on a bool flag.
- `WithSeverity` / `Severity` enum: mark errors as Info, Warning, Error, or Critical.
- `ValidationResult`: `Warnings`, `CriticalErrors`, `ErrorsAtOrAbove()`, `HasAnySeverity()`.
- `PropertyPath` on `ValidationError`: identify which property failed.
- `ValidateAll`: batch validation returning per-item results.
- `Explain()`: human-readable description of the built expression tree.
- `DateTimeOffset`, `DateOnly`, `TimeOnly` expression support.
- `IComparable<T>` generic comparison overloads (in-memory).
- Cross-property `InRange` comparisons (EF Core compatible).
- `ExpressionExplainer` utility.

### Bug Fixes

- Fixed `Or()` state machine: flat list with `isAnd` flag.
- Fixed `BuildCached()` thread safety: `Volatile.Read` + `Interlocked.CompareExchange`.
- Fixed `IsValid`/`IsNotValid` recompilation on every call.
- Fixed `NotEmpty` null guard.
- Fixed `Contains(string, List<selectors>)` OR-logic composition.
- Fixed `ValidateExpressionBody` false-positive for binary-zero expressions.
- Fixed `RegexMatch`: Regex compiled once at build time.
- Fixed `string.Contains(StringComparison)`: EF Core compatible via `ToLower()`.
- Fixed cross-property `InRange`: `Expression.Invoke` replaced with `ParameterReplacer`.
- Fixed `All/Any/None/EachItem/AnyItem`: `Expression.Quote` for EF Core compatibility.
- Fixed `Validate()` thread safety: lock on lazy compile write-back.
- Fixed `DateTimeOffset`/`DateOnly` stale date capture in `IsToday`/`IsFuture`/`IsPast`.
- Fixed `CountBetween`: null guard and min/max validation.
- Fixed `InRange`: min \<= max validation.
