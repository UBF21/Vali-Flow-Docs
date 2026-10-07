# Architecture — Overview
import Drawio from '@theme/Drawio';
import coreStructure from '@site/static/diagrams/core-structure.drawio';
import coreExecutionFlow from '@site/static/diagrams/core-execution-flow.drawio';


## What Vali-Flow.Core Is

Vali-Flow.Core is a .NET library that lets you build **validation rules and filters** fluently by chaining methods. The result of building those rules is an `Expression<Func<T, bool>>`: a representation of code as data that can be executed in memory or translated to SQL by Entity Framework Core.

```csharp
// The user writes this:
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .MinLength(u => u.Email, 5)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// And gets this (internally):
// Expression<Func<User, bool>>:
//   x => x.Email != null
//        && x.Email.Length >= 5
//        && Regex.IsMatch(x.Email, emailPattern)
//        && x.Age > 18

// Which can be used like this:
bool isValid = rule.IsValid(user);                     // in memory
var filtered = dbContext.Users.Where(rule.Build());    // with EF Core
```

---

## The Problem It Solves

### Without the library

To filter a collection with multiple conditions, the developer writes LINQ expressions manually:

```csharp
// Option 1: manual expression tree (verbose and error-prone)
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
// ... 20 lines for 2 simple conditions

// Option 2: direct lambda (not reusable, not composable)
users.Where(u => u.Email != null && u.Age > 18)
// Works but cannot be built programmatically, reused, or annotated with error messages
```

### With the library

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// The same rule works for both validation AND filtering
bool valid = rule.IsValid(user);
var query = dbContext.Users.Where(rule.Build());
```

The library solves three concrete problems:

1. **Verbosity**: building expression trees manually requires dozens of lines. The library reduces it to one line per condition.
2. **Composition**: rules are reusable objects. They can be cloned, extended, and combined with AND/OR.
3. **Validation with errors**: each condition can carry an error message and a code, producing a detailed `ValidationResult` instead of a simple `true/false`.

---

## Targets and Constraints

| Feature | Value |
|---|---|
| Supported frameworks | `net8.0`, `net9.0` (also runs unmodified on .NET 10 via forward compatibility) |
| External NuGet dependencies | None |
| Thread safety | Mutable during construction, thread-safe after freeze |
| EF Core translatability | Partial — see `ValiFlowQuery<T>` |

---

## Component Map


<Drawio content={coreStructure} />

---

## Execution Flow: From Method Call to Final Tree

This is the path a condition travels from when the user writes `.GreaterThan(u => u.Age, 18)` to when it becomes an `Expression<Func<User, bool>>`.


<Drawio content={coreExecutionFlow} />

Each section of this documentation dives into one of these steps.

---

## Relationship Between ValiFlow and ValiFlowQuery

`ValiFlow<T>` exposes all available methods, including some that are not translatable to SQL by EF Core (regular expressions, comparisons with `StringComparison`, lambda predicates on collections).

`ValiFlowQuery<T>` is a reduced version that only exposes methods whose expressions EF Core can translate to SQL. If a non-translatable method is called on a `ValiFlowQuery<T>`, the Roslyn Analyzer `VF001` emits a warning at compile time.

```
ValiFlow<T>         → for in-memory validation, business logic
ValiFlowQuery<T>    → for IQueryable, database filters
```

See [ef-core-safety.md](ef-core-safety.md) for the full details.