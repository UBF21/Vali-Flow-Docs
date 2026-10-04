---
sidebar_position: 7
---

# Architecture — Design Patterns Catalog

This document catalogs all design patterns used in Vali-Flow.Core, explaining why each was chosen and where to find it in the code.

---

## 1. Facade + Composition

**What it is:** A Facade is a class that presents a unified interface toward a set of subsystems. Instead of inheriting from multiple classes (impossible in C#), the class holds instances of those subsystems and delegates calls to them.

**Where it is:** `Builder/ValiFlow.cs`

**Why it is used:**
- C# does not allow inheriting from multiple classes
- Separates the 9 responsibilities (strings, numbers, dates, etc.) into independent classes
- Allows `ValiFlowQuery<T>` to share the same components but expose only a subset

**The problem it solves:** Without this pattern, all validation logic (string, numeric, collections, dates, etc.) would live in a single class of thousands of lines.

**Detailed documentation:** [03-facade-composition.md](03-facade-composition.md)

---

## 2. CRTP (Curiously Recurring Template Pattern)

**What it is:** A C++ pattern adapted to C#. The base class receives the concrete type as a generic parameter, which allows it to declare methods that return the concrete type without knowing what it is.

**Where it is:** `Classes/Base/BaseExpression<TBuilder, T>`

```csharp
public class BaseExpression<TBuilder, T>
    where TBuilder : BaseExpression<TBuilder, T>, new()
{
    public TBuilder Or()   // returns the concrete type, not BaseExpression
    {
        _nextIsAnd = 0;
        return (TBuilder)this;
    }
}

// ValiFlow<T> inherits by passing itself:
public class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>
```

**Why it is used:** Allows all base class methods (like `Or()`, `And()`, `WithMessage()`) to return the concrete type of the builder, keeping chaining typed throughout the entire method chain.

**Without CRTP:** BaseExpression methods would return `BaseExpression<TBuilder,T>`, losing the type. The user could not call `ValiFlow<T>` methods after an `Or()` because the compiler would only know `BaseExpression`.

---

## 3. Builder (Fluent Builder)

**What it is:** The Builder pattern separates the construction of a complex object from its representation. The "fluent" variant allows chaining construction methods.

**Where it is:** `Builder/ValiFlow.cs`, `Builder/ValiFlowQuery.cs`, `Builder/ValiSort.cs`

```csharp
var rule = new ValiFlow<User>()    // Builder
    .NotNull(u => u.Email)         // construction step
    .MinLength(u => u.Email, 5)    // construction step
    .GreaterThan(u => u.Age, 18);  // construction step
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^
//  each call returns the builder to continue chaining
```

**Why it is used:**
- Building a predicate has a variable number of steps (0 to N conditions)
- The final object (`Expression<Func<T,bool>>`) does not exist until `Build()` is called
- The fluent API is more readable than passing all conditions in a constructor

---

## 4. Immutable Builder (Freeze/Fork)

**What it is:** A Builder variant where the construction object has two phases: mutable (during construction) and immutable (during use). Mutations on an immutable object create copies instead of modifying the original.

**Where it is:** `Classes/Base/BaseExpression.cs` (`_frozen` field, `Freeze` method, fork logic in each mutation method)

```csharp
// Inspired by IQueryable<T> in LINQ:
var query = dbContext.Users;        // conceptually mutable
var filtered = query.Where(...);    // does not modify query, creates a new one
var sorted = filtered.OrderBy(...); // does not modify filtered, creates a new one

// ValiFlow follows the same pattern:
var base = new ValiFlow<User>().GreaterThan(u => u.Age, 18);
base.IsValid(user);               // implicit freeze
var extended = base.IsTrue(u => u.IsActive);  // fork, does not modify base
```

**Why it is used:**
- Allows sharing a base rule and extending it without risk of modifying it
- Makes the builder thread-safe after freeze (without locks)
- Familiar pattern for C# developers who know `IQueryable`

**Detailed documentation:** [02-thread-safety.md](../internals/02-thread-safety.md)

---

## 5. Value Object (ConditionEntry)

**What it is:** A Value Object is an object whose identity is defined by its values, not its reference. In C# it is typically implemented as a `record`.

**Where it is:** `Models/ConditionEntry.cs`

```csharp
internal sealed record ConditionEntry<T>
{
    public Expression<Func<T, bool>> Condition { get; init; }
    public bool IsAnd { get; init; }
    public string? ErrorCode { get; init; }
    // ...
}
```

**Why it is a record and not a class:**
- `init` setters guarantee that fields cannot change after construction
- The `with` syntax allows creating modified copies concisely:

```csharp
var updated = existingEntry with { Message = "new message" };
// existingEntry does not change; updated is a new object identical except for Message
```

This is used in `MutateLastCondition` to implement `WithMessage`, `WithError`, `WithSeverity` without mutating the list.

**Detailed documentation:** [01-condition-entry.md](../internals/01-condition-entry.md)

---

## 6. Registry (ValiFlowGlobal)

**What it is:** The Registry pattern is a globally known object (typically a singleton or static class) where components can register themselves and then be retrieved by other components.

**Where it is:** `Builder/ValiFlowGlobal.cs`

```csharp
// Registration (during application startup)
ValiFlowGlobal.Register<User>(u => !u.IsDeleted);
ValiFlowGlobal.Register<User>(u => u.TenantId == currentTenantId);

// Usage (when building queries)
var expr = builder.BuildWithGlobal();
// Produces: (builder conditions) AND (!u.IsDeleted) AND (u.TenantId == currentTenantId)
```

**Why it is used:**
- Global filters (soft-delete, multi-tenancy) are cross-cutting concerns throughout the application
- Without this pattern, the developer would have to add `.IsTrue(u => !u.IsDeleted)` in every query
- A single registration point eliminates duplication

**Important limitation:** It is a static dictionary. It persists for the entire life of the process. In tests, call `ValiFlowGlobal.ClearAll()` in teardown to avoid contamination between tests.

---

## 7. Strategy (ValiSort)

**What it is:** The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. The client chooses the algorithm without knowing its implementation details.

**Where it is:** `Builder/ValiSort.cs` (two strategies: IQueryable vs IEnumerable)

`ValiSort<T>` has two sorting strategies:
- **IQueryable strategy**: uses `Expression.Call(typeof(Queryable), "OrderBy", ...)` to build a method call in the expression tree, which EF Core can translate to `ORDER BY` in SQL.
- **IEnumerable strategy**: compiles `Func<IEnumerable<T>, IOrderedEnumerable<T>>` delegates at registration time (not in `Apply()`).

```csharp
var sort = new ValiSort<User>()
    .By(u => u.LastName)
    .ThenBy(u => u.FirstName, descending: true);

// Strategy 1: IQueryable (EF Core)
IOrderedQueryable<User> sorted = sort.Apply(dbContext.Users);
// Generates: ORDER BY LastName ASC, FirstName DESC

// Strategy 2: IEnumerable (in memory)
IOrderedEnumerable<User> sorted = sort.Apply(inMemoryList);
// Executes the pre-compiled delegates directly
```

**Why it is used:**
- The same sorting builder works with both data sources
- In-memory delegates are compiled when the criterion is registered (not in Apply), avoiding compilation on each use
- Strategy selection is automatic based on the type of the `Apply` argument

---

## 8. Visitor (ParameterReplacer, ForceCloneVisitor, ExpressionExplainer)

**What it is:** The Visitor pattern allows defining operations on an object structure without modifying the classes of that structure. Each node of the tree is "visited" and the operation is applied.

**Where it is:** `Utils/ExpressionHelpers.cs` (ParameterReplacer, ForceCloneVisitor), `Utils/ExpressionExplainer.cs`

All three implement .NET's `ExpressionVisitor` and override the visit methods for different node types:

```csharp
// ParameterReplacer: replaces a parameter with an expression
protected override Expression VisitParameter(ParameterExpression node)
    => node == _old ? _new : base.VisitParameter(node);

// ForceCloneVisitor: creates copies of each node
protected override Expression VisitMember(MemberExpression node)
{
    var expr = Visit(node.Expression);
    return Expression.MakeMemberAccess(expr, node.Member);
    // New node, same structure
}

// ExpressionExplainer: converts nodes to text
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

**Why it is used:**
- Expression trees are heterogeneous structures (different node types)
- The Visitor pattern allows traversal without manual casting or a giant switch
- .NET's `ExpressionVisitor` provides the base infrastructure

**Detailed documentation:** [03-expression-visitors.md](../internals/03-expression-visitors.md)

---

## 9. Source Generator (Roslyn)

**What it is:** Technically not a GoF design pattern, but a metaprogramming technique. During compilation, the generator analyzes source code and produces new code that is added to the project.

**Where it is:** Separate project `Vali-Flow.Core.SourceGenerators` (referenced as `Analyzer` in `.csproj`)

**Why it is used:**
- Eliminates ~800 lines of boilerplate (one-line delegation methods)
- Guarantees `ValiFlow<T>` is always in sync with the interfaces
- The alternative (reflection) would have runtime overhead and would not generate IntelliSense

**Detailed documentation:** [05-source-generator.md](05-source-generator.md)

---

## 10. Analyzer (Roslyn)

**What it is:** A Roslyn Analyzer analyzes source code and emits diagnostics (warnings/errors). Similar to a linter but with full access to the compiler's semantic model.

**Where it is:** `ValiFlowNonEfMethodAnalyzer` (in the same Source Generators project)

**Diagnostic VF001:** Detects calls to non-EF-safe methods on instances of `ValiFlowQuery<T>`.

**Why it is used:**
- Without the Analyzer, the "non-translatable method" error only appears at runtime
- With the Analyzer, it appears at compilation (or in the IDE in real time)
- It is the correct solution when the invariant to protect is semantic (not type-based)

**Detailed documentation:** [06-ef-core-safety.md](06-ef-core-safety.md)

---

## Summary Table

| Pattern | Component | Problem It Solves |
|---|---|---|
| Facade + Composition | `ValiFlow<T>` | Unified API without multiple inheritance |
| CRTP | `BaseExpression<TBuilder,T>` | Method chaining with correct type |
| Fluent Builder | `ValiFlow<T>`, `ValiSort<T>` | Incremental construction of predicates |
| Immutable Builder | `BaseExpression<TBuilder,T>` | Thread safety in the use phase |
| Value Object | `ConditionEntry<T>` | Immutable conditions with controlled mutation |
| Registry | `ValiFlowGlobal` | Cross-cutting filters without repetition |
| Strategy | `ValiSort<T>` | Same builder for IQueryable and IEnumerable |
| Visitor | `ParameterReplacer`, `ForceCloneVisitor`, `ExpressionExplainer` | Expression tree traversal and transformation |
| Source Generator | `ForwardingGenerator` | Elimination of delegation boilerplate |
| Roslyn Analyzer | `ValiFlowNonEfMethodAnalyzer` | Compile-time error detection |
