---
title: SqlUpdateBuilder
---

`SqlUpdateBuilder<T>` builds parameterized `UPDATE` statements.

```csharp
var result = new SqlUpdateBuilder<User>(new SqlServerDialect())
    .Table("Users")
    .Set(x => x.Name, "Bob")
    .Set(x => x.IsActive, false)
    .Where(w => w.EqualTo(x => x.Id, 42))
    .Build();
// → UPDATE [Users] SET [Name] = @pu0, [IsActive] = @pu1 WHERE [Id] = @pw0
```

> **Safety:** By default, `Build()` throws if no WHERE clause is set. Call `AllowUpdateAll()` to explicitly allow updating all rows.

---

### `Table`

**Signature**
```csharp
SqlUpdateBuilder<T> Table(string tableName, string? schema = null)
```

**Description**
Sets the target table name and optional schema.

---

### `Set`

**Signature**
```csharp
SqlUpdateBuilder<T> Set<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Description**
Adds a parameterized SET clause. Parameters use the `pu` prefix.

**Example**
```csharp
builder.Table("Users").Set(x => x.Name, "Bob").Set(x => x.IsActive, false);
// SET [Name] = @pu0, [IsActive] = @pu1
```

---

### `SetRaw`

**Signature**
```csharp
SqlUpdateBuilder<T> SetRaw(Expression<Func<T, object>> column, string rawExpression)
```

**Description**
Adds a raw (non-parameterized) SET clause. Use for server-side expressions like `GETDATE()` or arithmetic on existing values.

**Example**
```csharp
builder.SetRaw(x => x.Counter, "Counter + 1");
// SET [Counter] = Counter + 1

builder.SetRaw(x => x.UpdatedAt, "GETDATE()");
// SET [UpdatedAt] = GETDATE()
```

---

### `SetColumn`

**Signature**
```csharp
SqlUpdateBuilder<T> SetColumn<TValue>(
    Expression<Func<T, TValue>> target,
    Expression<Func<T, TValue>> source)
```

**Description**
Copies one column's current value to another column with no parameters.

**Example**
```csharp
builder.SetColumn(x => x.NameBackup, x => x.Name);
// SET [NameBackup] = [Name]
```

---

### `Where` (Update)

Three overloads are available — same semantics as `SqlQueryBuilder`:

```csharp
SqlUpdateBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
SqlUpdateBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
SqlUpdateBuilder<T> Where(Expression<Func<T, bool>> predicate)
SqlUpdateBuilder<T> Where(ValiFlow<T> filter)
```

---

### `FromTable`

**Signature**
```csharp
SqlUpdateBuilder<T> FromTable(string sourceTable, string? alias = null)
```

**Description**
Adds a FROM (SQL Server / PostgreSQL) or JOIN (MySQL) source table to the UPDATE statement, enabling multi-table updates. Throws on SQLite and Oracle.

**Example**
```csharp
// SQL Server
builder.Table("Orders")
    .Set(x => x.Status, "Shipped")
    .FromTable("Shipments", "s")
    .JoinOn("INNER JOIN", "[Shipments].[OrderId] = [Orders].[Id]")
    .Where(x => x.Status == "Pending")
    .Build();
// → UPDATE [Orders] SET [Status] = @pu0 FROM [Shipments] [s] INNER JOIN [Shipments].[OrderId] = [Orders].[Id]
//   WHERE [Status] = @p0
```

---

### `JoinOn`

**Signature**
```csharp
SqlUpdateBuilder<T> JoinOn(string joinType, string onCondition)
```

**Description**
Adds a JOIN condition to the FROM clause of the UPDATE statement. Used with `FromTable`.

---

### `AllowUpdateAll`

**Signature**
```csharp
SqlUpdateBuilder<T> AllowUpdateAll()
```

**Description**
Explicitly allows generating an UPDATE without a WHERE clause (affects all rows). Call only when a full-table update is intentional.

---

### `OutputUpdated`

**Signature**
```csharp
SqlUpdateBuilder<T> OutputUpdated()
```

**Description**
Appends `OUTPUT INSERTED.*` after SET. SQL Server only. Returns the updated rows' new values.

---

### `Returning` (Update)

**Signature**
```csharp
SqlUpdateBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Description**
Appends `RETURNING *` or specified columns after WHERE. PostgreSQL / SQLite only.

---

### `Tag` (Update)

**Signature**
```csharp
SqlUpdateBuilder<T> Tag(string description)
```

**Description**
Labels the query with a SQL comment.

---

### `Build` (Update)

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Assembles and returns the final `SqlQueryResult`. Throws if no SET assignments are present or if no WHERE clause is set (unless `AllowUpdateAll()` was called).

---

## Advanced Example

```csharp
var update = new SqlUpdateBuilder<User>()
    .Table("Users")
    .Set(u => u.LastLoginAt, DateTime.UtcNow)
    .Where(u => u.IsActive == true);
```
