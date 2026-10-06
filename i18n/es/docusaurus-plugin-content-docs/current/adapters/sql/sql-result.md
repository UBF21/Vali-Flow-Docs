---
title: SqlResult & SqlQueryResult
---

## Referencia

### `SqlResult`

Devuelto por los métodos de extensión `ToSql()`. Contiene solo un fragmento WHERE (sin SELECT / FROM).

| Propiedad / Método | Tipo | Descripción |
|---|---|---|
| `Sql` | `string` | Fragmento SQL parametrizado para WHERE (sin la palabra clave `WHERE`) |
| `Parameters` | `IReadOnlyDictionary<string, object>` | Parámetros nominales listos para Dapper o ADO.NET |
| `ApplyTo(IDbCommand)` | `void` | Agrega todos los parámetros a un comando ADO.NET |
| `ToString()` | `string` | Retorna `Sql` |

**Ejemplo con ApplyTo**
```csharp
var sql = filter.ToSql(new SqliteDialect());
cmd.CommandText = $"SELECT * FROM Products WHERE {sql.Sql}";
sql.ApplyTo(cmd);
var reader = cmd.ExecuteReader();
```

---

### `SqlQueryResult`

Devuelto por `Build()` en todos los constructores, y por `ToSqlCount()`. Contiene una sentencia SQL completa.

| Propiedad / Método | Tipo | Descripción |
|---|---|---|
| `Sql` | `string` | Consulta SQL parametrizada completa |
| `Parameters` | `IReadOnlyDictionary<string, object>` | Parámetros nominales |
| `ApplyTo(IDbCommand)` | `void` | Agrega todos los parámetros a un comando ADO.NET |
| `ToDebugSql()` | `string` | Retorna el SQL con los valores de parámetros incrustados — **solo para logging, nunca ejecutar** |
| `ToString()` | `string` | Retorna `Sql` |

**Ejemplo con ToDebugSql**
```csharp
var result = new SqlQueryBuilder<User>(new SqlServerDialect())
    .From("Users")
    .Where(x => x.Age > 18)
    .Build();

Console.WriteLine(result.ToDebugSql());
// SELECT * FROM [Users] WHERE [Age] > 18
```

> **Advertencia:** `ToDebugSql()` incrusta los valores reales en el string SQL para legibilidad. Nunca pases este string a una base de datos — es únicamente para logging y depuración.

---
