# Ejemplos de Vali-Flow Core

Esta página reúne ejemplos prácticos de `ValiFlow<T>` más allá del listado de métodos. Úsalos como patrones listos para copiar y adaptar.

---

## 1) Validación con `When`, mensajes y errores

```csharp
using ValiFlow.Builder;

var regla = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
        .WithMessage("Customer es requerido.")
    .GreaterThan(o => o.Total, 0m)
        .WithMessage("El total debe ser mayor a 0.")
    .IsNotNullOrEmpty(o => o.Reference)
        .WithError(new ValidationError("REF_EMPTY", "Reference no puede estar vacío"))
    .When(o => o.RequiresShipping, b => b
        .IsNotNullOrEmpty(x => x.ShippingAddress)
        .IsNotNullOrEmpty(x => x.ShippingCity));

var result = regla.Validate(order);
if (!result.IsValid)
{
    // Puedes usar el primer mensaje...
    Console.WriteLine(result.ErrorMessage);

    // ...o castear el error estructurado
    if (result.Error is ValidationError err)
        Console.WriteLine($"{err.Code}: {err.Message}");
}
```

---

## 2) Lógica OR agrupada con `AddSubGroup`

```csharp
var regla = new ValiFlow<User>()
    // (Role == Admin OR Role == Manager)
    .AddSubGroup(g => g
        .EqualTo(u => u.Role, "Admin")
        .Or()
        .EqualTo(u => u.Role, "Manager"))
    // AND IsActive = true
    .IsTrue(u => u.IsActive);

Expression<Func<User, bool>> expr = regla.Build();
```

---

## 3) Colecciones con regla interna reutilizable

```csharp
var reglaLinea = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice)
    .MinLength(x => x.Sku, 3);

var reglaOrden = new ValiFlow<Order>()
    .NotEmpty<OrderLine>(o => o.Lines)
    .AllMatch(o => o.Lines, reglaLinea)
    .AnyItem<OrderLine>(o => o.Lines, item =>
        item.GreaterThan(x => x.Discount, 0));

bool ok = reglaOrden.IsValid(order);
```

---

## 4) Separar reglas DB-safe vs en memoria

```csharp
// Filtro DB-safe
var query = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Reglas en memoria NO traducibles a SQL
var enMemoria = new ValiFlow<User>()
    .IsEmail(u => u.Email)
    .IsNotNullOrEmpty(u => u.DisplayName);

// Consulta DB
var users = await dbContext.Users.Where(query.Build()).ToListAsync();

// Validación en memoria después de cargar
var validUsers = users.Where(u => enMemoria.IsValid(u)).ToList();
```

---

## 5) Reutilizar un predicado compilado

```csharp
var regla = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0)
    .IsTrue(p => p.IsActive);

// Compila una vez, reutiliza muchas veces (se cachea tras la primera compilación)
Func<Product, bool> predicate = regla.BuildCached();

var available = products.Where(predicate).ToList();
```
