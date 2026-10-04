---
sidebar_position: 6
---

# DateTime Methods

`ValiFlow<T>` supports date and time validation across four .NET types: `DateTime`, `DateTimeOffset`, `DateOnly`, and `TimeOnly`. Methods that rely on runtime constants (e.g., "today", "this week") are in-memory only and cannot be translated by EF Core. Use `ValiFlowQuery<T>` for database-safe alternatives where available.

---

## DateTime

### `FutureDate`

Passes when the value is **greater than `DateTime.UtcNow`**.

```csharp
var rule = new ValiFlow<Product>()
    .FutureDate(x => x.ExpiresAt);
```

### `PastDate`

Passes when the value is **less than `DateTime.UtcNow`**.

```csharp
var rule = new ValiFlow<Order>()
    .PastDate(x => x.CreatedAt);
```

### `IsToday`

Passes when the value falls on **today's UTC date**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .IsToday(x => x.ScheduledAt);
```

### `IsYesterday`

Passes when the value falls on **yesterday's UTC date**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .IsYesterday(x => x.CreatedAt);
```

### `IsTomorrow`

Passes when the value falls on **tomorrow's UTC date**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Task>()
    .IsTomorrow(x => x.DueDate);
```

### `IsWeekend`

Passes when the value falls on a **Saturday or Sunday**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Event>()
    .IsWeekend(x => x.EventDate);
```

### `IsWeekday`

Passes when the value falls on a **Monday through Friday**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Appointment>()
    .IsWeekday(x => x.AppointmentDate);
```

### `IsDayOfWeek`

Passes when the value falls on a **specific day of the week**.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Meeting>()
    .IsDayOfWeek(x => x.Date, DayOfWeek.Monday);
```

### `IsInMonth`

Passes when the value's month equals the specified month (1–12).

```csharp
var rule = new ValiFlow<Order>()
    .IsInMonth(x => x.Date, 12);
```

### `IsInYear`

Passes when the value's year equals the specified year (1–9999).

```csharp
var rule = new ValiFlow<Order>()
    .IsInYear(x => x.Date, 2025);
```

### `IsBefore`

Passes when the value is **strictly less than** the given cutoff.

```csharp
var cutoff = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

var rule = new ValiFlow<Order>()
    .IsBefore(x => x.Date, cutoff);
```

### `IsAfter`

Passes when the value is **strictly greater than** the given cutoff.

```csharp
var cutoff = DateTime.UtcNow.AddDays(-30);

var rule = new ValiFlow<Order>()
    .IsAfter(x => x.Date, cutoff);
```

### `BetweenDates`

Passes when the value falls within `[from, to]` (inclusive).

```csharp
var from = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
var to   = new DateTime(2025, 12, 31, 23, 59, 59, DateTimeKind.Utc);

var rule = new ValiFlow<Order>()
    .BetweenDates(x => x.Date, from, to);
```

### `ExactDate`

Passes when the value falls on the **same UTC calendar date** as the target.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .ExactDate(x => x.Date, DateTime.UtcNow);
```

### `BeforeDate`

Passes when the value's UTC calendar date is **before** the target date.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .BeforeDate(x => x.Date, DateTime.UtcNow);
```

### `AfterDate`

Passes when the value's UTC calendar date is **after** the target date.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .AfterDate(x => x.Date, DateTime.UtcNow);
```

### `SameMonthAs`

Passes when the value shares the same **year and month** as the reference.

```csharp
var reference = DateTime.UtcNow;

var rule = new ValiFlow<Order>()
    .SameMonthAs(x => x.Date, reference);
```

### `SameYearAs`

Passes when the value shares the same **year** as the reference.

```csharp
var rule = new ValiFlow<Order>()
    .SameYearAs(x => x.Date, DateTime.UtcNow);
```

### `InLastDays`

Passes when the value falls within the **last N days** from now.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Order>()
    .InLastDays(x => x.CreatedAt, 7);
```

### `InNextDays`

Passes when the value falls within the **next N days** from now.

> **Note:** In-memory only — not EF Core translatable.

```csharp
var rule = new ValiFlow<Task>()
    .InNextDays(x => x.DueDate, 30);
```

---

## DateTimeOffset

`DateTimeOffset` exposes the same set of methods as `DateTime`. Methods that operate on `.UtcDateTime.Date` are in-memory only.

```csharp
var rule = new ValiFlow<Order>()
    .FutureDate(x => x.ExpiresAt)           // > DateTimeOffset.UtcNow
    .PastDate(x => x.CreatedAt)             // < DateTimeOffset.UtcNow
    .IsToday(x => x.ScheduledAt)            // in-memory only
    .IsYesterday(x => x.UpdatedAt)          // in-memory only
    .IsTomorrow(x => x.DueAt)               // in-memory only
    .IsWeekend(x => x.EventAt)              // in-memory only
    .IsWeekday(x => x.AppointmentAt)        // in-memory only
    .IsDayOfWeek(x => x.At, DayOfWeek.Friday)  // in-memory only
    .IsInMonth(x => x.At, 6)
    .IsInYear(x => x.At, 2025)
    .IsBefore(x => x.At, DateTimeOffset.UtcNow.AddDays(-1))
    .IsAfter(x => x.At, DateTimeOffset.UtcNow.AddDays(-30))
    .BetweenDates(x => x.At, from, to)
    .ExactDate(x => x.At, DateTimeOffset.UtcNow)   // in-memory only
    .BeforeDate(x => x.At, DateTimeOffset.UtcNow)  // in-memory only
    .AfterDate(x => x.At, DateTimeOffset.UtcNow)   // in-memory only
    .SameMonthAs(x => x.At, reference)
    .SameYearAs(x => x.At, reference)
    .InLastDays(x => x.At, 7)              // in-memory only
    .InNextDays(x => x.At, 30);            // in-memory only
```

---

## DateOnly

`DateOnly` supports most of the same methods. Day-of-week methods (`IsWeekend`, `IsWeekday`, `IsDayOfWeek`) are not available. `IsLastDayOfMonth` is an additional method specific to `DateOnly`.

### `IsLastDayOfMonth`

Passes when the date is the **last day of its month**. EF Core safe — uses the `AddDays(1).Month != Month` trick which translates correctly.

```csharp
var rule = new ValiFlow<Invoice>()
    .IsLastDayOfMonth(x => x.BillingDate);
```

Full `DateOnly` example:

```csharp
var rule = new ValiFlow<Order>()
    .FutureDate(x => x.ExpiresOn)
    .PastDate(x => x.CreatedOn)
    .IsToday(x => x.ScheduledOn)          // in-memory only
    .IsYesterday(x => x.ProcessedOn)      // in-memory only
    .IsTomorrow(x => x.DueOn)             // in-memory only
    .IsInMonth(x => x.Date, 12)
    .IsInYear(x => x.Date, 2025)
    .IsBefore(x => x.Date, new DateOnly(2026, 1, 1))
    .IsAfter(x => x.Date, new DateOnly(2024, 1, 1))
    .BetweenDates(x => x.Date, from, to)
    .SameMonthAs(x => x.Date, DateOnly.FromDateTime(DateTime.UtcNow))
    .SameYearAs(x => x.Date, DateOnly.FromDateTime(DateTime.UtcNow))
    .InLastDays(x => x.Date, 7)           // in-memory only
    .InNextDays(x => x.Date, 30)          // in-memory only
    .IsLastDayOfMonth(x => x.Date);       // EF Core safe
```

---

## TimeOnly

### `IsBefore`

Passes when the time is **strictly before** the given time.

```csharp
var rule = new ValiFlow<Shift>()
    .IsBefore(x => x.StartTime, TimeOnly.Parse("18:00"));
```

### `IsAfter`

Passes when the time is **strictly after** the given time.

```csharp
var rule = new ValiFlow<Shift>()
    .IsAfter(x => x.StartTime, TimeOnly.Parse("09:00"));
```

### `BetweenTimes`

Passes when the time falls within `[start, end]` (inclusive).

```csharp
var rule = new ValiFlow<Shift>()
    .BetweenTimes(x => x.StartTime, TimeOnly.Parse("08:00"), TimeOnly.Parse("17:00"));
```

### `IsAM`

Passes when the hour is **less than 12** (midnight to 11:59 AM).

```csharp
var rule = new ValiFlow<Event>()
    .IsAM(x => x.Time);
```

### `IsPM`

Passes when the hour is **12 or greater** (noon to 11:59 PM).

```csharp
var rule = new ValiFlow<Event>()
    .IsPM(x => x.Time);
```
