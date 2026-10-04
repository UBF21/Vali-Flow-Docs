---
sidebar_position: 3
---

# Arquitectura — Patrón Facade + Composition

## El problema que motiva este diseño

`ValiFlow<T>` debe exponer métodos para validar strings, números, colecciones, fechas, booleans, y más. Hay más de 250 métodos públicos en total. Si todo ese código viviera en una sola clase, tendría:

- Miles de líneas en un solo archivo
- Responsabilidades mezcladas (lógica de strings junto con lógica de fechas)
- Un archivo imposible de mantener y de revisar en un PR

La solución obvia sería usar herencia múltiple: que `ValiFlow<T>` herede de `StringValidator`, `NumericValidator`, etc. Pero C# no permite herencia múltiple de clases.

La solución elegida combina dos patrones: **Facade** y **Composition**.

---

## Qué es el patrón Facade

Un **Facade** es una clase que presenta una interfaz simplificada hacia un conjunto de subsistemas más complejos. El Facade no implementa la lógica; la delega.

Analogía: un panel de control de un avión. El piloto interactúa con un conjunto de botones y palancas unificados. Detrás de ese panel hay docenas de subsistemas independientes (hidráulico, eléctrico, motores). El panel es el Facade.

En Vali-Flow:

```
ValiFlow<T>  ←  Facade
               (el panel de control del usuario)

    ↓ delega a ↓

StringExpression     ← subsistema de strings
NumericExpression    ← subsistema de números
CollectionExpression ← subsistema de colecciones
DateTimeExpression   ← subsistema de fechas
... etc.
```

---

## Qué es el patrón Composition (frente a herencia)

En lugar de que `ValiFlow<T>` **sea** un `StringExpression` y **sea** un `NumericExpression` (herencia), `ValiFlow<T>` **tiene** un `StringExpression` y **tiene** un `NumericExpression` (composition).

```csharp
// Herencia (NO se usa en Vali-Flow) — imposible en C# con múltiples clases
public class ValiFlow<T>
    : StringExpression<T>      // error: C# no permite herencia de múltiples clases
    , NumericExpression<T>
    , CollectionExpression<T>
    // ...

// Composition (lo que SÍ se usa)
public class ValiFlow<T>
{
    private readonly IStringExpression<ValiFlow<T>, T>    _stringExpression;
    private readonly INumericExpression<ValiFlow<T>, T>   _numericExpression;
    private readonly ICollectionExpression<ValiFlow<T>, T> _collectionExpression;
    // ...
}
```

Cuando el usuario llama `builder.MinLength(...)`, `ValiFlow<T>` simplemente delega:

```csharp
public ValiFlow<T> MinLength(Expression<Func<T, string?>> selector, int min)
    => _stringExpression.MinLength(selector, min);
//     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//     toda la lógica real está en StringExpression
```

---

## La estructura completa de ValiFlow<T>

```csharp
public partial class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>,
    IBooleanExpression<ValiFlow<T>, T>,
    IComparisonExpression<ValiFlow<T>, T>,
    ICollectionExpression<ValiFlow<T>, T>,
    IStringExpression<ValiFlow<T>, T>,
    INumericExpression<ValiFlow<T>, T>,
    IDateTimeExpression<ValiFlow<T>, T>,
    IDateTimeOffsetExpression<ValiFlow<T>, T>,
    IDateOnlyExpression<ValiFlow<T>, T>,
    ITimeOnlyExpression<ValiFlow<T>, T>
{
    // Los 9 campos de composition (marcados con [ForwardInterface])
    [ForwardInterface]
    private readonly IBooleanExpression<ValiFlow<T>, T>          _booleanExpression;
    [ForwardInterface]
    private readonly ICollectionExpression<ValiFlow<T>, T>       _collectionExpression;
    [ForwardInterface]
    private readonly IComparisonExpression<ValiFlow<T>, T>       _comparisonExpression;
    [ForwardInterface]
    private readonly IStringExpression<ValiFlow<T>, T>           _stringExpression;
    [ForwardInterface]
    private readonly INumericExpression<ValiFlow<T>, T>          _numericExpression;
    [ForwardInterface]
    private readonly IDateTimeExpression<ValiFlow<T>, T>         _dateTimeExpression;
    [ForwardInterface]
    private readonly IDateTimeOffsetExpression<ValiFlow<T>, T>   _dateTimeOffsetExpression;
    [ForwardInterface]
    private readonly IDateOnlyExpression<ValiFlow<T>, T>         _dateOnlyExpression;
    [ForwardInterface]
    private readonly ITimeOnlyExpression<ValiFlow<T>, T>         _timeOnlyExpression;

    public ValiFlow()
    {
        // Cada componente recibe `this` como referencia al builder
        // para poder retornarlo al final de cada método (fluent chaining)
        _booleanExpression        = new BooleanExpression<ValiFlow<T>, T>(this);
        _collectionExpression     = new CollectionExpression<ValiFlow<T>, T>(this);
        _comparisonExpression     = new ComparisonExpression<ValiFlow<T>, T>(this);
        _stringExpression         = new StringExpression<ValiFlow<T>, T>(this);
        _numericExpression        = new NumericExpression<ValiFlow<T>, T>(this);
        _dateTimeExpression       = new DateTimeExpression<ValiFlow<T>, T>(this);
        _dateTimeOffsetExpression = new DateTimeOffsetExpression<ValiFlow<T>, T>(this);
        _dateOnlyExpression       = new DateOnlyExpression<ValiFlow<T>, T>(this);
        _timeOnlyExpression       = new TimeOnlyExpression<ValiFlow<T>, T>(this);
    }
}
```

---

## Cómo los componentes llaman de vuelta al builder

Cada componente especializado recibe una referencia al builder padre (`this`) en su constructor. Cuando un método de componente agrega una condición, llama a `_builder.Add(...)` que vive en `BaseExpression`. Cuando termina, retorna `_builder` (no `this`) para que el encadenamiento continúe sobre el builder principal.

```csharp
// Dentro de StringExpression<TBuilder, T>
public class StringExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
{
    private readonly TBuilder _builder;  // referencia al ValiFlow<T> padre

    public StringExpression(TBuilder builder)
    {
        _builder = builder;
    }

    public TBuilder MinLength(Expression<Func<T, string?>> selector, int min)
    {
        // Construye el árbol de expresión
        Expression<Func<T, bool>> expr = x =>
            selector.Compile()(x) != null &&
            selector.Compile()(x).Length >= min;

        // Lo registra en el motor central (BaseExpression)
        _builder.Add(expr);

        // Retorna el builder padre (ValiFlow<T>), no this (StringExpression)
        return _builder;
    }
}
```

Sin este diseño, el encadenamiento rompería el tipo. Si `MinLength` retornara `this` (un `StringExpression`), el usuario no podría llamar `.GreaterThan(...)` a continuación porque `StringExpression` no tiene ese método.

---

## El parámetro genérico TBuilder en los componentes

Todos los componentes son genéricos en `TBuilder`:

```csharp
public class StringExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
```

Esto permite que los mismos componentes sean usados tanto por `ValiFlow<T>` como por `ValiFlowQuery<T>`:

```csharp
// ValiFlow usa los componentes con TBuilder = ValiFlow<T>
private readonly IStringExpression<ValiFlow<T>, T> _stringExpression
    = new StringExpression<ValiFlow<T>, T>(this);

// ValiFlowQuery usa los mismos componentes con TBuilder = ValiFlowQuery<T>
private readonly IStringExpression<ValiFlowQuery<T>, T> _stringExpression
    = new StringExpression<ValiFlowQuery<T>, T>(this);
```

El código de los componentes no sabe ni le importa si está sirviendo a `ValiFlow` o a `ValiFlowQuery`.

---

## La jerarquía de interfaces

Las interfaces siguen la misma estructura de composición pero expresan el contrato en lugar de la implementación:

```
IExpressionAnnotator<TBuilder>
    WithMessage(string)
    WithError(string, string)
    WithSeverity(Severity)
    └── IExpressionBuilder<TBuilder, T>
            Add(Expression<Func<T,bool>>)
            AddSubGroup(Action<TBuilder>)
            And()
            Or()
            When(...)
            Unless(...)
            ValidateNested(...)

IExpressionEvaluator<T>
    IsValid(T)
    IsNotValid(T)
    Validate(T)
    ValidateAll(T)
    Explain()

IExpressionCompiler<T>
    Build()
    BuildNegated()
    BuildCached()
    BuildWithGlobal()

IExpressionLifecycle<TBuilder>
    Clone()
    Freeze()

IExpression<TBuilder, T>
    : IExpressionBuilder<TBuilder, T>
    : IExpressionEvaluator<T>
    : IExpressionCompiler<T>
    : IExpressionLifecycle<TBuilder>
```

`IExpressionAnnotator<TBuilder>` está separado de `IExpressionBuilder<TBuilder,T>` deliberadamente. Esto permite que un consumidor que solo necesita anotar condiciones (sin construir nuevas) dependa solo de la interfaz estrecha, en lugar del contrato completo.

---

## Los métodos de delegación: el problema sin el source generator

Sin el source generator, `ValiFlow<T>` necesitaría escribir manualmente un método de delegación por cada método de cada interfaz. Para ilustrar el problema:

```csharp
// Solo los métodos de string (~40 métodos):
public ValiFlow<T> MinLength(Expression<Func<T,string?>> s, int min)
    => _stringExpression.MinLength(s, min);
public ValiFlow<T> MaxLength(Expression<Func<T,string?>> s, int max)
    => _stringExpression.MaxLength(s, max);
public ValiFlow<T> ExactLength(Expression<Func<T,string?>> s, int len)
    => _stringExpression.ExactLength(s, len);
public ValiFlow<T> IsEmail(Expression<Func<T,string?>> s)
    => _stringExpression.IsEmail(s);
// ... x40 para strings
// ... x50 para numéricos
// ... x30 para colecciones
// ... x40 para DateTime
// ... etc.
// Total: ~250 métodos de una línea cada uno
```

800+ líneas de boilerplate que no contienen ninguna lógica. El source generator los produce automáticamente. Ver [05-source-generator.md](05-source-generator.md).

---

## Qué ocurre si no existiera este patrón

Si todo el código viviera en `ValiFlow<T>` directamente:

- El archivo tendría 3000+ líneas
- Cualquier cambio en validación de strings requeriría abrir el mismo archivo que lógica de fechas
- Las pruebas de strings y de números estarían mezcladas
- `ValiFlowQuery<T>` (la variante EF Core) tendría que duplicar todo el código, no solo los métodos que difieren

Con Facade + Composition:
- Cada dominio tiene su propio archivo de ~200-300 líneas
- Las pruebas pueden enfocarse en el dominio específico
- `ValiFlowQuery<T>` comparte exactamente los mismos componentes y solo omite los campos para dominios no-EF-safe
