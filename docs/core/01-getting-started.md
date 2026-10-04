---
sidebar_position: 1
---

# Getting Started with Vali-Flow.Core

## What Is Vali-Flow.Core?

**Vali-Flow.Core** is a dependency-free .NET library for building `Expression<Func<T, bool>>` expression trees through a fluent API. It allows you to compose validation and filtering rules in a readable, type-safe way — without writing raw LINQ expression code.

Key properties:

- Zero NuGet dependencies.
- Targets `net8.0` and `net9.0`.
- Produces standard `Expression<Func<T, bool>>` trees consumable by LINQ, Entity Framework Core, and any other LINQ provider.
- Supports in-memory validation with detailed error reporting.

---

## ValiFlow\<T\> vs ValiFlowQuery\<T\>

| | `ValiFlow<T>` | `ValiFlowQuery<T>` |
|---|---|---|
| **Use case** | In-memory objects and EF Core | EF Core queries only |
| **In-memory validation** (`IsValid`, `Validate`, `BuildCached`) | Yes | No |
| **EF Core translatable** | Most methods | All methods |
| **Methods like `IsInEnum`, `IsDefault`** | Yes (in-memory only) | No |
| **Regex / `Contains` with `StringComparison`** | Yes (in-memory only) | No |

Use `ValiFlow<T>` when you need both in-memory validation and expression-tree output.
Use `ValiFlowQuery<T>` when you are building queries exclusively for an EF Core `DbSet<T>` and need guaranteed SQL translatability.

---

## Installation

```bash
dotnet add package Vali-Flow.Core
```

Or via the NuGet Package Manager:

```
Install-Package Vali-Flow.Core
```

---

## Quick Start

```csharp
using ValiFlow.Builder;

var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
    .GreaterThan(o => o.Total, 0m)
    .IsNotNullOrEmpty(o => o.Reference);

// In-memory: returns true if the object satisfies all conditions
bool valid = rule.IsValid(order);

// Get a compiled delegate (result is cached after first compilation)
Func<Order, bool> predicate = rule.BuildCached();

// Get the raw expression tree (for EF Core / LINQ providers)
Expression<Func<Order, bool>> expr = rule.Build();

// Detailed validation with error reporting
var result = rule.Validate(order);
if (!result.IsValid)
    Console.WriteLine(result.ErrorMessage);
```

---

## Fluent Chaining

Conditions are chained with `And()` (the default) or `Or()`.

```csharp
// AND is implicit — no call needed
var rule = new ValiFlow<Product>()
    .NotNull(p => p.Name)
    .GreaterThan(p => p.Price, 0m)
    .LessThanOrEqualTo(p => p.Stock, 10_000);

// OR must be explicit
var rule = new ValiFlow<User>()
    .EqualTo(u => u.Role, "Admin")
    .Or()
    .EqualTo(u => u.Role, "Manager");
```

Operator precedence follows standard logic: `AND` binds more tightly than `OR`. Groups of AND-connected conditions separated by OR are evaluated as `(A && B) || (C && D)`.

---

## WithMessage and WithError

Attach a human-readable message or a structured error object to any condition:

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
        .WithMessage("Customer ID is required.")
    .GreaterThan(o => o.Total, 0m)
        .WithMessage("Order total must be greater than zero.")
    .IsNotNullOrEmpty(o => o.Reference)
        .WithError(new ValidationError("REF_001", "Reference cannot be empty."));
```

---

## Validate() Result Structure

`Validate(T instance)` returns a `ValidationResult` with:

| Member | Type | Description |
|--------|------|-------------|
| `IsValid` | `bool` | `true` if all conditions pass |
| `ErrorMessage` | `string?` | Message from the first failing condition, or `null` |
| `Error` | `object?` | Structured error from `WithError(...)`, or `null` |

```csharp
var result = rule.Validate(order);

if (!result.IsValid)
{
    // Use the message
    Console.WriteLine(result.ErrorMessage);

    // Or cast the structured error
    if (result.Error is ValidationError err)
        logger.LogError("[{Code}] {Message}", err.Code, err.Message);
}
```

---

## When / Unless — Conditional Conditions

Apply a condition only when a predicate is satisfied (`When`) or not satisfied (`Unless`):

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
    // Only validate ShippingAddress when the order requires shipping
    .IsNotNullOrEmpty(o => o.ShippingAddress)
        .When(o => o.RequiresShipping)
    // Only validate DiscountCode when the order does NOT have a fixed price
    .IsNotNullOrEmpty(o => o.DiscountCode)
        .Unless(o => o.HasFixedPrice);
```

---

## AddSubGroup — Grouped Logic

`AddSubGroup` lets you nest a self-contained block of conditions as a single logical unit. This is equivalent to wrapping conditions in parentheses:

```csharp
// Equivalent to: (Status == "Active" || Status == "Pending") && Total > 0
var rule = new ValiFlow<Order>()
    .AddSubGroup(g => g
        .EqualTo(o => o.Status, "Active")
        .Or()
        .EqualTo(o => o.Status, "Pending"))
    .GreaterThan(o => o.Total, 0m);
```

Sub-groups compose with the outer builder using `And` or `Or` just like any other condition.
