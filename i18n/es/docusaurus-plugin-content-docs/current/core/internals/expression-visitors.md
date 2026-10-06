# Internals — Expression Visitors
import Drawio from '@theme/Drawio';
import expressionVisitors from '@site/static/diagrams/expression-visitors.drawio';

## Qué es ExpressionVisitor

`ExpressionVisitor` es una clase base del framework .NET (en `System.Linq.Expressions`) que implementa el patrón Visitor para recorrer un árbol de expresiones. Provee un método `Visit(Expression node)` que llama al método apropiado según el tipo del nodo (`VisitBinary`, `VisitMember`, `VisitParameter`, etc.).

Para crear un visitor personalizado, se hereda de `ExpressionVisitor` y se sobreescriben solo los métodos de los tipos de nodo que interesan. Los nodos no sobreescritos se recorren de forma transparente (el visitor los visita pero retorna el mismo nodo sin cambios).

```csharp
// Un visitor que no hace nada (el árbol sale igual que entra):
class NoopVisitor : ExpressionVisitor { }

// Un visitor que solo modifica los nodos binarios:
class NegateComparisonsVisitor : ExpressionVisitor
{
    protected override Expression VisitBinary(BinaryExpression node)
    {
        if (node.NodeType == ExpressionType.GreaterThan)
            return Expression.LessThan(node.Left, node.Right);  // invierte
        return base.VisitBinary(node);  // deja los demás igual
    }
}
```

Vali-Flow tiene tres visitors propios, cada uno con una responsabilidad específica.

---

## ParameterReplacer

### Qué hace

Recorre un árbol de expresión y reemplaza todas las ocurrencias de un `ParameterExpression` específico por otra expresión. La expresión de reemplazo puede ser cualquier `Expression` (no necesariamente otro `ParameterExpression`).

### Código

```csharp
// En Utils/ExpressionHelpers.cs
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
    //     Comparación por referencia: ¿es el mismo objeto?
    //     Si sí, retorna el nodo de reemplazo
    //     Si no, retorna el nodo original (sin cambios)
}
```

### Por qué acepta Expression y no ParameterExpression como reemplazo

La firma es `ParameterReplacer(ParameterExpression old, Expression new)` — el parámetro `new` es `Expression`, no `ParameterExpression`. Esto permite usarlo para un caso especial en `ValiFlowGlobal`:

Cuando se registra un filtro global para una interfaz (ej: `Register<ISoftDeletable>(...)`), y luego se aplica a un tipo concreto (ej: `User` que implementa `ISoftDeletable`), el parámetro de la lambda del filtro (`ISoftDeletable`) debe ser reemplazado por una expresión de cast:

```csharp
// Filtro registrado para la interfaz:
Expression<Func<ISoftDeletable, bool>> filter = x => !x.IsDeleted;

// Al aplicarlo a User, el parámetro ISoftDeletable debe convertirse en:
// (User x) => !((ISoftDeletable)x).IsDeleted
//               ^^^^^^^^^^^^^^^^^^
//               Esto es un Expression.Convert, no un ParameterExpression

// ParameterReplacer reemplaza el parámetro x (ISoftDeletable)
// por la expresión Expression.Convert(userParam, typeof(ISoftDeletable))
var castExpression = Expression.Convert(userParam, typeof(ISoftDeletable));
var replaced = new ParameterReplacer(filter.Parameters[0], castExpression)
    .Visit(filter.Body);
```

Si `new` fuera `ParameterExpression`, este caso sería imposible.

### Dónde se usa

- `BaseExpression.Build()`: para unificar el parámetro de cada condición con el parámetro compartido del árbol final
- `BaseExpression.When()` y `Unless()`: para insertar el parámetro correcto en la condición condicional
- `BaseExpression.BuildNestedExpression()`: para reemplazar el parámetro del sub-builder con el acceso de navegación
- `BaseExpression.BuildWithGlobal()`: para adaptar los filtros globales al tipo concreto

---

## ForceCloneVisitor

### Qué hace

Produce una copia estructuralmente idéntica pero con instancias de nodo completamente distintas. Todos los nodos del árbol resultante son nuevos objetos, aunque su estructura y valores son iguales al original.

### Código

```csharp
// En Utils/ExpressionHelpers.cs
internal sealed class ForceCloneVisitor : ExpressionVisitor
{
    protected override Expression VisitMember(MemberExpression node)
    {
        var expr = Visit(node.Expression);
        return Expression.MakeMemberAccess(expr, node.Member);
        // Nuevo MemberExpression con la misma propiedad
    }

    protected override Expression VisitUnary(UnaryExpression node)
    {
        var operand = Visit(node.Operand)!;
        return Expression.MakeUnary(node.NodeType, operand, node.Type, node.Method);
        // Nuevo UnaryExpression con el mismo operador
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
        // Nuevo BinaryExpression con los mismos operandos clonados
    }

    protected override Expression VisitMethodCall(MethodCallExpression node)
    {
        var obj  = node.Object != null ? Visit(node.Object) : null;
        var args = node.Arguments.Select(a => Visit(a)!);
        return Expression.Call(obj, node.Method, args);
        // Nuevo MethodCallExpression con el mismo método
    }
}
```

### Por qué es necesario

El problema surge en `ValidateNested`. Cuando se valida una propiedad de navegación, el árbol final necesita usar el selector (ej: `order.Customer`) en dos lugares distintos:

1. El null-check: `order.Customer != null`
2. Como "parámetro" del sub-árbol: `order.Customer.Email != null`

Si ambos usan el mismo nodo `MemberExpression order.Customer`, el árbol sería inválido: un nodo del árbol de expresión no puede aparecer en dos posiciones distintas.

```csharp
// El árbol final que queremos:
//   order => order.Customer != null && order.Customer.Email != null
//                   ^^^^^^^^                 ^^^^^^^^
//            Posición 1 del null-check    Posición 2 del sub-árbol
//            Deben ser nodos distintos (aunque representen lo mismo)

// ForceCloneVisitor crea una copia del MemberExpression para la segunda posición:
var selectorBody = selector.Body;               // order.Customer (original)
var selectorBodyClone = new ForceCloneVisitor() // order.Customer (copia)
    .Visit(selectorBody)!;
```

### Dónde se usa

Exclusivamente en `BuildNestedExpression()` dentro de `BaseExpression`, para el caso de `ValidateNested`.

---

## ExpressionExplainer

### Qué hace

Convierte un árbol de expresión en una cadena de texto legible. El resultado no es código C# exacto, sino una representación simplificada diseñada para ser entendida por humanos en logs y mensajes de debugging.

### Ejemplo de output

```csharp
var rule = new ValiFlow<User>()
    .GreaterThan(u => u.Age, 18)
    .IsTrue(u => u.IsActive)
    .Or()
    .IsTrue(u => u.IsAdmin);

rule.Explain();
// Output: "((x.Age > 18) AND (x.IsActive == True)) OR (x.IsAdmin == True)"
```

### Cómo funciona

`ExpressionExplainer` hereda de `ExpressionVisitor` y acumula texto en un `StringBuilder`. Para cada tipo de nodo, genera la representación textual correspondiente:

```csharp
// Pseudocódigo de los métodos principales:

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
    // Si es acceso a propiedad de un parámetro: "x.PropertyName"
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
    // Muestra: "MethodName(arg1, arg2)"
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

### Mapeo de NodeType a símbolo

| NodeType | Símbolo en Explain() |
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

### Dónde se usa

`BaseExpression.Explain()` llama a `ExpressionExplainer`:

> **v2.0.0:** Dos ramas `else-if`/`else` duplicadas en `VisitMethodCall` — con cuerpos idénticos — fueron colapsadas en un único `else`. Sin cambio de comportamiento; fue una eliminación de código muerto.

```csharp
public string Explain()
{
    var expr = Build();
    return ExpressionExplainer.Explain(expr);
}
```

---

## Relación entre los tres visitors


<Drawio content={expressionVisitors} />

---

## Cómo crear un visitor propio

Si se necesita agregar un visitor personalizado (para un caso de uso específico):

1. Heredar de `ExpressionVisitor`
2. Sobreescribir los métodos de los tipos de nodo que interesan
3. Llamar `base.VisitXxx(node)` para los nodos que no se modifican
4. Usar `Visit(subNode)` para recorrer sub-expresiones recursivamente

```csharp
// Ejemplo: un visitor que cuenta cuántos accesos a propiedades hay
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

// Uso:
var counter = new PropertyAccessCounter();
counter.Visit(rule.Build());
Console.WriteLine(counter.Count);
```