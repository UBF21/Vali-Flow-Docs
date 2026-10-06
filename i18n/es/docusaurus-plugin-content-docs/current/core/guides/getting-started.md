# Guía — Getting Started

## Instalación

### Prerequisitos

- .NET 8.0 o .NET 9.0
- No se requieren dependencias adicionales

### NuGet

```bash
dotnet add package Vali-Flow.Core
```

O en el archivo `.csproj`:

```xml
<PackageReference Include="Vali-Flow.Core" Version="x.x.x" />
```

---

## Concepto fundamental: el builder es un objeto

A diferencia de una librería de validación que usa atributos (`[Required]`, `[MinLength]`), Vali-Flow construye las reglas como **objetos**. Esto significa que:

- Las reglas se pueden guardar en variables
- Se pueden pasar como parámetros
- Se pueden combinar y extender
- Se pueden reutilizar en distintos contextos (validación, filtrado, etc.)

---

## Primer ejemplo: validar un objeto

```csharp
using Vali_Flow.Core.Builder;

// Definir la entidad
public class User
{
    public string? Email { get; set; }
    public int Age { get; set; }
    public bool IsActive { get; set; }
}

// Definir la regla
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .MinLength(u => u.Email, 5)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Validar un objeto
var user = new User { Email = "test@example.com", Age = 25, IsActive = true };

bool isValid = rule.IsValid(user);   // true
bool isNotValid = rule.IsNotValid(user); // false
```

---

## AND y OR

Por defecto, todas las condiciones se combinan con AND. Para usar OR, se llama `.Or()` antes de la siguiente condición:

```csharp
var rule = new ValiFlow<User>()
    .IsTrue(u => u.IsAdmin)     // IsAdmin
    .Or()
    .IsTrue(u => u.IsSuperUser); // OR IsSuperUser

// Equivale a: u => u.IsAdmin || u.IsSuperUser

// Con AND y OR mezclados:
var rule2 = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)   // A
    .IsTrue(u => u.IsActive)        // AND B
    .Or()
    .IsTrue(u => u.IsAdmin);        // OR C

// Equivale a: u => (u.Age > 18 && u.IsActive) || u.IsAdmin
// Los AND siempre tienen precedencia sobre OR (igual que en C#)
```

---

## Subgrupos explícitos

Para controlar explícitamente la precedencia, se pueden usar subgrupos:

```csharp
var rule = new ValiFlow<User>()
    .AddSubGroup(g => g
        .IsTrue(u => u.IsActive)
        .Or()
        .IsTrue(u => u.IsPending))
    .GreaterThan(u => u.Age, 18);

// Equivale a: u => (u.IsActive || u.IsPending) && u.Age > 18
```

---

## Obtener la expresión para filtrar

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Obtener como Expression<Func<T, bool>>
Expression<Func<User, bool>> expr = rule.Build();

// Usar con listas en memoria:
var adults = users.Where(expr.Compile()).ToList();

// O usar BuildCached() para evitar recompilar en cada llamada:
var compiled = rule.BuildCached();
var adults = users.Where(compiled).ToList();
```

---

## Uso con EF Core (ValiFlowQuery)

Para filtros de base de datos, usar `ValiFlowQuery<T>` en lugar de `ValiFlow<T>`:

```csharp
using Vali_Flow.Core.Builder;

// ValiFlowQuery solo expone métodos que EF Core puede traducir a SQL
var filter = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Usar directamente con IQueryable:
var users = await dbContext.Users
    .Where(filter.Build())
    .ToListAsync();

// El Build() retorna Expression<Func<User,bool>>
// EF Core lo traduce a: WHERE Email IS NOT NULL AND Age > 18 AND IsActive = 1
```

Si se intenta usar un método no-EF-safe en `ValiFlowQuery<T>`, el compilador (Analyzer VF001) emite un warning:

```csharp
var filter = new ValiFlowQuery<User>()
    .IsEmail(u => u.Email);  // warning VF001: not EF Core translatable
```

---

## Negación

```csharp
var activeRule = new ValiFlow<User>().IsTrue(u => u.IsActive);

// Build normal: x => x.IsActive
Expression<Func<User, bool>> active = activeRule.Build();

// Build negado: x => !x.IsActive
Expression<Func<User, bool>> inactive = activeRule.BuildNegated();
```

---

## Validaciones condicionales: When y Unless

Se puede hacer que una condición solo se aplique cuando otra se cumple:

```csharp
var rule = new ValiFlow<User>()
    .When(
        condition: u => u.IsEmployee,      // solo aplica si es empleado
        then: g => g.NotNull(u => u.EmployeeId)  // validar EmployeeId
    );

// Si u.IsEmployee es false, la condición u.EmployeeId != null no se evalúa

// Unless es el inverso: aplica la condición cuando el predicado NO se cumple
var rule2 = new ValiFlow<User>()
    .Unless(
        condition: u => u.IsGuest,
        then: g => g.NotNull(u => u.Email)  // solo si NO es guest
    );
```

---

## Validar propiedades de navegación

```csharp
public class Order
{
    public Customer? Customer { get; set; }
}

public class Customer
{
    public string? Email { get; set; }
    public string? Phone { get; set; }
}

var rule = new ValiFlow<Order>()
    .ValidateNested(
        o => o.Customer,
        customer => customer
            .NotNull(c => c.Email)
            .NotNull(c => c.Phone)
    );

// Equivale a: o => o.Customer != null && o.Customer.Email != null && o.Customer.Phone != null
// El null-check del Customer se agrega automáticamente
```

---

## Catálogo de métodos por tipo

### Boolean

```csharp
.IsTrue(u => u.IsActive)
.IsFalse(u => u.IsDeleted)
```

### Comparación

```csharp
.IsNull(u => u.MiddleName)
.NotNull(u => u.Email)
.EqualTo(u => u.Status, "Active")
.NotEqualTo(u => u.Status, "Deleted")
```

### String

```csharp
.MinLength(u => u.Name, 2)
.MaxLength(u => u.Name, 100)
.ExactLength(u => u.Code, 10)
.LengthBetween(u => u.Name, 2, 100)
.StartsWith(u => u.Code, "USR")
.EndsWith(u => u.Email, ".com")
.Contains(u => u.Bio, "developer")
.IsEmail(u => u.Email)              // solo ValiFlow<T>
.IsUrl(u => u.Website)              // solo ValiFlow<T>
.IsGuid(u => u.ExternalId)          // solo ValiFlow<T>
.IsNullOrEmpty(u => u.MiddleName)
.IsNotNullOrEmpty(u => u.Name)
.IsNullOrWhiteSpace(u => u.Notes)
.RegexMatch(u => u.Code, @"^\d{5}$")  // solo ValiFlow<T>
```

### Numérico (int, long, double, decimal, float, short)

```csharp
.GreaterThan(u => u.Age, 18)
.GreaterThanOrEqualTo(u => u.Score, 60)
.LessThan(u => u.Price, 1000)
.LessThanOrEqualTo(u => u.Quantity, 99)
.Between(u => u.Age, 18, 65)
.IsZero(u => u.Balance)
.IsNotZero(u => u.Price)
.IsPositive(u => u.Score)
.IsNegative(u => u.Discount)
.IsEven(u => u.Count)
.IsOdd(u => u.Count)
.IsMultipleOf(u => u.Quantity, 5)
.MinValue(u => u.Age, 0)
.MaxValue(u => u.Age, 120)
```

### Colección

```csharp
.IsEmpty(u => u.Tags)
.IsNotEmpty(u => u.Roles)
.CountEquals(u => u.Items, 3)
.CountGreaterThan(u => u.Items, 0)
.CountLessThan(u => u.Items, 100)
.Contains(u => u.Roles, "Admin")         // colección contiene un elemento
.All(u => u.Items, i => i.Price > 0)     // solo ValiFlow<T>
.Any(u => u.Items, i => i.IsActive)      // solo ValiFlow<T>
.None(u => u.Items, i => i.IsDeleted)    // solo ValiFlow<T>
```

### DateTime

```csharp
.IsInFuture(u => u.ExpiresAt)
.IsInPast(u => u.CreatedAt)
.IsBefore(u => u.ExpiresAt, DateTime.Now.AddDays(30))
.IsAfter(u => u.CreatedAt, new DateTime(2020, 1, 1))
.IsBetween(u => u.EventDate, startDate, endDate)
.IsToday(u => u.ScheduledAt)
.IsWeekday(u => u.AppointmentDate)
.IsWeekend(u => u.DayOff)
```

---

## Reutilizar reglas como base

```csharp
// Regla base
var baseUserRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Freeze implícito al primer uso
baseUserRule.IsValid(someUser);

// Crear reglas extendidas (forks) sin modificar la base
var adminRule = baseUserRule.IsTrue(u => u.IsAdmin);
var activeRule = baseUserRule.IsTrue(u => u.IsActive);

// baseUserRule sigue siendo solo Email + Age
// adminRule  = Email + Age + IsAdmin
// activeRule = Email + Age + IsActive
```

---

## Explicar una regla

Útil para logging y debugging:

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

Console.WriteLine(rule.Explain());
// Output: "(x.Age > 18) AND (x.IsActive == True)"
```
