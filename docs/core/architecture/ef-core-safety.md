# Architecture — ValiFlowQuery and EF Core Safety

## The Problem of EF Core and Expressions

Entity Framework Core translates `Expression<Func<T, bool>>` to SQL. But it cannot translate any expression: only those that have an SQL equivalent and that the database provider understands.

When EF Core encounters an expression it cannot translate, it throws a runtime exception:

```
InvalidOperationException: The LINQ expression '...' could not be translated.
Either rewrite the query in a form that can be translated, or switch to client evaluation explicitly
by inserting a call to 'AsEnumerable', 'AsAsyncEnumerable', 'ToList', or 'ToListAsync'.
```

This error appears in production, not at compile time. It is hard to detect because in-memory tests pass without issues (LINQ-to-Objects evaluates everything in memory and never fails for this reason).

---

## What Expressions EF Core CANNOT Translate

Expressions that EF Core cannot translate to SQL are those that:

- Use `Regex.IsMatch` (does not exist in standard SQL)
- Use `StringComparison` (e.g.: `string.Contains(s, StringComparison.OrdinalIgnoreCase)`)
- Use `char` methods (e.g.: `char.IsLetter`, `char.IsDigit`)
- Use lambdas as predicates inside in-memory collections (e.g.: `list.Any(x => x.IsActive)`)
- Use `Enum.IsDefined`, `string.IsNullOrWhiteSpace` with some provider versions
- Use `.ToLower()` with complex predicates

---

## `ValiFlowQuery<T>`: The EF Core-Safe Subset

`ValiFlowQuery<T>` is a variant of `ValiFlow<T>` that exposes **only methods whose expressions EF Core can translate to SQL**. Using `ValiFlowQuery<T>` guarantees at compile time that the resulting expression is translatable.

```csharp
// With ValiFlow<T>: all methods available, including non-translatable ones
var rule = new ValiFlow<User>()
    .IsEmail(u => u.Email)    // NOT translatable to SQL
    .GreaterThan(u => u.Age, 18);

// With ValiFlowQuery<T>: only EF Core-safe methods
var query = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)    // translatable: WHERE Email IS NOT NULL
    .GreaterThan(u => u.Age, 18);  // translatable: WHERE Age > 18

// Use with IQueryable:
var results = await dbContext.Users
    .Where(query.Build())
    .ToListAsync();
```

---

## Methods Absent in ValiFlowQuery

`ValiFlowQuery<T>` deliberately omits the following groups of methods:

### Regex-Based Methods

```csharp
// These methods do NOT exist in ValiFlowQuery<T>:
IsEmail(selector)
IsUrl(selector)
IsPhoneNumber(selector)
IsGuid(selector)
IsIPAddress(selector)
RegexMatch(selector, pattern)
IsAlphanumeric(selector)
```

Reason: they use `Regex.IsMatch` internally, which has no SQL equivalent.

### StringComparison or char-Based Methods

```csharp
// Not available in ValiFlowQuery<T>:
EqualToIgnoreCase(selector, value)    // uses StringComparison.OrdinalIgnoreCase
IsTrimmed(selector)                    // uses char.IsWhiteSpace
IsLowerCase(selector)                  // uses char-level LINQ
IsUpperCase(selector)                  // uses char-level LINQ
HasOnlyDigits(selector)                // uses char.IsDigit
HasOnlyLetters(selector)               // uses char.IsLetter
```

### Collection Methods with Lambda Predicates

```csharp
// Not available in ValiFlowQuery<T>:
All(selector, predicate)
Any(selector, predicate)
None(selector, predicate)
EachItem(selector, predicate)
AnyItem(selector, predicate)
AllMatch(selector, predicate)
DistinctCount(selector, count)
HasDuplicates(selector)
```

Reason: lambda predicates inside collections cannot be translated to SQL with LINQ.

### Other In-Memory Methods

```csharp
// Not available in ValiFlowQuery<T>:
IsOneOf(selector, values[])   // uses Enumerable.Contains which may not translate
IsInEnum(selector)             // uses Enum.IsDefined
```

---

## The VF001 Analyzer

The Analyzer is a Roslyn component that analyzes source code during compilation (or in the IDE in real time) and emits diagnostics. `ValiFlowNonEfMethodAnalyzer` detects when a non-EF-safe method is called on an instance of `ValiFlowQuery<T>`.

Without the Analyzer, the error only appears at runtime. With the Analyzer, it appears at compile time:

```csharp
var query = new ValiFlowQuery<User>();
query.IsEmail(u => u.Email);
//    ^^^^^^^
// warning VF001: Method 'IsEmail' on ValiFlowQuery<T> is not translatable
//                by EF Core providers. Use ValiFlow<T> for in-memory validation.
```

The warning appears in the IDE (yellow underline) and in the build output. It can be configured as an error in projects that require strict consistency.

---

## How ValiFlowQuery Avoids Non-EF-Safe Methods

`ValiFlowQuery<T>` simply does not declare or implement methods that are not EF Core-safe. Since they do not exist in the class or its interfaces, the C# compiler emits an error if they are called.

The Roslyn Analyzer is an additional layer of protection for cases where the variable type is the base interface and not `ValiFlowQuery<T>` directly:

```csharp
IExpression<ValiFlowQuery<User>, User> rule = new ValiFlowQuery<User>();
// The compiler cannot detect the problem here because it is typed as IExpression
// The Analyzer can detect it by analyzing the real type of the instance
```

---

## When to Use ValiFlow vs ValiFlowQuery

| Situation | Use |
|---|---|
| In-memory object validation (business logic, controllers) | `ValiFlow<T>` |
| Repository filtering with EF Core (`IQueryable`) | `ValiFlowQuery<T>` |
| Business rules that are also applied as DB filters | `ValiFlowQuery<T>` if you do not need regex/char methods; otherwise `ValiFlow<T>` only for validation |
| Unit tests | `ValiFlow<T>` (always in memory) |

---

## Migration Example from ValiFlow to ValiFlowQuery

```csharp
// BEFORE: ValiFlow<T> with in-memory methods
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)          // not EF Core-safe
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Use in EF Core: FAILS at runtime
var users = dbContext.Users.Where(rule.Build()).ToList();
// InvalidOperationException: IsEmail could not be translated

// AFTER: ValiFlowQuery<T> for the EF Core-safe part
var dbFilter = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive);

// Separate format validation with ValiFlow<T>
var emailFormat = new ValiFlow<User>()
    .IsEmail(u => u.Email);

// Usage:
var candidates = await dbContext.Users
    .Where(dbFilter.Build())         // filtered in SQL
    .ToListAsync();

var valid = candidates
    .Where(emailFormat.BuildCached()) // validated in memory
    .ToList();
```

---

## The Translatability Property and `<remarks>` Comments

In the interfaces, methods that are not EF Core-safe are documented with `<remarks>Not EF Core translatable</remarks>`. This serves as a signal to library maintainers that the method must not appear in `ValiFlowQuery<T>`:

```csharp
// In IStringExpression:
/// <summary>Validates that the value matches the standard email address format.</summary>
/// <remarks>Not EF Core translatable. Uses Regex.IsMatch internally.</remarks>
TBuilder IsEmail(Expression<Func<T, string?>> selector);
```

This convention is part of the **method addition checklist** documented in [adding-new-methods.md](../guides/adding-new-methods.md).
