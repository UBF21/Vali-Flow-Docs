---
title: SQL Overview
---

import Drawio from '@theme/Drawio';
import sqlFlow from '@site/static/diagrams/sql-flow.drawio';

**Vali-Flow.Sql** traduce expresiones C# fuertemente tipadas y constructores fluidos en sentencias SQL parametrizadas. Está diseñado para integrarse con Dapper, ADO.NET o cualquier framework que acepte un string SQL más un diccionario de parámetros.

<Drawio content={sqlFlow} />

Características principales:

- Traducción de árboles de expresión a cláusula WHERE via `ValiFlow<T>.ToSql(dialect)`
- Construcción de consultas SELECT completas via `SqlQueryBuilder<T>`
- Constructores para INSERT, UPDATE, DELETE, TRUNCATE y MERGE
- Cinco dialectos SQL integrados (SQL Server, PostgreSQL, MySQL, SQLite, Oracle)
- Todas las consultas son parametrizadas — sin interpolación de valores del usuario
- Funciones de ventana: ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, FIRST_VALUE, LAST_VALUE y funciones de agregado OVER
- CTEs (regulares y recursivas), JOINs con subconsultas, UNION / EXCEPT / INTERSECT, bloqueo de filas

**Instalación**

```bash
dotnet add package Vali-Flow.Sql
```

**Ejemplo rápido**

```csharp
var filter = new ValiFlow<User>()
    .NotNull(x => x.Name)
    .GreaterThan(x => x.Age, 18);

var sql = filter.ToSql(new SqlServerDialect());
// sql.Sql        → "[Name] IS NOT NULL AND [Age] > @p0"
// sql.Parameters → { "p0": 18 }

// Dapper
var users = connection.Query<User>($"SELECT * FROM Users WHERE {sql.Sql}", sql.Parameters);

// ADO.NET
cmd.CommandText = $"SELECT * FROM Users WHERE {sql.Sql}";
sql.ApplyTo(cmd);
```

---
