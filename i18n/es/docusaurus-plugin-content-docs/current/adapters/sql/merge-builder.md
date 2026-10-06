---
title: SqlMergeBuilder
---

`SqlMergeBuilder<TTarget, TSource>` construye sentencias `MERGE` de SQL Server. Para upsert en PostgreSQL, usa `SqlInsertBuilder.OnConflictDoUpdate` en su lugar.

> **Nota:** `Build()` lanza `InvalidOperationException` en dialectos distintos a `SqlServerDialect`. Solo SQL Server soporta la sintaxis MERGE tal como está implementada aquí.

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

### `Into` (Merge)

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> Into(string tableName, string? schema = null)
```

**Descripción**
Establece la tabla destino del MERGE.

---

### `Using`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> Using(string sourceTable, string alias = "src")
```

**Descripción**
Establece el nombre y alias de la tabla fuente usados en la cláusula `USING`.

---

### `On`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> On(
    Expression<Func<TTarget, object>> targetKey,
    Expression<Func<TSource, object>> sourceKey)
```

**Descripción**
Agrega una condición de unión: `target.col = source.col`. Se puede llamar múltiples veces para claves compuestas.

**Ejemplo**
```csharp
builder.On(t => t.TenantId, s => s.TenantId).On(t => t.ExternalId, s => s.ExternalId);
// ON target.[TenantId] = src.[TenantId] AND target.[ExternalId] = src.[ExternalId]
```

---

### `WhenMatchedUpdate`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenMatchedUpdate(
    Action<SqlMergeBuilder<TTarget, TSource>> configure)
```

**Descripción**
Configura la cláusula `WHEN MATCHED THEN UPDATE SET ...`. La acción `configure` llama a `MatchedSetColumn` y/o `MatchedSetValue`.

---

### `MatchedSetColumn`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> MatchedSetColumn(
    Expression<Func<TTarget, object>> targetCol,
    Expression<Func<TSource, object>> sourceCol)
```

**Descripción**
En WHEN MATCHED UPDATE: establece `target.targetCol = source.sourceCol` (copia columna a columna, sin parámetros).

---

### `MatchedSetValue`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> MatchedSetValue<TValue>(
    Expression<Func<TTarget, object>> targetCol, TValue value)
```

**Descripción**
En WHEN MATCHED UPDATE: establece `target.targetCol = @pmN` (valor parametrizado).

---

### `WhenNotMatchedInsert`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenNotMatchedInsert(
    Action<SqlMergeBuilder<TTarget, TSource>> configure)
```

**Descripción**
Configura la cláusula `WHEN NOT MATCHED BY TARGET THEN INSERT (...)`. La acción `configure` llama a `NotMatchedInsertColumn` y/o `NotMatchedInsertValue`.

---

### `NotMatchedInsertColumn`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> NotMatchedInsertColumn(
    Expression<Func<TTarget, object>> targetCol,
    Expression<Func<TSource, object>> sourceCol)
```

**Descripción**
En WHEN NOT MATCHED INSERT: mapea `targetCol = source.sourceCol`.

---

### `NotMatchedInsertValue`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> NotMatchedInsertValue<TValue>(
    Expression<Func<TTarget, object>> targetCol, TValue value)
```

**Descripción**
En WHEN NOT MATCHED INSERT: mapea `targetCol = @pmN` (valor parametrizado).

---

### `WhenNotMatchedBySourceDelete`

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> WhenNotMatchedBySourceDelete()
```

**Descripción**
Agrega `WHEN NOT MATCHED BY SOURCE THEN DELETE`. Elimina filas del destino que no tienen fila correspondiente en la fuente.

---

### `Tag` (Merge)

**Firma**
```csharp
SqlMergeBuilder<TTarget, TSource> Tag(string description)
```

**Descripción**
Agrega un encabezado de comentario SQL y habilita el tag de consola para trazabilidad.

---

### `Build` (Merge)

**Firma**
```csharp
SqlQueryResult Build()
```

**Descripción**
Construye y devuelve la sentencia MERGE parametrizada. Lanza excepción si `Into()`, `Using()`, `On()` y al menos una cláusula WHEN no han sido llamados.

**Ejemplo completo**
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
    .Tag("Sincronizar usuarios desde staging")
    .Build();

// → -- Sincronizar usuarios desde staging
//   MERGE INTO [dbo].[Users] AS target
//   USING [Staging] AS src ON target.[Email] = src.[Email]
//   WHEN MATCHED THEN
//       UPDATE SET target.[Name] = src.[Name], target.[UpdatedAt] = src.[UpdatedAt]
//   WHEN NOT MATCHED BY TARGET THEN
//       INSERT ([Email], [Name], [CreatedAt]) VALUES (src.[Email], src.[Name], @pm0)
//   WHEN NOT MATCHED BY SOURCE THEN DELETE;
```
---

## Ejemplo avanzado

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
