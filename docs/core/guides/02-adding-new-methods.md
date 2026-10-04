---
sidebar_position: 2
---

# Guide — How to Add a New Method to the Library

This guide describes the complete process for adding a new validation method to Vali-Flow.Core. The example used is adding an `IsPostalCode` method to the string domain.

---

## Checklist (Summary)

Keep this checklist at hand before starting. Each step corresponds to a section of the guide:

- [ ] 1. Implement in the component class (`Classes/Types/`)
- [ ] 2. Declare in the type interface (`Interfaces/Types/`)
- [ ] 3. Add to `ValiFlow<T>` (the source generator does this automatically)
- [ ] 4. Decide whether it goes in `ValiFlowQuery<T>` (is it EF Core-safe?)
- [ ] 5. Write tests
- [ ] 6. Run `dotnet test` — 0 failures

---

## Step 1: Implement in the Component Class

The first step is writing the real logic in the corresponding component class. For a string validation method, the file is `Vali-Flow.Core/Classes/Types/StringExpression.cs`.

The component class always follows the same structure:

```csharp
// Inside StringExpression<TBuilder, T>

/// <summary>Validates that the value is an Argentine postal code (4 or 5 digits).</summary>
/// <remarks>Not EF Core translatable. Uses Regex internally.</remarks>
public TBuilder IsPostalCode(Expression<Func<T, string?>> selector)
{
    // 1. Get the parameter from the selector (represents "x" in x => x.ZipCode)
    var parameter = selector.Parameters[0];

    // 2. Build the expression tree
    //    This tree represents: x => x.ZipCode != null && Regex.IsMatch(x.ZipCode, pattern)
    var notNull = Expression.NotEqual(
        selector.Body,
        Expression.Constant(null, typeof(string))
    );

    var regexIsMatch = typeof(Regex).GetMethod(
        nameof(Regex.IsMatch),
        new[] { typeof(string), typeof(string) }
    )!;

    var regexCall = Expression.Call(
        regexIsMatch,
        selector.Body,
        Expression.Constant(@"^\d{4,5}$")  // pattern: 4 or 5 digits
    );

    var combined = Expression.AndAlso(notNull, regexCall);
    var lambda = Expression.Lambda<Func<T, bool>>(combined, parameter);

    // 3. Delegate to the parent builder (BaseExpression.Add)
    return _builder.Add(lambda);
}
```

### Where the Logic Lives

All expression building code lives in the component. `ValiFlow<T>` has no logic; it only delegates.

### Accessing Predefined Regex Patterns

Common patterns are in `RegularExpressions/RegularExpression.cs`. If the pattern is new, add it there:

```csharp
// In RegularExpression.cs
internal static class RegularExpression
{
    internal static readonly Regex Email = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // New pattern:
    internal static readonly Regex PostalCode = new(@"^\d{4,5}$",
        RegexOptions.Compiled);
}
```

Use the class field instead of creating a `new Regex(...)` on each call:

```csharp
var regexCall = Expression.Call(
    regexIsMatch,
    selector.Body,
    Expression.Constant(RegularExpression.PostalCode.ToString())
    // Or pass the instance directly if the method accepts Regex:
    // Expression.Constant(RegularExpression.PostalCode)
);
```

---

## Step 2: Declare in the Type Interface

Open `Vali-Flow.Core/Interfaces/Types/IStringExpression.cs` and add the method declaration.

The interface defines the contract. Consumers that depend on the interface will see the new method automatically.

```csharp
// In IStringExpression<TBuilder, T> or in a sub-interface like IStringFormatExpression
// (choose the sub-interface that best groups the method)

/// <summary>Validates that the value is a 4 or 5 digit postal code.</summary>
/// <remarks>Not EF Core translatable. Uses Regex internally.</remarks>
TBuilder IsPostalCode(Expression<Func<T, string?>> selector);
```

### When to Add the `<remarks>Not EF Core translatable`

Add this remark if the method uses any of these elements:
- `Regex.IsMatch`
- `string.Contains(string, StringComparison)`
- `char.IsLetter`, `char.IsDigit`, `char.IsWhiteSpace`, etc.
- Lambda predicates as arguments (`.Any(x => x.Active)`)
- `Enumerable.Contains` with in-memory lists

If the method generates only simple comparisons (equal, greater than, less than, property access), it is EF Core-safe and does not need the remark.

---

## Step 3: ValiFlow<T> — The Source Generator Handles It

After adding the method to the component class and the interface, the source generator detects the change on the next compilation and automatically generates the delegation method in `ValiFlow.Forwarding.g.cs`:

```csharp
// Automatically generated — do NOT edit:
public ValiFlow<T> IsPostalCode(Expression<Func<T, string?>> selector)
    => _stringExpression.IsPostalCode(selector);
```

There is nothing to do manually in `ValiFlow.cs`.

---

## Step 4: Decide Whether It Goes in ValiFlowQuery<T>

### If the Method Is EF Core-Safe

Open `Vali-Flow.Core/Builder/ValiFlowQuery.cs` and verify that the `_stringExpression` field already has the correct interface. The source generator will also generate the delegation method for `ValiFlowQuery<T>` automatically, as long as the interface is referenced in the field marked with `[ForwardInterface]`.

For an EF Core-safe method, no additional action is needed in `ValiFlowQuery.cs`.

### If the Method Is NOT EF Core-Safe (like IsPostalCode)

The method must not appear in `ValiFlowQuery<T>`. To ensure this:

1. Verify the `Not EF Core translatable` remark is in the interface
2. Verify that `ValiFlowQuery.cs` uses a separate interface (or excludes the sub-interface) that does not declare the method

If the sub-interface `IStringFormatExpression` is excluded from `ValiFlowQuery<T>`, the method will not appear there automatically.

---

## Step 5: Write Tests

Tests live in `Vali-Flow.Core.Tests/`. Each domain has its own test file (e.g.: `StringExpressionTests.cs`).

Structure of a test:

```csharp
[Fact]
public void IsPostalCode_ValidCode_ReturnsTrue()
{
    // Arrange
    var rule = new ValiFlow<User>()
        .IsPostalCode(u => u.ZipCode);

    var user = new User { ZipCode = "12345" };

    // Act
    var result = rule.IsValid(user);

    // Assert
    Assert.True(result);
}

[Theory]
[InlineData(null)]
[InlineData("")]
[InlineData("ABCDE")]
[InlineData("123")]   // too short
[InlineData("123456")] // too long
public void IsPostalCode_InvalidCode_ReturnsFalse(string? zipCode)
{
    var rule = new ValiFlow<User>().IsPostalCode(u => u.ZipCode);
    var user = new User { ZipCode = zipCode };

    Assert.False(rule.IsValid(user));
}
```

### What to Cover in Tests

- Happy path: valid value that should pass
- Edge cases: null, empty string, minimum/maximum value of the range
- Negative cases: values that should clearly fail
- AND/OR combination (if the logic is complex)
- Integration: that `Build()` returns an expression usable with LINQ

---

## Step 6: Run the Tests

```bash
cd /path/to/Vali-Flow.Core
dotnet test
```

The result must be 0 failures before committing.

```bash
dotnet test --configuration Release
```

Also run in Release to detect behavioral differences between Debug and Release (rare, but they do exist with expression trees).

---

## Complete Example: IsAlphaNumeric Method (Without Regex, EF Core-Safe)

To show a method that does go in `ValiFlowQuery<T>`:

```csharp
// Step 1: Implement in StringExpression.cs
/// <summary>Validates that the value contains only letters and/or digits.</summary>
public TBuilder IsAlphaNumericSimple(Expression<Func<T, string?>> selector)
{
    var parameter = selector.Parameters[0];

    // Simple version: use string.All with char.IsLetterOrDigit
    // NOTE: char.IsLetterOrDigit is not EF Core-translatable
    // To make an EF Core-safe version, a different comparison is needed

    // EF Core-safe version: delegate to a computed column or use LIKE
    // In EF Core there is no direct equivalent of "alphanumeric only"
    // Therefore, this method belongs only to ValiFlow<T>
}
```

If it is discovered that a method cannot be made EF Core-safe in any reasonable way, simply do not add it to `ValiFlowQuery<T>` and document it with the remark.

---

## Common Mistakes When Adding Methods

### The Expression Tree References Captured Variables Incorrectly

```csharp
// BAD: the 'pattern' variable is captured by reference
// If its value changes later, the tree may behave unexpectedly
string pattern = GetPattern();
var expr = (Expression<Func<User, bool>>)(u => Regex.IsMatch(u.Email!, pattern));

// GOOD: use Expression.Constant to embed the value in the tree
var lambda = Expression.Lambda<Func<T, bool>>(
    Expression.Call(regexMethod, selector.Body, Expression.Constant(pattern)),
    parameter
);
```

### Forgetting to Unify Parameters Before Combining

`BaseExpression.Add` handles this when the expression is added. But if inside the component method multiple expressions are manually combined before calling `_builder.Add`, all of them must share the same `ParameterExpression`.

```csharp
// BAD: combining without unifying parameters
var cond1 = BuildCondition1(selector);
var cond2 = BuildCondition2(selector);
var combined = Expression.AndAlso(cond1.Body, cond2.Body);
// cond1 and cond2 may have different parameters

// GOOD: use the same parameter in all sub-expressions
var param = selector.Parameters[0];
var body1 = BuildBody1(selector.Body, param);
var body2 = BuildBody2(selector.Body, param);
var combined = Expression.AndAlso(body1, body2);
var lambda = Expression.Lambda<Func<T, bool>>(combined, param);
```

### Adding the Method to the Interface but Not the Class

If `IsPostalCode` is added to `IStringExpression` but not to `StringExpression`, the compiler will give an "does not implement interface member" error. The source generator cannot generate the delegation method if the component does not have it.
