# Internals — ValiFlowGlobal and ValiSort

## ValiFlowGlobal: Cross-Cutting Filters

### What It Is

`ValiFlowGlobal` is a static class that acts as a centralized registry of filters that should be automatically applied to all queries for a given type. It is the Vali-Flow equivalent of EF Core's `HasQueryFilter`, but more flexible because it works both in memory and with IQueryable.

### The Problem It Solves

In applications with common patterns like soft-delete or multi-tenancy, every query needs to include the same base conditions:

```csharp
// Without ValiFlowGlobal: repetition in every query
var activeUsers = dbContext.Users
    .Where(u => !u.IsDeleted && u.TenantId == currentTenantId)
    .Where(mySpecificFilter.Build())
    .ToList();

var premiumUsers = dbContext.Users
    .Where(u => !u.IsDeleted && u.TenantId == currentTenantId)  // repeated
    .Where(premiumFilter.Build())
    .ToList();
```

With `ValiFlowGlobal`, the cross-cutting conditions are registered once and included automatically when `BuildWithGlobal()` is called:

```csharp
// During startup:
ValiFlowGlobal.Register<User>(u => !u.IsDeleted);
ValiFlowGlobal.Register<User>(u => u.TenantId == currentTenantId);

// In queries:
var query = new ValiFlowQuery<User>()
    .GreaterThan(u => u.Age, 18);

var expr = query.BuildWithGlobal();
// Produces: u => (u.Age > 18) AND (!u.IsDeleted) AND (u.TenantId == currentTenantId)
```

### Internal Implementation

```csharp
public static class ValiFlowGlobal
{
    // Dictionary: Type → list of lambda filters for that type
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

The lock in `Register` guarantees that concurrent registrations (if called from multiple threads during startup) do not corrupt the dictionary.

### BuildWithGlobal: How Filters Are Combined

**v2.0.0:** `BuildWithGlobal()` now caches the result of `Build()` using the same `Volatile.Read` + `Interlocked.CompareExchange` pattern as `BuildCached()`. Multiple calls to `BuildWithGlobal` on the same frozen builder reuse the cached expression tree without re-traversing the condition list.

`BuildWithGlobal()` in `BaseExpression` follows these steps:

1. Obtains a snapshot of global filters for type `T` under the lock
2. Combines the global filters with each other using AND (using `ParameterReplacer` to unify parameters)
3. Combines the result with the builder tree using AND

```csharp
// Pseudocode of BuildWithGlobal:
public Expression<Func<T, bool>> BuildWithGlobal()
{
    var localExpr = Build();         // builder tree (user conditions)
    var globalExprs = ValiFlowGlobal.GetFilters<T>();  // snapshot under lock

    if (globalExprs.Count == 0)
        return localExpr;

    var parameter = localExpr.Parameters[0];

    // Combine global filters with each other using AND
    Expression? globalBody = null;
    foreach (var filter in globalExprs)
    {
        var body = new ParameterReplacer(filter.Parameters[0], parameter)
            .Visit(filter.Body);
        globalBody = globalBody == null ? body : Expression.AndAlso(globalBody, body);
    }

    // Combine the user tree with global filters using AND
    var combined = Expression.AndAlso(localExpr.Body, globalBody!);
    return Expression.Lambda<Func<T, bool>>(combined, parameter);
}
```

### Interface Support

A filter can be registered for an interface, and it will apply to all concrete types that implement it:

```csharp
public interface ISoftDeletable { bool IsDeleted { get; } }

// Register for the interface:
ValiFlowGlobal.Register<ISoftDeletable>(x => !x.IsDeleted);

// When User implements ISoftDeletable:
public class User : ISoftDeletable { ... }

// BuildWithGlobal on a User builder will include the filter automatically
```

Internally, when `BuildWithGlobal` looks for filters for `User`, it also looks for filters for each interface that `User` implements. For interface filters, the lambda parameter (which is of type `ISoftDeletable`) is replaced with an `Expression.Convert(userParam, typeof(ISoftDeletable))`:

```csharp
// Registered filter: (ISoftDeletable x) => !x.IsDeleted
// After adapting for User: (User x) => !((ISoftDeletable)x).IsDeleted
//                                        ^^^^^^^^^^^^^^^^^^^
//                                        Expression.Convert
```

**Important warning**: EF Core cannot translate `Expression.Convert` to SQL. Filters registered for interfaces are only safe for in-memory use (LINQ-to-Objects). For EF Core, register the filter directly on the concrete type.

### Clearing Registrations (Tests)

`ValiFlowGlobal` uses a static dictionary that persists throughout the entire life of the process. In tests, this can cause contamination between test cases:

```csharp
// In the test teardown:
public void Dispose()
{
    ValiFlowGlobal.ClearAll();          // clear all filters
    // or:
    ValiFlowGlobal.Clear<User>();       // clear only User filters
}
```

### Thread Safety of ValiFlowGlobal

- `Register` and `Clear`: thread-safe thanks to the lock. Designed to be used during startup.
- `GetFilters` (internally in `BuildWithGlobal`): takes a snapshot under lock. Filters registered after `BuildWithGlobal` starts will not be included in that invocation.
- **Recommendation**: register all global filters before processing any request. Do not register filters dynamically during the lifetime of the application.

**v2.0.0:** `HasFilters<T>()` was simplified to `GetFilters<T>().Count > 0` — it now reuses the cache built by `GetFilters<T>()` instead of acquiring the lock and traversing `_filters` independently. This eliminates duplicated traversal logic and an unnecessary lock acquisition.

---

## ValiSort: Fluent Sorting

### What It Is

`ValiSort<T>` is a sorting criteria builder. It allows building an order fluently and applying it to `IQueryable<T>` (EF Core) or `IEnumerable<T>` (in memory) with the same API.

```csharp
var sort = new ValiSort<User>()
    .By(u => u.LastName)                    // primary criterion
    .ThenBy(u => u.FirstName)               // secondary criterion
    .ThenBy(u => u.CreatedAt, descending: true); // tertiary, descending

// Apply to IQueryable (EF Core):
IOrderedQueryable<User> dbResult = sort.Apply(dbContext.Users);
// Generates: ORDER BY LastName ASC, FirstName ASC, CreatedAt DESC

// Apply to IEnumerable (in memory):
IOrderedEnumerable<User> memResult = sort.Apply(inMemoryList);
```

### The SortEntry Structure

Internally, each sorting criterion is stored in a `SortEntry` struct:

```csharp
private readonly struct SortEntry
{
    public LambdaExpression Selector { get; }
    public bool Descending { get; }
    public bool IsPrimary { get; }  // true = first (OrderBy), false = secondary (ThenBy)

    // Pre-compiled when the criterion is registered (not in Apply)
    // For use with IEnumerable:
    public Func<IEnumerable<T>, IOrderedEnumerable<T>>? OrderApply { get; }
    public Func<IOrderedEnumerable<T>, IOrderedEnumerable<T>>? ThenApply { get; }
}
```

The `OrderApply` and `ThenApply` delegates are compiled **at the time of calling `By()` or `ThenBy()`**, not in `Apply()`. This guarantees that `Apply()` is cheap (only executes already-compiled delegates), even if called many times.

### How By() Works

```csharp
public IValiSort<T> By<TKey>(Expression<Func<T, TKey>> selector, bool descending = false)
{
    ArgumentNullException.ThrowIfNull(selector);
    _sorts.Clear();  // By() replaces all previous criteria

    var compiled = selector.Compile();

    // Compile the delegate for IEnumerable
    Func<IEnumerable<T>, IOrderedEnumerable<T>> orderApply = descending
        ? seq => seq.OrderByDescending(compiled)
        : seq => seq.OrderBy(compiled);

    _sorts.Add(new SortEntry(
        selector:    selector,
        descending:  descending,
        isPrimary:   true,
        orderApply:  orderApply,
        thenApply:   null        // not used for the primary criterion
    ));
    return this;
}
```

### How ThenBy() Works

```csharp
public IValiSort<T> ThenBy<TKey>(Expression<Func<T, TKey>> selector, bool descending = false)
{
    ArgumentNullException.ThrowIfNull(selector);
    if (_sorts.Count == 0)
        throw new InvalidOperationException("Call By() before ThenBy().");

    var compiled = selector.Compile();

    // Compile the delegate for IEnumerable
    Func<IOrderedEnumerable<T>, IOrderedEnumerable<T>> thenApply = descending
        ? ordered => ordered.ThenByDescending(compiled)
        : ordered => ordered.ThenBy(compiled);

    _sorts.Add(new SortEntry(
        selector:    selector,
        descending:  descending,
        isPrimary:   false,
        orderApply:  null,       // not used for secondary criteria
        thenApply:   thenApply
    ));
    return this;
}
```

### How Apply() Works with IQueryable

For `IQueryable<T>`, the compiled delegates cannot be used because EF Core needs an expression tree, not a delegate. Instead, the call to `Queryable.OrderBy` is built using expression trees:

```csharp
// For the first entry (IsPrimary = true):
var methodName = entry.Descending ? "OrderByDescending" : "OrderBy";

// Build: queryable.OrderBy(selector)
var result = Expression.Call(
    typeof(Queryable),
    methodName,
    new[] { typeof(T), keyType },
    sourceExpr,        // the IQueryable expression
    entry.Selector     // the selector expression (not compiled)
);

// For secondary entries (IsPrimary = false):
var methodName = entry.Descending ? "ThenByDescending" : "ThenBy";
result = Expression.Call(
    typeof(Queryable),
    methodName,
    new[] { typeof(T), keyType },
    result,
    entry.Selector
);
```

The result is a method call expression tree that EF Core can translate to `ORDER BY` in SQL.

### Thread Safety of ValiSort

`ValiSort<T>` intentionally does not implement the freeze/fork pattern used by `ValiFlow<T>`. A sort builder defines a single ordering applied once per sequence — there is no "shared base sort extended per-thread" scenario. `By()` already resets all criteria, making each sort configuration self-contained. For concurrent scenarios, create one `ValiSort<T>` instance per thread or per sort contract, configure it once, and call `Apply()` read-only thereafter.

### Usage Example in a Repository

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
            query = sort.Apply(query);  // returns IOrderedQueryable<User>

        return await query.ToListAsync();
    }
}

// Usage:
var filter = new ValiFlowQuery<User>().IsTrue(u => u.IsActive);

var sort = new ValiSort<User>()
    .By(u => u.LastName)
    .ThenBy(u => u.FirstName);

var users = await repo.GetActiveUsersAsync(filter, sort);
```

### Why By() Resets the Criteria

`By()` calls `_sorts.Clear()` before adding the new criterion. This allows reusing a `ValiSort` with different orderings without creating a new instance:

```csharp
var sort = new ValiSort<User>();

sort.By(u => u.LastName);                    // criterion: LastName
var nameSort = sort.Apply(users);

sort.By(u => u.CreatedAt, descending: true); // criterion: CreatedAt DESC (resets)
var dateSort = sort.Apply(users);
```

Without the reset, `By()` would accumulate criteria, which would be confusing. The semantics are: "the order is BY this field, then THEN BY the following ones."
