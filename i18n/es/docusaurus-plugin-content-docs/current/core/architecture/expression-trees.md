# Arquitectura — Árboles de Expresión LINQ

## Qué es un Expression Tree

Un **expression tree** (árbol de expresión) es una representación de código como una estructura de datos en memoria. En lugar de compilar el código a instrucciones de máquina directamente, .NET permite capturarlo como un objeto que se puede inspeccionar, transformar y compilar más tarde.

La diferencia con un delegate normal (`Func<T, bool>`):

```csharp
// Delegate: el código se compila y ejecuta. No se puede inspeccionar.
Func<User, bool> func = u => u.Age > 18;
func(user);  // ejecuta, pero no se puede saber "qué hace"

// Expression tree: el código se representa como datos. Se puede inspeccionar.
Expression<Func<User, bool>> expr = u => u.Age > 18;
// expr.Body es: BinaryExpression { Left = MemberExpression{Age}, Right = ConstantExpression{18} }
// Se puede recorrer, modificar, serializar... o compilar a delegate.
var compiled = expr.Compile();  // ahora se puede ejecutar
compiled(user);
```

---

## Por qué Vali-Flow usa Expression Trees y no delegates

La razón principal es **EF Core**: para que una condición funcione con `IQueryable<T>` (y se traduzca a SQL), EF Core necesita recibir un `Expression<Func<T, bool>>`, no un `Func<T, bool>`.

```csharp
// Esto funciona con EF Core (traduce a WHERE en SQL):
dbContext.Users.Where(u => u.Age > 18);
//                    ^^^^^^^^^^^^^^^^
//                    El compilador captura esto como Expression<Func<User,bool>>
//                    cuando el parámetro del método es Expression<Func<T,bool>>

// Esto NO funciona con EF Core (el delegate ya fue compilado):
Func<User, bool> func = u => u.Age > 18;
dbContext.Users.Where(func);  // error: no se puede traducir a SQL
```

La segunda razón es la capacidad de **inspección**: `Explain()`, el reporte de errores por condición, y el Analyzer VF001 dependen de poder recorrer el árbol de expresiones.

---

## La anatomía de un árbol de expresión

Cada árbol tiene nodos. El nodo raíz es una `LambdaExpression`. Los nodos internos pueden ser `BinaryExpression`, `MemberExpression`, `MethodCallExpression`, etc.

Ejemplo: `u => u.Age > 18`

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

En código:

```csharp
var param = Expression.Parameter(typeof(User), "u");

var ageProperty = Expression.Property(param, nameof(User.Age));
var constant18  = Expression.Constant(18, typeof(int));
var greaterThan = Expression.GreaterThan(ageProperty, constant18);

var lambda = Expression.Lambda<Func<User, bool>>(greaterThan, param);
// equivalente a: u => u.Age > 18
```

---

## Cómo los componentes construyen expresiones

Cada método de un componente (como `StringExpression.MinLength`) construye manualmente el árbol de expresión que representa esa validación.

### Ejemplo: MinLength

La validación "el string no es null y tiene al menos N caracteres" se construye así:

```csharp
// Lo que hace MinLength internamente:
public TBuilder MinLength(Expression<Func<T, string?>> selector, int min)
{
    // Crea un árbol para: x => selector(x) != null && selector(x).Length >= min
    var parameter = selector.Parameters[0];  // el parámetro "x" de la expresión

    // Nodo: selector(x) != null
    var notNull = Expression.NotEqual(
        selector.Body,
        Expression.Constant(null, typeof(string))
    );

    // Nodo: selector(x).Length
    var lengthProperty = Expression.Property(selector.Body, nameof(string.Length));

    // Nodo: selector(x).Length >= min
    var minCheck = Expression.GreaterThanOrEqual(
        lengthProperty,
        Expression.Constant(min, typeof(int))
    );

    // Nodo raíz: notNull && minCheck
    var combined = Expression.AndAlso(notNull, minCheck);

    // Envuelve en lambda
    var lambda = Expression.Lambda<Func<T, bool>>(combined, parameter);

    // Lo pasa al motor central
    return _builder.Add(lambda);
}
```

El resultado es una `Expression<Func<T, bool>>` que representa `x => x.Email != null && x.Email.Length >= 5`.

---

## El problema del parámetro compartido

Cuando `Build()` combina múltiples condiciones en un solo árbol, surge un problema: cada condición tiene su propio `ParameterExpression`. Aunque se llamen igual ("x" o "u"), son objetos distintos en memoria.

```csharp
Expression<Func<User, bool>> cond1 = u => u.Age > 18;
Expression<Func<User, bool>> cond2 = u => u.IsActive;
//                                    ^               ^
//              cond1.Parameters[0]   ≠   cond2.Parameters[0]
//              Son dos objetos distintos aunque se llamen igual
```

Si se combinan directamente sin unificar parámetros:

```csharp
// INCORRECTO: el árbol referencia dos parámetros distintos
var bad = Expression.AndAlso(cond1.Body, cond2.Body);
var badLambda = Expression.Lambda<Func<User, bool>>(bad, cond1.Parameters[0]);
// cond2.Body referencia cond2.Parameters[0], que no está en la firma de badLambda
// Esto lanza InvalidOperationException al compilar
```

La solución es reemplazar todos los parámetros por uno solo antes de combinar. Esto lo hace `ParameterReplacer`:

```csharp
// CORRECTO
var unifiedParam = Expression.Parameter(typeof(User), "x");

var body1 = new ParameterReplacer(cond1.Parameters[0], unifiedParam).Visit(cond1.Body);
var body2 = new ParameterReplacer(cond2.Parameters[0], unifiedParam).Visit(cond2.Body);

var combined = Expression.AndAlso(body1, body2);
var lambda = Expression.Lambda<Func<User, bool>>(combined, unifiedParam);
// Correcto: un solo parámetro, todos los nodos lo usan
```

---

## Condiciones con MethodCall

Algunos métodos generan expresiones con llamadas a métodos (`MethodCallExpression`). Por ejemplo, `IsEmail` usa `Regex.IsMatch`:

```csharp
// IsEmail construye internamente algo equivalente a:
// x => Regex.IsMatch(x.Email, emailPattern)

var regexIsMatch = typeof(Regex).GetMethod(
    nameof(Regex.IsMatch),
    new[] { typeof(string), typeof(string) }
);

var expr = Expression.Call(
    regexIsMatch,
    selector.Body,                        // primer argumento: x.Email
    Expression.Constant(emailPattern)     // segundo argumento: el pattern
);
```

Este tipo de expresión **no es traducible por EF Core** porque SQL no tiene `Regex.IsMatch`. Por eso `IsEmail` existe solo en `ValiFlow<T>` y no en `ValiFlowQuery<T>`.

---

## Condiciones con acceso a propiedades de navegación

`ValidateNested` construye expresiones para validar propiedades de navegación (objetos anidados):

```csharp
var rule = new ValiFlow<Order>()
    .ValidateNested(
        o => o.Customer,            // selector: Order.Customer
        customer => customer
            .NotNull(c => c.Email)  // condición sobre Customer
    );
```

Internamente, `ValidateNested` construye un árbol que:

1. Compila las condiciones del sub-builder (para `Customer`)
2. Crea un null-check para el selector (`o.Customer != null`)
3. Sustituye el parámetro del sub-árbol por el acceso de navegación (`o.Customer`)
4. Combina el null-check con el sub-árbol

```csharp
// Resultado aproximado:
// o => o.Customer != null && o.Customer.Email != null
```

Para el punto 3, se necesita `ForceCloneVisitor` porque el selector body (`o.Customer`) puede aparecer en dos posiciones del árbol final (en el null-check y como argumento del sub-árbol). Si ambas posiciones compartieran el mismo nodo, el árbol sería inválido. `ForceCloneVisitor` crea copias estructuralmente idénticas pero con distintas instancias de nodo.

---

## Compilar vs. no compilar

`Expression.Compile()` convierte un árbol de expresión en un delegate ejecutable. Es una operación costosa (comparable en tiempo a JIT-compilar un método). Por eso Vali-Flow usa compilación diferida y cacheada:

```
Primera llamada a IsValid(user):
  1. Build() construye el árbol (rápido)
  2. Compile() genera el delegate (costoso, ~1ms)
  3. El delegate se guarda en _cachedFunc
  4. Se ejecuta: _cachedFunc(user) (muy rápido)

Llamadas siguientes a IsValid(user):
  1. _cachedFunc ya existe, se omiten los pasos 1-3
  2. Se ejecuta: _cachedFunc(user) (muy rápido)
```

Para `Validate()`, cada `ConditionEntry<T>` tiene su propio `Lazy<Func<T, bool>>`. La compilación ocurre la primera vez que esa condición específica se evalúa, y el resultado se cachea para siempre. Si una condición nunca falla (no se necesita su delegate), nunca se compila.

---

## Resumen: el ciclo de vida de una expresión en Vali-Flow

```
1. CAPTURA (en el método del componente)
   El usuario escribe: u => u.Age > 18
   C# captura esto como Expression<Func<User,bool>>
   El componente puede extraer y modificar los nodos del árbol

2. ALMACENAMIENTO (en ConditionEntry)
   La expresión se guarda como dato en ConditionEntry<T>
   Junto con sus metadatos: operador AND/OR, mensaje, código de error

3. COMBINACIÓN (en BaseExpression.Build)
   Las expresiones individuales se combinan en un solo árbol
   Los parámetros se unifican con ParameterReplacer
   El resultado es una Expression<Func<T,bool>> completa

4. COMPILACIÓN (diferida y cacheada)
   Expression.Compile() genera un Func<T,bool>
   Se cachea para evitar repetir el paso costoso

5. EJECUCIÓN
   compiled(instance) evalúa el árbol contra una instancia concreta
   Retorna true/false
```
