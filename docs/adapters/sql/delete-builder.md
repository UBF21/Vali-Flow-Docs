---
title: SqlDeleteBuilder
---

`SqlDeleteBuilder<T>` builds parameterized `DELETE` statements.

```csharp
var result = new SqlDeleteBuilder<User>(new SqlServerDialect())
    .From("Users")
    .Where(w => w.EqualTo(x => x.Id, 42))
    .Build();
// → DELETE FROM [Users] WHERE [Id] = @pw0
```

> **Safety:** By default, `Build()` throws if no WHERE clause is set. Call `AllowDeleteAll()` to explicitly allow deleting all rows.

---

### `From` (Delete)

**Signature**
```csharp
SqlDeleteBuilder<T> From(string tableName, string? schema = null)
```

**Description**
Sets the target table name and optional schema.

---

### `Where` (Delete)

Four overloads — same semantics as `SqlUpdateBuilder`:

```csharp
SqlDeleteBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
SqlDeleteBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
SqlDeleteBuilder<T> Where(Expression<Func<T, bool>> predicate)
SqlDeleteBuilder<T> Where(ValiFlow<T> filter)
```

---

### `OutputDeleted`

**Signature**
```csharp
SqlDeleteBuilder<T> OutputDeleted()
```

**Description**
Appends `OUTPUT DELETED.*` after DELETE FROM. SQL Server only — returns the deleted rows.

**Example**
```csharp
builder.From("Users").Where(x => x.Id == 42).OutputDeleted().Build();
// → DELETE FROM [Users] OUTPUT DELETED.* WHERE [Id] = @p0
```

---

### `Returning` (Delete)

**Signature**
```csharp
SqlDeleteBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Description**
Appends `RETURNING *` or specified columns. PostgreSQL / SQLite only.

**Example**
```csharp
builder.From("Users").Where(x => x.Id == 42).Returning(x => x.Id, x => x.Name).Build();
// → DELETE FROM "Users" WHERE "Id" = @p0 RETURNING "Id", "Name"
```

---

### `AllowDeleteAll`

**Signature**
```csharp
SqlDeleteBuilder<T> AllowDeleteAll()
```

**Description**
Explicitly allows generating a DELETE without a WHERE clause (affects all rows).

---

### `Tag` (Delete)

**Signature**
```csharp
SqlDeleteBuilder<T> Tag(string description)
```

**Description**
Labels the query with a SQL comment.

---

### `Build` (Delete)

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Assembles and returns the final `SqlQueryResult`.

---

## Advanced Example

```csharp
var delete = new SqlDeleteBuilder<User>()
    .From("Users")
    .Where(u => u.IsArchived == true);
```
