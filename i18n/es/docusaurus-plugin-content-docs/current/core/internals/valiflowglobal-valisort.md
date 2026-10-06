# Internals — ValiFlowGlobal y ValiSort

## ValiFlowGlobal: filtros transversales

### Qué es

`ValiFlowGlobal` es una clase estática que actúa como registro centralizado de filtros que deben aplicarse automáticamente a todos los queries de un tipo dado. Es el equivalente en Vali-Flow de los `HasQueryFilter` de EF Core, pero más flexible porque funciona tanto en memoria como con IQueryable.

### El problema que resuelve

En aplicaciones con patrones comunes como soft-delete o multi-tenancy, cada query necesita incluir las mismas condiciones base:

```csharp
// Sin ValiFlowGlobal: repetición en cada query
var activeUsers = dbContext.Users
    .Where(u => !u.IsDeleted && u.TenantId == currentTenantId)
    .Where(mySpecificFilter.Build())
    .ToList();

var premiumUsers = dbContext.Users
    .Where(u => !u.IsDeleted && u.TenantId == currentTenantId)  // repetido
    .Where(premiumFilter.Build())
    .ToList();
```

Con `ValiFlowGlobal`, las condiciones transversales se registran una vez y se incluyen automáticamente cuando se llama `BuildWithGlobal()`:

```csharp
// Durante el startup:
ValiFlowGlobal.Register<User>(u => !u.IsDeleted);
ValiFlowGlobal.Register<User>(u => u.TenantId == currentTenantId);

// En los queries:
var query = new ValiFlowQuery<User>()
    .GreaterThan(u => u.Age, 18);

var expr = query.BuildWithGlobal();
// Produce: u => (u.Age > 18) AND (!u.IsDeleted) AND (u.TenantId == currentTenantId)
```

### Implementación interna

```csharp
public static class ValiFlowGlobal
{
    // Diccionario: Type → lista de filtros lambda para ese tipo
    private static readonly Dictionary<Type, List<LambdaExpression>> _globalFilters = new();
    private static readonly object _lock = new();

    public static void Register<T>(Expression<Func<T, bool>> filter)
    {
        if (filter == null)
            throw new ArgumentNullException(nameof(filter));

        lock (_lock)
        {
            if (!_globalFilters.ContainsKey(typeof(T)))
                _globalFilters[typeof(T)] = new List<LambdaExpression>();

            _globalFilters[typeof(T)].Add(filter);
        }
    }
}
```

El lock en `Register` garantiza que registros concurrentes (si se llaman desde múltiples threads durante startup) no corrompan el diccionario.

### BuildWithGlobal: cómo se combinan los filtros

> **v2.0.0:** `BuildWithGlobal()` ahora cachea el resultado de `Build()` usando el mismo patrón `Volatile.Read` + `Interlocked.CompareExchange` que `BuildCached()`. Múltiples llamadas a `BuildWithGlobal` sobre el mismo builder congelado reutilizan el árbol de expresión cacheado sin re-recorrer la lista de condiciones.

`BuildWithGlobal()` en `BaseExpression` sigue estos pasos:

1. Obtiene una snapshot de los filtros globales para el tipo `T` bajo el lock
2. Combina los filtros globales entre sí con AND (usando `ParameterReplacer` para unificar parámetros)
3. Combina el resultado con el árbol del builder con AND

```csharp
// Pseudocódigo de BuildWithGlobal:
public Expression<Func<T, bool>> BuildWithGlobal()
{
    var localExpr = Build();         // árbol del builder (condiciones del usuario)
    var globalExprs = ValiFlowGlobal.GetFilters<T>();  // snapshot bajo lock

    if (globalExprs.Count == 0)
        return localExpr;

    var parameter = localExpr.Parameters[0];

    // Combinar filtros globales entre sí con AND
    Expression? globalBody = null;
    foreach (var filter in globalExprs)
    {
        var body = new ParameterReplacer(filter.Parameters[0], parameter)
            .Visit(filter.Body);
        globalBody = globalBody == null ? body : Expression.AndAlso(globalBody, body);
    }

    // Combinar el árbol del usuario con los filtros globales con AND
    var combined = Expression.AndAlso(localExpr.Body, globalBody!);
    return Expression.Lambda<Func<T, bool>>(combined, parameter);
}
```

### Soporte para interfaces

Se puede registrar un filtro para una interfaz, y aplicará a todos los tipos concretos que la implementen:

```csharp
public interface ISoftDeletable { bool IsDeleted { get; } }

// Registrar para la interfaz:
ValiFlowGlobal.Register<ISoftDeletable>(x => !x.IsDeleted);

// Cuando User implementa ISoftDeletable:
public class User : ISoftDeletable { ... }

// BuildWithGlobal en un builder de User incluirá el filtro automáticamente
```

Internamente, cuando `BuildWithGlobal` busca filtros para `User`, también busca filtros para cada interfaz que `User` implementa. Para los filtros de interfaz, el parámetro de la lambda (que es de tipo `ISoftDeletable`) se reemplaza con un `Expression.Convert(userParam, typeof(ISoftDeletable))`:

```csharp
// Filtro registrado: (ISoftDeletable x) => !x.IsDeleted
// Después de adaptar para User: (User x) => !((ISoftDeletable)x).IsDeleted
//                                            ^^^^^^^^^^^^^^^^^^^
//                                            Expression.Convert
```

**Advertencia importante**: EF Core no puede traducir `Expression.Convert` a SQL. Los filtros registrados para interfaces solo son seguros para uso en memoria (LINQ-to-Objects). Para EF Core, registrar el filtro directamente en el tipo concreto.

### Limpiar registros (tests)

`ValiFlowGlobal` usa un diccionario estático que persiste durante toda la vida del proceso. En tests, esto puede causar contaminación entre pruebas:

```csharp
// En el test teardown:
public void Dispose()
{
    ValiFlowGlobal.ClearAll();          // limpiar todos los filtros
    // o:
    ValiFlowGlobal.Clear<User>();       // limpiar solo los filtros de User
}
```

### HasFilters

> **v2.0.0:** `HasFilters<T>()` fue simplificado a `GetFilters<T>().Count > 0` — reutiliza el caché construido por `GetFilters<T>()` en lugar de adquirir el lock y recorrer `_filters` independientemente. Esto elimina la lógica de recorrido duplicada y una adquisición de lock innecesaria.

### Thread safety de ValiFlowGlobal

- `Register` y `Clear`: thread-safe gracias al lock. Diseñados para usarse durante startup.
- `GetFilters` (internamente en `BuildWithGlobal`): toma una snapshot bajo lock. Los filtros registrados después de que empiece `BuildWithGlobal` no se incluirán en esa invocación.
- **Recomendación**: registrar todos los filtros globales antes de procesar cualquier request. No registrar filtros de forma dinámica durante la vida de la aplicación.

---

## ValiSort: ordenamiento fluido

### Qué es

`ValiSort<T>` es un builder de criterios de ordenamiento. Permite construir un orden de forma fluida y aplicarlo a `IQueryable<T>` (EF Core) o `IEnumerable<T>` (en memoria) con la misma API.

```csharp
var sort = new ValiSort<User>()
    .By(u => u.LastName)                    // criterio primario
    .ThenBy(u => u.FirstName)               // criterio secundario
    .ThenBy(u => u.CreatedAt, descending: true); // terciario, descendente

// Aplicar a IQueryable (EF Core):
IOrderedQueryable<User> dbResult = sort.Apply(dbContext.Users);
// Genera: ORDER BY LastName ASC, FirstName ASC, CreatedAt DESC

// Aplicar a IEnumerable (en memoria):
IOrderedEnumerable<User> memResult = sort.Apply(inMemoryList);
```

### La estructura SortEntry

Internamente, cada criterio de ordenamiento se almacena en un struct `SortEntry`:

```csharp
private readonly struct SortEntry
{
    public LambdaExpression Selector { get; }
    public bool Descending { get; }
    public bool IsPrimary { get; }  // true = primero (OrderBy), false = secundario (ThenBy)

    // Pre-compilado al registrar el criterio (no en Apply)
    // Para uso con IEnumerable:
    public Func<IEnumerable<T>, IOrderedEnumerable<T>>? OrderApply { get; }
    public Func<IOrderedEnumerable<T>, IOrderedEnumerable<T>>? ThenApply { get; }
}
```

Los delegates `OrderApply` y `ThenApply` se compilan **en el momento de llamar `By()` o `ThenBy()`**, no en `Apply()`. Esto garantiza que `Apply()` sea barato (solo ejecuta delegates ya compilados), aunque se llame muchas veces.

### Cómo funciona By()

```csharp
public IValiSort<T> By<TKey>(Expression<Func<T, TKey>> selector, bool descending = false)
{
    ArgumentNullException.ThrowIfNull(selector);
    _sorts.Clear();  // By() reemplaza todos los criterios anteriores

    var compiled = selector.Compile();

    // Compilar el delegate para IEnumerable
    Func<IEnumerable<T>, IOrderedEnumerable<T>> orderApply = descending
        ? seq => seq.OrderByDescending(compiled)
        : seq => seq.OrderBy(compiled);

    _sorts.Add(new SortEntry(
        selector:    selector,
        descending:  descending,
        isPrimary:   true,
        orderApply:  orderApply,
        thenApply:   null        // no se usa para el criterio primario
    ));
    return this;
}
```

### Cómo funciona ThenBy()

```csharp
public IValiSort<T> ThenBy<TKey>(Expression<Func<T, TKey>> selector, bool descending = false)
{
    ArgumentNullException.ThrowIfNull(selector);
    if (_sorts.Count == 0)
        throw new InvalidOperationException("Call By() before ThenBy().");

    var compiled = selector.Compile();

    // Compilar el delegate para IEnumerable
    Func<IOrderedEnumerable<T>, IOrderedEnumerable<T>> thenApply = descending
        ? ordered => ordered.ThenByDescending(compiled)
        : ordered => ordered.ThenBy(compiled);

    _sorts.Add(new SortEntry(
        selector:    selector,
        descending:  descending,
        isPrimary:   false,
        orderApply:  null,       // no se usa para criterios secundarios
        thenApply:   thenApply
    ));
    return this;
}
```

### Cómo funciona Apply() con IQueryable

Para `IQueryable<T>`, no se pueden usar los delegates compilados porque EF Core necesita un árbol de expresión, no un delegate. En su lugar, se construye la llamada al método `Queryable.OrderBy` usando expression trees:

```csharp
// Para la primera entrada (IsPrimary = true):
var methodName = entry.Descending ? "OrderByDescending" : "OrderBy";

// Construir: queryable.OrderBy(selector)
var result = Expression.Call(
    typeof(Queryable),
    methodName,
    new[] { typeof(T), keyType },
    sourceExpr,        // la expresión del IQueryable
    entry.Selector     // la expresión del selector (no compilada)
);

// Para entradas secundarias (IsPrimary = false):
var methodName = entry.Descending ? "ThenByDescending" : "ThenBy";
result = Expression.Call(
    typeof(Queryable),
    methodName,
    new[] { typeof(T), keyType },
    result,
    entry.Selector
);
```

El resultado es una expression tree de llamada a método que EF Core puede traducir a `ORDER BY` en SQL.

### Thread safety de ValiSort

`ValiSort<T>` **no es thread-safe**. Si se necesita usar en múltiples threads concurrentes, cada thread debe tener su propia instancia.

Esto contrasta con `ValiFlow<T>` que es thread-safe después de freeze. La diferencia: `ValiSort` no tiene el concepto de freeze porque el ordenamiento no tiene el mismo ciclo de vida de "construir una vez, usar muchas veces".

`ValiSort<T>` intencionalmente no implementa el patrón freeze/fork de `ValiFlow<T>`. Un builder de ordenamiento define un único criterio aplicado una vez por secuencia — no existe el escenario de "sort base compartido extendido por hilo". `By()` ya resetea todos los criterios, haciendo cada configuración auto-contenida. Para escenarios concurrentes, crea una instancia de `ValiSort<T>` por hilo o por contrato de ordenamiento, configúrala una vez y llama `Apply()` en modo solo-lectura.

### Ejemplo de uso en un repositorio

```csharp
public class UserRepository
{
    private readonly AppDbContext _db;

    public async Task<List<User>> GetActiveUsersAsync(
        ValiFlowQuery<User> filter,
        ValiSort<User>? sort = null)
    {
        var query = _db.Users.Where(filter.BuildWithGlobal());

        if (sort != null)
            query = sort.Apply(query);  // retorna IOrderedQueryable<User>

        return await query.ToListAsync();
    }
}

// Uso:
var filter = new ValiFlowQuery<User>().IsTrue(u => u.IsActive);

var sort = new ValiSort<User>()
    .By(u => u.LastName)
    .ThenBy(u => u.FirstName);

var users = await repo.GetActiveUsersAsync(filter, sort);
```

### Por qué By() resetea los criterios

`By()` llama `_sorts.Clear()` antes de agregar el nuevo criterio. Esto permite reutilizar un `ValiSort` con distintos ordenamientos sin crear una nueva instancia:

```csharp
var sort = new ValiSort<User>();

sort.By(u => u.LastName);                    // criterio: LastName
var nameSort = sort.Apply(users);

sort.By(u => u.CreatedAt, descending: true); // criterio: CreatedAt DESC (resetea)
var dateSort = sort.Apply(users);
```

Sin el reset, `By()` acumularía criterios, lo que sería confuso. La semántica es: "el orden es BY este campo, luego THEN BY los siguientes".
