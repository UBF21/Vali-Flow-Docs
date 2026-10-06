---
title: Reference
---

## Referencia

Ambas sobrecargas están en `Vali_Flow.NoSql.Redis.Extensions.ValiFlowRedisSearchExtensions`.

### `ToRedisSearch<T>(this ValiFlow<T> flow, Func<object?, string?>? customConverter = null)`

Traduce las condiciones acumuladas en un constructor `ValiFlow<T>` en una cadena de consulta RediSearch.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `flow` | `ValiFlow<T>` | Sí | El constructor que contiene las condiciones. |
| `customConverter` | `Func<object?, string?>?` | No | Hook para mapear tipos CLR a su cadena de valor tag. Retornar `null` para caer al conversor por defecto. |

**Retorna:** `string` — pásalo a `new Query(result)` o úsalo directamente en `FT().Search(...)`.

### `ToRedisSearch<T>(this Expression<Func<T, bool>> expression, Func<object?, string?>? customConverter = null)`

Misma traducción para una `Expression<Func<T, bool>>` ya construida.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending";
string query = expr.ToRedisSearch();
```


## Operaciones soportadas

| Método ValiFlow | Nodo IR | Salida RediSearch |
|----------------|---------|-------------------|
| `.EqualTo(x => x.NumField, 42)` | `EqualNode` (numérico) | `@NumField:[42 42]` |
| `.EqualTo(x => x.StrField, "v")` | `EqualNode` (cadena) | `@StrField:{"v"}` |
| `.NotEqualTo(x => x.NumField, 42)` | `EqualNode(IsNegated, numérico)` | `(-@NumField:[42 42])` |
| `.NotEqualTo(x => x.StrField, "v")` | `EqualNode(IsNegated, cadena)` | `-@StrField:{"v"}` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GT)` | `@Field:[(v +inf]` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GTE)` | `@Field:[v +inf]` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LT)` | `@Field:[-inf (v]` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LTE)` | `@Field:[-inf v]` |
| `.Contains(x => x.Field, "txt")` | `LikeNode(Contains)` | `@Field:*txt*` |
| `.StartsWith(x => x.Field, "pre")` | `LikeNode(StartsWith)` | `@Field:pre*` |
| `.EndsWith(x => x.Field, "suf")` | `LikeNode(EndsWith)` | `@Field:*suf` |
| `.In(x => x.Field, [1, 2, 3])` | `InNode` (numérico) | `(@Field:[1 1]\|@Field:[2 2]\|@Field:[3 3])` |
| `.In(x => x.Field, ["a", "b"])` | `InNode` (cadena) | `@Field:{"a"\|"b"}` |
| `.And(a, b)` | `AndNode` | `(a b)` |
| `.Or(a, b)` | `OrNode` | `(a \| b)` |
| `.Not(inner)` | `NotNode` | `-(inner)` |

**Límites de rango exclusivos:** RediSearch usa `(value` (paréntesis de apertura antes del número) para expresar desigualdad estricta. `GreaterThan` emite `[(v +inf]` y `LessThan` emite `[-inf (v]`.

**Escape de tags:** `\` y `"` dentro de valores de tag con comillas se escapan a `\\` y `\"`.

**Lista IN mixta:** Si un `InNode` contiene una mezcla de valores numéricos y no numéricos, se lanza `InvalidOperationException`. Todos los valores no nulos en una llamada `In` deben ser del mismo tipo (todos numérico/bool, o todos cadenas).


## Mapeo de tipos

Los valores se clasifican como numéricos (mapeados a consultas de rango) o cadena (mapeados a consultas de tag).

**Tipos numérico/bool** (usan sintaxis de consulta de rango `@field:[v v]`):

| Tipo CLR | Representación RediSearch |
|----------|--------------------------|
| `bool` | `1` (true) o `0` (false) |
| `int` | representación en cadena |
| `long` | representación en cadena |
| `double` | representación en cadena (InvariantCulture) |
| `float` | representación en cadena (InvariantCulture) |
| `decimal` | convertido a `double`, luego cadena |

**Tipos cadena/otros** (usan sintaxis de consulta de tag `@field:{"value"}`):

| Tipo CLR | Valor tag |
|----------|-----------|
| `string` | la cadena misma |
| `Enum` | `.ToString()` (nombre, no número) |
| cualquier otro | `.ToString()` |


## Conversor de valores personalizado

Usa `customConverter` para controlar cómo aparecen los tipos de dominio en la cadena de consulta. El conversor se llama **antes** de la clasificación incorporada. Retorna `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: usar el monto numérico para que aterrice en una consulta de rango
string query = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToRedisSearch(value =>
    {
        if (value is Money m)
            return m.Amount.ToString(CultureInfo.InvariantCulture);
        return null;
    });

// query → "@Price:[(100 +inf]"
```

Retornar una cadena desde el conversor siempre produce una consulta de tag para igualdad, y se usa tal cual para consultas de rango (así que retorna una cadena numérica en cultura invariante para campos numéricos).

---

## Ejemplo avanzado

```csharp
var query = new ValiFlow<User>()
    .EqualTo(x => x.Role, "Admin")
    .ToRedisSearch();
```
