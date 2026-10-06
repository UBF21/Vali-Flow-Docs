---
title: SqlTruncateBuilder
---

`SqlTruncateBuilder<T>` construye sentencias `TRUNCATE TABLE`.

> **Nota:** SQLite no soporta TRUNCATE TABLE. `Build()` lanza `InvalidOperationException` al usar `SqliteDialect`. Usa `SqlDeleteBuilder` con `AllowDeleteAll()` en su lugar.

```csharp
var result = new SqlTruncateBuilder<User>(new SqlServerDialect())
    .Table("Users")
    .Build();
// → TRUNCATE TABLE [Users]
```

---

### `Table` (Truncate)

**Firma**
```csharp
SqlTruncateBuilder<T> Table(string tableName, string? schema = null)
```

**Descripción**
Establece la tabla a truncar. Si no se llama, usa `typeof(T).Name`.

---

### `Tag` (Truncate)

**Firma**
```csharp
SqlTruncateBuilder<T> Tag(string description)
```

**Descripción**
Agrega un encabezado de comentario SQL para trazabilidad.

---

### `Build` (Truncate)

**Firma**
```csharp
SqlQueryResult Build()
```

**Descripción**
Construye y devuelve la sentencia `TRUNCATE TABLE` como un `SqlQueryResult` con un diccionario de parámetros vacío.

**Ejemplo con esquema**
```csharp
new SqlTruncateBuilder<Order>(new SqlServerDialect())
    .Table("Orders", schema: "dbo")
    .Tag("Limpiar tabla de pedidos")
    .Build();
// → -- Limpiar tabla de pedidos
//   TRUNCATE TABLE [dbo].[Orders]
```

---
---

## Ejemplo avanzado

```csharp
var truncate = new SqlTruncateBuilder<User>()
    .Table("Users")
    .Build();
```
