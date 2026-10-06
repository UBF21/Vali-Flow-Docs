---
title: SqlDeleteBuilder
---

`SqlDeleteBuilder<T>` construye sentencias `DELETE` parametrizadas.

```csharp
var result = new SqlDeleteBuilder<User>(new SqlServerDialect())
    .From("Users")
    .Where(w => w.EqualTo(x => x.Id, 42))
    .Build();
// → DELETE FROM [Users] WHERE [Id] = @pw0
```

> **Seguridad:** Por defecto, `Build()` lanza una excepción si no se establece ninguna cláusula WHERE. Llama a `AllowDeleteAll()` para permitir explícitamente la eliminación de todas las filas.

---

### `From` (Delete)

**Firma**
```csharp
SqlDeleteBuilder<T> From(string tableName, string? schema = null)
```

**Descripción**
Establece el nombre de la tabla destino y el esquema opcional.

---

### `Where` (Delete)

Cuatro sobrecargas — misma semántica que `SqlUpdateBuilder`:

```csharp
SqlDeleteBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
SqlDeleteBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
SqlDeleteBuilder<T> Where(Expression<Func<T, bool>> predicate)
SqlDeleteBuilder<T> Where(ValiFlow<T> filter)
```

---

### `OutputDeleted`

**Firma**
```csharp
SqlDeleteBuilder<T> OutputDeleted()
```

**Descripción**
Agrega `OUTPUT DELETED.*` después de DELETE FROM. Solo para SQL Server — devuelve las filas eliminadas.

**Ejemplo**
```csharp
builder.From("Users").Where(x => x.Id == 42).OutputDeleted().Build();
// → DELETE FROM [Users] OUTPUT DELETED.* WHERE [Id] = @p0
```

---

### `Returning` (Delete)

**Firma**
```csharp
SqlDeleteBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega `RETURNING *` o columnas especificadas. Solo para PostgreSQL / SQLite.

**Ejemplo**
```csharp
builder.From("Users").Where(x => x.Id == 42).Returning(x => x.Id, x => x.Name).Build();
// → DELETE FROM "Users" WHERE "Id" = @p0 RETURNING "Id", "Name"
```

---

### `AllowDeleteAll`

**Firma**
```csharp
SqlDeleteBuilder<T> AllowDeleteAll()
```

**Descripción**
Permite explícitamente generar un DELETE sin cláusula WHERE (afecta todas las filas).

---

### `Tag` (Delete)

**Firma**
```csharp
SqlDeleteBuilder<T> Tag(string description)
```

**Descripción**
Etiqueta la consulta con un comentario SQL.

---

### `Build` (Delete)

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
var delete = new SqlDeleteBuilder<User>()
    .From("Users")
    .Where(u => u.IsArchived == true);
```
