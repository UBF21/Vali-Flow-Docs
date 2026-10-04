---
sidebar_position: 7
---

[← Volver al README](../../README.md)

# ValiFlowQuery\<T\> — Builder Seguro para EF Core

`ValiFlowQuery<T>` es la variante de `ValiFlow<T>` segura para EF Core. Expone la misma API fluida pero restringe los métodos disponibles a aquellos que se traducen correctamente a SQL a través del visitor de expresiones de EF Core.

---

## Cuándo Usar Cada Builder

| Builder | Caso de uso |
|---|---|
| `ValiFlow<T>` | Validación en memoria, pruebas unitarias, reglas de negocio aplicadas sobre objetos cargados |
| `ValiFlowQuery<T>` | `IQueryable<T>` con EF Core — expresiones enviadas a la base de datos |

---

## Uso Básico

```csharp
// Uso con EF Core
var query = new ValiFlowQuery<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)
    .IsAfter(x => x.CreatedAt, DateTime.UtcNow.AddDays(-30));

Expression<Func<Order, bool>> expr = query.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```

---

## Qué Está Excluido de ValiFlowQuery\<T\>

Los siguientes métodos de `ValiFlow<T>` **no están disponibles** en `ValiFlowQuery<T>` porque no pueden ser traducidos a SQL:

| Método excluido | Motivo |
|---|---|
| `IsWeekend` / `IsWeekday` / `IsDayOfWeek` | Sin equivalente SQL estándar |
| `IsToday` / `IsYesterday` / `IsTomorrow` (DateTime / DateTimeOffset) | Usa `.UtcDateTime.Date` dentro de una lambda |
| `ExactDate` / `BeforeDate` / `AfterDate` (DateTime / DateTimeOffset) | Usa `.UtcDateTime.Date` dentro de una lambda |
| `InLastDays` / `InNextDays` (DateTime / DateTimeOffset) | Límite calculado dentro de una lambda |
| `IsInEnum` | Usa `Enum.IsDefined` — no traducible |
| `IsDefault` / `IsNotDefault` | Comparación con `default(T)` — no traducible |
| `IsOneOf` (cuando el predicado captura estado externo) | Depende del contexto |
| `MatchesWildcard` | Coincidencia de patrones de string no es universalmente traducible |

---

## Métodos de Fecha Seguros para EF Core

Para operaciones con `DateOnly` y algunas con `DateTimeOffset`, `ValiFlowQuery<T>` captura los valores límite **en el momento de construcción** para que el árbol de expresiones resultante contenga únicamente constantes literales — que EF Core puede parametrizar de forma segura.

### `IsToday` (DateOnly)

Captura la fecha de hoy en el momento de construcción. EF Core traduce esto a una verificación de igualdad de fecha simple.

```csharp
var query = new ValiFlowQuery<Order>()
    .IsToday(x => x.ScheduledOn); // DateOnly — captura DateOnly.FromDateTime(DateTime.UtcNow)
```

### `IsLastDayOfMonth` (DateOnly)

Usa el truco `AddDays(1).Month != Month`, que EF Core traduce correctamente.

```csharp
var query = new ValiFlowQuery<Invoice>()
    .IsLastDayOfMonth(x => x.BillingDate);
```

### `InLastDays` / `InNextDays` (DateOnly)

Las fechas límite se capturan como constantes en el momento de construcción.

```csharp
var query = new ValiFlowQuery<Order>()
    .InLastDays(x => x.CreatedOn, 30)   // lower = DateOnly.FromDateTime(UtcNow).AddDays(-30)
    .InNextDays(x => x.DueOn, 7);       // upper = DateOnly.FromDateTime(UtcNow).AddDays(+7)
```

### DateTimeOffset — variantes seguras

Para propiedades `DateTimeOffset`, usa `IsBefore`, `IsAfter` y `BetweenDates` — los límites se capturan en el momento de construcción y se traducen correctamente.

```csharp
var query = new ValiFlowQuery<Order>()
    .IsAfter(x => x.CreatedAt, DateTimeOffset.UtcNow.AddDays(-30))
    .IsBefore(x => x.ExpiresAt, DateTimeOffset.UtcNow.AddDays(90));
```

---

## Filtrado por Día de Semana en SQL

`IsWeekend`, `IsWeekday` e `IsDayOfWeek` no están disponibles en `ValiFlowQuery<T>`. Para filtrar por día de la semana a nivel de base de datos, usa SQL directo o funciones específicas del proveedor:

```csharp
// PostgreSQL (Npgsql) — filtrar días hábiles
var weekdays = dbContext.Orders
    .Where(o => EF.Functions.DatePart("dow", o.CreatedAt) >= 1
             && EF.Functions.DatePart("dow", o.CreatedAt) <= 5)
    .ToList();

// SQL Server — filtrar fin de semana
var weekends = dbContext.Orders
    .Where(o => EF.Functions.DateDiffDay(
        new DateTime(1900, 1, 7), o.CreatedAt) % 7 < 2)
    .ToList();
```

---

## Combinar ValiFlowQuery\<T\> con Reglas en Memoria

Puedes compartir lógica de reglas entre `ValiFlowQuery<T>` (para consultas a base de datos) y `ValiFlow<T>` (para validación en memoria) construyendo instancias separadas:

```csharp
// Lógica compartida — solo métodos seguros para EF Core
static ValiFlowQuery<Order> BuildDbFilter() =>
    new ValiFlowQuery<Order>()
        .EqualTo(x => x.Status, "Active")
        .GreaterThan(x => x.Total, 0m);

// Lógica extendida para validación en memoria
static ValiFlow<Order> BuildFullRule() =>
    new ValiFlow<Order>()
        .EqualTo(x => x.Status, "Active")
        .GreaterThan(x => x.Total, 0m)
        .IsWeekday(x => x.CreatedAt)          // solo en memoria
        .NotEmpty<OrderLine>(x => x.Lines);   // verificación de colección

// Consulta a EF Core
var expr = BuildDbFilter().Build();
var orders = await dbContext.Orders.Where(expr).ToListAsync();

// Validación post-carga
var fullRule = BuildFullRule();
var invalid = orders.Where(o => !fullRule.IsValid(o)).ToList();
```

---

## Ejemplo Completo

```csharp
var query = new ValiFlowQuery<Order>()
    .NotNull(x => x.CustomerId)
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)
    .IsAfter(x => x.CreatedAt, DateTime.UtcNow.AddDays(-90))
    .IsBefore(x => x.ExpiresAt, DateTime.UtcNow.AddDays(365))
    .IsInYear(x => x.CreatedAt, DateTime.UtcNow.Year)
    .InLastDays(x => x.ScheduledOn, 30);  // DateOnly — seguro para EF Core

Expression<Func<Order, bool>> expr = query.Build();

var results = await dbContext.Orders
    .Where(expr)
    .OrderBy(o => o.CreatedAt)
    .ToListAsync();
```
