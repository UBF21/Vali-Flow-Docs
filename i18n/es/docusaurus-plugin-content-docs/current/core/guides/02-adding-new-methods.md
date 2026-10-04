---
sidebar_position: 2
---

# Guía — Cómo agregar un nuevo método a la librería

Esta guía describe el proceso completo para agregar un nuevo método de validación a Vali-Flow.Core. Se usa como ejemplo agregar un método `IsPostalCode` al dominio de strings.

---

## Checklist (resumen)

Antes de empezar, tener a mano este checklist. Cada paso corresponde a una sección de la guía:

- [ ] 1. Implementar en la clase del componente (`Classes/Types/`)
- [ ] 2. Declarar en la interfaz del tipo (`Interfaces/Types/`)
- [ ] 3. Agregar a `ValiFlow<T>` (el source generator lo hace automáticamente)
- [ ] 4. Decidir si va en `ValiFlowQuery<T>` (¿es EF Core-safe?)
- [ ] 5. Escribir tests
- [ ] 6. Ejecutar `dotnet test` — 0 fallos

---

## Paso 1: Implementar en la clase del componente

El primer paso es escribir la lógica real en la clase del componente correspondiente. Para un método de validación de strings, el archivo es `Vali-Flow.Core/Classes/Types/StringExpression.cs`.

La clase del componente sigue siempre la misma estructura:

```csharp
// Dentro de StringExpression<TBuilder, T>

/// <summary>Valida que el valor es un código postal argentino (4 o 5 dígitos).</summary>
/// <remarks>Not EF Core translatable. Uses Regex internally.</remarks>
public TBuilder IsPostalCode(Expression<Func<T, string?>> selector)
{
    // 1. Obtener el parámetro del selector (representa "x" en x => x.ZipCode)
    var parameter = selector.Parameters[0];

    // 2. Construir el árbol de expresión
    //    Este árbol representa: x => x.ZipCode != null && Regex.IsMatch(x.ZipCode, pattern)
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
        Expression.Constant(@"^\d{4,5}$")  // patrón: 4 o 5 dígitos
    );

    var combined = Expression.AndAlso(notNull, regexCall);
    var lambda = Expression.Lambda<Func<T, bool>>(combined, parameter);

    // 3. Delegar al builder padre (BaseExpression.Add)
    return _builder.Add(lambda);
}
```

### Dónde vive la lógica

Todo el código de construcción de expresiones vive en el componente. `ValiFlow<T>` no tiene lógica; solo delega.

### Acceder a patrones Regex predefinidos

Los patrones comunes están en `RegularExpressions/RegularExpression.cs`. Si el patrón es nuevo, agregarlo ahí:

```csharp
// En RegularExpression.cs
internal static class RegularExpression
{
    internal static readonly Regex Email = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // Nuevo patrón:
    internal static readonly Regex PostalCode = new(@"^\d{4,5}$",
        RegexOptions.Compiled);
}
```

Usar el campo de la clase en lugar de crear un `new Regex(...)` en cada llamada:

```csharp
var regexCall = Expression.Call(
    regexIsMatch,
    selector.Body,
    Expression.Constant(RegularExpression.PostalCode.ToString())
    // O pasar directamente la instancia si el método acepta Regex:
    // Expression.Constant(RegularExpression.PostalCode)
);
```

---

## Paso 2: Declarar en la interfaz del tipo

Abrir `Vali-Flow.Core/Interfaces/Types/IStringExpression.cs` y agregar la declaración del método.

La interfaz define el contrato. Los consumidores que dependan de la interfaz verán el nuevo método automáticamente.

```csharp
// En IStringExpression<TBuilder, T> o en una sub-interfaz como IStringFormatExpression
// (elegir la sub-interfaz que mejor agrupe el método)

/// <summary>Valida que el valor es un código postal de 4 o 5 dígitos.</summary>
/// <remarks>Not EF Core translatable. Uses Regex internally.</remarks>
TBuilder IsPostalCode(Expression<Func<T, string?>> selector);
```

### Cuándo poner el `<remarks>Not EF Core translatable`

Agregar este remark si el método usa cualquiera de estos elementos:
- `Regex.IsMatch`
- `string.Contains(string, StringComparison)`
- `char.IsLetter`, `char.IsDigit`, `char.IsWhiteSpace`, etc.
- Predicados lambda como argumentos (`.Any(x => x.Active)`)
- `Enumerable.Contains` con listas en memoria

Si el método genera solo comparaciones simples (igual, mayor que, menor que, acceso a propiedad), es EF Core-safe y no necesita el remark.

---

## Paso 3: ValiFlow<T> — el source generator lo resuelve

Después de agregar el método a la clase del componente y a la interfaz, el source generator detecta el cambio en la próxima compilación y genera automáticamente el método de delegación en `ValiFlow.Forwarding.g.cs`:

```csharp
// Generado automáticamente — NO editar:
public ValiFlow<T> IsPostalCode(Expression<Func<T, string?>> selector)
    => _stringExpression.IsPostalCode(selector);
```

No hay nada que hacer manualmente en `ValiFlow.cs`.

---

## Paso 4: Decidir si va en ValiFlowQuery<T>

### Si el método es EF Core-safe

Abrir `Vali-Flow.Core/Builder/ValiFlowQuery.cs` y verificar que el campo `_stringExpression` ya tiene la interfaz correcta. El source generator también generará el método de delegación para `ValiFlowQuery<T>` automáticamente, siempre que la interfaz esté referenciada en el campo marcado con `[ForwardInterface]`.

Para un método EF Core-safe no hay que hacer nada adicional en `ValiFlowQuery.cs`.

### Si el método NO es EF Core-safe (como IsPostalCode)

El método no debe aparecer en `ValiFlowQuery<T>`. Para asegurar esto:

1. Verificar que el remark `Not EF Core translatable` está en la interfaz
2. Verificar que `ValiFlowQuery.cs` usa una interfaz separada (o excluye la sub-interfaz) que no declara el método

Si la sub-interfaz `IStringFormatExpression` está excluida de `ValiFlowQuery<T>`, el método no aparecerá allí automáticamente.

---

## Paso 5: Escribir tests

Los tests viven en `Vali-Flow.Core.Tests/`. Cada dominio tiene su propio archivo de tests (ej: `StringExpressionTests.cs`).

Estructura de un test:

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
[InlineData("123")]   // muy corto
[InlineData("123456")] // muy largo
public void IsPostalCode_InvalidCode_ReturnsFalse(string? zipCode)
{
    var rule = new ValiFlow<User>().IsPostalCode(u => u.ZipCode);
    var user = new User { ZipCode = zipCode };

    Assert.False(rule.IsValid(user));
}
```

### Qué cubrir en los tests

- Caso feliz: valor válido que debe pasar
- Casos de borde: null, cadena vacía, valor mínimo/máximo del rango
- Casos negativos: valores que claramente deben fallar
- Combinación con AND/OR (si la lógica es compleja)
- Integración: que `Build()` retorna una expresión usable con LINQ

---

## Paso 6: Ejecutar los tests

```bash
cd /Users/feliperafaelmontenegro/RiderProjects/Vali-Flow.Core
dotnet test
```

El resultado debe ser 0 fallos antes de hacer commit.

```bash
dotnet test --configuration Release
```

También ejecutar en Release para detectar diferencias de comportamiento entre Debug y Release (son raras, pero existen con expression trees).

---

## Ejemplo completo: método IsAlphaNumeric (sin Regex, EF Core-safe)

Para mostrar un método que sí va en `ValiFlowQuery<T>`:

```csharp
// Paso 1: Implementar en StringExpression.cs
/// <summary>Valida que el valor contiene solo letras y/o dígitos.</summary>
public TBuilder IsAlphaNumericSimple(Expression<Func<T, string?>> selector)
{
    var parameter = selector.Parameters[0];

    // Versión simple: usar string.All con char.IsLetterOrDigit
    // NOTA: char.IsLetterOrDigit no es EF Core-translatable
    // Para hacer una versión EF Core-safe, se necesita una comparación diferente

    // Versión EF Core-safe: delegar a una columna calculada o usar LIKE
    // En EF Core no hay un equivalente directo de "solo alfanumérico"
    // Por tanto, este método pertenece solo a ValiFlow<T>
}
```

Si se descubre que un método no puede ser EF Core-safe de ninguna forma razonable, simplemente no se agrega a `ValiFlowQuery<T>` y se documenta con el remark.

---

## Errores comunes al agregar métodos

### El árbol de expresión referencia variables capturadas incorrectamente

```csharp
// MAL: la variable 'pattern' es capturada por referencia
// Si su valor cambia después, el árbol puede comportarse de forma inesperada
string pattern = GetPattern();
var expr = (Expression<Func<User, bool>>)(u => Regex.IsMatch(u.Email!, pattern));

// BIEN: usar Expression.Constant para incrustar el valor en el árbol
var lambda = Expression.Lambda<Func<T, bool>>(
    Expression.Call(regexMethod, selector.Body, Expression.Constant(pattern)),
    parameter
);
```

### Olvidar unificar parámetros antes de combinar

`BaseExpression.Add` se encarga de esto cuando se agrega la expresión. Pero si dentro del método del componente se combinan múltiples expresiones manualmente antes de llamar `_builder.Add`, hay que asegurar que todas comparten el mismo `ParameterExpression`.

```csharp
// MAL: combinar sin unificar parámetros
var cond1 = BuildCondition1(selector);
var cond2 = BuildCondition2(selector);
var combined = Expression.AndAlso(cond1.Body, cond2.Body);
// cond1 y cond2 pueden tener distintos parámetros

// BIEN: usar el mismo parámetro en todas las sub-expresiones
var param = selector.Parameters[0];
var body1 = BuildBody1(selector.Body, param);
var body2 = BuildBody2(selector.Body, param);
var combined = Expression.AndAlso(body1, body2);
var lambda = Expression.Lambda<Func<T, bool>>(combined, param);
```

### Agregar el método a la interfaz pero no a la clase

Si se agrega `IsPostalCode` a `IStringExpression` pero no a `StringExpression`, el compilador dará un error de "no implementa el miembro de la interfaz". El source generator no puede generar el método de delegación si el componente no lo tiene.
