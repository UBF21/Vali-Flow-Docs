---
title: SqlMergeBuilder
---

`SqlMergeBuilder<TTarget, TSource>` builds SQL Server `MERGE` statements. For PostgreSQL upsert, use `SqlInsertBuilder.OnConflictDoUpdate` instead.

> **Note:** `Build()` throws `InvalidOperationException` on dialects other than `SqlServerDialect`. Only SQL Server supports the MERGE syntax as implemented here.

```csharp
var result = new SqlMergeBuilder<User, UserDto>(new SqlServerDialect())
    .Into("Users")
    .Using("UserUpdates", "src")
    .On(t => t.Id, s => s.Id)
    .WhenMatchedUpdate(m => m
        .MatchedSetColumn(t => t.Name, s => s.Name)
        .MatchedSetColumn(t => t.Email, s => s.Email))
    .WhenNotMatchedInsert(i => i
        .NotMatchedInsertColumn(t => t.Id, s => s.Id)
        .NotMatchedInsertColumn(t => t.Name, s => s.Name))
    .Build();
```

---

## Advanced Example

```csharp
var merge = new SqlMergeBuilder<User>()
    .Target("Users")
    .Source("StagingUsers")
    .On("Users.Id = StagingUsers.Id")
    .WhenMatchedUpdate()
        .Set("Users.Name", "StagingUsers.Name")
    .WhenNotMatchedInsert()
        .Value("Id", "StagingUsers.Id")
        .Value("Name", "StagingUsers.Name");
```
---

### `Into` (Merge)

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> Into(string tableName, string? schema = null)
```

**Description**
Sets the target table for the MERGE.

---

### `Using`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> Using(string sourceTable, string alias = "src")
```

**Description**
Sets the source table name and alias used in the `USING` clause.

---

### `On`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> On(
    Expression<Func<TTarget, object>> targetKey,
    Expression<Func<TSource, object>> sourceKey)
```

**Description**
Adds a join condition: `target.col = source.col`. Can be called multiple times for composite keys.

**Example**
```csharp
builder.On(t => t.TenantId, s => s.TenantId).On(t => t.ExternalId, s => s.ExternalId);
// ON target.[TenantId] = src.[TenantId] AND target.[ExternalId] = src.[ExternalId]
```

---

### `WhenMatchedUpdate`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenMatchedUpdate(
    Action<SqlMergeBuilder<TTarget, TSource>> configure)
```

**Description**
Configures the `WHEN MATCHED THEN UPDATE SET ...` clause. The `configure` action calls `MatchedSetColumn` and/or `MatchedSetValue`.

---

### `MatchedSetColumn`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> MatchedSetColumn(
    Expression<Func<TTarget, object>> targetCol,
    Expression<Func<TSource, object>> sourceCol)
```

**Description**
In WHEN MATCHED UPDATE: sets `target.targetCol = source.sourceCol` (column-to-column copy, no parameters).

---

### `MatchedSetValue`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> MatchedSetValue<TValue>(
    Expression<Func<TTarget, object>> targetCol, TValue value)
```

**Description**
In WHEN MATCHED UPDATE: sets `target.targetCol = @pmN` (parameterized value).

---

### `WhenNotMatchedInsert`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenNotMatchedInsert(
    Action<SqlMergeBuilder<TTarget, TSource>> configure)
```

**Description**
Configures the `WHEN NOT MATCHED BY TARGET THEN INSERT (...)` clause. The `configure` action calls `NotMatchedInsertColumn` and/or `NotMatchedInsertValue`.

---

### `NotMatchedInsertColumn`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> NotMatchedInsertColumn(
    Expression<Func<TTarget, object>> targetCol,
    Expression<Func<TSource, object>> sourceCol)
```

**Description**
In WHEN NOT MATCHED INSERT: maps `targetCol = source.sourceCol`.

---

### `NotMatchedInsertValue`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> NotMatchedInsertValue<TValue>(
    Expression<Func<TTarget, object>> targetCol, TValue value)
```

**Description**
In WHEN NOT MATCHED INSERT: maps `targetCol = @pmN` (parameterized value).

---

### `WhenNotMatchedBySourceDelete`

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenNotMatchedBySourceDelete()
```

**Description**
Adds `WHEN NOT MATCHED BY SOURCE THEN DELETE`. Removes target rows that have no corresponding source row.

---

### `Tag` (Merge)

**Signature**
```csharp
SqlMergeBuilder<TTarget, TSource> Tag(string description)
```

**Description**
Adds a SQL comment header and enables console tag for traceability.

---

### `Build` (Merge)

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Builds and returns the parameterized MERGE statement. Throws if `Into()`, `Using()`, `On()`, and at least one WHEN clause have not been called.

**Full example**
```csharp
var result = new SqlMergeBuilder<User, UserDto>(new SqlServerDialect())
    .Into("Users", schema: "dbo")
    .Using("Staging", "src")
    .On(t => t.Email, s => s.Email)
    .WhenMatchedUpdate(m => m
        .MatchedSetColumn(t => t.Name,       s => s.Name)
        .MatchedSetColumn(t => t.UpdatedAt,  s => s.UpdatedAt))
    .WhenNotMatchedInsert(i => i
        .NotMatchedInsertColumn(t => t.Email,     s => s.Email)
        .NotMatchedInsertColumn(t => t.Name,      s => s.Name)
        .NotMatchedInsertValue(t => t.CreatedAt,  DateTime.UtcNow))
    .WhenNotMatchedBySourceDelete()
    .Tag("Sync users from staging")
    .Build();

// → -- Sync users from staging
//   MERGE INTO [dbo].[Users] AS target
//   USING [Staging] AS src ON target.[Email] = src.[Email]
//   WHEN MATCHED THEN
//       UPDATE SET target.[Name] = src.[Name], target.[UpdatedAt] = src.[UpdatedAt]
//   WHEN NOT MATCHED BY TARGET THEN
//       INSERT ([Email], [Name], [CreatedAt]) VALUES (src.[Email], src.[Name], @pm0)
//   WHEN NOT MATCHED BY SOURCE THEN DELETE;
```
