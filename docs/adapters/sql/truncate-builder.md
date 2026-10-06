---
title: SqlTruncateBuilder
---

`SqlTruncateBuilder<T>` builds `TRUNCATE TABLE` statements.

> **Note:** SQLite does not support TRUNCATE TABLE. `Build()` throws `InvalidOperationException` when using `SqliteDialect`. Use `SqlDeleteBuilder` with `AllowDeleteAll()` instead.

```csharp
var result = new SqlTruncateBuilder<User>(new SqlServerDialect())
    .Table("Users")
    .Build();
// → TRUNCATE TABLE [Users]
```

---

### `Table` (Truncate)

**Signature**
```csharp
SqlTruncateBuilder<T> Table(string tableName, string? schema = null)
```

**Description**
Sets the table to truncate. If not called, uses `typeof(T).Name`.

---

### `Tag` (Truncate)

**Signature**
```csharp
SqlTruncateBuilder<T> Tag(string description)
```

**Description**
Adds a SQL comment header for traceability.

---

### `Build` (Truncate)

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Builds and returns the `TRUNCATE TABLE` statement as a `SqlQueryResult` with an empty parameters dictionary.

**Example with schema**
```csharp
new SqlTruncateBuilder<Order>(new SqlServerDialect())
    .Table("Orders", schema: "dbo")
    .Tag("Clear orders table")
    .Build();
// → -- Clear orders table
//   TRUNCATE TABLE [dbo].[Orders]
```

---

## Advanced Example

```csharp
var truncate = new SqlTruncateBuilder<User>()
    .Table("Users")
    .Build();
```
