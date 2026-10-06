# Architecture — LINQ Expression Trees

## What an Expression Tree Is

An **expression tree** is a representation of code as an in-memory data structure. Instead of compiling code directly to machine instructions, .NET allows capturing it as an object that can be inspected, transformed, and compiled later.

The difference from a normal delegate (`Func<T, bool>`):

```csharp
// Delegate: code is compiled and executed. Cannot be inspected.
Func<User, bool> func = u => u.Age > 18;
func(user);  // executes, but you cannot know "what it does"

// Expression tree: code is represented as data. Can be inspected.
Expression<Func<User, bool>> expr = u => u.Age > 18;
// expr.Body is: BinaryExpression { Left = MemberExpression{Age}, Right = ConstantExpression{18} }
// It can be traversed, modified, serialized... or compiled to a delegate.
var compiled = expr.Compile();  // now it can be executed
compiled(user);
```

---

## Why Vali-Flow Uses Expression Trees Instead of Delegates

The main reason is **EF Core**: for a condition to work with `IQueryable<T>` (and be translated to SQL), EF Core needs to receive an `Expression<Func<T, bool>>`, not a `Func<T, bool>`.

```csharp
// This works with EF Core (translates to WHERE in SQL):
dbContext.Users.Where(u => u.Age > 18);
//                    ^^^^^^^^^^^^^^^^
//                    The compiler captures this as Expression<Func<User,bool>>
//                    when the method parameter is Expression<Func<T,bool>>

// This does NOT work with EF Core (the delegate was already compiled):
Func<User, bool> func = u => u.Age > 18;
dbContext.Users.Where(func);  // error: cannot be translated to SQL
```

The second reason is **inspection** capability: `Explain()`, per-condition error reporting, and the VF001 Analyzer all depend on being able to traverse the expression tree.

---

## The Anatomy of an Expression Tree

Each tree has nodes. The root node is a `LambdaExpression`. Internal nodes can be `BinaryExpression`, `MemberExpression`, `MethodCallExpression`, etc.

Example: `u => u.Age > 18`

```
LambdaExpression
  Parameters: [ParameterExpression { Name="u", Type=User }]
  Body:
    BinaryExpression (NodeType = GreaterThan)
      Left:
        MemberExpression (Member = User.Age)
          Expression:
            ParameterExpression { Name="u", Type=User }
      Right:
        ConstantExpression { Value = 18, Type = int }
```

In code:

```csharp
var param = Expression.Parameter(typeof(User), "u");

var ageProperty = Expression.Property(param, nameof(User.Age));
var constant18  = Expression.Constant(18, typeof(int));
var greaterThan = Expression.GreaterThan(ageProperty, constant18);

var lambda = Expression.Lambda<Func<User, bool>>(greaterThan, param);
// equivalent to: u => u.Age > 18
```

---

## How Components Build Expressions

Each component method (such as `StringExpression.MinLength`) manually builds the expression tree that represents that validation.

### Example: MinLength

The validation "the string is not null and has at least N characters" is built like this:

```csharp
// What MinLength does internally:
public TBuilder MinLength(Expression<Func<T, string?>> selector, int min)
{
    // Creates a tree for: x => selector(x) != null && selector(x).Length >= min
    var parameter = selector.Parameters[0];  // the "x" parameter of the expression

    // Node: selector(x) != null
    var notNull = Expression.NotEqual(
        selector.Body,
        Expression.Constant(null, typeof(string))
    );

    // Node: selector(x).Length
    var lengthProperty = Expression.Property(selector.Body, nameof(string.Length));

    // Node: selector(x).Length >= min
    var minCheck = Expression.GreaterThanOrEqual(
        lengthProperty,
        Expression.Constant(min, typeof(int))
    );

    // Root node: notNull && minCheck
    var combined = Expression.AndAlso(notNull, minCheck);

    // Wrap in lambda
    var lambda = Expression.Lambda<Func<T, bool>>(combined, parameter);

    // Pass to the central engine
    return _builder.Add(lambda);
}
```

The result is an `Expression<Func<T, bool>>` that represents `x => x.Email != null && x.Email.Length >= 5`.

---

## The Shared Parameter Problem

When `Build()` combines multiple conditions into a single tree, a problem arises: each condition has its own `ParameterExpression`. Although they may have the same name ("x" or "u"), they are distinct objects in memory.

```csharp
Expression<Func<User, bool>> cond1 = u => u.Age > 18;
Expression<Func<User, bool>> cond2 = u => u.IsActive;
//                                    ^               ^
//              cond1.Parameters[0]   ≠   cond2.Parameters[0]
//              Two distinct objects even if they have the same name
```

If combined directly without unifying parameters:

```csharp
// INCORRECT: the tree references two distinct parameters
var bad = Expression.AndAlso(cond1.Body, cond2.Body);
var badLambda = Expression.Lambda<Func<User, bool>>(bad, cond1.Parameters[0]);
// cond2.Body references cond2.Parameters[0], which is not in badLambda's signature
// This throws InvalidOperationException when compiled
```

The solution is to replace all parameters with a single one before combining. This is what `ParameterReplacer` does:

```csharp
// CORRECT
var unifiedParam = Expression.Parameter(typeof(User), "x");

var body1 = new ParameterReplacer(cond1.Parameters[0], unifiedParam).Visit(cond1.Body);
var body2 = new ParameterReplacer(cond2.Parameters[0], unifiedParam).Visit(cond2.Body);

var combined = Expression.AndAlso(body1, body2);
var lambda = Expression.Lambda<Func<User, bool>>(combined, unifiedParam);
// Correct: one single parameter, all nodes use it
```

---

## Conditions with MethodCall

Some methods generate expressions with method calls (`MethodCallExpression`). For example, `IsEmail` uses `Regex.IsMatch`:

```csharp
// IsEmail internally builds something equivalent to:
// x => Regex.IsMatch(x.Email, emailPattern)

var regexIsMatch = typeof(Regex).GetMethod(
    nameof(Regex.IsMatch),
    new[] { typeof(string), typeof(string) }
);

var expr = Expression.Call(
    regexIsMatch,
    selector.Body,                        // first argument: x.Email
    Expression.Constant(emailPattern)     // second argument: the pattern
);
```

This type of expression **is not translatable by EF Core** because SQL does not have `Regex.IsMatch`. This is why `IsEmail` exists only in `ValiFlow<T>` and not in `ValiFlowQuery<T>`.

---

## Conditions with Navigation Property Access

`ValidateNested` builds expressions to validate navigation properties (nested objects):

```csharp
var rule = new ValiFlow<Order>()
    .ValidateNested(
        o => o.Customer,            // selector: Order.Customer
        customer => customer
            .NotNull(c => c.Email)  // condition on Customer
    );
```

Internally, `ValidateNested` builds a tree that:

1. Compiles the sub-builder conditions (for `Customer`)
2. Creates a null-check for the selector (`o.Customer != null`)
3. Substitutes the sub-tree parameter with the navigation access (`o.Customer`)
4. Combines the null-check with the sub-tree

```csharp
// Approximate result:
// o => o.Customer != null && o.Customer.Email != null
```

For point 3, `ForceCloneVisitor` is needed because the selector body (`o.Customer`) may appear in two positions of the final tree (in the null-check and as the argument of the sub-tree). If both positions shared the same node, the tree would be invalid. `ForceCloneVisitor` creates structurally identical copies but with distinct node instances.

---

## Compiling vs. Not Compiling

`Expression.Compile()` converts an expression tree into an executable delegate. It is an expensive operation (comparable in time to JIT-compiling a method). This is why Vali-Flow uses deferred and cached compilation:

```
First call to IsValid(user):
  1. Build() constructs the tree (fast)
  2. Compile() generates the delegate (expensive, ~1ms)
  3. The delegate is stored in _cachedFunc
  4. Executed: _cachedFunc(user) (very fast)

Subsequent calls to IsValid(user):
  1. _cachedFunc already exists, steps 1-3 are skipped
  2. Executed: _cachedFunc(user) (very fast)
```

For `Validate()`, each `ConditionEntry<T>` has its own `Lazy<Func<T, bool>>`. Compilation happens the first time that specific condition is evaluated, and the result is cached forever. If a condition never fails (its delegate is not needed), it is never compiled.

---

## Summary: The Lifecycle of an Expression in Vali-Flow

```
1. CAPTURE (in the component method)
   The user writes: u => u.Age > 18
   C# captures this as Expression<Func<User,bool>>
   The component can extract and modify the tree nodes

2. STORAGE (in ConditionEntry)
   The expression is stored as data in ConditionEntry<T>
   Together with its metadata: AND/OR operator, message, error code

3. COMBINATION (in BaseExpression.Build)
   Individual expressions are combined into a single tree
   Parameters are unified with ParameterReplacer
   The result is a complete Expression<Func<T,bool>>

4. COMPILATION (deferred and cached)
   Expression.Compile() generates a Func<T,bool>
   Cached to avoid repeating the expensive step

5. EXECUTION
   compiled(instance) evaluates the tree against a concrete instance
   Returns true/false
```
