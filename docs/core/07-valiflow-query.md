---
sidebar_position: 7
---

[← Back to README](../../README.md)

# ValiFlowQuery\<T\> — EF Core-Safe Builder

`ValiFlowQuery<T>` is the EF Core-safe variant of `ValiFlow<T>`. It exposes the same fluent API but restricts the available methods to those that translate correctly to SQL through EF Core's expression visitor.

---

## When to Use Which Builder

| Builder | Use case |
|---|---|
| `ValiFlow<T>` | In-memory validation, unit testing, business rules applied to loaded objects |
| `ValiFlowQuery<T>` | `IQueryable<T>` with EF Core — expressions sent to the database |

---

## Basic Usage

```csharp
// EF Core usage
var query = new ValiFlowQuery<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)
    .IsAfter(x => x.CreatedAt, DateTime.UtcNow.AddDays(-30));

Expression<Func<Order, bool>> expr = query.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```

---

## What Is Excluded from ValiFlowQuery\<T\>

The following methods from `ValiFlow<T>` are **not available** in `ValiFlowQuery<T>` because they cannot be translated to SQL:

| Excluded method | Reason |
|---|---|
| `IsWeekend` / `IsWeekday` / `IsDayOfWeek` | No standard SQL equivalent |
| `IsToday` / `IsYesterday` / `IsTomorrow` (DateTime / DateTimeOffset) | Uses `.UtcDateTime.Date` inside a lambda |
| `ExactDate` / `BeforeDate` / `AfterDate` (DateTime / DateTimeOffset) | Uses `.UtcDateTime.Date` inside a lambda |
| `InLastDays` / `InNextDays` (DateTime / DateTimeOffset) | Boundary computed inside a lambda |
| `IsInEnum` | Uses `Enum.IsDefined` — not translatable |
| `IsDefault` / `IsNotDefault` | Uses `default(T)` comparison — not translatable |
| `IsOneOf` (when the predicate captures external state) | Depends on context |
| `MatchesWildcard` | String pattern matching not universally translatable |

---

## EF Core-Safe Date Methods

For `DateOnly` and some `DateTimeOffset` operations, `ValiFlowQuery<T>` captures boundary values **at build time** so that the resulting expression tree contains only literal constants — which EF Core can safely parameterize.

### `IsToday` (DateOnly)

Captures today's date at build time. EF Core translates this to a simple date equality check.

```csharp
var query = new ValiFlowQuery<Order>()
    .IsToday(x => x.ScheduledOn); // DateOnly — captures DateOnly.FromDateTime(DateTime.UtcNow)
```

### `IsLastDayOfMonth` (DateOnly)

Uses the `AddDays(1).Month != Month` trick, which EF Core translates correctly.

```csharp
var query = new ValiFlowQuery<Invoice>()
    .IsLastDayOfMonth(x => x.BillingDate);
```

### `InLastDays` / `InNextDays` (DateOnly)

Boundary dates are captured at build time as constants.

```csharp
var query = new ValiFlowQuery<Order>()
    .InLastDays(x => x.CreatedOn, 30)   // lower = DateOnly.FromDateTime(UtcNow).AddDays(-30)
    .InNextDays(x => x.DueOn, 7);       // upper = DateOnly.FromDateTime(UtcNow).AddDays(+7)
```

### DateTimeOffset — safe variants

For `DateTimeOffset` properties, use `IsBefore`, `IsAfter`, and `BetweenDates` — the boundaries are captured at build time and translate correctly.

```csharp
var query = new ValiFlowQuery<Order>()
    .IsAfter(x => x.CreatedAt, DateTimeOffset.UtcNow.AddDays(-30))
    .IsBefore(x => x.ExpiresAt, DateTimeOffset.UtcNow.AddDays(90));
```

---

## Day-of-Week Filtering in SQL

`IsWeekend`, `IsWeekday`, and `IsDayOfWeek` are not available in `ValiFlowQuery<T>`. For day-of-week filtering at the database level, use raw SQL or provider-specific functions:

```csharp
// PostgreSQL (Npgsql) — filter for weekdays
var weekdays = dbContext.Orders
    .Where(o => EF.Functions.DatePart("dow", o.CreatedAt) >= 1
             && EF.Functions.DatePart("dow", o.CreatedAt) <= 5)
    .ToList();

// SQL Server — filter for weekend
var weekends = dbContext.Orders
    .Where(o => EF.Functions.DateDiffDay(
        new DateTime(1900, 1, 7), o.CreatedAt) % 7 < 2)
    .ToList();
```

---

## Combining ValiFlowQuery\<T\> with In-Memory Rules

You can share rule logic between `ValiFlowQuery<T>` (for database queries) and `ValiFlow<T>` (for in-memory validation) by building separate instances:

```csharp
// Shared logic — only EF Core-safe methods
static ValiFlowQuery<Order> BuildDbFilter() =>
    new ValiFlowQuery<Order>()
        .EqualTo(x => x.Status, "Active")
        .GreaterThan(x => x.Total, 0m);

// Extended logic for in-memory validation
static ValiFlow<Order> BuildFullRule() =>
    new ValiFlow<Order>()
        .EqualTo(x => x.Status, "Active")
        .GreaterThan(x => x.Total, 0m)
        .IsWeekday(x => x.CreatedAt)          // in-memory only
        .NotEmpty<OrderLine>(x => x.Lines);   // collection check

// EF Core query
var expr = BuildDbFilter().Build();
var orders = await dbContext.Orders.Where(expr).ToListAsync();

// Post-load validation
var fullRule = BuildFullRule();
var invalid = orders.Where(o => !fullRule.IsValid(o)).ToList();
```

---

## Full Example

```csharp
var query = new ValiFlowQuery<Order>()
    .NotNull(x => x.CustomerId)
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)
    .IsAfter(x => x.CreatedAt, DateTime.UtcNow.AddDays(-90))
    .IsBefore(x => x.ExpiresAt, DateTime.UtcNow.AddDays(365))
    .IsInYear(x => x.CreatedAt, DateTime.UtcNow.Year)
    .InLastDays(x => x.ScheduledOn, 30);  // DateOnly — EF Core safe

Expression<Func<Order, bool>> expr = query.Build();

var results = await dbContext.Orders
    .Where(expr)
    .OrderBy(o => o.CreatedAt)
    .ToListAsync();
```
