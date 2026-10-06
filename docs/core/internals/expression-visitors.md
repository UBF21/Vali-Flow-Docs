# Internals — Expression Visitors
import Drawio from '@theme/Drawio';
import expressionVisitors from '@site/static/diagrams/expression-visitors.drawio';

## What ExpressionVisitor Is

`ExpressionVisitor` is a .NET framework base class (in `System.Linq.Expressions`) that implements the Visitor pattern for traversing an expression tree. It provides a `Visit(Expression node)` method that calls the appropriate method based on the node type (`VisitBinary`, `VisitMember`, `VisitParameter`, etc.).

To create a custom visitor, inherit from `ExpressionVisitor` and override only the methods for the node types of interest. Non-overridden nodes are traversed transparently (the visitor visits them but returns the same node without changes).

```csharp
// A visitor that does nothing (the tree comes out the same as it goes in):
class NoopVisitor : ExpressionVisitor { }

// A visitor that only modifies binary nodes:
class NegateComparisonsVisitor : ExpressionVisitor
{
    protected override Expression VisitBinary(BinaryExpression node)
    {
        if (node.NodeType == ExpressionType.GreaterThan)
            return Expression.LessThan(node.Left, node.Right);  // reverses it
        return base.VisitBinary(node);  // leaves others unchanged
    }
}
```

Vali-Flow has three custom visitors, each with a specific responsibility.

---

## ParameterReplacer

### What It Does

Traverses an expression tree and replaces all occurrences of a specific `ParameterExpression` with another expression. The replacement expression can be any `Expression` (not necessarily another `ParameterExpression`).

### Code

```csharp
// In Utils/ExpressionHelpers.cs
internal sealed class ParameterReplacer : ExpressionVisitor
{
    private readonly ParameterExpression _old;
    private readonly Expression _new;

    internal ParameterReplacer(ParameterExpression old, Expression @new)
    {
        _old = old;
        _new = @new;
    }

    protected override Expression VisitParameter(ParameterExpression node)
        => node == _old ? _new : base.VisitParameter(node);
    //     ^^^^^^^^^^^^^^^^
    //     Reference comparison: is it the same object?
    //     If yes, return the replacement node
    //     If no, return the original node (unchanged)
}
```

### Why It Accepts Expression and Not ParameterExpression as Replacement

The signature is `ParameterReplacer(ParameterExpression old, Expression new)` — the `new` parameter is `Expression`, not `ParameterExpression`. This allows it to be used for a special case in `ValiFlowGlobal`:

When a global filter is registered for an interface (e.g.: `Register<ISoftDeletable>(...)`), and then applied to a concrete type (e.g.: `User` which implements `ISoftDeletable`), the parameter of the filter lambda (`ISoftDeletable`) must be replaced with a cast expression:

```csharp
// Filter registered for the interface:
Expression<Func<ISoftDeletable, bool>> filter = x => !x.IsDeleted;

// When applying it to User, the ISoftDeletable parameter must be converted to:
// (User x) => !((ISoftDeletable)x).IsDeleted
//               ^^^^^^^^^^^^^^^^^^
//               This is an Expression.Convert, not a ParameterExpression

// ParameterReplacer replaces the parameter x (ISoftDeletable)
// with the expression Expression.Convert(userParam, typeof(ISoftDeletable))
var castExpression = Expression.Convert(userParam, typeof(ISoftDeletable));
var replaced = new ParameterReplacer(filter.Parameters[0], castExpression)
    .Visit(filter.Body);
```

If `new` were `ParameterExpression`, this case would be impossible.

### Where It Is Used

- `BaseExpression.Build()`: to unify each condition's parameter with the shared parameter of the final tree
- `BaseExpression.When()` and `Unless()`: to insert the correct parameter in the conditional condition
- `BaseExpression.BuildNestedExpression()`: to replace the sub-builder parameter with the navigation access
- `BaseExpression.BuildWithGlobal()`: to adapt global filters to the concrete type

---

## ForceCloneVisitor

### What It Does

Produces a structurally identical copy but with completely distinct node instances. All nodes in the resulting tree are new objects, although their structure and values are equal to the original.

### Code

```csharp
// In Utils/ExpressionHelpers.cs
internal sealed class ForceCloneVisitor : ExpressionVisitor
{
    protected override Expression VisitMember(MemberExpression node)
    {
        var expr = Visit(node.Expression);
        return Expression.MakeMemberAccess(expr, node.Member);
        // New MemberExpression with the same property
    }

    protected override Expression VisitUnary(UnaryExpression node)
    {
        var operand = Visit(node.Operand)!;
        return Expression.MakeUnary(node.NodeType, operand, node.Type, node.Method);
        // New UnaryExpression with the same operator
    }

    protected override Expression VisitBinary(BinaryExpression node)
    {
        var left  = Visit(node.Left)!;
        var right = Visit(node.Right)!;
        return node.Conversion != null
            ? Expression.MakeBinary(node.NodeType, left, right,
                node.IsLiftedToNull, node.Method, (LambdaExpression)Visit(node.Conversion)!)
            : Expression.MakeBinary(node.NodeType, left, right,
                node.IsLiftedToNull, node.Method);
        // New BinaryExpression with the same cloned operands
    }

    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        var obj  = node.Object != null ? Visit(node.Object) : null;
        var args = node.Arguments.Select(a => Visit(a)!);
        return Expression.Call(obj, node.Method, args);
        // New MethodCallExpression with the same method
    }
}
```

### Why It Is Necessary

The problem arises in `ValidateNested`. When validating a navigation property, the final tree needs to use the selector (e.g.: `order.Customer`) in two different positions:

1. The null-check: `order.Customer != null`
2. As the "parameter" of the sub-tree: `order.Customer.Email != null`

If both positions used the same `MemberExpression order.Customer` node, the tree would be invalid: an expression tree node cannot appear in two different positions.

```csharp
// The final tree we want:
//   order => order.Customer != null && order.Customer.Email != null
//                   ^^^^^^^^                 ^^^^^^^^
//            Position 1 of null-check    Position 2 of sub-tree
//            Must be distinct nodes (even if they represent the same thing)

// ForceCloneVisitor creates a copy of the MemberExpression for the second position:
var selectorBody = selector.Body;               // order.Customer (original)
var selectorBodyClone = new ForceCloneVisitor() // order.Customer (copy)
    .Visit(selectorBody)!;
```

### Where It Is Used

Exclusively in `BuildNestedExpression()` inside `BaseExpression`, for the `ValidateNested` case.

---

## ExpressionExplainer

### What It Does

Converts an expression tree into a human-readable string. The result is not exact C# code, but a simplified representation designed to be understood by humans in logs and debugging messages.

### Example Output

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive)
    .Or()
    .IsTrue(u => u.IsAdmin);

rule.Explain();
// Output: "((x.Age > 18) AND (x.IsActive == True)) OR (x.IsAdmin == True)"
```

### How It Works

`ExpressionExplainer` inherits from `ExpressionVisitor` and accumulates text in a `StringBuilder`. For each node type, it generates the corresponding textual representation:

```csharp
// Pseudocode of the main methods:

protected override Expression VisitBinary(BinaryExpression node)
{
    _sb.Append("(");
    Visit(node.Left);
    _sb.Append($" {NodeTypeToSymbol(node.NodeType)} ");
    Visit(node.Right);
    _sb.Append(")");
    return node;
}

protected override Expression VisitMember(MemberExpression node)
{
    // If it is a property access on a parameter: "x.PropertyName"
    if (node.Expression is ParameterExpression param)
        _sb.Append($"{param.Name}.{node.Member.Name}");
    else
    {
        Visit(node.Expression);
        _sb.Append($".{node.Member.Name}");
    }
    return node;
}

protected override Expression VisitConstant(ConstantExpression node)
{
    _sb.Append(node.Value?.ToString() ?? "null");
    return node;
}

protected override Expression VisitMethodCall(MethodCallExpression node)
{
    // Shows: "MethodName(arg1, arg2)"
    _sb.Append($"{node.Method.Name}(");
    for (int i = 0; i < node.Arguments.Count; i++)
    {
        if (i > 0) _sb.Append(", ");
        Visit(node.Arguments[i]);
    }
    _sb.Append(")");
    return node;
}
```

### NodeType to Symbol Mapping

| NodeType | Symbol in Explain() |
|---|---|
| `AndAlso` | `AND` |
| `OrElse` | `OR` |
| `GreaterThan` | `>` |
| `GreaterThanOrEqual` | `>=` |
| `LessThan` | `<` |
| `LessThanOrEqual` | `<=` |
| `Equal` | `==` |
| `NotEqual` | `!=` |
| `Not` | `NOT` |

### Where It Is Used

`BaseExpression.Explain()` calls `ExpressionExplainer`:

```csharp
public string Explain()
{
    var expr = Build();
    return ExpressionExplainer.Explain(expr);
}
```

**v2.0.0:** Two duplicate `else-if`/`else` branches in `VisitMethodCall` — both with identical bodies — were collapsed into a single `else` branch. No behavioral change; this was a dead-code deduplication.

---

## Relationship Between the Three Visitors


<Drawio content={expressionVisitors} />

---

## How to Create a Custom Visitor

If a custom visitor is needed (for a specific use case):

1. Inherit from `ExpressionVisitor`
2. Override the methods for the node types of interest
3. Call `base.VisitXxx(node)` for nodes that are not modified
4. Use `Visit(subNode)` to traverse sub-expressions recursively

```csharp
// Example: a visitor that counts how many property accesses there are
internal sealed class PropertyAccessCounter : ExpressionVisitor
{
    public int Count { get; private set; }

    protected override Expression VisitMember(MemberExpression node)
    {
        if (node.Expression is ParameterExpression)
            Count++;
        return base.VisitMember(node);
    }
}

// Usage:
var counter = new PropertyAccessCounter();
counter.Visit(rule.Build());
Console.WriteLine(counter.Count);
```