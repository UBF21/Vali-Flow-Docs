---
title: SqlInsertBuilder
---

`SqlInsertBuilder<T>` construye sentencias `INSERT` parametrizadas. Soporta inserción de fila única, multi-fila, INSERT … SELECT, y patrones de resolución de conflictos.

```csharp
var result = new SqlInsertBuilder<User>(new SqlServerDialect())
    .Into("Users")
    .Set(x => x.Name, "Alicia")
    .Set(x => x.Age, 30)
    .Build();
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1)
```

---

### `Into`

**Firma**
```csharp
SqlInsertBuilder<T> Into(string tableName, string? schema = null)
```

**Descripción**
Establece el nombre de la tabla destino y el esquema opcional.

---

### `Set`

**Firma**
```csharp
SqlInsertBuilder<T> Set<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Descripción**
Mapea una columna tipada a su valor de inserción para la fila actual.

**Ejemplo**
```csharp
builder.Into("Users").Set(x => x.Name, "Alicia").Set(x => x.Age, 30);
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1)
```

---

### `NextRow`

**Firma**
```csharp
SqlInsertBuilder<T> NextRow()
```

**Descripción**
Inicia una nueva fila para una inserción multi-fila. Las llamadas `Set` posteriores llenan la nueva fila. Todas las filas deben tener el mismo número de columnas.

**Ejemplo**
```csharp
builder.Into("Users")
    .Set(x => x.Name, "Alicia").Set(x => x.Age, 30)
    .NextRow()
    .Set(x => x.Name, "Roberto").Set(x => x.Age, 25)
    .Build();
// → INSERT INTO [Users] ([Name], [Age]) VALUES (@pi0, @pi1), (@pi2, @pi3)
```

---

### `OutputInserted`

**Firma**
```csharp
SqlInsertBuilder<T> OutputInserted()
```

**Descripción**
Agrega `OUTPUT INSERTED.*` antes de VALUES. Solo para SQL Server — útil para recuperar columnas de identidad o calculadas después de la inserción.

**Ejemplo**
```csharp
builder.Into("Users").Set(x => x.Name, "Alicia").OutputInserted().Build();
// → INSERT INTO [Users] ([Name]) OUTPUT INSERTED.* VALUES (@pi0)
```

> **Nota:** Lanza `InvalidOperationException` si se usa con un dialecto que no sea SQL Server. Usa `Returning()` para PostgreSQL / SQLite.

---

### `Returning`

**Firma**
```csharp
SqlInsertBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega `RETURNING *` o `RETURNING col1, col2` después de VALUES. Compatible con PostgreSQL y SQLite 3.35+.

**Ejemplo**
```csharp
builder.Into("Users").Set(x => x.Name, "Alicia")
    .Returning(x => x.Id, x => x.CreatedAt)
    .Build();
// → INSERT INTO "Users" ("Name") VALUES (@pi0) RETURNING "Id", "CreatedAt"
```

---

### `SelectFrom`

**Firma**
```csharp
SqlInsertBuilder<T> SelectFrom(SqlQueryResult selectQuery)
```

**Descripción**
Especifica una consulta SELECT cuyos resultados se insertarán en la tabla. Mutuamente exclusivo con `Set`.

**Ejemplo**
```csharp
var select = new SqlQueryBuilder<User>(dialect)
    .From("Archivo")
    .Select(x => x.Name)
    .Build();

new SqlInsertBuilder<User>(dialect)
    .Into("Users")
    .Columns(x => x.Name)
    .SelectFrom(select)
    .Build();
// → INSERT INTO [Users] ([Name]) SELECT [Name] FROM [Archivo]
```

---

### `Columns`

**Firma**
```csharp
SqlInsertBuilder<T> Columns(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Especifica las columnas destino para INSERT … SELECT. Si no se llama, la lista de columnas se omite: `INSERT INTO tabla SELECT …`.

---

### `Tag` (Insert)

**Firma**
```csharp
SqlInsertBuilder<T> Tag(string description)
```

**Descripción**
Etiqueta la consulta con un comentario antepuesto al SQL.

---

### Resolución de Conflictos

#### `OrIgnore` (SQLite)

**Firma**
```csharp
SqlInsertBuilder<T> OrIgnore()
```

**Descripción**
Emite `INSERT OR IGNORE INTO ...`. Solo para SQLite.

---

#### `OrReplace` (SQLite)

**Firma**
```csharp
SqlInsertBuilder<T> OrReplace()
```

**Descripción**
Emite `INSERT OR REPLACE INTO ...`. Solo para SQLite.

---

#### `OnConflictDoNothing` (PostgreSQL / SQLite)

**Firma**
```csharp
SqlInsertBuilder<T> OnConflictDoNothing()
```

**Descripción**
Agrega `ON CONFLICT DO NOTHING` después de VALUES.

**Ejemplo**
```csharp
builder.Into("Users").Set(x => x.Email, "a@b.com").OnConflictDoNothing().Build();
// → INSERT INTO "Users" ("Email") VALUES (@pi0) ON CONFLICT DO NOTHING
```

---

#### `OnConflictDoUpdate` (PostgreSQL / SQLite)

**Firma**
```csharp
SqlInsertBuilder<T> OnConflictDoUpdate(
    Action<SqlInsertBuilder<T>> conflictKeys,
    Action<SqlInsertBuilder<T>> updateAssignments)
```

**Descripción**
Agrega `ON CONFLICT (cols) DO UPDATE SET ...` después de VALUES. Pasa acciones que llaman a `AddConflictKey` y `AddConflictUpdate`.

**Ejemplo**
```csharp
builder.Into("Users")
    .Set(x => x.Email, "a@b.com")
    .Set(x => x.Name, "Alicia")
    .OnConflictDoUpdate(
        claves    => claves.AddConflictKey(x => x.Email),
        updates   => updates.AddConflictUpdate(x => x.Name, "Alicia"))
    .Build();
// → INSERT INTO "Users" ("Email", "Name") VALUES (@pi0, @pi1)
//   ON CONFLICT ("Email") DO UPDATE SET "Name" = @pu0
```

---

#### `AddConflictKey`

**Firma**
```csharp
SqlInsertBuilder<T> AddConflictKey<TValue>(Expression<Func<T, TValue>> column)
```

**Descripción**
Registra una columna como parte de la lista de columnas objetivo del ON CONFLICT. Se llama dentro de la acción `conflictKeys` de `OnConflictDoUpdate`.

---

#### `AddConflictUpdate`

**Firma**
```csharp
SqlInsertBuilder<T> AddConflictUpdate<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Descripción**
Registra una asignación columna = valor para la cláusula DO UPDATE SET. Se llama dentro de la acción `updateAssignments` de `OnConflictDoUpdate`.

---

#### `InsertIgnore` (MySQL)

**Firma**
```csharp
SqlInsertBuilder<T> InsertIgnore()
```

**Descripción**
Emite `INSERT IGNORE INTO ...`. Solo para MySQL.

---

#### `OnDuplicateKeyUpdate` (MySQL)

**Firma**
```csharp
SqlInsertBuilder<T> OnDuplicateKeyUpdate(Action<SqlInsertBuilder<T>> configure)
```

**Descripción**
Agrega `ON DUPLICATE KEY UPDATE col = @pu...` después de VALUES. Solo para MySQL.

**Ejemplo**
```csharp
builder.Into("Users")
    .Set(x => x.Email, "a@b.com")
    .OnDuplicateKeyUpdate(u => u.AddDuplicateKeyAssignment(x => x.Name, "Alicia"))
    .Build();
// → INSERT INTO `Users` (`Email`) VALUES (@pi0) ON DUPLICATE KEY UPDATE `Name` = @pu0
```

---

#### `AddDuplicateKeyAssignment`

**Firma**
```csharp
SqlInsertBuilder<T> AddDuplicateKeyAssignment<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Descripción**
Registra una asignación columna = valor para la cláusula ON DUPLICATE KEY UPDATE.

---

### `Build` (Insert)

**Firma**
```csharp
SqlQueryResult Build()
```

**Descripción**
Ensambla y devuelve el `SqlQueryResult` final.

---
---

## Ejemplo avanzado

```csharp
var insert = new SqlInsertBuilder<User>()
    .Into("Users")
    .Value(u => u.Email, "a@b.com")
    .Value(u => u.IsActive, true)
    .Returning(u => u.Id);
```
