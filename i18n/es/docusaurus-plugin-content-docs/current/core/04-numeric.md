---
sidebar_position: 4
---

# Métodos Numéricos

Esta página cubre todos los métodos relacionados con números disponibles en `ValiFlow<T>`. Están definidos en `NumericExpression<TBuilder, T>` y `ComparisonExpression<TBuilder, T>`, y son accesibles directamente desde tu instancia del builder `ValiFlow<T>`.

Salvo que se indique lo contrario, cada método soporta **6 overloads numéricos**: `int`, `long`, `float`, `double`, `decimal` y `short`. Los ejemplos a continuación usan `int` y `decimal` por brevedad — las mismas firmas aplican para todos los tipos soportados.

---

## Cero

### `Zero`

Pasa cuando el valor es igual a `0`.

```csharp
var rule = new ValiFlow<Order>()
    .Zero(x => x.Quantity);
```

### `NotZero`

Pasa cuando el valor es distinto de `0`.

```csharp
var rule = new ValiFlow<Product>()
    .NotZero(x => x.Price);
```

---

## Signo

### `Positive`

Pasa cuando el valor es estrictamente mayor que `0`.

```csharp
var rule = new ValiFlow<Product>()
    .Positive(x => x.Amount);
```

### `Negative`

Pasa cuando el valor es estrictamente menor que `0`.

```csharp
var rule = new ValiFlow<Order>()
    .Negative(x => x.Balance);
```

---

## Comparación (valor constante)

### `GreaterThan`

Pasa cuando el valor de la propiedad es estrictamente mayor que la constante indicada. Soporta 6 overloads numéricos.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThan(x => x.Total, 0m);

var rule = new ValiFlow<Product>()
    .GreaterThan(x => x.Stock, 0);
```

### `GreaterThanOrEqualTo`

Pasa cuando el valor de la propiedad es mayor o igual que la constante indicada.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThanOrEqualTo(x => x.Quantity, 1);
```

### `LessThan`

Pasa cuando el valor de la propiedad es estrictamente menor que la constante indicada.

```csharp
var rule = new ValiFlow<Product>()
    .LessThan(x => x.Price, 1000m);
```

### `LessThanOrEqualTo`

Pasa cuando el valor de la propiedad es menor o igual que la constante indicada.

```csharp
var rule = new ValiFlow<User>()
    .LessThanOrEqualTo(x => x.Age, 120);
```

### `EqualTo`

Pasa cuando el valor numérico es exactamente igual a la constante indicada. Este es el overload de igualdad específico para números.

```csharp
var rule = new ValiFlow<Product>()
    .EqualTo(x => x.Score, 100);
```

---

## Comparación entre Propiedades

Estos overloads comparan dos propiedades de la misma entidad entre sí. Aceptan cualquier tipo que implemente `IComparable<T>`, lo que los hace aptos para `DateTime`, `decimal`, `int` y tipos similares.

### `GreaterThan` (entre propiedades)

Pasa cuando el valor de la primera propiedad es estrictamente mayor que el de la segunda.

```csharp
var rule = new ValiFlow<Order>()
    .GreaterThan(x => x.EndDate, x => x.StartDate);
```

### `GreaterThanOrEqualTo` (entre propiedades)

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThanOrEqualTo(x => x.Max, x => x.Min);
```

### `LessThan` (entre propiedades)

```csharp
var rule = new ValiFlow<Product>()
    .LessThan(x => x.Price, x => x.Cap);
```

### `LessThanOrEqualTo` (entre propiedades)

```csharp
var rule = new ValiFlow<Order>()
    .LessThanOrEqualTo(x => x.Quantity, x => x.Stock);
```

---

## Rango

### `InRange`

Pasa cuando el valor se encuentra dentro del rango inclusivo `[min, max]`. Soporta 6 overloads numéricos y una variante entre propiedades.

```csharp
// Límites constantes
var rule = new ValiFlow<Product>()
    .InRange(x => x.Score, 0, 100);

// Límites entre propiedades
var rule = new ValiFlow<Product>()
    .InRange(x => x.Value, x => x.Min, x => x.Max);
```

### `Between`

Alias / variante de `InRange` con semántica inclusiva. Úsalo cuando la intención se lee más naturalmente como descripción de rango.

```csharp
var rule = new ValiFlow<User>()
    .Between(x => x.Age, 18, 65);
```

### `IsBetweenExclusive`

Pasa cuando el valor está estrictamente dentro del intervalo abierto `(min, max)` — ambos límites están excluidos. Soporta 6 overloads numéricos.

```csharp
// 0 < Discount < 100
var rule = new ValiFlow<Product>()
    .IsBetweenExclusive(x => x.Discount, 0, 100);
```

---

## Tolerancia

### `IsCloseTo`

Pasa cuando `|valor - objetivo| <= tolerancia`. Útil para comparaciones de punto flotante. Soporta `float` y `double`.

```csharp
var rule = new ValiFlow<Product>()
    .IsCloseTo(x => x.Weight, 0.5, 0.01);   // dentro de ±0.01 de 0.5

var rule = new ValiFlow<Order>()
    .IsCloseTo(x => x.Latitude, 40.7128, 0.001);
```

---

## Paridad

### `IsEven`

Pasa cuando el valor es divisible por 2. Soporta `int` y `long`.

```csharp
var rule = new ValiFlow<Order>()
    .IsEven(x => x.Quantity);
```

### `IsOdd`

Pasa cuando el valor no es divisible por 2. Soporta `int` y `long`.

```csharp
var rule = new ValiFlow<Product>()
    .IsOdd(x => x.Id);
```

### `IsMultipleOf`

Pasa cuando el valor es un múltiplo exacto del divisor indicado. Soporta `int` y `long`.

```csharp
var rule = new ValiFlow<Order>()
    .IsMultipleOf(x => x.Quantity, 5);
```

---

## Extremos

### `MinValue`

Pasa cuando el valor de la propiedad es igual al mínimo representable para el tipo (p. ej. `int.MinValue`, `decimal.MinValue`). Soporta 6 overloads numéricos.

```csharp
var rule = new ValiFlow<Product>()
    .MinValue(x => x.Priority);
```

### `MaxValue`

Pasa cuando el valor de la propiedad es igual al máximo representable para el tipo. Soporta 6 overloads numéricos.

```csharp
var rule = new ValiFlow<Product>()
    .MaxValue(x => x.Priority);
```

---

## Numéricos Nullable

Estos métodos manejan propiedades numéricas nullable (`int?`, `long?`, `decimal?`, `double?`, `float?`).

### `IsNullOrZero`

Pasa cuando el valor nullable es `null` o `0`.

```csharp
var rule = new ValiFlow<Product>()
    .IsNullOrZero(x => x.Discount);
```

### `IsNotNullOrZero`

Pasa cuando el valor nullable no es ni `null` ni `0`.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNullOrZero(x => x.Price);
```

---

## Ejemplo Combinado

La siguiente regla valida una entidad `Product` con una variedad de restricciones numéricas:

```csharp
var rule = new ValiFlow<Product>()
    .NotZero(x => x.Price)
    .Positive(x => x.Price)
    .InRange(x => x.Stock, 0, 10000)
    .IsBetweenExclusive(x => x.Discount, 0, 100)   // 0 < Discount < 100
    .IsCloseTo(x => x.Weight, 0.5, 0.01);           // dentro de ±0.01 de 0.5

bool isValid = rule.Evaluate(product);

// Construir la expresión para LINQ/EF Core
Expression<Func<Product, bool>> expr = rule.Build();
var availableProducts = dbContext.Products.Where(expr).ToList();
```
