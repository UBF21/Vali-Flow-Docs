---
sidebar_position: 2
---

# Arquitectura — BaseExpression: el motor central

## Qué es BaseExpression

`BaseExpression<TBuilder, T>` es la clase que hace que todo funcione. Ningún usuario instancia esta clase directamente; es la clase base de `ValiFlow<T>` y `ValiFlowQuery<T>`. Su responsabilidad es:

1. Acumular condiciones a medida que el usuario encadena métodos
2. Gestionar el operador lógico entre condiciones (AND / OR)
3. Construir el árbol de expresión final cuando se llama `Build()`
4. Evaluar el árbol contra instancias concretas (`IsValid`, `Validate`)
5. Gestionar el ciclo de vida del builder (mutable → frozen → fork)

---

## CRTP: el truco que hace posible el method chaining tipado

El parámetro genérico `TBuilder` en `BaseExpression<TBuilder, T>` no es arbitrario. Sigue el patrón **CRTP** (Curiously Recurring Template Pattern): el tipo concreto se pasa a sí mismo como argumento genérico de su propia clase base.

```csharp
// ValiFlow<T> se pasa a sí mismo como TBuilder
public partial class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>
//                                               ^^^^^^^^^^^
//                                               "yo mismo"
```

Sin CRTP, el problema sería este: `BaseExpression` necesita que sus métodos retornen el tipo concreto del builder (para que el encadenamiento funcione), pero no sabe cuál es ese tipo concreto.

```csharp
// Sin CRTP: los métodos retornan BaseExpression, perdiendo el tipo
public BaseExpression<TBuilder, T> Or()  // retorna BaseExpression, no ValiFlow
{
    _nextIsAnd = 0;
    return this;  // el caller recibe BaseExpression, no ValiFlow
}

// Con CRTP: los métodos retornan TBuilder (que en la práctica es ValiFlow<T>)
public TBuilder Or()
{
    _nextIsAnd = 0;
    return (TBuilder)this;  // el caller recibe ValiFlow<T>
}
```

El resultado es que toda la cadena de métodos mantiene el tipo correcto:

```csharp
ValiFlow<User> rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)   // retorna ValiFlow<User>
    .Or()                           // retorna ValiFlow<User>
    .IsTrue(u => u.IsAdmin);        // retorna ValiFlow<User>
//  ^^^^^^^^^^^^^^^^^^^^^^^^ el compilador sabe en todo momento que es ValiFlow<User>
```

---

## Estado interno del builder

```csharp
public class BaseExpression<TBuilder, T>
{
    // Lista inmutable de condiciones acumuladas.
    // ImmutableList permite Fork sin copias profundas.
    private volatile ImmutableList<ConditionEntry<T>> _conditions
        = ImmutableList<ConditionEntry<T>>.Empty;

    // Operador del PRÓXIMO Add: 1=AND (default), 0=OR
    // Cambia a 0 cuando el usuario llama .Or()
    // Se resetea a 1 después de consumirse
    private int _nextIsAnd = 1;

    // Cache del delegate compilado (post-freeze)
    private Func<T, bool>? _cachedFunc;
    private Func<T, bool>? _cachedNegatedFunc;

    // Cache de la expresión compilada (post-freeze)
    private Expression<Func<T, bool>>? _cachedExpression;

    // Estado del ciclo de vida: 0=mutable, 1=frozen
    // int en lugar de bool para usar Interlocked.CompareExchange
    private int _frozen;

    // Lock dedicado solo para Validate() (iteración de condiciones con delegates)
    private readonly object _validateLock = new();
}
```

### Por qué ImmutableList

`ImmutableList<T>` permite que el **Fork** (clonar un builder) no requiera copiar todos los elementos. Cuando se crea un fork, el nuevo builder recibe la misma referencia a la lista. La primera mutación en el fork crea internamente una nueva lista.

Esto también permite que el builder pueda ser leído de forma concurrente (después de freeze) sin locks.

---

## Cómo funciona AND / OR

La lógica de AND/OR está diseñada para ser intuitiva: por defecto todo es AND, y se puede insertar un OR explícito.

```csharp
builder
    .GreaterThan(u => u.Age, 18)     // _nextIsAnd=1 → isAnd=true
    .IsTrue(u => u.IsActive)         // _nextIsAnd=1 → isAnd=true
    .Or()                            // _nextIsAnd=0
    .IsTrue(u => u.IsAdmin);         // _nextIsAnd=0 → isAnd=false, luego _nextIsAnd=1
```

Cada condición almacenada en `ConditionEntry<T>` lleva un flag `IsAnd` que registra qué operador la une con la condición anterior.

La lista interna queda así:

```
[
  ConditionEntry { Condition = Age > 18,    IsAnd = true  },
  ConditionEntry { Condition = IsActive,    IsAnd = true  },
  ConditionEntry { Condition = IsAdmin,     IsAnd = false },
]
```

---

## El algoritmo Build()

`Build()` convierte la lista plana de condiciones en un único `Expression<Func<T, bool>>`. El algoritmo tiene tres pasos.

### Paso 1: Agrupar por OR

Se recorre la lista. Cada vez que aparece una condición con `IsAnd = false`, se inicia un nuevo grupo. Las condiciones con `IsAnd = true` se agregan al grupo actual.

```
Entrada: [A(and=T), B(and=T), C(and=F), D(and=T), E(and=F)]

Grupo 1: [A, B]      ← A es la primera, B tiene IsAnd=true → mismo grupo
Grupo 2: [C, D]      ← C tiene IsAnd=false → nuevo grupo; D tiene IsAnd=true → mismo grupo
Grupo 3: [E]         ← E tiene IsAnd=false → nuevo grupo
```

### Paso 2: AND dentro de cada grupo

Dentro de cada grupo, las condiciones se combinan con `Expression.AndAlso` (el `&&` de LINQ):

```
Grupo 1: A AndAlso B
Grupo 2: C AndAlso D
Grupo 3: E
```

### Paso 3: OR entre grupos

Los grupos se combinan entre sí con `Expression.OrElse` (el `||` de LINQ):

```
(A AndAlso B) OrElse (C AndAlso D) OrElse E
```

El resultado final respeta la precedencia estándar: AND tiene mayor precedencia que OR, igual que en C#.

### Código del algoritmo (simplificado)

```csharp
public Expression<Func<T, bool>> Build()
{
    if (_conditions.Count == 0)
        return _ => true;  // sin condiciones: todo pasa

    var parameter = Expression.Parameter(typeof(T), "x");

    // Paso 1: agrupar por OR
    var groups = new List<List<Expression>>();
    List<Expression>? currentGroup = null;

    foreach (var entry in _conditions)
    {
        // Reemplazar el parámetro original de la expresión por el parámetro unificado
        var body = new ParameterReplacer(entry.Condition.Parameters[0], parameter)
            .Visit(entry.Condition.Body);

        if (!entry.IsAnd || currentGroup == null)
        {
            currentGroup = new List<Expression>();
            groups.Add(currentGroup);
        }
        currentGroup.Add(body);
    }

    // Pasos 2 y 3: AND dentro de grupo, OR entre grupos
    Expression? result = null;
    foreach (var group in groups)
    {
        Expression? groupExpr = null;
        foreach (var expr in group)
            groupExpr = groupExpr == null ? expr : Expression.AndAlso(groupExpr, expr);

        result = result == null ? groupExpr : Expression.OrElse(result, groupExpr!);
    }

    return Expression.Lambda<Func<T, bool>>(result!, parameter);
}
```

### Ejemplo concreto

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)      // A
    .IsTrue(u => u.IsActive)          // B
    .Or()
    .IsTrue(u => u.IsAdmin);          // C

// Build() produce:
//   x => (x.Age > 18 && x.IsActive) || x.IsAdmin
```

---

## Por qué se necesita ParameterReplacer

Cada lambda que el usuario escribe tiene su propio `ParameterExpression` (el `u =>` en `u => u.Age > 18`). Son objetos distintos aunque todos representan el mismo concepto ("el objeto T que estoy evaluando").

Cuando `Build()` combina múltiples condiciones en un solo árbol, todos los nodos deben compartir **exactamente el mismo** objeto `ParameterExpression`. Si no, el árbol no es válido.

```
Condición A: parámetro_A => parámetro_A.Age > 18
Condición B: parámetro_B => parámetro_B.IsActive
                ^^^^^^^^^^^   ^^^^^^^^^^^
                Son distintos objetos ParameterExpression

Build() unifica:
  parámetro_unificado => parámetro_unificado.Age > 18
                      && parámetro_unificado.IsActive
```

`ParameterReplacer` recorre el árbol de cada condición y reemplaza el parámetro original por el parámetro unificado. Ver [03-expression-visitors.md](../internals/03-expression-visitors.md) para el detalle de implementación.

---

## BuildNegated

`BuildNegated()` retorna el complemento lógico: `Expression.Not(Build())`. Es útil para construir filtros de exclusión.

```csharp
var activeRule = new ValiFlow<User>().IsTrue(u => u.IsActive);
var inactiveFilter = activeRule.BuildNegated();
// Produce: x => !x.IsActive
```

---

## IsValid vs Validate vs ValidateAll

Estos tres métodos evalúan las condiciones contra una instancia concreta, pero con distintos niveles de detalle.

### IsValid

El más simple. Compila el árbol a un delegate y lo ejecuta. Retorna `true` o `false`.

```csharp
bool ok = rule.IsValid(user);
```

Internamente usa el delegate cacheado (`_cachedFunc`) para evitar re-compilar el árbol en cada llamada.

### Validate

> **Short-circuit por grupos OR (v2.0.0):** `Validate()` evalúa los grupos OR de uno en uno. En cuanto un grupo pasa, retorna `ValidationResult.Ok()` inmediatamente sin evaluar los grupos restantes. Los detalles de error solo se recopilan para los grupos que ya fallaron. Esto refleja la semántica de short-circuit de `Build()`.

Evalúa cada condición **individualmente** y retorna un `ValidationResult` con la lista de errores.

```csharp
var result = rule.Validate(user);
if (!result.IsValid)
{
    foreach (var error in result.Errors)
        Console.WriteLine($"[{error.ErrorCode}] {error.Message}");
}
```

Para poder hacer esto, necesita ejecutar cada `ConditionEntry<T>` por separado. Cada `ConditionEntry` tiene su propio `Lazy<Func<T, bool>>` que compila el delegate de esa condición específica.

### ValidateAll

Igual que `Validate`, pero evalúa todas las condiciones **sin cortocircuito**: aunque fallen las primeras condiciones, sigue evaluando las siguientes para acumular todos los errores posibles.

`Validate` se detiene en la primera condición fallida de un grupo AND. `ValidateAll` no se detiene.

---

## El ciclo de vida Freeze/Fork

Este es uno de los diseños más importantes de la librería. Se explica en profundidad en [02-thread-safety.md](../internals/02-thread-safety.md), pero el concepto esencial es:

```
Estado MUTABLE:  el builder está siendo construido
                 se puede agregar condiciones, llamar .Or(), .WithMessage()
                 NO es thread-safe

                 ↓ (primera llamada a IsValid, Build, Freeze)

Estado FROZEN:   el builder está sellado
                 cualquier llamada a métodos de mutación retorna un NUEVO builder (fork)
                 el builder original NUNCA se modifica
                 IsValid, Build, Validate son thread-safe
```

Ejemplo:

```csharp
var baseRule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18);

baseRule.IsValid(user);  // <- freeze implícito aquí

// Ahora baseRule está frozen.
// Agregar condiciones NO modifica baseRule, crea un fork:
var adminRule   = baseRule.IsTrue(u => u.IsAdmin);    // fork independiente
var activeRule  = baseRule.IsTrue(u => u.IsActive);   // otro fork independiente

// baseRule sigue siendo: solo Age > 18
// adminRule  es: Age > 18 AND IsAdmin
// activeRule es: Age > 18 AND IsActive
```

---

## BuildCached

`BuildCached()` compila el árbol de expresión a un delegate `Func<T, bool>` y lo cachea. Después de la primera compilación, las llamadas siguientes retornan el delegate cacheado sin recompilar.

La publicación del cache usa `Volatile.Read/Write` e `Interlocked.CompareExchange` para ser thread-safe sin usar un lock, siguiendo el patrón de "publicación segura" (safe publication).

```csharp
// Compilar es costoso (~1ms). Cachear garantiza que se hace una sola vez.
var compiled = rule.BuildCached();  // compila si no existe cache
bool ok1 = compiled(user1);        // directo, sin re-compilar
bool ok2 = compiled(user2);        // directo, sin re-compilar
```

---

## Explain

`Explain()` retorna una representación legible del árbol de expresión:

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

Console.WriteLine(rule.Explain());
// Output: "(x.Age > 18) AND (x.IsActive == True)"
```

Útil para debugging y logging. Implementado por `ExpressionExplainer` en `Utils/`. Ver [03-expression-visitors.md](../internals/03-expression-visitors.md).

---

## Constraint del tipo genérico

```csharp
public class BaseExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
```

El constraint `where TBuilder : BaseExpression<TBuilder, T>, new()` tiene dos partes:

1. `BaseExpression<TBuilder, T>`: garantiza CRTP — `TBuilder` debe heredar de la misma clase base.
2. `new()`: garantiza que `TBuilder` tiene un constructor sin parámetros, necesario para crear forks en `Clone()`.

`CreateNestedBuilder<TProperty>()` es `virtual` (desde v2.0.0) con implementación por defecto `new ValiFlow<TProperty>()`. Las subclases externas de `BaseExpression` no necesitan sobreescribirlo a menos que requieran un tipo de builder diferente. `ValiFlowQuery<T>` lo sobreescribe para lanzar `UnreachableException` — su `ValidateNested` propio nunca delega a este factory.

Sin `new()`, `Clone()` no podría crear una nueva instancia del tipo concreto sin reflection.
