---
title: SQL Overview
---

import Drawio from '@theme/Drawio';
import sqlFlow from '@site/static/diagrams/sql-flow.drawio';

**Vali-Flow.Sql** translates strongly-typed C# expressions and fluent builders into parameterized SQL statements. It targets Dapper, ADO.NET, or any framework that accepts a SQL string plus a parameter dictionary.

<Drawio content={sqlFlow} />

Key features:

- Expression tree → SQL WHERE clause translation via `ValiFlow<T>.ToSql(dialect)`
- Full SELECT query construction via `SqlQueryBuilder<T>`
- INSERT, UPDATE, DELETE, TRUNCATE, and MERGE builders
- Five built-in SQL dialects (SQL Server, PostgreSQL, MySQL, SQLite, Oracle)
- All queries are parameterized — no string interpolation of user values
- Window functions: ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, FIRST_VALUE, LAST_VALUE, and aggregate OVER functions
- CTEs (regular and recursive), subquery JOINs, UNION / EXCEPT / INTERSECT, row locking

**Install**

```bash
dotnet add package Vali-Flow.Sql
```

**Quick example**

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

## More Examples

### 1) Build a full query

```csharp
var query = new SqlQueryBuilder<User>()
    .SelectAll()
    .From("Users")
    .Where(filter, new SqlServerDialect())
    .OrderByDesc(u => u.CreatedAt)
    .Take(50);
```

### 2) Insert

```csharp
var insert = new SqlInsertBuilder<User>()
    .Into("Users")
    .Value(u => u.Name, "Alice")
    .Value(u => u.IsActive, true);
```

### 3) Update

```csharp
var update = new SqlUpdateBuilder<User>()
    .Table("Users")
    .Set(u => u.IsActive, false)
    .Where(u => u.Id == 42);
```
