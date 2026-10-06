---
title: Extension Methods
---

## Reference

### `ToSql` — ValiFlow overload

**Signature**
```csharp
SqlResult ToSql<T>(this ValiFlow<T> flow, ISqlDialect dialect)
```

**Description**
Translates all conditions built in a `ValiFlow<T>` into a parameterized SQL WHERE fragment (without the `WHERE` keyword).

**Example**
```csharp
var filter = new ValiFlow<User>()
    .NotNull(x => x.Name)
    .GreaterThan(x => x.Age, 18);

var sql = filter.ToSql(new SqlServerDialect());
// sql.Sql        → "[Name] IS NOT NULL AND [Age] > @p0"
// sql.Parameters → { "p0": 18 }
```

---

### `ToSql` — ValiFlowQuery overload

**Signature**
```csharp
SqlResult ToSql<T>(this ValiFlowQuery<T> flow, ISqlDialect dialect)
```

**Description**
Same as above but for `ValiFlowQuery<T>` instances.

---

### `ToSql` — Expression overload

**Signature**
```csharp
SqlResult ToSql<T>(this Expression<Func<T, bool>> expression, ISqlDialect dialect)
```

**Description**
Translates a prebuilt `Expression<Func<T, bool>>` directly, without requiring a `ValiFlow<T>` wrapper.

**Example**
```csharp
Expression<Func<User, bool>> expr = u => u.IsActive && u.Age > 18;
var sql = expr.ToSql(new PostgreSqlDialect());
// sql.Sql → "\"IsActive\" = true AND \"Age\" > @p0"
```

---

### `ToSqlCount` — ValiFlow overload

**Signature**
```csharp
SqlQueryResult ToSqlCount<T>(
    this ValiFlow<T>? flow,
    ISqlDialect dialect,
    string? tableName = null) where T : class
```

**Description**
Generates a `SELECT COUNT(*) FROM [table] WHERE ...` query. Pass `null` as `flow` to count all rows.

**Example**
```csharp
var countResult = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .ToSqlCount(new SqlServerDialect(), "Users");

// countResult.Sql → "SELECT COUNT(*) FROM [Users] WHERE [IsActive] = @p0"
var count = connection.ExecuteScalar<int>(countResult.Sql, countResult.Parameters);
```

---

### `ToSqlCount` — ValiFlowQuery overload

**Signature**
```csharp
SqlQueryResult ToSqlCount<T>(
    this ValiFlowQuery<T>? flow,
    ISqlDialect dialect,
    string? tableName = null) where T : class
```

**Description**
Same as above for `ValiFlowQuery<T>`.

---

## Advanced Examples

### 1) Count with table name

```csharp
var countResult = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .ToSqlCount(new SqlServerDialect(), tableName: "Users");
```

### 2) Expression overload

```csharp
Expression<Func<Order, bool>> expr = o => o.Total > 100m && o.Status == "Open";
var sql = expr.ToSql(new PostgreSqlDialect());
```
