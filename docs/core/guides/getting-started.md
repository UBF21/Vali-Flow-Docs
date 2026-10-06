# Guide — Getting Started

## Installation

### Prerequisites

- .NET 8.0 or .NET 9.0
- No additional dependencies required

### NuGet

```bash
dotnet add package Vali-Flow.Core
```

Or in the `.csproj` file:

```xml
<PackageReference Include="Vali-Flow.Core" Version="x.x.x" />
```

---

## Core Concept: The Builder Is an Object

Unlike a validation library that uses attributes (`[Required]`, `[MinLength]`), Vali-Flow builds rules as **objects**. This means:

- Rules can be stored in variables
- They can be passed as parameters
- They can be combined and extended
- They can be reused in different contexts (validation, filtering, etc.)

---

## First Example: Validating an Object

```csharp
using Vali_Flow.Core.Builder;

// Define the entity
public class User
{
    public string? Email { get; set; }
    public int Age { get; set; }
    public bool IsActive { get; set; }
}

// Define the rule
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .MinLength(u => u.Email, 5)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Validate an object
var user = new User { Email = "test@example.com", Age = 25, IsActive = true };

bool isValid = rule.IsValid(user);   // true
bool isNotValid = rule.IsNotValid(user); // false
```

---

## AND and OR

By default, all conditions are combined with AND. To use OR, call `.Or()` before the next condition:

```csharp
var rule = new ValiFlow<User>()
    .IsTrue(u => u.IsAdmin)     // IsAdmin
    .Or()
    .IsTrue(u => u.IsSuperUser); // OR IsSuperUser

// Equivalent to: u => u.IsAdmin || u.IsSuperUser

// With mixed AND and OR:
var rule2 = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)   // A
    .IsTrue(u => u.IsActive)        // AND B
    .Or()
    .IsTrue(u => u.IsAdmin);        // OR C

// Equivalent to: u => (u.Age > 18 && u.IsActive) || u.IsAdmin
// AND always has higher precedence than OR (same as in C#)
```

---

## Explicit Subgroups

To explicitly control precedence, subgroups can be used:

```csharp
var rule = new ValiFlow<User>()
    .AddSubGroup(g => g
        .IsTrue(u => u.IsActive)
        .Or()
        .IsTrue(u => u.IsPending))
    .GreaterThan(u => u.Age, 18);

// Equivalent to: u => (u.IsActive || u.IsPending) && u.Age > 18
```

---

## Getting the Expression for Filtering

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Get as Expression<Func<T, bool>>
Expression<Func<User, bool>> expr = rule.Build();

// Use with in-memory lists:
var adults = users.Where(expr.Compile()).ToList();

// Or use BuildCached() to avoid recompiling on each call:
var compiled = rule.BuildCached();
var adults = users.Where(compiled).ToList();
```

---

## Use with EF Core (ValiFlowQuery)

For database filters, use `ValiFlowQuery<T>` instead of `ValiFlow<T>`:

```csharp
using Vali_Flow.Core.Builder;

// ValiFlowQuery only exposes methods that EF Core can translate to SQL
var filter = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Use directly with IQueryable:
var users = await dbContext.Users
    .Where(filter.Build())
    .ToListAsync();

// Build() returns Expression<Func<User,bool>>
// EF Core translates it to: WHERE Email IS NOT NULL AND Age > 18 AND IsActive = 1
```

If a non-EF-safe method is used on `ValiFlowQuery<T>`, the compiler (Analyzer VF001) emits a warning:

```csharp
var filter = new ValiFlowQuery<User>()
    .IsEmail(u => u.Email);  // warning VF001: not EF Core translatable
```

---

## Negation

```csharp
var activeRule = new ValiFlow<User>().IsTrue(u => u.IsActive);

// Normal build: x => x.IsActive
Expression<Func<User, bool>> active = activeRule.Build();

// Negated build: x => !x.IsActive
Expression<Func<User, bool>> inactive = activeRule.BuildNegated();
```

---

## Conditional Validations: When and Unless

A condition can be made to apply only when another condition is met:

```csharp
var rule = new ValiFlow<User>()
    .When(
        condition: u => u.IsEmployee,      // only applies if employee
        then: g => g.NotNull(u => u.EmployeeId)  // validate EmployeeId
    );

// If u.IsEmployee is false, the condition u.EmployeeId != null is not evaluated

// Unless is the inverse: applies the condition when the predicate is NOT met
var rule2 = new ValiFlow<User>()
    .Unless(
        condition: u => u.IsGuest,
        then: g => g.NotNull(u => u.Email)  // only if NOT a guest
    );
```

---

## Validating Navigation Properties

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

// Equivalent to: o => o.Customer != null && o.Customer.Email != null && o.Customer.Phone != null
// The null-check for Customer is added automatically
```

---

## Method Catalog by Type

### Boolean

```csharp
.IsTrue(u => u.IsActive)
.IsFalse(u => u.IsDeleted)
```

### Comparison

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
.IsEmail(u => u.Email)              // ValiFlow<T> only
.IsUrl(u => u.Website)              // ValiFlow<T> only
.IsGuid(u => u.ExternalId)          // ValiFlow<T> only
.IsNullOrEmpty(u => u.MiddleName)
.IsNotNullOrEmpty(u => u.Name)
.IsNullOrWhiteSpace(u => u.Notes)
.RegexMatch(u => u.Code, @"^\d{5}$")  // ValiFlow<T> only
```

### Numeric (int, long, double, decimal, float, short)

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

### Collection

```csharp
.IsEmpty(u => u.Tags)
.IsNotEmpty(u => u.Roles)
.CountEquals(u => u.Items, 3)
.CountGreaterThan(u => u.Items, 0)
.CountLessThan(u => u.Items, 100)
.Contains(u => u.Roles, "Admin")         // collection contains an element
.All(u => u.Items, i => i.Price > 0)     // ValiFlow<T> only
.Any(u => u.Items, i => i.IsActive)      // ValiFlow<T> only
.None(u => u.Items, i => i.IsDeleted)    // ValiFlow<T> only
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

## Reusing Rules as a Base

```csharp
// Base rule
var baseUserRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Implicit freeze on first use
baseUserRule.IsValid(someUser);

// Create extended rules (forks) without modifying the base
var adminRule = baseUserRule.IsTrue(u => u.IsAdmin);
var activeRule = baseUserRule.IsTrue(u => u.IsActive);

// baseUserRule is still only Email + Age
// adminRule  = Email + Age + IsAdmin
// activeRule = Email + Age + IsActive
```

---

## Explaining a Rule

Useful for logging and debugging:

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

Console.WriteLine(rule.Explain());
// Output: "(x.Age > 18) AND (x.IsActive == True)"
```
