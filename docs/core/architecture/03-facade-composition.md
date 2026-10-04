---
sidebar_position: 3
---

# Architecture — Facade + Composition Pattern

## The Problem That Motivates This Design

`ValiFlow<T>` must expose methods for validating strings, numbers, collections, dates, booleans, and more. There are over 250 public methods in total. If all that code lived in a single class, it would have:

- Thousands of lines in one file
- Mixed responsibilities (string logic alongside date logic)
- A file impossible to maintain or review in a PR

The obvious solution would be multiple inheritance: have `ValiFlow<T>` inherit from `StringValidator`, `NumericValidator`, etc. But C# does not allow multiple class inheritance.

The chosen solution combines two patterns: **Facade** and **Composition**.

---

## What the Facade Pattern Is

A **Facade** is a class that presents a simplified interface toward a set of more complex subsystems. The Facade does not implement logic; it delegates it.

Analogy: an airplane cockpit. The pilot interacts with a unified set of buttons and levers. Behind that panel there are dozens of independent subsystems (hydraulic, electrical, engines). The panel is the Facade.

In Vali-Flow:

```
ValiFlow<T>  ←  Facade
               (the user's control panel)

    ↓ delegates to ↓

StringExpression     ← string subsystem
NumericExpression    ← numeric subsystem
CollectionExpression ← collection subsystem
DateTimeExpression   ← date subsystem
... etc.
```

---

## What the Composition Pattern Is (vs. Inheritance)

Instead of having `ValiFlow<T>` **be** a `StringExpression` and **be** a `NumericExpression` (inheritance), `ValiFlow<T>` **has** a `StringExpression` and **has** a `NumericExpression` (composition).

```csharp
// Inheritance (NOT used in Vali-Flow) — impossible in C# with multiple classes
public class ValiFlow<T>
    : StringExpression<T>      // error: C# does not allow inheriting from multiple classes
    , NumericExpression<T>
    , CollectionExpression<T>
    // ...

// Composition (what IS used)
public class ValiFlow<T>
{
    private readonly IStringExpression<ValiFlow<T>, T>    _stringExpression;
    private readonly INumericExpression<ValiFlow<T>, T>   _numericExpression;
    private readonly ICollectionExpression<ValiFlow<T>, T> _collectionExpression;
    // ...
}
```

When the user calls `builder.MinLength(...)`, `ValiFlow<T>` simply delegates:

```csharp
public ValiFlow<T> MinLength(Expression<Func<T, string?>> selector, int min)
    => _stringExpression.MinLength(selector, min);
//     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//     all the real logic is in StringExpression
```

---

## The Complete Structure of ValiFlow<T>

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
    // The 9 composition fields (marked with [ForwardInterface])
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
        // Each component receives `this` as a reference to the builder
        // so it can return it at the end of each method (fluent chaining)
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

## How Components Call Back to the Builder

Each specialized component receives a reference to the parent builder (`this`) in its constructor. When a component method adds a condition, it calls `_builder.Add(...)` which lives in `BaseExpression`. When it finishes, it returns `_builder` (not `this`) so that chaining continues on the main builder.

```csharp
// Inside StringExpression<TBuilder, T>
public class StringExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
{
    private readonly TBuilder _builder;  // reference to the parent ValiFlow<T>

    public StringExpression(TBuilder builder)
    {
        _builder = builder;
    }

    public TBuilder MinLength(Expression<Func<T, string?>> selector, int min)
    {
        // Build the expression tree
        Expression<Func<T, bool>> expr = x =>
            selector.Compile()(x) != null &&
            selector.Compile()(x).Length >= min;

        // Register it in the central engine (BaseExpression)
        _builder.Add(expr);

        // Return the parent builder (ValiFlow<T>), not this (StringExpression)
        return _builder;
    }
}
```

Without this design, chaining would break the type. If `MinLength` returned `this` (a `StringExpression`), the user could not call `.GreaterThan(...)` next because `StringExpression` does not have that method.

---

## The TBuilder Generic Parameter in Components

All components are generic over `TBuilder`:

```csharp
public class StringExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
```

This allows the same components to be used by both `ValiFlow<T>` and `ValiFlowQuery<T>`:

```csharp
// ValiFlow uses the components with TBuilder = ValiFlow<T>
private readonly IStringExpression<ValiFlow<T>, T> _stringExpression
    = new StringExpression<ValiFlow<T>, T>(this);

// ValiFlowQuery uses the same components with TBuilder = ValiFlowQuery<T>
private readonly IStringExpression<ValiFlowQuery<T>, T> _stringExpression
    = new StringExpression<ValiFlowQuery<T>, T>(this);
```

The component code does not know and does not care whether it is serving `ValiFlow` or `ValiFlowQuery`.

---

## The Interface Hierarchy

The interfaces follow the same composition structure but express the contract rather than the implementation:

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

`IExpressionAnnotator<TBuilder>` is deliberately separated from `IExpressionBuilder<TBuilder,T>`. This allows a consumer that only needs to annotate conditions (without building new ones) to depend only on the narrow interface, rather than the full contract.

---

## The Delegation Methods: The Problem Without the Source Generator

Without the source generator, `ValiFlow<T>` would need to manually write one delegation method per method of each interface. To illustrate the problem:

```csharp
// Just the string methods (~40 methods):
public ValiFlow<T> MinLength(Expression<Func<T,string?>> s, int min)
    => _stringExpression.MinLength(s, min);
public ValiFlow<T> MaxLength(Expression<Func<T,string?>> s, int max)
    => _stringExpression.MaxLength(s, max);
public ValiFlow<T> ExactLength(Expression<Func<T,string?>> s, int len)
    => _stringExpression.ExactLength(s, len);
public ValiFlow<T> IsEmail(Expression<Func<T,string?>> s)
    => _stringExpression.IsEmail(s);
// ... x40 for strings
// ... x50 for numerics
// ... x30 for collections
// ... x40 for DateTime
// ... etc.
// Total: ~250 one-liner methods
```

800+ lines of boilerplate that contain no logic. The source generator produces them automatically. See [05-source-generator.md](05-source-generator.md).

---

## What Would Happen Without This Pattern

If all code lived in `ValiFlow<T>` directly:

- The file would have 3000+ lines
- Any change to string validation would require opening the same file as date logic
- String and number tests would be mixed
- `ValiFlowQuery<T>` (the EF Core variant) would have to duplicate all code, not just the methods that differ

With Facade + Composition:
- Each domain has its own file of ~200-300 lines
- Tests can focus on the specific domain
- `ValiFlowQuery<T>` shares exactly the same components and only omits the fields for non-EF-safe domains
