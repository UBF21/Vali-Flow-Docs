# Arquitectura — ValiFlowQuery y seguridad EF Core

## El problema de EF Core y las expresiones

Entity Framework Core traduce `Expression<Func<T, bool>>` a SQL. Pero no puede traducir cualquier expresión: solo aquellas que tienen un equivalente en SQL y que el proveedor de base de datos entiende.

Cuando EF Core encuentra una expresión que no puede traducir, lanza una excepción en tiempo de ejecución:

```
InvalidOperationException: The LINQ expression '...' could not be translated.
Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly
by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'.
```

Este error aparece en producción, no en tiempo de compilación. Es difícil de detectar porque los tests en memoria pasan sin problemas (LINQ-to-Objects evalúa todo en memoria y nunca falla por este motivo).

---

## Qué expresiones NO puede traducir EF Core

Las expresiones que EF Core no puede traducir a SQL son aquellas que:

- Usan `Regex.IsMatch` (no existe en SQL estándar)
- Usan `StringComparison` (ej: `string.Contains(s, StringComparison.OrdinalIgnoreCase)`)
- Usan métodos de `char` (ej: `char.IsLetter`, `char.IsDigit`)
- Usan lambdas como predicados dentro de colecciones en memoria (ej: `list.Any(x => x.IsActive)`)
- Usan `Enum.IsDefined`, `string.IsNullOrWhiteSpace` con algunas versiones del proveedor
- Usan `.ToLower()` con predicados complejos

---

## `ValiFlowQuery<T>`: el subconjunto EF Core-safe

`ValiFlowQuery<T>` es una variante de `ValiFlow<T>` que expone **solo los métodos cuyas expresiones EF Core puede traducir a SQL**. Si se usa `ValiFlowQuery<T>`, se garantiza en tiempo de compilación que la expresión resultante es traducible.

```csharp
// Con ValiFlow<T>: todos los métodos disponibles, incluyendo no-traducibles
var rule = new ValiFlow<User>()
    .IsEmail(u => u.Email)    // NO traducible a SQL
    .GreaterThan(u => u.Age, 18);

// Con ValiFlowQuery<T>: solo métodos EF Core-safe
var query = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)    // traducible: WHERE Email IS NOT NULL
    .GreaterThan(u => u.Age, 18);  // traducible: WHERE Age > 18

// Uso con IQueryable:
var results = await dbContext.Users
    .Where(query.Build())
    .ToListAsync();
```

---

## Métodos ausentes en ValiFlowQuery

`ValiFlowQuery<T>` omite deliberadamente los siguientes grupos de métodos:

### Métodos basados en Regex

```csharp
// Estos métodos NO existen en ValiFlowQuery<T>:
IsEmail(selector)
IsUrl(selector)
IsPhoneNumber(selector)
IsGuid(selector)
IsIPAddress(selector)
RegexMatch(selector, pattern)
IsAlphanumeric(selector)
```

Motivo: usan `Regex.IsMatch` internamente, que no tiene equivalente en SQL.

### Métodos basados en char

```csharp
// No disponibles en ValiFlowQuery<T>:
HasOnlyDigits(selector)                // usa char.IsDigit
HasOnlyLetters(selector)               // usa char.IsLetter
```

> `EqualToIgnoreCase`, `IsTrimmed`, `IsLowerCase` e `IsUpperCase` **sí están
> disponibles** en `ValiFlowQuery<T>` — cada uno tiene su propia
> reimplementación EF-safe en `StringExpressionQuery` (por ejemplo, `IsTrimmed`
> se traduce a `val == val.Trim()`, y `EqualToIgnoreCase` a una comparación
> basada en `ToLower()`). El analyzer VF001 los marcaba incorrectamente como
> no traducibles hasta que ese falso positivo se corrigió en v2.0.3.

### Métodos de colección con predicados lambda

```csharp
// No disponibles en ValiFlowQuery<T>:
All(selector, predicate)
Any(selector, predicate)
None(selector, predicate)
EachItem(selector, predicate)
AnyItem(selector, predicate)
AllMatch(selector, predicate)
DistinctCount(selector, count)
HasDuplicates(selector)
```

Motivo: los predicados lambda dentro de colecciones no se pueden traducir a SQL con LINQ.

### Otros métodos en memoria

```csharp
// No disponibles en ValiFlowQuery<T>:
IsOneOf(selector, values[])   // usa Enumerable.Contains que puede no traducirse
IsInEnum(selector)             // usa Enum.IsDefined
```

---

## El Analyzer VF001

El Analyzer es un componente de Roslyn que analiza el código fuente durante la compilación (o en el IDE en tiempo real) y emite diagnósticos. `ValiFlowNonEfMethodAnalyzer` detecta cuando se llama un método no-EF-safe sobre una instancia de `ValiFlowQuery<T>`.

Sin el Analyzer, el error solo aparece en tiempo de ejecución. Con el Analyzer, aparece en tiempo de compilación:

```csharp
var query = new ValiFlowQuery<User>();
query.IsEmail(u => u.Email);
//    ^^^^^^^
// warning VF001: Method 'IsEmail' on ValiFlowQuery<T> is not translatable
//                by EF Core providers. Use ValiFlow<T> for in-memory validation.
```

El warning aparece en el IDE (subrayado amarillo) y en la salida del build. Se puede configurar para que sea un error en proyectos que requieren consistencia estricta.

---

## Cómo ValiFlowQuery evita los métodos no-EF-safe

`ValiFlowQuery<T>` simplemente no declara ni implementa los métodos que no son EF Core-safe. Como no existen en la clase ni en sus interfaces, el compilador de C# emite un error si se intenta llamarlos.

El Analyzer de Roslyn es una capa adicional de protección para los casos donde el tipo de la variable es la interfaz base y no `ValiFlowQuery<T>` directamente:

```csharp
IExpression<ValiFlowQuery<User>, User> rule = new ValiFlowQuery<User>();
// El compilador no puede detectar el problema aquí porque está tipado como IExpression
// El Analyzer sí puede detectarlo analizando el tipo real de la instancia
```

---

## Cuándo usar ValiFlow vs ValiFlowQuery

| Situación | Usar |
|---|---|
| Validación de objetos en memoria (lógica de negocio, controllers) | `ValiFlow<T>` |
| Filtrado de repositorios con EF Core (`IQueryable`) | `ValiFlowQuery<T>` |
| Reglas de negocio que también se aplican como filtros de DB | `ValiFlowQuery<T>` si no necesitas métodos regex/char; de lo contrario `ValiFlow<T>` solo para validación |
| Tests unitarios | `ValiFlow<T>` (siempre en memoria) |

---

## Ejemplo de migración de ValiFlow a ValiFlowQuery

```csharp
// ANTES: ValiFlow<T> con métodos en memoria
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)          // no EF Core-safe
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Usar en EF Core: FALLA en runtime
var users = dbContext.Users.Where(rule.Build()).ToList();
// InvalidOperationException: IsEmail could not be translated

// DESPUÉS: ValiFlowQuery<T> para la parte EF Core-safe
var dbFilter = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Separar la validación de formato con ValiFlow<T>
var emailFormat = new ValiFlow<User>()
    .IsEmail(u => u.Email);

// Uso:
var candidates = await dbContext.Users
    .Where(dbFilter.Build())         // filtrado en SQL
    .ToListAsync();

var valid = candidates
    .Where(emailFormat.BuildCached()) // validación en memoria
    .ToList();
```

---

## La propiedad de traducibilidad y los comentarios `<remarks>`

En las interfaces, los métodos que no son EF Core-safe están documentados con `<remarks>Not EF Core translatable</remarks>`. Esto sirve como señal para los mantenedores de la librería de que ese método no debe aparecer en `ValiFlowQuery<T>`:

```csharp
// En IStringExpression:
/// <summary>Validates that the value matches the standard email address format.</summary>
/// <remarks>Not EF Core translatable. Uses Regex.IsMatch internally.</remarks>
TBuilder IsEmail(Expression<Func<T, string?>> selector);
```

Esta convención es parte del **checklist de adición de métodos** documentado en [adding-new-methods.md](../guides/adding-new-methods.md).
