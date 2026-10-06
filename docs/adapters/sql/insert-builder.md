---
title: SqlInsertBuilder
---

`SqlInsertBuilder<T>` builds parameterized `INSERT` statements. Supports single-row, multi-row, INSERT … SELECT, and conflict resolution patterns.

```csharp
var result = new SqlInsertBuilder<User>(new SqlServerDialect())
    .Into("Users")
    .Set(x => x.Name, "Alice")
    .Set(x => x.Age, 30)
    .Build();
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1)
```

---

### `Into`

**Signature**
```csharp
SqlInsertBuilder<T> Into(string tableName, string? schema = null)
```

**Description**
Sets the target table name and optional schema.

---

### `Set`

**Signature**
```csharp
SqlInsertBuilder<T> Set<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Description**
Maps a typed column to its insert value for the current row.

**Example**
```csharp
builder.Into("Users").Set(x => x.Name, "Alice").Set(x => x.Age, 30);
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1)
```

---

### `NextRow`

**Signature**
```csharp
SqlInsertBuilder<T> NextRow()
```

**Description**
Starts a new row for a multi-row insert. Subsequent `Set` calls populate the new row. All rows must have the same number of columns.

**Example**
```csharp
builder.Into("Users")
    .Set(x => x.Name, "Alice").Set(x => x.Age, 30)
    .NextRow()
    .Set(x => x.Name, "Bob").Set(x => x.Age, 25)
    .Build();
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1), (@pi2, @pi3)
```

---

### `OutputInserted`

**Signature**
```csharp
SqlInsertBuilder<T> OutputInserted()
```

**Description**
Appends `OUTPUT INSERTED.*` before VALUES. SQL Server only — use for retrieving auto-generated identity or computed columns after insert.

**Example**
```csharp
builder.Into("Users").Set(x => x.Name, "Alice").OutputInserted().Build();
// → INSERT INTO [Users] ([Name]) OUTPUT INSERTED.* VALUES (@pi0)
```

> **Note:** Throws `InvalidOperationException` if used with a non-SQL Server dialect. Use `Returning()` for PostgreSQL / SQLite.

---

### `Returning`

**Signature**
```csharp
SqlInsertBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Description**
Appends `RETURNING *` or `RETURNING col1, col2` after VALUES. Supported by PostgreSQL and SQLite 3.35+.

**Example**
```csharp
builder.Into("Users").Set(x => x.Name, "Alice")
    .Returning(x => x.Id, x => x.CreatedAt)
    .Build();
// → INSERT INTO "Users" ("Name") VALUES (@pi0) RETURNING "Id", "CreatedAt"
```

---

### `SelectFrom`

**Signature**
```csharp
SqlInsertBuilder<T> SelectFrom(SqlQueryResult selectQuery)
```

**Description**
Specifies a SELECT query whose results will be inserted into the table. Mutually exclusive with `Set`.

**Example**
```csharp
var select = new SqlQueryBuilder<User>(dialect)
    .From("Archive")
    .Select(x => x.Name)
    .Build();

new SqlInsertBuilder<User>(dialect)
    .Into("Users")
    .Columns(x => x.Name)
    .SelectFrom(select)
    .Build();
// → INSERT INTO [Users] ([Name]) SELECT [Name] FROM [Archive]
```

---

### `Columns`

**Signature**
```csharp
SqlInsertBuilder<T> Columns(params Expression<Func<T, object>>[] columns)
```

**Description**
Specifies the target columns for INSERT … SELECT. If not called, the column list is omitted: `INSERT INTO table SELECT …`.

---

### `Tag`

**Signature**
```csharp
SqlInsertBuilder<T> Tag(string description)
```

**Description**
Labels the query with a comment prepended to the SQL.

---

### Conflict Resolution

#### `OrIgnore` (SQLite)

**Signature**
```csharp
SqlInsertBuilder<T> OrIgnore()
```

**Description**
Emits `INSERT OR IGNORE INTO ...`. SQLite only.

---

#### `OrReplace` (SQLite)

**Signature**
```csharp
SqlInsertBuilder<T> OrReplace()
```

**Description**
Emits `INSERT OR REPLACE INTO ...`. SQLite only.

---

#### `OnConflictDoNothing` (PostgreSQL / SQLite)

**Signature**
```csharp
SqlInsertBuilder<T> OnConflictDoNothing()
```

**Description**
Appends `ON CONFLICT DO NOTHING` after VALUES.

**Example**
```csharp
builder.Into("Users").Set(x => x.Email, "a@b.com").OnConflictDoNothing().Build();
// → INSERT INTO "Users" ("Email") VALUES (@pi0) ON CONFLICT DO NOTHING
```

---

#### `OnConflictDoUpdate` (PostgreSQL / SQLite)

**Signature**
```csharp
SqlInsertBuilder<T> OnConflictDoUpdate(
    Action<SqlInsertBuilder<T>> conflictKeys,
    Action<SqlInsertBuilder<T>> updateAssignments)
```

**Description**
Appends `ON CONFLICT (cols) DO UPDATE SET ...` after VALUES. Pass actions that call `AddConflictKey` and `AddConflictUpdate`.

**Example**
```csharp
builder.Into("Users")
    .Set(x => x.Email, "a@b.com")
    .Set(x => x.Name, "Alice")
    .OnConflictDoUpdate(
        keys    => keys.AddConflictKey(x => x.Email),
        updates => updates.AddConflictUpdate(x => x.Name, "Alice"))
    .Build();
// → INSERT INTO "Users" ("Email", "Name") VALUES (@pi0, @pi1)
//   ON CONFLICT ("Email") DO UPDATE SET "Name" = @pu0
```

---

#### `AddConflictKey`

**Signature**
```csharp
SqlInsertBuilder<T> AddConflictKey<TValue>(Expression<Func<T, TValue>> column)
```

**Description**
Registers a column as part of the ON CONFLICT target column list. Called inside the `conflictKeys` action of `OnConflictDoUpdate`.

---

#### `AddConflictUpdate`

**Signature**
```csharp
SqlInsertBuilder<T> AddConflictUpdate<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Description**
Registers a column = value assignment for the DO UPDATE SET clause. Called inside the `updateAssignments` action of `OnConflictDoUpdate`.

---

#### `InsertIgnore` (MySQL)

**Signature**
```csharp
SqlInsertBuilder<T> InsertIgnore()
```

**Description**
Emits `INSERT IGNORE INTO ...`. MySQL only.

---

#### `OnDuplicateKeyUpdate` (MySQL)

**Signature**
```csharp
SqlInsertBuilder<T> OnDuplicateKeyUpdate(Action<SqlInsertBuilder<T>> configure)
```

**Description**
Appends `ON DUPLICATE KEY UPDATE col = @pu...` after VALUES. MySQL only.

**Example**
```csharp
builder.Into("Users")
    .Set(x => x.Email, "a@b.com")
    .OnDuplicateKeyUpdate(u => u.AddDuplicateKeyAssignment(x => x.Name, "Alice"))
    .Build();
// → INSERT INTO `Users` (`Email`) VALUES (@pi0) ON DUPLICATE KEY UPDATE `Name` = @pu0
```

---

#### `AddDuplicateKeyAssignment`

**Signature**
```csharp
SqlInsertBuilder<T> AddDuplicateKeyAssignment<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Description**
Registers a column = value assignment for the ON DUPLICATE KEY UPDATE clause.

---

### `Build` (Insert)

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Assembles and returns the final `SqlQueryResult`.

---

## Advanced Example

```csharp
var insert = new SqlInsertBuilder<User>()
    .Into("Users")
    .Value(u => u.Email, "a@b.com")
    .Value(u => u.IsActive, true)
    .Returning(u => u.Id);
```
