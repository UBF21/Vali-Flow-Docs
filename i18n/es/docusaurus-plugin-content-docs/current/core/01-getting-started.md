---
sidebar_position: 1
---

# Primeros pasos con Vali-Flow.Core

## ¿Qué es Vali-Flow.Core?

**Vali-Flow.Core** es una librería .NET sin dependencias externas para construir árboles de expresiones `Expression<Func<T, bool>>` mediante una API fluida. Permite componer reglas de validación y filtrado de forma legible y con seguridad de tipos, sin necesidad de escribir código de expresiones LINQ a mano.

Características principales:

- Sin dependencias de NuGet.
- Apunta a `net8.0` y `net9.0`.
- Produce árboles `Expression<Func<T, bool>>` estándar, consumibles por LINQ, Entity Framework Core y cualquier otro proveedor LINQ.
- Soporta validación en memoria con reporte detallado de errores.

---

## ValiFlow\<T\> vs ValiFlowQuery\<T\>

| | `ValiFlow<T>` | `ValiFlowQuery<T>` |
|---|---|---|
| **Caso de uso** | Objetos en memoria y EF Core | Solo consultas EF Core |
| **Validación en memoria** (`IsValid`, `Validate`, `BuildCached`) | Sí | No |
| **Traducible a SQL con EF Core** | La mayoría de métodos | Todos los métodos |
| **Métodos como `IsInEnum`, `IsDefault`** | Sí (solo en memoria) | No |
| **Regex / `Contains` con `StringComparison`** | Sí (solo en memoria) | No |

Usa `ValiFlow<T>` cuando necesites tanto validación en memoria como salida de árboles de expresiones.
Usa `ValiFlowQuery<T>` cuando construyas consultas exclusivamente para un `DbSet<T>` de EF Core y necesites garantía de traducción a SQL.

---

## Instalación

```bash
dotnet add package Vali-Flow.Core
```

O mediante el Administrador de Paquetes NuGet:

```
Install-Package Vali-Flow.Core
```

---

## Inicio rápido

```csharp
using ValiFlow.Builder;

var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
    .GreaterThan(o => o.Total, 0m)
    .IsNotNullOrEmpty(o => o.Reference);

// En memoria: devuelve true si el objeto cumple todas las condiciones
bool valid = rule.IsValid(order);

// Obtener un delegate compilado (el resultado se cachea después de la primera compilación)
Func<Order, bool> predicate = rule.BuildCached();

// Obtener el árbol de expresión (para EF Core / proveedores LINQ)
Expression<Func<Order, bool>> expr = rule.Build();

// Validación detallada con reporte de errores
var result = rule.Validate(order);
if (!result.IsValid)
    Console.WriteLine(result.ErrorMessage);
```

---

## Encadenamiento fluido

Las condiciones se encadenan con `And()` (por defecto) u `Or()`.

```csharp
// AND es implícito — no se necesita llamada explícita
var rule = new ValiFlow<Product>()
    .NotNull(p => p.Name)
    .GreaterThan(p => p.Price, 0m)
    .LessThanOrEqualTo(p => p.Stock, 10_000);

// OR debe ser explícito
var rule = new ValiFlow<User>()
    .EqualTo(u => u.Role, "Admin")
    .Or()
    .EqualTo(u => u.Role, "Manager");
```

La precedencia de operadores sigue la lógica estándar: `AND` tiene mayor precedencia que `OR`. Los grupos de condiciones unidas por AND separados por OR se evalúan como `(A && B) || (C && D)`.

---

## WithMessage y WithError

Adjunta un mensaje legible o un objeto de error estructurado a cualquier condición:

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
        .WithMessage("El ID de cliente es obligatorio.")
    .GreaterThan(o => o.Total, 0m)
        .WithMessage("El total del pedido debe ser mayor que cero.")
    .IsNotNullOrEmpty(o => o.Reference)
        .WithError(new ValidationError("REF_001", "La referencia no puede estar vacía."));
```

---

## Estructura del resultado de Validate()

`Validate(T instance)` devuelve un `ValidationResult` con:

| Miembro | Tipo | Descripción |
|---------|------|-------------|
| `IsValid` | `bool` | `true` si todas las condiciones se cumplen |
| `ErrorMessage` | `string?` | Mensaje de la primera condición que falla, o `null` |
| `Error` | `object?` | Error estructurado de `WithError(...)`, o `null` |

```csharp
var result = rule.Validate(order);

if (!result.IsValid)
{
    // Usar el mensaje
    Console.WriteLine(result.ErrorMessage);

    // O hacer cast al error estructurado
    if (result.Error is ValidationError err)
        logger.LogError("[{Code}] {Message}", err.Code, err.Message);
}
```

---

## When / Unless — Condiciones condicionales

Aplica una condición solo cuando un predicado se cumple (`When`) o no se cumple (`Unless`):

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
    // Solo validar ShippingAddress cuando el pedido requiere envío
    .IsNotNullOrEmpty(o => o.ShippingAddress)
        .When(o => o.RequiresShipping)
    // Solo validar DiscountCode cuando el pedido NO tiene precio fijo
    .IsNotNullOrEmpty(o => o.DiscountCode)
        .Unless(o => o.HasFixedPrice);
```

---

## AddSubGroup — Lógica agrupada

`AddSubGroup` permite anidar un bloque autocontenido de condiciones como una unidad lógica. Es equivalente a agrupar condiciones entre paréntesis:

```csharp
// Equivalente a: (Status == "Active" || Status == "Pending") && Total > 0
var rule = new ValiFlow<Order>()
    .AddSubGroup(g => g
        .EqualTo(o => o.Status, "Active")
        .Or()
        .EqualTo(o => o.Status, "Pending"))
    .GreaterThan(o => o.Total, 0m);
```

Los sub-grupos se componen con el builder externo usando `And` u `Or`, igual que cualquier otra condición.
