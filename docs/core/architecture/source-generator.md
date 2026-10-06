# Architecture — The Source Generator

## The Problem It Solves

`ValiFlow<T>` uses the Facade + Composition pattern: it has 9 internal components and delegates each call to the corresponding component. This means that for every method of every component, `ValiFlow<T>` needs a one-line delegation method:

```csharp
// StringExpression methods (~40 methods):
public ValiFlow<T> MinLength(Expression<Func<T, string?>> s, int min)
    => _stringExpression.MinLength(s, min);
public ValiFlow<T> MaxLength(Expression<Func<T, string?>> s, int max)
    => _stringExpression.MaxLength(s, max);
public ValiFlow<T> ExactLength(Expression<Func<T, string?>> s, int len)
    => _stringExpression.ExactLength(s, len);
// ... 37 more methods just for strings

// NumericExpression methods (~50 methods):
public ValiFlow<T> GreaterThan(Expression<Func<T, int>> s, int val)
    => _numericExpression.GreaterThan(s, val);
// ... 49 more for numerics

// ... and so on for 7 more components
// Total: ~250 delegation methods
```

That is more than 800 lines of code that:
- Contain no logic
- Are 100% mechanical and repetitive
- Require remembering to add a method to `ValiFlow.cs` whenever one is added to `IStringExpression`
- Require updating both the component and the facade whenever a method is renamed
- Must be repeated in `ValiFlowQuery<T>` as well

The source generator eliminates this problem entirely.

---

## What a Roslyn Source Generator Is

A **Source Generator** is a component that runs during compilation. It has full access to the syntax tree and source code symbols (through Roslyn's semantic analysis API). It can generate new `.cs` files that are added to the project as if the developer had written them.

Unlike T4 templates or external code generation tools, source generators:
- Run on every compilation (always up to date)
- Require no manual build steps
- Have complete visibility into source code (can read interfaces, types, methods)
- Generated code appears in the IDE with IntelliSense

---

## The ForwardInterface Attribute

The activation mechanism is a simple attribute:

```csharp
[AttributeUsage(AttributeTargets.Field)]
internal sealed class ForwardInterfaceAttribute : Attribute { }
```

When a field is marked with `[ForwardInterface]`, the generator knows it must generate delegation methods for all methods of that field's interface:

```csharp
[ForwardInterface]
private readonly IStringExpression<ValiFlow<T>, T> _stringExpression;
//               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//               The generator reads the interface of this field
//               and generates one method per interface method
```

The attribute itself does nothing at runtime. It is only a marker for the generator.

---

## The Generator Pipeline

The generator follows these steps during compilation:

### Step 1: Find Marked Fields

Uses Roslyn's incremental API (`ForAttributeWithMetadataName`) to find all fields with `[ForwardInterface]` in the assembly being compiled.

```
Fields found in ValiFlow<T>:
  _booleanExpression    : IBooleanExpression<ValiFlow<T>, T>
  _collectionExpression : ICollectionExpression<ValiFlow<T>, T>
  _comparisonExpression : IComparisonExpression<ValiFlow<T>, T>
  _stringExpression     : IStringExpression<ValiFlow<T>, T>
  _numericExpression    : INumericExpression<ValiFlow<T>, T>
  _dateTimeExpression   : IDateTimeExpression<ValiFlow<T>, T>
  ... etc.
```

### Step 2: Extract Methods from Each Interface

For each field, the generator obtains the interface symbol and calls `GetMembers()` to get all its methods. It also traverses `AllInterfaces` to capture methods from parent interfaces (IStringExpression inherits from IStringLengthExpression, IStringContentExpression, etc.).

```
IStringExpression methods (including base interfaces):
  MinLength(selector, int)
  MaxLength(selector, int)
  ExactLength(selector, int)
  LengthBetween(selector, int, int)
  StartsWith(selector, string)
  EndsWith(selector, string)
  Contains(selector, string)
  IsEmail(selector)
  IsUrl(selector)
  ... ~40 methods in total
```

### Step 3: Build Data Models

For each method, the generator extracts the information needed to generate the code:
- Method name
- Return type
- List of parameters with types and names
- Generic constraints (if any)
- Name of the field to delegate to

All of this is represented as plain strings (not as Roslyn tree objects), so the generator's incremental engine can easily compare whether something has changed.

### Step 4: Detect Conflicts

A problem arises when two different fields define methods with the same name but different generic constraints. For example:

```csharp
// In IComparisonExpression:
TBuilder EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IEquatable<TValue>;

// In INumericExpression (IComparableExpression):
TBuilder EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IComparable<TValue>;
```

Both methods have the same name and the same parameter types, but different constraints. In C#, you cannot have two public methods with the same signature. The solution is:

- The first method found is generated as `public`
- Subsequent methods with the same signature are generated as **explicit interface implementations**:

```csharp
// Generated: the first is public
public ValiFlow<T> EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IEquatable<TValue>
    => _comparisonExpression.EqualTo(selector, value);

// Generated: the second is explicit (no access modifier, prefixed with the interface)
ValiFlow<T> INumericExpression<ValiFlow<T>,T>.EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IComparable<TValue>
    => _numericExpression.EqualTo(selector, value);
```

### Step 5: Generate the File

The generator produces a `ValiFlow.Forwarding.g.cs` file with all delegation methods:

```csharp
// <auto-generated/>
// This file was generated by the ForwardingGenerator source generator.
// Do not edit manually.

partial class ValiFlow<T>
{
    public ValiFlow<T> MinLength(Expression<Func<T, string?>> selector, int min)
        => _stringExpression.MinLength(selector, min);

    public ValiFlow<T> MaxLength(Expression<Func<T, string?>> selector, int max)
        => _stringExpression.MaxLength(selector, max);

    // ... ~250 more methods
}
```

---

## Why the Incremental Generator Is Used

Roslyn offers two APIs for source generators: the old one (`ISourceGenerator`) and the new incremental one (`IIncrementalGenerator`). Vali-Flow uses the incremental one because:

- It only regenerates when something relevant changes (not on every full compilation)
- It is more efficient for large projects
- `ForAttributeWithMetadataName` is optimized to find attributes by name without traversing the entire tree

---

## What Happens When a New Method Is Added to an Interface

1. The method is added to the interface (e.g.: `IStringExpression.IsPostalCode`)
2. It is implemented in the component class (e.g.: `StringExpression.IsPostalCode`)
3. On the next compilation, the source generator detects the new method in the interface
4. It automatically generates the delegation method in `ValiFlow.Forwarding.g.cs`
5. No changes to `ValiFlow.cs` or `ValiFlowQuery.cs` are needed (unless the method should be excluded from the EF Core variant)

---

## The `.g.cs` Suffix and the `partial` Class

Generated files have the `.g.cs` suffix by convention to distinguish them from manually written code. `ValiFlow<T>` is declared as `partial` specifically to allow the generated code to extend the class without modifying the original file:

```csharp
// ValiFlow.cs (written manually) — defines the constructor and fields
public partial class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>, ...
{
    [ForwardInterface]
    private readonly IStringExpression<ValiFlow<T>, T> _stringExpression;
    // ...
}

// ValiFlow.Forwarding.g.cs (generated) — defines the delegation methods
partial class ValiFlow<T>
{
    public ValiFlow<T> MinLength(...) => _stringExpression.MinLength(...);
    // ...
}
```

The C# compiler treats both as a single class.

---

## What the Generator Does NOT Do

The generator only generates **delegation** (forwarding) methods. It does not generate:
- Business logic (that lives in the components)
- Tests
- XML documentation
- Interface implementations for `ValiFlowQuery<T>` (that file has its own `[ForwardInterface]` annotation)

---

## How to Inspect the Generated Code

In Rider or Visual Studio, generated files are visible in the project explorer under "Generated Files" or "Analyzer Files". The file can also be found in the build folder:

```
obj/Debug/net8.0/generated/
  Vali_Flow.Core.SourceGenerators/
    ForwardingGenerator/
      ValiFlow.Forwarding.g.cs
      ValiFlowQuery.Forwarding.g.cs
```
