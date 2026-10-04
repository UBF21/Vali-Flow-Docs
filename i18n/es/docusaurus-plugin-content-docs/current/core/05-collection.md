---
sidebar_position: 5
---

# Métodos de Colecciones

`ValiFlow<T>` ofrece un conjunto completo de métodos para validar y filtrar propiedades de tipo colección. Cubre verificaciones de vacuidad, pertenencia a conjuntos, restricciones de conteo, proyecciones con predicados y unicidad.

---

## Vacuidad

### `NotEmpty<TValue>`

Pasa cuando la colección **no es null y no está vacía**.

```csharp
var rule = new ValiFlow<Product>()
    .NotEmpty<string>(x => x.Tags);
```

### `Empty<TValue>`

Pasa cuando la colección **es null o está vacía**.

```csharp
var rule = new ValiFlow<Order>()
    .Empty<string>(x => x.Errors);
```

---

## Pertenencia

### `In`

Pasa cuando el valor escalar seleccionado **está presente** en la lista proporcionada.

```csharp
var rule = new ValiFlow<Order>()
    .In(x => x.Status, ["Active", "Pending"]);
```

### `NotIn`

Pasa cuando el valor escalar seleccionado **no está presente** en la lista proporcionada.

```csharp
var rule = new ValiFlow<User>()
    .NotIn(x => x.Status, ["Banned", "Deleted"]);
```

### `Contains<TValue>`

Pasa cuando la colección contiene un valor específico.

```csharp
var rule = new ValiFlow<Product>()
    .Contains<string>(x => x.Tags, "csharp");
```

---

## Conteo

### `Count<TValue>`

Pasa cuando la colección tiene **exactamente N** elementos.

```csharp
var rule = new ValiFlow<Order>()
    .Count<OrderLine>(x => x.Items, 5);
```

### `CountEquals<TValue>`

Alias de `Count<TValue>` con intención semántica más clara.

```csharp
var rule = new ValiFlow<Order>()
    .CountEquals<OrderLine>(x => x.Items, 5);
```

### `CountBetween<TValue>`

Pasa cuando el número de elementos cae dentro del rango `[min, max]` (inclusive).

```csharp
var rule = new ValiFlow<Product>()
    .CountBetween<string>(x => x.Tags, 1, 10);
```

### `MinCount<TValue>`

Pasa cuando la colección tiene **al menos N** elementos. Una colección `null` falla.

```csharp
var rule = new ValiFlow<Order>()
    .MinCount<OrderLine>(x => x.Items, 1);
```

### `MaxCount<TValue>`

Pasa cuando la colección tiene **como máximo N** elementos. Una colección `null` falla.

```csharp
var rule = new ValiFlow<Order>()
    .MaxCount<OrderLine>(x => x.Items, 100);
```

---

## Predicados

### `Any<TValue>`

Pasa cuando **al menos un** elemento de la colección satisface el predicado.

```csharp
var rule = new ValiFlow<Order>()
    .Any<OrderLine>(x => x.Items, item => item.Price > 0);
```

### `All<TValue>`

Pasa cuando **todos** los elementos de la colección satisfacen el predicado.

```csharp
var rule = new ValiFlow<Order>()
    .All<OrderLine>(x => x.Items, item => item.IsActive);
```

### `None<TValue>`

Pasa cuando **ningún** elemento satisface el predicado. Una colección `null` pasa vacuamente.

```csharp
var rule = new ValiFlow<Product>()
    .None<string>(x => x.Tags, t => t == "banned");
```

### `AllMatch<TValue>` — patrón composable

Acepta un **`ValiFlow<TValue>` pre-construido** y pasa cuando todos los elementos lo satisfacen. Ideal para reutilizar reglas de validación internas.

```csharp
// Regla interna reutilizable
var lineItemRule = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice);

// Componer en la regla exterior
var orderRule = new ValiFlow<Order>()
    .NotEmpty<OrderLine>(x => x.Lines)
    .AllMatch(x => x.Lines, lineItemRule); // reutilizar el filtro pre-construido
```

### `EachItem<TValue>`

Variante inline de `AllMatch` — construye la regla interna con una lambda.

```csharp
var rule = new ValiFlow<Order>()
    .EachItem<OrderLine>(x => x.Items, item =>
        item.MinLength(x => x.ProductCode, 3));
```

### `AnyItem<TValue>`

Variante inline de `Any` — pasa cuando al menos un elemento satisface la regla construida inline.

```csharp
var rule = new ValiFlow<Order>()
    .AnyItem<OrderLine>(x => x.Items, item =>
        item.GreaterThan(x => x.Price, 0));
```

---

## Unicidad

### `HasDuplicates<TValue>`

Pasa cuando la colección contiene **elementos duplicados**.

```csharp
var rule = new ValiFlow<Order>()
    .HasDuplicates<string>(x => x.Codes);
```

### `DistinctCount<TValue>`

Pasa cuando la colección tiene **exactamente N elementos distintos**.

```csharp
var rule = new ValiFlow<Product>()
    .DistinctCount<string>(x => x.Tags, 3);
```

---

## Patrón Composable — Ejemplo Completo

```csharp
// Regla interna: cada línea de pedido debe ser válida
var lineItemRule = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice)
    .NotEmpty<string>(x => x.ProductCode);

// Regla exterior: el pedido en sí
var orderRule = new ValiFlow<Order>()
    .NotNull(x => x.CustomerId)
    .NotEmpty<OrderLine>(x => x.Lines)
    .MinCount<OrderLine>(x => x.Lines, 1)
    .MaxCount<OrderLine>(x => x.Lines, 100)
    .AllMatch(x => x.Lines, lineItemRule);

// Uso en memoria
bool isValid = orderRule.IsValid(order);

// Uso con IQueryable (ValiFlowQuery para EF Core)
Expression<Func<Order, bool>> expr = orderRule.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```
