---
sidebar_position: 6
---

# Métodos de Fechas y Horas

`ValiFlow<T>` soporta validación de fechas y horas para cuatro tipos de .NET: `DateTime`, `DateTimeOffset`, `DateOnly` y `TimeOnly`. Los métodos que dependen de constantes en tiempo de ejecución (como "hoy", "esta semana") son de uso solo en memoria y no pueden ser traducidos por EF Core. Para alternativas seguras en base de datos, usa `ValiFlowQuery<T>` donde esté disponible.

---

## DateTime

### `FutureDate`

Pasa cuando el valor es **mayor que `DateTime.UtcNow`**.

```csharp
var rule = new ValiFlow<Product>()
    .FutureDate(x => x.ExpiresAt);
```

### `PastDate`

Pasa cuando el valor es **menor que `DateTime.UtcNow`**.

```csharp
var rule = new ValiFlow<Order>()
    .PastDate(x => x.CreatedAt);
```

### `IsToday`

Pasa cuando el valor cae en la **fecha UTC de hoy**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .IsToday(x => x.ScheduledAt);
```

### `IsYesterday`

Pasa cuando el valor cae en la **fecha UTC de ayer**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .IsYesterday(x => x.CreatedAt);
```

### `IsTomorrow`

Pasa cuando el valor cae en la **fecha UTC de mañana**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Task>()
    .IsTomorrow(x => x.DueDate);
```

### `IsWeekend`

Pasa cuando el valor cae en **sábado o domingo**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Event>()
    .IsWeekend(x => x.EventDate);
```

### `IsWeekday`

Pasa cuando el valor cae entre **lunes y viernes**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Appointment>()
    .IsWeekday(x => x.AppointmentDate);
```

### `IsDayOfWeek`

Pasa cuando el valor cae en un **día específico de la semana**.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Meeting>()
    .IsDayOfWeek(x => x.Date, DayOfWeek.Monday);
```

### `IsInMonth`

Pasa cuando el mes del valor es igual al mes especificado (1–12).

```csharp
var rule = new ValiFlow<Order>()
    .IsInMonth(x => x.Date, 12);
```

### `IsInYear`

Pasa cuando el año del valor es igual al año especificado (1–9999).

```csharp
var rule = new ValiFlow<Order>()
    .IsInYear(x => x.Date, 2025);
```

### `IsBefore`

Pasa cuando el valor es **estrictamente menor** que el límite dado.

```csharp
var cutoff = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);

var rule = new ValiFlow<Order>()
    .IsBefore(x => x.Date, cutoff);
```

### `IsAfter`

Pasa cuando el valor es **estrictamente mayor** que el límite dado.

```csharp
var cutoff = DateTime.UtcNow.AddDays(-30);

var rule = new ValiFlow<Order>()
    .IsAfter(x => x.Date, cutoff);
```

### `BetweenDates`

Pasa cuando el valor cae dentro del rango `[from, to]` (inclusive).

```csharp
var from = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
var to   = new DateTime(2025, 12, 31, 23, 59, 59, DateTimeKind.Utc);

var rule = new ValiFlow<Order>()
    .BetweenDates(x => x.Date, from, to);
```

### `ExactDate`

Pasa cuando el valor cae en la **misma fecha calendario UTC** que el objetivo.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .ExactDate(x => x.Date, DateTime.UtcNow);
```

### `BeforeDate`

Pasa cuando la fecha calendario UTC del valor es **anterior** a la fecha objetivo.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .BeforeDate(x => x.Date, DateTime.UtcNow);
```

### `AfterDate`

Pasa cuando la fecha calendario UTC del valor es **posterior** a la fecha objetivo.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .AfterDate(x => x.Date, DateTime.UtcNow);
```

### `SameMonthAs`

Pasa cuando el valor comparte el mismo **año y mes** que la referencia.

```csharp
var reference = DateTime.UtcNow;

var rule = new ValiFlow<Order>()
    .SameMonthAs(x => x.Date, reference);
```

### `SameYearAs`

Pasa cuando el valor comparte el mismo **año** que la referencia.

```csharp
var rule = new ValiFlow<Order>()
    .SameYearAs(x => x.Date, DateTime.UtcNow);
```

### `InLastDays`

Pasa cuando el valor cae dentro de los **últimos N días** desde ahora.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Order>()
    .InLastDays(x => x.CreatedAt, 7);
```

### `InNextDays`

Pasa cuando el valor cae dentro de los **próximos N días** desde ahora.

> **Nota:** Solo en memoria — no traducible por EF Core.

```csharp
var rule = new ValiFlow<Task>()
    .InNextDays(x => x.DueDate, 30);
```

---

## DateTimeOffset

`DateTimeOffset` expone el mismo conjunto de métodos que `DateTime`. Los métodos que operan sobre `.UtcDateTime.Date` son solo en memoria.

```csharp
var rule = new ValiFlow<Order>()
    .FutureDate(x => x.ExpiresAt)           // > DateTimeOffset.UtcNow
    .PastDate(x => x.CreatedAt)             // < DateTimeOffset.UtcNow
    .IsToday(x => x.ScheduledAt)            // solo en memoria
    .IsYesterday(x => x.UpdatedAt)          // solo en memoria
    .IsTomorrow(x => x.DueAt)               // solo en memoria
    .IsWeekend(x => x.EventAt)              // solo en memoria
    .IsWeekday(x => x.AppointmentAt)        // solo en memoria
    .IsDayOfWeek(x => x.At, DayOfWeek.Friday)  // solo en memoria
    .IsInMonth(x => x.At, 6)
    .IsInYear(x => x.At, 2025)
    .IsBefore(x => x.At, DateTimeOffset.UtcNow.AddDays(-1))
    .IsAfter(x => x.At, DateTimeOffset.UtcNow.AddDays(-30))
    .BetweenDates(x => x.At, from, to)
    .ExactDate(x => x.At, DateTimeOffset.UtcNow)   // solo en memoria
    .BeforeDate(x => x.At, DateTimeOffset.UtcNow)  // solo en memoria
    .AfterDate(x => x.At, DateTimeOffset.UtcNow)   // solo en memoria
    .SameMonthAs(x => x.At, reference)
    .SameYearAs(x => x.At, reference)
    .InLastDays(x => x.At, 7)              // solo en memoria
    .InNextDays(x => x.At, 30);            // solo en memoria
```

---

## DateOnly

`DateOnly` soporta la mayoría de los mismos métodos. Los métodos de día de la semana (`IsWeekend`, `IsWeekday`, `IsDayOfWeek`) no están disponibles. `IsLastDayOfMonth` es un método adicional específico de `DateOnly`.

### `IsLastDayOfMonth`

Pasa cuando la fecha es el **último día de su mes**. Es seguro para EF Core — usa el truco `AddDays(1).Month != Month` que se traduce correctamente.

```csharp
var rule = new ValiFlow<Invoice>()
    .IsLastDayOfMonth(x => x.BillingDate);
```

Ejemplo completo con `DateOnly`:

```csharp
var rule = new ValiFlow<Order>()
    .FutureDate(x => x.ExpiresOn)
    .PastDate(x => x.CreatedOn)
    .IsToday(x => x.ScheduledOn)          // solo en memoria
    .IsYesterday(x => x.ProcessedOn)      // solo en memoria
    .IsTomorrow(x => x.DueOn)             // solo en memoria
    .IsInMonth(x => x.Date, 12)
    .IsInYear(x => x.Date, 2025)
    .IsBefore(x => x.Date, new DateOnly(2026, 1, 1))
    .IsAfter(x => x.Date, new DateOnly(2024, 1, 1))
    .BetweenDates(x => x.Date, from, to)
    .SameMonthAs(x => x.Date, DateOnly.FromDateTime(DateTime.UtcNow))
    .SameYearAs(x => x.Date, DateOnly.FromDateTime(DateTime.UtcNow))
    .InLastDays(x => x.Date, 7)           // solo en memoria
    .InNextDays(x => x.Date, 30)          // solo en memoria
    .IsLastDayOfMonth(x => x.Date);       // seguro para EF Core
```

---

## TimeOnly

### `IsBefore`

Pasa cuando la hora es **estrictamente anterior** a la hora dada.

```csharp
var rule = new ValiFlow<Shift>()
    .IsBefore(x => x.StartTime, TimeOnly.Parse("18:00"));
```

### `IsAfter`

Pasa cuando la hora es **estrictamente posterior** a la hora dada.

```csharp
var rule = new ValiFlow<Shift>()
    .IsAfter(x => x.StartTime, TimeOnly.Parse("09:00"));
```

### `BetweenTimes`

Pasa cuando la hora cae dentro del rango `[inicio, fin]` (inclusive).

```csharp
var rule = new ValiFlow<Shift>()
    .BetweenTimes(x => x.StartTime, TimeOnly.Parse("08:00"), TimeOnly.Parse("17:00"));
```

### `IsAM`

Pasa cuando la hora es **menor que 12** (de medianoche a las 11:59 AM).

```csharp
var rule = new ValiFlow<Event>()
    .IsAM(x => x.Time);
```

### `IsPM`

Pasa cuando la hora es **12 o mayor** (de mediodía a las 11:59 PM).

```csharp
var rule = new ValiFlow<Event>()
    .IsPM(x => x.Time);
```
