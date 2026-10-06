---
title: Reference
---

## Referencia

Ambas sobrecargas viven en `Vali_Flow.NoSql.Firestore.Extensions.ValiFlowFirestoreExtensions`.

### `ToFirestore<T>(this ValiFlow<T> flow, Func<object?, object?>? customConverter = null)`

Traduce las condiciones acumuladas en un builder `ValiFlow<T>` a un `Filter` nativo.

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|--------------|
| `flow` | `ValiFlow<T>` | Sí | El builder con las condiciones. Lanza `ArgumentNullException` si es `null`. |
| `customConverter` | `Func<object?, object?>?` | No | Hook para mapear tipos CLR que el switch incorporado no maneja. Retornar `null` para caer en la conversión por defecto. Está acotado a esta llamada (thread-safe). |

**Retorna:** `Filter` — pasalo directo a `Query.Where(filter)`.

### `ToFirestore<T>(this Expression<Func<T, bool>> expression, Func<object?, object?>? customConverter = null)`

Misma traducción para un `Expression<Func<T, bool>>` ya construido.

```csharp
Expression<Func<Order, bool>> expr = o => o.Status == "Pending" && o.Total > 50m;
Filter filter = expr.ToFirestore();
```

Ambas sobrecargas son wrappers delgados sobre `FirestoreFilterTranslator.Translate(IConditionNode, Func<object?, object?>?)` — la sobrecarga de `ValiFlow<T>` llama primero a `flow.ToNoSqlIR()`, y la de expresión llama primero a `expression.ToNoSqlIR()`.

---

## Operaciones soportadas

| Método ValiFlow | Nodo IR | Llamada a `Filter` de Firestore |
|------------------|---------|-----------------------------------|
| `.EqualTo(x => x.Field, v)` | `EqualNode(IsNegated: false)` | `Filter.EqualTo(field, value)` |
| `.NotEqualTo(x => x.Field, v)` | `EqualNode(IsNegated: true)` | `Filter.NotEqualTo(field, value)` |
| `.GreaterThan(x => x.Field, v)` | `ComparisonNode(GreaterThan)` | `Filter.GreaterThan(field, value)` |
| `.GreaterThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(GreaterThanOrEqual)` | `Filter.GreaterThanOrEqualTo(field, value)` |
| `.LessThan(x => x.Field, v)` | `ComparisonNode(LessThan)` | `Filter.LessThan(field, value)` |
| `.LessThanOrEqualTo(x => x.Field, v)` | `ComparisonNode(LessThanOrEqual)` | `Filter.LessThanOrEqualTo(field, value)` |
| `.In(x => x.Field, list)` | `InNode` | `Filter.InArray(field, values)` |
| `.IsNull(x => x.Field)` | `NullNode(IsNull)` | `Filter.EqualTo(field, null)` |
| `.IsNotNull(x => x.Field)` | `NullNode(IsNotNull)` | `Filter.NotEqualTo(field, null)` |
| `.And(a, b)` | `AndNode` | `Filter.And(left, right)` |
| `.Or(a, b)` | `OrNode` | `Filter.Or(left, right)` |
| `.Contains` / `.StartsWith` / `.EndsWith` | `LikeNode` | **lanza** `NotSupportedException` |
| `.Not(inner)` | `NotNode` | **lanza** `NotSupportedException` |

`And`/`Or` anidan recursivamente, replicando exactamente la forma del árbol IR — no hay un "flattening" a un único `Filter.And(a, b, c, ...)` aunque la expresión original encadene más de dos condiciones; cada nodo binario se convierte en una llamada anidada `Filter.And`/`Filter.Or`.

---

## Mapeo de tipos

El switch incorporado dentro de `FirestoreFilterTranslator` (método `ToValue`) maneja estos tipos CLR antes de pasar el valor a `Filter.*`:

| Tipo CLR | Valor pasado a `Filter.*` |
|----------|------------------------------|
| `null` | `null` |
| `Enum` | `int` (vía `Convert.ToInt32(e)`) |
| `DateTimeOffset` | `Timestamp.FromDateTimeOffset(dto)` |
| `DateTime` | `Timestamp.FromDateTime(...)` — convertido a UTC primero si `dt.Kind != DateTimeKind.Utc` |
| cualquier otro (`string`, `int`, `long`, `double`, `bool`, `decimal`, ...) | pasa sin cambios — el SDK de Firestore los serializa de forma nativa |

Orden de resolución: `customConverter` (si se provee) corre primero vía `ConditionValueResolver.Resolve`; si retorna `null`, aplica el switch incorporado de arriba.

---

## Conversor de valores personalizado

Usá `customConverter` para tipos de dominio que el switch incorporado no conoce, o para sobreescribir un default (por ejemplo, almacenar un `decimal` como `double` en vez de dejar que el SDK lo serialice tal cual).

El conversor corre **antes** del switch incorporado. Retorná `null` para dejar que el default maneje el valor.

```csharp
// Tipo de dominio
record Money(decimal Amount, string Currency);

// Conversor: almacenar Money como un double del monto
Filter filter = new ValiFlow<Product>()
    .GreaterThan(x => x.Price, new Money(100m, "USD"))
    .ToFirestore(value =>
    {
        if (value is Money m)
            return (double)m.Amount;
        return null; // dejar pasar todo lo demás
    });
```

---

## Ejemplo avanzado

```csharp
// Conversor personalizado para el tipo Money
Filter filter = new ValiFlow<Order>()
    .GreaterThan(o => o.Total, 100m)
    .ToFirestore(obj => obj is Money m ? (double)m.Amount : null);
```
