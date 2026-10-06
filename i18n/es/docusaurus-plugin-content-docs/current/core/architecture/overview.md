# Arquitectura — Visión General
import Drawio from '@theme/Drawio';
import coreStructure from '@site/static/diagrams/core-structure.drawio';
import coreExecutionFlow from '@site/static/diagrams/core-execution-flow.drawio';


## Qué es Vali-Flow.Core

Vali-Flow.Core es una librería .NET que permite construir **reglas de validación y filtros** de forma fluida (fluent API) encadenando métodos. El resultado de construir esas reglas es un `Expression<Func<T, bool>>`: una representación de código como datos que puede ser ejecutada en memoria o traducida a SQL por Entity Framework Core.

```csharp
// El usuario escribe esto:
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .MinLength(u => u.Email, 5)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Y obtiene esto (internamente):
// Expression<Func<User, bool>>:
//   x => x.Email != null
//        && x.Email.Length >= 5
//        && Regex.IsMatch(x.Email, emailPattern)
//        && x.Age > 18

// Que puede usar así:
bool isValid = rule.IsValid(user);                     // en memoria
var filtered = dbContext.Users.Where(rule.Build());    // con EF Core
```

---

## El problema que resuelve

### Sin la librería

Para filtrar una coleccion con multiples condiciones, el desarrollador escribe expresiones LINQ manualmente:

```csharp
// Opcion 1: Expression tree manual (verboso y propenso a errores)
var param = Expression.Parameter(typeof(User), "x");
var emailNotNull = Expression.NotEqual(
    Expression.Property(param, nameof(User.Email)),
    Expression.Constant(null)
);
var ageCheck = Expression.GreaterThan(
    Expression.Property(param, nameof(User.Age)),
    Expression.Constant(18)
);
var combined = Expression.AndAlso(emailNotNull, ageCheck);
var lambda = Expression.Lambda<Func<User, bool>>(combined, param);
// ... 20 lineas para 2 condiciones simples

// Opcion 2: Lambda directa (no reutilizable, no componible)
users.Where(u => u.Email != null && u.Age > 18)
// Funciona pero no se puede construir programaticamente, reutilizar, ni anotar con mensajes de error
```

### Con la librería

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// La misma regla sirve para validar Y para filtrar
bool valid = rule.IsValid(user);
var query = dbContext.Users.Where(rule.Build());
```

La librería resuelve tres problemas concretos:

1. **Verbosidad**: construir expression trees manualmente requiere decenas de líneas. La librería lo reduce a una línea por condición.
2. **Composición**: las reglas son objetos reutilizables. Se pueden clonar, extender, combinar con AND/OR.
3. **Validación con errores**: cada condición puede llevar un mensaje de error y un código, produciendo un `ValidationResult` detallado en lugar de un simple `true/false`.

---

## Targets y restricciones

| Característica | Valor |
|---|---|
| Frameworks soportados | `net8.0`, `net9.0` |
| Dependencias externas NuGet | Ninguna |
| Thread safety | Mutable durante construcción, thread-safe después de freeze |
| Traducibilidad EF Core | Parcial — ver `ValiFlowQuery<T>` |

---

## Mapa de componentes


<Drawio content={coreStructure} />

---

## Flujo de ejecución: del método al árbol final


<Drawio content={coreExecutionFlow} />

Cada sección de esta documentación profundiza en uno de estos pasos.

---

## Relacion entre ValiFlow y ValiFlowQuery

`ValiFlow<T>` expone todos los métodos disponibles, incluyendo algunos que no son traducibles a SQL por EF Core (expresiones regulares, comparaciones con `StringComparison`, predicados lambda en colecciones).

`ValiFlowQuery<T>` es una versión reducida que solo expone los métodos cuyas expresiones EF Core puede traducir a SQL. Si se intenta llamar un método no-traducible en un `ValiFlowQuery<T>`, el Analyzer de Roslyn `VF001` emite un warning en tiempo de compilación.

```
ValiFlow<T>         → para validación en memoria, lógica de negocio
ValiFlowQuery<T>    → para IQueryable, filtros en base de datos
```

Ver [ef-core-safety.md](ef-core-safety.md) para el detalle completo.