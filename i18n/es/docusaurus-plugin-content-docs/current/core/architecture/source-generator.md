# Arquitectura — El Source Generator

## El problema que resuelve

`ValiFlow<T>` usa el patrón Facade + Composition: tiene 9 componentes internos y delega cada llamada al componente correspondiente. Esto significa que por cada método de cada componente, `ValiFlow<T>` necesita un método de delegación de una línea:

```csharp
// Métodos de StringExpression (~40 métodos):
public ValiFlow<T> MinLength(Expression<Func<T, string?>> s, int min)
    => _stringExpression.MinLength(s, min);
public ValiFlow<T> MaxLength(Expression<Func<T, string?>> s, int max)
    => _stringExpression.MaxLength(s, max);
public ValiFlow<T> ExactLength(Expression<Func<T, string?>> s, int len)
    => _stringExpression.ExactLength(s, len);
// ... 37 métodos más solo para strings

// Métodos de NumericExpression (~50 métodos):
public ValiFlow<T> GreaterThan(Expression<Func<T, int>> s, int val)
    => _numericExpression.GreaterThan(s, val);
// ... 49 más para numéricos

// ... y así para 7 componentes más
// Total: ~250 métodos de delegación
```

Eso son más de 800 líneas de código que:
- No contienen ninguna lógica
- Son 100% mecánicas y repetitivas
- Si se agrega un método a `IStringExpression`, hay que acordarse de agregarlo también a `ValiFlow.cs`
- Si se renombra un método, hay que actualizarlo en el componente Y en el facade
- Los mismos métodos hay que repetirlos en `ValiFlowQuery<T>`

El source generator elimina este problema completamente.

---

## Qué es un Source Generator de Roslyn

Un **Source Generator** es un componente que se ejecuta durante la compilación. Tiene acceso completo al árbol de sintaxis y a los símbolos del código fuente (gracias a la API de análisis semántico de Roslyn). Puede generar nuevos archivos `.cs` que se agregan al proyecto como si los hubiera escrito el desarrollador.

A diferencia de T4 templates o herramientas de generación de código externas, los source generators:
- Se ejecutan en cada compilación (siempre están actualizados)
- No requieren pasos de build manuales
- Tienen visibilidad completa del código fuente (pueden leer interfaces, tipos, métodos)
- El código generado aparece en el IDE con IntelliSense

---

## El atributo ForwardInterface

El mecanismo de activación es un atributo simple:

```csharp
[AttributeUsage(AttributeTargets.Field)]
internal sealed class ForwardInterfaceAttribute : Attribute { }
```

Cuando se marca un campo con `[ForwardInterface]`, el generador sabe que debe generar métodos de delegación para todos los métodos de la interfaz de ese campo:

```csharp
[ForwardInterface]
private readonly IStringExpression<ValiFlow<T>, T> _stringExpression;
//               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//               El generador lee la interfaz de este campo
//               y genera un método por cada método de la interfaz
```

El atributo en sí no hace nada en tiempo de ejecución. Es solo un marcador para el generador.

---

## El pipeline del generador

El generador sigue estos pasos durante la compilación:

### Paso 1: Encontrar campos marcados

Usa la API incremental de Roslyn (`ForAttributeWithMetadataName`) para encontrar todos los campos con `[ForwardInterface]` en el assembly que se está compilando.

```
Campos encontrados en ValiFlow<T>:
  _booleanExpression    : IBooleanExpression<ValiFlow<T>, T>
  _collectionExpression : ICollectionExpression<ValiFlow<T>, T>
  _comparisonExpression : IComparisonExpression<ValiFlow<T>, T>
  _stringExpression     : IStringExpression<ValiFlow<T>, T>
  _numericExpression    : INumericExpression<ValiFlow<T>, T>
  _dateTimeExpression   : IDateTimeExpression<ValiFlow<T>, T>
  ... etc.
```

### Paso 2: Extraer métodos de cada interfaz

Para cada campo, el generador obtiene el símbolo de la interfaz y llama a `GetMembers()` para obtener todos sus métodos. También recorre `AllInterfaces` para capturar los métodos de las interfaces padre (IStringExpression hereda de IStringLengthExpression, IStringContentExpression, etc.).

```
IStringExpression métodos (incluyendo interfaces base):
  MinLength(selector, int)
  MaxLength(selector, int)
  ExactLength(selector, int)
  LengthBetween(selector, int, int)
  StartsWith(selector, string)
  EndsWith(selector, string)
  Contains(selector, string)
  IsEmail(selector)
  IsUrl(selector)
  ... ~40 métodos en total
```

### Paso 3: Construir modelos de datos

Para cada método, el generador extrae la información necesaria para generar el código:
- Nombre del método
- Tipo de retorno
- Lista de parámetros con tipos y nombres
- Constraints genéricos (si los hay)
- Nombre del campo al que delegar

Todo esto se representa como strings puros (no como objetos del árbol de Roslyn), para que el motor incremental del generador pueda comparar fácilmente si algo cambió.

### Paso 4: Detectar conflictos

Surge un problema cuando dos campos distintos definen métodos con el mismo nombre pero constraints genéricos diferentes. Por ejemplo:

```csharp
// En IComparisonExpression:
TBuilder EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IEquatable<TValue>;

// En INumericExpression (IComparableExpression):
TBuilder EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IComparable<TValue>;
```

Ambos métodos tienen el mismo nombre y los mismos tipos de parámetros, pero constraints distintos. En C#, no se puede tener dos métodos públicos con la misma firma. La solución es:

- El primer método encontrado se genera como `public`
- Los siguientes con la misma firma se generan como **implementación explícita de interfaz** (`explicit interface implementation`):

```csharp
// Generado: el primero es public
public ValiFlow<T> EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IEquatable<TValue>
    => _comparisonExpression.EqualTo(selector, value);

// Generado: el segundo es explicit (sin modificador de acceso, prefijado con la interfaz)
ValiFlow<T> INumericExpression<ValiFlow<T>,T>.EqualTo<TValue>(Expression<Func<T, TValue>> selector, TValue value)
    where TValue : IComparable<TValue>
    => _numericExpression.EqualTo(selector, value);
```

### Paso 5: Generar el archivo

El generador produce un archivo `ValiFlow.Forwarding.g.cs` con todos los métodos de delegación:

```csharp
// <auto-generated/>
// Este archivo fue generado por el source generator ForwardingGenerator.
// No editar manualmente.

partial class ValiFlow<T>
{
    public ValiFlow<T> MinLength(Expression<Func<T, string?>> selector, int min)
        => _stringExpression.MinLength(selector, min);

    public ValiFlow<T> MaxLength(Expression<Func<T, string?>> selector, int max)
        => _stringExpression.MaxLength(selector, max);

    // ... ~250 métodos más
}
```

---

## Por qué se usa el generador incremental

Roslyn ofrece dos APIs para source generators: la vieja (`ISourceGenerator`) y la nueva incremental (`IIncrementalGenerator`). Vali-Flow usa la incremental porque:

- Solo re-genera cuando algo relevante cambia (no en cada compilación completa)
- Es más eficiente para proyectos grandes
- `ForAttributeWithMetadataName` está optimizado para encontrar atributos por nombre sin recorrer todo el árbol

---

## Qué pasa si se agrega un nuevo método a una interfaz

1. Se agrega el método a la interfaz (ej: `IStringExpression.IsPostalCode`)
2. Se implementa en la clase del componente (ej: `StringExpression.IsPostalCode`)
3. En la siguiente compilación, el source generator detecta el nuevo método en la interfaz
4. Genera automáticamente el método de delegación en `ValiFlow.Forwarding.g.cs`
5. No hay que tocar `ValiFlow.cs` ni `ValiFlowQuery.cs` (salvo que se quiera excluirlo de la variante EF Core)

---

## El sufijo `.g.cs` y la clase `partial`

Los archivos generados tienen el sufijo `.g.cs` por convención para distinguirlos del código escrito manualmente. `ValiFlow<T>` está declarada como `partial` exactamente para permitir que el código generado extienda la clase sin modificar el archivo original:

```csharp
// ValiFlow.cs (escrito manualmente) — define el constructor y campos
public partial class ValiFlow<T> : BaseExpression<ValiFlow<T>, T>, ...
{
    [ForwardInterface]
    private readonly IStringExpression<ValiFlow<T>, T> _stringExpression;
    // ...
}

// ValiFlow.Forwarding.g.cs (generado) — define los métodos de delegación
partial class ValiFlow<T>
{
    public ValiFlow<T> MinLength(...) => _stringExpression.MinLength(...);
    // ...
}
```

El compilador C# trata ambas como una sola clase.

---

## Qué NO hace el generador

El generador solo genera métodos de **delegación** (forwarding). No genera:
- Lógica de negocio (esa vive en los componentes)
- Tests
- Documentación XML
- Implementaciones de interfaces para `ValiFlowQuery<T>` (ese archivo tiene su propia anotación `[ForwardInterface]`)

---

## Cómo verificar el código generado

En Rider o Visual Studio, los archivos generados son visibles en el explorador del proyecto bajo "Generated Files" o "Analyzer Files". También se puede encontrar el archivo en la carpeta de build:

```
obj/Debug/net8.0/generated/
  Vali_Flow.Core.SourceGenerators/
    ForwardingGenerator/
      ValiFlow.Forwarding.g.cs
      ValiFlowQuery.Forwarding.g.cs
```
