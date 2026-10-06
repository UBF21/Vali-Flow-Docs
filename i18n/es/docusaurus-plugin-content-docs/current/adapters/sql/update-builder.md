---
title: SqlUpdateBuilder
---

`SqlUpdateBuilder<T>` construye sentencias `UPDATE` parametrizadas.

```csharp
var result = new SqlUpdateBuilder<User>(new SqlServerDialect())
    .Table("Users")
    .Set(x => x.Name, "Roberto")
    .Set(x => x.IsActive, false)
    .Where(w => w.EqualTo(x => x.Id, 42))
    .Build();
// → UPDATE [Users] SET [Name] = @pu0, [IsActive] = @pu1 WHERE [Id] = @pw0
```

> **Seguridad:** Por defecto, `Build()` lanza una excepción si no se establece ninguna cláusula WHERE. Llama a `AllowUpdateAll()` para permitir explícitamente la actualización de todas las filas.

---

### `Table`

**Firma**
```csharp
SqlUpdateBuilder<T> Table(string tableName, string? schema = null)
```

**Descripción**
Establece el nombre de la tabla destino y el esquema opcional.

---

### `Set` (Update)

**Firma**
```csharp
SqlUpdateBuilder<T> Set<TValue>(Expression<Func<T, TValue>> column, TValue value)
```

**Descripción**
Agrega una cláusula SET parametrizada. Los parámetros usan el prefijo `pu`.

**Ejemplo**
```csharp
builder.Table("Users").Set(x => x.Name, "Roberto").Set(x => x.IsActive, false);
// SET [Name] = @pu0, [IsActive] = @pu1
```

---

### `SetRaw`

**Firma**
```csharp
SqlUpdateBuilder<T> SetRaw(Expression<Func<T, object>> column, string rawExpression)
```

**Descripción**
Agrega una cláusula SET literal (sin parametrizar). Útil para expresiones del lado del servidor como `GETDATE()` o aritmética sobre valores existentes.

**Ejemplo**
```csharp
builder.SetRaw(x => x.Counter, "Counter + 1");
// SET [Counter] = Counter + 1

builder.SetRaw(x => x.UpdatedAt, "GETDATE()");
// SET [UpdatedAt] = GETDATE()
```

---

### `SetColumn`

**Firma**
```csharp
SqlUpdateBuilder<T> SetColumn<TValue>(
    Expression<Func<T, TValue>> target,
    Expression<Func<T, TValue>> source)
```

**Descripción**
Copia el valor actual de una columna a otra sin parámetros.

**Ejemplo**
```csharp
builder.SetColumn(x => x.NameBackup, x => x.Name);
// SET [NameBackup] = [Name]
```

---

### `Where` (Update)

Cuatro sobrecargas disponibles — misma semántica que `SqlQueryBuilder`:

```csharp
SqlUpdateBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
SqlUpdateBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
SqlUpdateBuilder<T> Where(Expression<Func<T, bool>> predicate)
SqlUpdateBuilder<T> Where(ValiFlow<T> filter)
```

---

### `FromTable`

**Firma**
```csharp
SqlUpdateBuilder<T> FromTable(string sourceTable, string? alias = null)
```

**Descripción**
Agrega una tabla fuente FROM (SQL Server / PostgreSQL) o JOIN (MySQL) a la sentencia UPDATE, habilitando actualizaciones multi-tabla. Lanza excepción en SQLite y Oracle.

**Ejemplo**
```csharp
// SQL Server
builder.Table("Orders")
    .Set(x => x.Status, "Enviado")
    .FromTable("Shipments", "s")
    .JoinOn("INNER JOIN", "[Shipments].[OrderId] = [Orders].[Id]")
    .Where(x => x.Status == "Pendiente")
    .Build();
// → UPDATE [Orders] SET [Status] = @pu0 FROM [Shipments] [s] INNER JOIN [Shipments].[OrderId] = [Orders].[Id]
//   WHERE [Status] = @p0
```

---

### `JoinOn`

**Firma**
```csharp
SqlUpdateBuilder<T> JoinOn(string joinType, string onCondition)
```

**Descripción**
Agrega una condición JOIN a la cláusula FROM de la sentencia UPDATE. Se usa junto con `FromTable`.

---

### `AllowUpdateAll`

**Firma**
```csharp
SqlUpdateBuilder<T> AllowUpdateAll()
```

**Descripción**
Permite explícitamente generar un UPDATE sin cláusula WHERE (afecta todas las filas). Llama solo cuando la actualización de toda la tabla es intencional.

---

### `OutputUpdated`

**Firma**
```csharp
SqlUpdateBuilder<T> OutputUpdated()
```

**Descripción**
Agrega `OUTPUT INSERTED.*` después de SET. Solo para SQL Server. Devuelve los nuevos valores de las filas actualizadas.

---

### `Returning` (Update)

**Firma**
```csharp
SqlUpdateBuilder<T> Returning(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega `RETURNING *` o columnas especificadas después de WHERE. Solo para PostgreSQL / SQLite.

---

### `Tag` (Update)

**Firma**
```csharp
SqlUpdateBuilder<T> Tag(string description)
```

**Descripción**
Etiqueta la consulta con un comentario SQL.

---

### `Build` (Update)

**Firma**
```csharp
SqlQueryResult Build()
```

**Descripción**
Ensambla y devuelve el `SqlQueryResult` final. Lanza excepción si no hay asignaciones SET o si no hay cláusula WHERE (a menos que se haya llamado `AllowUpdateAll()`).

---
---

## Ejemplo avanzado

```csharp
var update = new SqlUpdateBuilder<User>()
    .Table("Users")
    .Set(u => u.LastLoginAt, DateTime.UtcNow)
    .Where(u => u.IsActive == true);
```
