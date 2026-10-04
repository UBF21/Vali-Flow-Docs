---
sidebar_position: 2
---

# Métodos de comparación y booleanos

Esta página documenta todos los checks booleanos, checks de nulidad, comparaciones de igualdad, verificaciones de tipos y comparaciones entre campos disponibles en `ValiFlow<T>`.

---

## Checks booleanos

### `IsTrue(selector)`

La propiedad seleccionada debe evaluarse como `true`.

```csharp
var rule = new ValiFlow<User>()
    .IsTrue(u => u.IsActive);
```

### `IsFalse(selector)`

La propiedad seleccionada debe evaluarse como `false`.

```csharp
var rule = new ValiFlow<User>()
    .IsFalse(u => u.IsDeleted);
```

---

## Checks de nulidad

### `NotNull(selector)`

El miembro seleccionado no debe ser `null`. Lanza una excepción si el selector siempre produce un tipo de valor no anulable.

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId);
```

### `IsNotNull(selector)`

Alias de `NotNull`. Se prefiere este nombre por consistencia con la convención de nomenclatura `Is*`.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNull(p => p.Name);
```

### `Null(selector)`

El miembro seleccionado debe ser `null`.

```csharp
var rule = new ValiFlow<User>()
    .Null(u => u.DeletedAt);
```

### `IsNull(selector)`

Alias de `Null`.

```csharp
var rule = new ValiFlow<Order>()
    .IsNull(o => o.CancelledAt);
```

---

## Igualdad

### `EqualTo(selector, value)`

La propiedad seleccionada debe ser igual a `value`. `TValue` debe implementar `IEquatable<TValue>`.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(o => o.Status, "Active");
```

### `NotEqualTo(selector, value)`

La propiedad seleccionada no debe ser igual a `value`.

```csharp
var rule = new ValiFlow<Order>()
    .NotEqualTo(o => o.Status, "Cancelled");
```

---

## Verificaciones de tipo

### `IsInEnum(selector)`

El valor seleccionado debe ser un miembro definido de su tipo enum. Esta verificación usa `Enum.IsDefined` y se evalúa en memoria.

> **Nota:** Solo en memoria. Este método no es traducible a SQL por EF Core. Usa `ValiFlow<T>` (no `ValiFlowQuery<T>`) cuando esta condición sea necesaria.

```csharp
var rule = new ValiFlow<Order>()
    .IsInEnum(o => o.PaymentMethod);
```

### `IsDefault(selector)`

El valor seleccionado debe ser igual a `default(TValue)` — es decir, `null` para tipos de referencia, `0` para tipos numéricos, `DateTime.MinValue` para `DateTime`, etc.

> **Nota:** Solo en memoria. No es traducible a SQL por EF Core.

```csharp
var rule = new ValiFlow<Booking>()
    .IsDefault(b => b.CheckOutDate); // true cuando CheckOutDate == default(DateTime)
```

### `IsNotDefault(selector)`

El valor seleccionado no debe ser igual a `default(TValue)`.

> **Nota:** Solo en memoria. No es traducible a SQL por EF Core.

```csharp
var rule = new ValiFlow<Booking>()
    .IsNotDefault(b => b.Id); // asegura que Id ha sido asignado
```

---

## Comparaciones entre campos

Estos métodos comparan dos propiedades de la misma entidad entre sí. El tipo del selector `TValue` debe implementar `IComparable<TValue>`, lo que incluye `DateTime`, `decimal`, `int`, `string`, `DateOnly`, `TimeOnly`, `DateTimeOffset` y cualquier otro tipo comparable.

### `GreaterThan(leftSelector, rightSelector)`

`left > right` — la propiedad izquierda debe ser estrictamente mayor que la derecha.

```csharp
var rule = new ValiFlow<Booking>()
    .GreaterThan(b => b.CheckOut, b => b.CheckIn);
```

### `GreaterThanOrEqualTo(leftSelector, rightSelector)`

`left >= right`.

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThanOrEqualTo(p => p.MaxPrice, p => p.MinPrice);
```

### `LessThan(leftSelector, rightSelector)`

`left < right`.

```csharp
var rule = new ValiFlow<Order>()
    .LessThan(o => o.DiscountedPrice, o => o.OriginalPrice);
```

### `LessThanOrEqualTo(leftSelector, rightSelector)`

`left <= right`.

```csharp
var rule = new ValiFlow<Warehouse>()
    .LessThanOrEqualTo(w => w.CurrentStock, w => w.Capacity);
```

---

## Ejemplo práctico

La siguiente regla combina checks booleanos, de nulidad, igualdad, tipo y comparaciones entre campos para validar una entidad `Booking`:

```csharp
var rule = new ValiFlow<Booking>()
    // Id debe haber sido asignado (distinto del valor por defecto)
    .IsNotDefault(b => b.Id)
    // El nombre del huésped no debe ser null
    .IsNotNull(b => b.GuestName)
    // Solo se aceptan reservas confirmadas
    .EqualTo(b => b.Status, BookingStatus.Confirmed)
    // PaymentMethod debe ser un valor de enum válido
    .IsInEnum(b => b.PaymentMethod)
    // La reserva no debe estar cancelada
    .IsFalse(b => b.IsCancelled)
    // El check-out debe ser posterior al check-in
    .GreaterThan(b => b.CheckOut, b => b.CheckIn);

var result = rule.Validate(booking);
if (!result.IsValid)
    Console.WriteLine($"Reserva inválida: {result.ErrorMessage}");
```

> **Nota:** `IsNotDefault` e `IsInEnum` son solo en memoria. Si pasas la salida de `Build()` de esta regla a una consulta de EF Core, esas condiciones lanzarán una excepción de traducción. En ese escenario, evalúalas por separado en memoria después de la consulta a la base de datos, o reemplázalas con equivalentes traducibles por EF Core.
