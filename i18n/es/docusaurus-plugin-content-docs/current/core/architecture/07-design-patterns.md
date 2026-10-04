---
sidebar_position: 7
---

# Arquitectura — Catálogo de Patrones de Diseño

Este documento cataloga todos los patrones de diseño usados en Vali-Flow.Core, explicando por qué se eligió cada uno y dónde encontrarlo en el código.

---

## 1. Facade + Composition

**Qué es:** Un Facade es una clase que presenta una interfaz unificada hacia un conjunto de subsistemas. En lugar de heredar de múltiples clases (imposible en C#), la clase tiene instancias de esos subsistemas y delega las llamadas.

**Dónde está:** `Builder/ValiFlow.cs`

**Por qué se usa:**
- C# no permite herencia de múltiples clases
- Separar las 9 responsabilidades (strings, números, fechas, etc.) en clases independientes
- Permite que `ValiFlowQuery<T>` comparta los mismos componentes pero exponga solo un subconjunto

**El problema que resuelve:** Sin este patrón, toda la lógica de validación (string, numérico, colecciones, fechas, etc.) viviría en una sola clase de miles de líneas.

**Documentación detallada:** [03-facade-composition.md](03-facade-composition.md)

---

## 2. CRTP (Curiously Recurring Template Pattern)

**Qué es:** Un patrón de C++ adaptado a C#. La clase base recibe el tipo concreto como parámetro genérico, lo que le permite declarar métodos que retornan el tipo concreto sin conocerlo.

**Dónde está:** `Classes/Base/BaseExpression<TBuilder, T>`

```csharp
public class BaseExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
{
    public TBuilder Or()   // retorna el tipo concreto, no BaseExpression
    {
        _nextIsAnd = 0;
        return (TBuilder)this;
    }
}

// ValiFlow<T> hereda pasándose a sí mismo:
public class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>
```

**Por qué se usa:** Permite que todos los métodos de la clase base (como `Or()`, `And()`, `WithMessage()`) retornen el tipo concreto del builder, manteniendo el encadenamiento tipado a lo largo de toda la cadena de métodos.

**Sin CRTP:** Los métodos de BaseExpression retornarían `BaseExpression<TBuilder,T>`, perdiendo el tipo. El usuario no podría llamar métodos de `ValiFlow<T>` después de un `Or()` porque el compilador solo conocería `BaseExpression`.

---

## 3. Builder (Fluent Builder)

**Qué es:** El patrón Builder separa la construcción de un objeto complejo de su representación. La variante "fluent" permite encadenar métodos de construcción.

**Dónde está:** `Builder/ValiFlow.cs`, `Builder/ValiFlowQuery.cs`, `Builder/ValiSort.cs`

```csharp
var rule = new ValiFlow<User>()    // Builder
    .NotNull(u => u.Email)         // paso de construcción
    .MinLength(u => u.Email, 5)    // paso de construcción
    .GreaterThan(u => u.Age, 18);  // paso de construcción
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^
//  cada llamada retorna el builder para seguir encadenando
```

**Por qué se usa:**
- La construcción de un predicado tiene un número variable de pasos (0 a N condiciones)
- El objeto final (`Expression<Func<T,bool>>`) no existe hasta que se llama `Build()`
- El API fluent es más legible que pasar todas las condiciones en un constructor

---

## 4. Immutable Builder (Freeze/Fork)

**Qué es:** Una variante del Builder donde el objeto de construcción tiene dos fases: mutable (durante la construcción) e inmutable (durante el uso). Las mutaciones sobre un objeto inmutable crean copias en lugar de modificar el original.

**Dónde está:** `Classes/Base/BaseExpression.cs` (campo `_frozen`, método `Freeze`, lógica de fork en cada método de mutación)

```csharp
// Inspirado en IQueryable<T> de LINQ:
var query = dbContext.Users;        // mutable conceptualmente
var filtered = query.Where(...);    // no modifica query, crea uno nuevo
var sorted = filtered.OrderBy(...); // no modifica filtered, crea uno nuevo

// ValiFlow sigue el mismo patrón:
var base = new ValiFlow<User>().GreaterThan(u => u.Age, 18);
base.IsValid(user);               // freeze implícito
var extended = base.IsTrue(u => u.IsActive);  // fork, no modifica base
```

**Por qué se usa:**
- Permite compartir una regla base y extenderla sin riesgo de modificarla
- Hace que el builder sea thread-safe después de freeze (sin locks)
- Patrón familiar para los desarrolladores de C# que conocen `IQueryable`

**Documentación detallada:** [02-thread-safety.md](../internals/02-thread-safety.md)

---

## 5. Value Object (ConditionEntry)

**Qué es:** Un Value Object es un objeto cuya identidad está definida por sus valores, no por su referencia. En C# se implementa típicamente como `record`.

**Dónde está:** `Models/ConditionEntry.cs`

```csharp
internal sealed record ConditionEntry<T>
{
    public Expression<Func<T, bool>> Condition { get; init; }
    public bool IsAnd { get; init; }
    public string? ErrorCode { get; init; }
    // ...
}
```

**Por qué es record y no class:**
- Los `init` setters garantizan que los campos no cambian después de la construcción
- La sintaxis `with` permite crear copias modificadas de forma concisa:

```csharp
var updated = existingEntry with { Message = "nuevo mensaje" };
// existingEntry no cambia; updated es un nuevo objeto con todo igual excepto Message
```

Esto se usa en `MutateLastCondition` para implementar `WithMessage`, `WithError`, `WithSeverity` sin mutar la lista.

**Documentación detallada:** [01-condition-entry.md](../internals/01-condition-entry.md)

---

## 6. Registry (ValiFlowGlobal)

**Qué es:** El patrón Registry es un objeto conocido globalmente (típicamente un singleton o clase estática) donde los componentes pueden registrarse y luego ser recuperados por otros componentes.

**Dónde está:** `Builder/ValiFlowGlobal.cs`

```csharp
// Registro (durante startup de la aplicación)
ValiFlowGlobal.Register<User>(u => !u.IsDeleted);
ValiFlowGlobal.Register<User>(u => u.TenantId == currentTenantId);

// Uso (al construir queries)
var expr = builder.BuildWithGlobal();
// Produce: (condiciones del builder) AND (!u.IsDeleted) AND (u.TenantId == currentTenantId)
```

**Por qué se usa:**
- Los filtros globales (soft-delete, multi-tenancy) son transversales a toda la aplicación
- Sin este patrón, el desarrollador tendría que agregar `.IsTrue(u => !u.IsDeleted)` en cada query
- Un solo punto de registro elimina la duplicación

**Limitación importante:** Es un diccionario estático. Persiste por toda la vida del proceso. En tests, llamar `ValiFlowGlobal.ClearAll()` en el teardown para evitar contaminación entre tests.

---

## 7. Strategy (ValiSort)

**Qué es:** El patrón Strategy define una familia de algoritmos, encapsula cada uno y los hace intercambiables. El cliente elige el algoritmo sin conocer los detalles de implementación.

**Dónde está:** `Builder/ValiSort.cs` (dos estrategias: IQueryable vs IEnumerable)

`ValiSort<T>` tiene dos estrategias de ordenamiento:
- **Estrategia IQueryable**: usa `Expression.Call(typeof(Queryable), "OrderBy", ...)` para construir una llamada a método en el árbol de expresión, que EF Core puede traducir a `ORDER BY` en SQL.
- **Estrategia IEnumerable**: compila delegates `Func<IEnumerable<T>, IOrderedEnumerable<T>>` en el momento del registro (no en `Apply()`).

```csharp
var sort = new ValiSort<User>()
    .By(u => u.LastName)
    .ThenBy(u => u.FirstName, descending: true);

// Estrategia 1: IQueryable (EF Core)
IOrderedQueryable<User> sorted = sort.Apply(dbContext.Users);
// Genera: ORDER BY LastName ASC, FirstName DESC

// Estrategia 2: IEnumerable (en memoria)
IOrderedEnumerable<User> sorted = sort.Apply(inMemoryList);
// Ejecuta los delegates pre-compilados directamente
```

**Por qué se usa:**
- El mismo builder de ordenamiento funciona con ambas fuentes de datos
- Los delegates in-memory se compilan al registrar el criterio (no en Apply), evitando compilación en cada uso
- La elección de estrategia es automática según el tipo del argumento de `Apply`

---

## 8. Visitor (ParameterReplacer, ForceCloneVisitor, ExpressionExplainer)

**Qué es:** El patrón Visitor permite definir operaciones sobre una estructura de objetos sin modificar las clases de esa estructura. Se "visita" cada nodo del árbol y se aplica la operación.

**Dónde está:** `Utils/ExpressionHelpers.cs` (ParameterReplacer, ForceCloneVisitor), `Utils/ExpressionExplainer.cs`

Los tres implementan `ExpressionVisitor` de .NET y sobreescriben los métodos de visita para distintos tipos de nodo:

```csharp
// ParameterReplacer: reemplaza un parámetro por una expresión
protected override Expression VisitParameter(ParameterExpression node)
    => node == _old ? _new : base.VisitParameter(node);

// ForceCloneVisitor: crea copias de cada nodo
protected override Expression VisitMember(MemberExpression node)
{
    var expr = Visit(node.Expression);
    return Expression.MakeMemberAccess(expr, node.Member);
    // Nuevo nodo, misma estructura
}

// ExpressionExplainer: convierte nodos a texto
protected override Expression VisitBinary(BinaryExpression node)
{
    _sb.Append("(");
    Visit(node.Left);
    _sb.Append($" {NodeTypeToString(node.NodeType)} ");
    Visit(node.Right);
    _sb.Append(")");
    return node;
}
```

**Por qué se usa:**
- Los árboles de expresión son estructuras heterogéneas (distintos tipos de nodo)
- El patrón Visitor permite traversal sin necesidad de casting manual o switch gigante
- `ExpressionVisitor` de .NET provee la infraestructura base

**Documentación detallada:** [03-expression-visitors.md](../internals/03-expression-visitors.md)

---

## 9. Source Generator (Roslyn)

**Qué es:** Técnicamente no es un patrón de diseño del GoF, sino una técnica de metaprogramación. Durante la compilación, el generador analiza el código fuente y produce nuevo código que se agrega al proyecto.

**Dónde está:** Proyecto separado `Vali-Flow.Core.SourceGenerators` (referenciado como `Analyzer` en el `.csproj`)

**Por qué se usa:**
- Elimina ~800 líneas de boilerplate (métodos de delegación de una línea)
- Garantiza que `ValiFlow<T>` siempre está sincronizado con las interfaces
- La alternativa (reflection) tendría overhead en runtime y no generaría IntelliSense

**Documentación detallada:** [05-source-generator.md](05-source-generator.md)

---

## 10. Analyzer (Roslyn)

**Qué es:** Un Analyzer de Roslyn analiza el código fuente y emite diagnósticos (warnings/errors). Similar a un linter pero con acceso completo al modelo semántico del compilador.

**Dónde está:** `ValiFlowNonEfMethodAnalyzer` (en el mismo proyecto de Source Generators)

**Diagnóstico VF001:** Detecta llamadas a métodos no-EF-safe en instancias de `ValiFlowQuery<T>`.

**Por qué se usa:**
- Sin el Analyzer, el error de "método no traducible" solo aparece en runtime
- Con el Analyzer, aparece en compilación (o en el IDE en tiempo real)
- Es la solución correcta cuando la invariante que se quiere proteger es de tipo semántico (no de tipos)

**Documentación detallada:** [06-ef-core-safety.md](06-ef-core-safety.md)

---

## Tabla resumen

| Patrón | Componente | Problema que resuelve |
|---|---|---|
| Facade + Composition | `ValiFlow<T>` | API unificada sin herencia múltiple |
| CRTP | `BaseExpression<TBuilder,T>` | Method chaining con tipo correcto |
| Fluent Builder | `ValiFlow<T>`, `ValiSort<T>` | Construcción incremental de predicados |
| Immutable Builder | `BaseExpression<TBuilder,T>` | Thread safety en la fase de uso |
| Value Object | `ConditionEntry<T>` | Condiciones inmutables con mutación controlada |
| Registry | `ValiFlowGlobal` | Filtros transversales sin repetición |
| Strategy | `ValiSort<T>` | Mismo builder para IQueryable e IEnumerable |
| Visitor | `ParameterReplacer`, `ForceCloneVisitor`, `ExpressionExplainer` | Traversal y transformación de expression trees |
| Source Generator | `ForwardingGenerator` | Eliminación de boilerplate de delegación |
| Roslyn Analyzer | `ValiFlowNonEfMethodAnalyzer` | Detección de errores en tiempo de compilación |
