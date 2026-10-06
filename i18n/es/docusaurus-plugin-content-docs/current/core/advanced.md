# Características Avanzadas

Esta página cubre las capacidades avanzadas de `BaseExpression<TBuilder, T>`: construcción y compilación de expresiones, helpers de validación, adjuntar mensajes, operadores lógicos, condiciones condicionales, agrupación de sub-grupos y seguridad en concurrencia.

**Ejemplos:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

---

## Construir Expresiones

### `Build()`

Devuelve el árbol de expresiones `Expression<Func<T, bool>>` compuesto. El árbol se recompila en cada llamada, a menos que se use la versión en caché.

```csharp
Expression<Func<Order, bool>> expr = rule.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```

### `BuildCached()`

Devuelve un delegado `Func<T, bool>` compilado. El delegado compilado se almacena en caché internamente tras la primera llamada — las llamadas posteriores devuelven la misma instancia.

```csharp
Func<Order, bool> predicate = rule.BuildCached();
var valid = orders.Where(predicate).ToList();
```

### `BuildNegated()`

Devuelve un árbol de expresiones negado — el complemento lógico de `Build()`.

```csharp
Expression<Func<Order, bool>> notExpr = rule.BuildNegated();
var invalid = await dbContext.Orders.Where(notExpr).ToListAsync();
```

---

## Helpers de Validación

### `IsValid`

Devuelve `true` cuando la entidad satisface todas las condiciones.

```csharp
bool ok = rule.IsValid(entity);
```

### `IsNotValid`

Devuelve `true` cuando la entidad falla al menos una condición.

```csharp
bool failed = rule.IsNotValid(entity);
```

### `Validate`

Devuelve un `ValidationResult` para la entidad con información de error estructurada.

```csharp
ValidationResult result = rule.Validate(entity);

Console.WriteLine(result.IsValid);        // bool
Console.WriteLine(result.ErrorMessage);   // string — primer mensaje de fallo
Console.WriteLine(result.PropertyPath);   // string — adjuntado con WithError()
Console.WriteLine(result.Severity);       // enum Severity
```

> **Short-circuit por grupos OR:** `Validate()` evalúa los grupos OR de uno en uno. En cuanto un grupo pasa (todas sus condiciones AND se cumplen), `Validate()` retorna `Ok()` inmediatamente sin evaluar los grupos restantes. Solo cuando todos los grupos fallan se recopilan y retornan los errores.

### `ValidateAll`

Devuelve un `IEnumerable<ValidationResult>` para una colección de entidades.

```csharp
IEnumerable<ValidationResult> all = rule.ValidateAll(entities);

var errors = all.Where(r => !r.IsValid).ToList();
```

### `Explain`

Devuelve un string legible que describe qué condiciones pasaron o fallaron para una entidad dada. Útil para depuración y logging.

```csharp
string explanation = rule.Explain(entity);
Console.WriteLine(explanation);
```

---

## WithMessage / WithError

Adjunta un mensaje descriptivo o una ruta de propiedad a la **condición añadida más recientemente**.

### `WithMessage(string)`

Adjunta un mensaje de error estático.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage("El nombre debe tener al menos 3 caracteres.");
```

### `WithMessage(Func<string>)`

Adjunta un mensaje evaluado de forma diferida o localizado.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage(() => Resources.NameTooShort);
```

> **Nota:** La función factory no debe retornar `null`. Si retorna `null`, la condición se trata como si no tuviera mensaje y será excluida silenciosamente del `ValidationResult` aunque la condición haya fallado.

### `WithError(string)`

Adjunta una ruta de propiedad para identificar qué campo falló.

```csharp
rule.MinLength(x => x.Name, 3)
    .WithMessage("El nombre es demasiado corto")
    .WithError("Name");
```

Combinando los tres:

```csharp
rule.NotNull(x => x.CustomerId)
    .WithMessage(() => Resources.CustomerRequired)
    .WithError(nameof(Order.CustomerId));
```

---

## Operadores Lógicos (And / Or)

### And (predeterminado)

Las condiciones se combinan con `AND` por defecto. No es necesario llamar a `And()` explícitamente.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")   // AND
    .GreaterThan(x => x.Total, 0m);     // AND
```

### `Or()`

Inserta un `OR` lógico entre la condición anterior y la siguiente.

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .Or()
    .EqualTo(x => x.Status, "Pending");
// Produce: Status == "Active" OR Status == "Pending"
```

Mezcla de `And` y `Or`:

```csharp
var rule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active")
    .GreaterThan(x => x.Total, 0m)       // AND
    .Or()
    .EqualTo(x => x.Status, "Pending")   // OR
    .GreaterThan(x => x.Total, 0m);      // AND (aplica a la rama Pending)
```

> **Nota:** Las condiciones conectadas con `And` se evalúan antes que los grupos separados por `Or`. El builder agrupa las condiciones `And` consecutivas antes de combinar grupos con `Or` — consistente con la precedencia estándar de operadores booleanos.

---

## When / Unless (Condiciones Condicionales)

Aplica condiciones solo cuando un indicador en tiempo de ejecución es verdadero o falso.

### `When`

Añade las condiciones internas solo cuando el predicado es `true`.

```csharp
rule.When(order.IsInternational, r =>
    r.IsNotNullOrEmpty(x => x.CustomsCode));
```

### `Unless`

Añade las condiciones internas solo cuando el predicado es `false`.

```csharp
rule.Unless(order.IsDraft, r =>
    r.NotNull(x => x.CustomerId));
```

Combinando ambos:

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(x => x.Total)
    .When(order.IsInternational, r =>
        r.IsNotNullOrEmpty(x => x.CustomsCode)
         .IsNotNullOrEmpty(x => x.DestinationCountry))
    .Unless(order.IsDraft, r =>
        r.NotNull(x => x.CustomerId)
         .GreaterThan(x => x.Total, 0m));
```

---

## AddSubGroup — Lógica Agrupada

Usa `AddSubGroup` para crear sub-expresiones agrupadas explícitamente. Es el equivalente explícito de encadenar `.Or()` entre condiciones, pero envuelve una sub-regla completa como una única unidad agrupada.

```csharp
// (Type == "A" AND Amount > 100) OR (Type == "B" AND Amount < 50)
var rule = new ValiFlow<Order>()
    .AddSubGroup(g => g
        .EqualTo(x => x.Type, "A")
        .GreaterThan(x => x.Amount, 100))
    .Or()
    .AddSubGroup(g => g
        .EqualTo(x => x.Type, "B")
        .LessThan(x => x.Amount, 50));
```

> **Nota de diseño:** `AddSubGroup(g => ...)` y `Add().Or().Add()` producen árboles de expresiones equivalentes. Mantenlos consistentes al escribir reglas compuestas.

---

## Freeze / Clone — Seguridad en Concurrencia

### `Freeze()`

Sella el builder para que no se puedan añadir más condiciones. Cualquier llamada a `Add()` después de `Freeze()` devuelve un **fork** (una nueva copia independiente) en lugar de mutar el original. Útil para compartir una regla base entre hilos.

```csharp
var baseRule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active");

baseRule.Freeze(); // sellarlo

// Las adiciones posteriores devuelven un fork, no una mutación
var extendedRule = baseRule.GreaterThan(x => x.Total, 1000m);
// baseRule no cambia; extendedRule es una nueva instancia
```

### `Clone()`

Crea una copia superficial O(1) del builder. El clon se recompila en su primer uso. Útil para crear variantes por solicitud o por hilo.

```csharp
var baseRule = new ValiFlow<Order>()
    .EqualTo(x => x.Status, "Active");

var premiumRule = baseRule.Clone();
premiumRule.GreaterThan(x => x.Total, 1000m); // solo afecta a premiumRule

bool isRegular = baseRule.IsValid(order);
bool isPremium = premiumRule.IsValid(order);
```

---

## Severity

Las condiciones usan `Severity.Error` por defecto. Puedes adjuntar `Severity.Warning` a una condición para indicar un fallo no bloqueante.

`Severity.Info` — Informativo. Una condición con esta severidad solo aparece en `ValidationResult` cuando **falla** y tiene un mensaje adjunto (via `WithMessage` o `WithError`). Una condición `Info` que falla sin mensaje es excluida silenciosamente de todas las colecciones del resultado. Esto es intencional: `Info` representa una sugerencia, no un fallo bloqueante.

```csharp
var rule = new ValiFlow<Order>()
    .NotNull(x => x.Name)
        .WithMessage("El nombre es obligatorio")
        // Severity.Error es el valor predeterminado
    .MinLength(x => x.Name, 2)
        .WithMessage("El nombre es muy corto — considera un nombre más largo")
        .WithSeverity(Severity.Warning);

ValidationResult result = rule.Validate(order);

if (!result.IsValid && result.Severity == Severity.Error)
{
    // fallo crítico
}
else if (!result.IsValid && result.Severity == Severity.Warning)
{
    // fallo leve — advertir al usuario
}
```

---

## Mini ejemplos

### 1) Reusar predicado cacheado

```csharp
var regla = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0)
    .IsTrue(p => p.IsActive);

Func<Product, bool> predicate = regla.BuildCached();
var available = products.Where(predicate).ToList();
```

### 2) Filtro negado para “fallidos”

```csharp
var regla = new ValiFlow<Order>()
    .IsTrue(o => o.IsPaid)
    .GreaterThan(o => o.Total, 0m);

Expression<Func<Order, bool>> failed = regla.BuildNegated();
var notPaid = await dbContext.Orders.Where(failed).ToListAsync();
```
