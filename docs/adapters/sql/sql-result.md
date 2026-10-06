---
title: SqlResult & SqlQueryResult
---

## Reference

### `SqlResult`

Returned by `ToSql()` extension methods. Holds a WHERE fragment only (no SELECT / FROM).

| Property / Method | Type | Description |
|---|---|---|
| `Sql` | `string` | Parameterized SQL WHERE fragment (without `WHERE` keyword) |
| `Parameters` | `IReadOnlyDictionary<string, object>` | Named parameters ready for Dapper or ADO.NET |
| `ApplyTo(IDbCommand)` | `void` | Adds all parameters to an ADO.NET command |
| `ToString()` | `string` | Returns `Sql` |

**ApplyTo example**
```csharp
var sql = filter.ToSql(new SqliteDialect());
cmd.CommandText = $"SELECT * FROM Products WHERE {sql.Sql}";
sql.ApplyTo(cmd);
var reader = cmd.ExecuteReader();
```

---

### `SqlQueryResult`

Returned by `Build()` on all builders, and by `ToSqlCount()`. Holds a complete SQL statement.

| Property / Method | Type | Description |
|---|---|---|
| `Sql` | `string` | Full parameterized SQL query |
| `Parameters` | `IReadOnlyDictionary<string, object>` | Named parameters |
| `ApplyTo(IDbCommand)` | `void` | Adds all parameters to an ADO.NET command |
| `ToDebugSql()` | `string` | Returns SQL with parameter values inlined — **for logging only, never execute** |
| `ToString()` | `string` | Returns `Sql` |

**ToDebugSql example**
```csharp
var result = new SqlQueryBuilder<User>(new SqlServerDialect())
    .From("Users")
    .Where(x => x.Age > 18)
    .Build();

Console.WriteLine(result.ToDebugSql());
// SELECT * FROM [Users] WHERE [Age] > 18
```

> **Warning:** `ToDebugSql()` inlines raw values into the SQL string for readability. Never pass this string to a database — it is intended only for logging and debugging.

---
