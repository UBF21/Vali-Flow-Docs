# Internals — Thread Safety y el ciclo Freeze/Fork

## El problema

Un builder de expresiones tiene dos fases de vida radicalmente distintas:

1. **Fase de construcción**: el usuario agrega condiciones, llama `.Or()`, `.WithMessage()`, etc. Esta fase requiere mutación del estado interno. Es inherentemente secuencial (un thread a la vez).

2. **Fase de uso**: el builder ya está definido. Se llama `IsValid()`, `Build()`, `Validate()` potencialmente desde múltiples threads concurrentes (ej: múltiples requests HTTP que usan la misma regla estática).

El desafío es hacer que la transición entre fases sea segura, sin requerir que el usuario lo gestione explícitamente.

---

## El modelo Freeze/Fork

La solución implementada se llama **Freeze/Fork** y está inspirada en cómo funciona `IQueryable<T>` de LINQ.

### Freeze: sellar el builder

Cuando el builder entra en la fase de uso (por primera vez que se llama `IsValid`, `Build`, `Validate`, o explícitamente `Freeze()`), el builder se "sella". Internamente, esto significa cambiar el campo `_frozen` de `0` a `1`:

```csharp
private int _frozen; // 0 = mutable, 1 = frozen

public TBuilder Freeze()
{
    Interlocked.CompareExchange(ref _frozen, 1, 0);
    // CompareExchange: si _frozen es 0, lo cambia a 1 atómicamente
    // Si ya era 1 (ya estaba frozen), no hace nada
    return (TBuilder)this;
}
```

Se usa `Interlocked.CompareExchange` en lugar de una asignación simple para garantizar que el cambio sea atómico y visible inmediatamente para todos los threads.

### Fork: mutación segura después de freeze

Después de freeze, cualquier llamada a un método de mutación detecta que el builder está frozen y en lugar de modificarlo, crea un **fork**: una copia del builder con la nueva condición agregada.

```csharp
// Pseudocódigo del flujo de Add():
internal TBuilder Add(Expression<Func<T, bool>> condition, bool isAnd = true)
{
    var entry = ConditionEntry<T>.Create(condition, isAnd);

    if (Volatile.Read(ref _frozen) == 1)
    {
        // El builder está frozen: crear un fork
        var fork = new TBuilder();               // nuevo builder (vacío)
        fork._conditions = _conditions.Add(entry); // condiciones: las existentes + la nueva
        // El fork empieza como mutable (fork._frozen = 0)
        return fork;
    }

    // El builder está mutable: agregar directamente
    _conditions = _conditions.Add(entry);
    return (TBuilder)this;
}
```

El fork es completamente independiente. Tiene la misma lista de condiciones que el original (gracias a `ImmutableList`, que no copia los elementos), más la nueva condición.

---

## Por qué ImmutableList hace el fork eficiente

`ImmutableList<T>` de .NET está implementado internamente como un árbol AVL balanceado. Cuando se llama `.Add(item)`:
- No se copia toda la lista
- Se crean solo los nodos nuevos del árbol que son necesarios
- Los nodos anteriores se comparten entre la lista vieja y la nueva

```
Lista original: [A, B, C]      (internamente: árbol AVL)
Lista fork:     [A, B, C, D]   (comparte el subárbol [A,B,C] con la original)
```

Esto significa que `_conditions.Add(entry)` es O(log n) en tiempo y espacio, no O(n). No importa cuántas condiciones tenga el builder base.

---

## Volatile.Read y la publicación del cache

Después de freeze, `IsValid` usa un delegate compilado cacheado (`_cachedFunc`). La primera vez que se llama `IsValid`, se compila y guarda:

```csharp
private Func<T, bool>? _cachedFunc;

public Func<T, bool> BuildCached()
{
    // Leer el cache con Volatile para garantizar visibilidad cross-thread
    var cached = Volatile.Read(ref _cachedFunc);
    if (cached != null)
        return cached;

    // Compilar
    var compiled = Build().Compile();

    // Publicar el cache con Volatile para garantizar que otros threads lo vean
    Volatile.Write(ref _cachedFunc, compiled);

    return compiled;
}
```

`Volatile.Read` y `Volatile.Write` garantizan que las lecturas y escrituras son visibles inmediatamente para todos los threads, sin requerir un lock. Esto implementa el patrón de "publicación segura" (safe publication).

En teoría, dos threads podrían compilar el delegate simultáneamente si ambos leen `_cachedFunc == null` antes de que cualquiera escriba. Esto es **benign**: el resultado es el mismo delegate lógico, y uno de los resultados simplemente se descartará. Se prefiere esta estrategia a un lock porque:
- Los locks son costosos cuando hay mucha contención
- La compilación duplicada es extremadamente rara (solo en el primer uso)
- El resultado es determinista (mismo árbol → mismo comportamiento)

---

## Validate y el _validateLock

`Validate()` y `ValidateAll()` tienen una lógica diferente a `IsValid`. No usan el delegate compilado global; usan el `CompiledFunc` de cada `ConditionEntry` individualmente para poder reportar qué condición falló.

El ciclo de evaluación necesita iterar la lista de condiciones. Aunque `ImmutableList` es thread-safe para lectura concurrente, `Validate` necesita construir el `ValidationResult` de forma atómica con respecto a la lista:

```csharp
private readonly object _validateLock = new();

public ValidationResult Validate(T instance)
{
    // Freeze implícito
    Freeze();

    lock (_validateLock)
    {
        var errors = new List<ValidationError>();

        foreach (var entry in _conditions)
        {
            // Evaluar el delegate de esta condición
            bool passes = entry.CompiledFunc.Value(instance);

            if (!passes && entry.HasMetadata)
            {
                errors.Add(new ValidationError
                {
                    ErrorCode    = entry.ErrorCode,
                    Message      = entry.Message ?? entry.MessageFactory?.Invoke(),
                    PropertyPath = entry.PropertyPath,
                    Severity     = entry.Severity
                });
            }
        }

        return new ValidationResult(errors);
    }
}
```

El lock `_validateLock` no protege la lista de condiciones (que es inmutable y thread-safe), sino la construcción del resultado. Esto evita que dos threads construyan `ValidationResult` simultáneamente con estados intermedios inconsistentes.

---

## Garantías concretas de thread safety

### Durante la construcción (antes de freeze)

- **NO thread-safe**: todos los métodos de construcción (`Add`, `Or`, `WithMessage`, etc.) deben llamarse desde un solo thread.
- Esto es intencional: imponer sincronización durante la construcción añadiría overhead sin beneficio real (los builders se construyen localmente antes de ser compartidos).

### Durante el uso (después de freeze)

| Método | Thread-safe | Notas |
|---|---|---|
| `IsValid(instance)` | Sí | Usa el delegate cacheado |
| `IsNotValid(instance)` | Sí | Igual que IsValid |
| `Build()` | Sí | Solo lee; retorna una nueva expresión cada vez |
| `BuildCached()` | Sí | Safe publication con Volatile |
| `BuildNegated()` | Sí | Solo lee |
| `Validate(instance)` | Sí | Usa `_validateLock` |
| `ValidateAll(instance)` | Sí | Usa `_validateLock` |
| `Explain()` | Sí | Solo lee |
| `Clone()` | Sí | Crea un nuevo builder mutable |

### Métodos de mutación sobre un builder frozen

Retornan un **nuevo builder** (fork). El builder original no se modifica. El fork es mutable hasta que se freezea por primera vez.

---

## Ejemplo: regla estática compartida entre threads

Este es el patrón correcto para usar un builder como regla estática en una aplicación con múltiples requests concurrentes:

```csharp
// Se define una sola vez (ej: como campo estático de un servicio)
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// En el constructor del servicio (o en startup), hacer el freeze explícito:
static MyService()
{
    _userRule.Freeze();  // freeze explícito; también cachea el delegate
    _ = _userRule.BuildCached();  // pre-compila el delegate
}

// En el método del request (llamado desde múltiples threads):
public bool ValidateUser(User user)
{
    return _userRule.IsValid(user);  // thread-safe después de freeze
}
```

---

## Ejemplo: fork para extender una regla base

```csharp
// Regla base: se construye y freezea una vez
var baseRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Freeze explícito (el primer IsValid también lo haría implícitamente)
baseRule.Freeze();

// Crear forks (cada fork es independiente y empieza como mutable)
// Esto es seguro llamarlo desde múltiples threads:
var adminRule  = baseRule.IsTrue(u => u.IsAdmin);    // fork
var activeRule = baseRule.IsTrue(u => u.IsActive);   // fork diferente

// baseRule: Email + Age                  (unchanged)
// adminRule:  Email + Age + IsAdmin      (independent fork)
// activeRule: Email + Age + IsActive     (independent fork)
```

Si dos threads ejecutan `baseRule.IsTrue(u => u.IsAdmin)` simultáneamente, cada uno obtiene su propio fork independiente. No hay interferencia porque `ImmutableList.Add` crea una nueva instancia sin modificar la original.

---

## Cambios en v2.0.0

### And() / Or() e invalidación de caché

> **v2.0.0:** `And()` y `Or()` ya no llaman `Volatile.Write(null)` sobre los campos de caché. Esas eran escrituras muertas: `And()` y `Or()` solo pueden llamarse sobre builders no congelados, y las cachés solo se populan después del freeze. Eliminarlas quita 4 operaciones de barrera de memoria innecesarias por llamada.

### Null guards en métodos de mutación

> A partir de v2.0.0, `Add`, `Add<TValue>`, `When` y `Unless` usan `ArgumentNullException.ThrowIfNull` (C# 10+) en lugar de patrones `if`/`throw` manuales, consistente con el resto del código base.

---

## Por qué Freeze es int y no bool

El campo `_frozen` es `int` (no `bool`) para poder usar `Interlocked.CompareExchange`, que solo opera sobre tipos de 32 bits:

```csharp
// Con int: puede usar Interlocked.CompareExchange (atómico)
Interlocked.CompareExchange(ref _frozen, 1, 0);

// Con bool: no hay Interlocked.CompareExchange para bool
// Se tendría que usar un lock o un workaround
```

`Interlocked.CompareExchange(ref location, value, comparand)` significa: "si `location` tiene el valor `comparand`, reemplazarlo por `value`, todo de forma atómica". Es la primitiva fundamental para CAS (Compare-And-Swap) en .NET.
