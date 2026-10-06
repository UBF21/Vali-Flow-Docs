---
title: SqlQueryBuilder
---

`SqlQueryBuilder<T>` es el punto de entrada principal para construir consultas SELECT completas. Es una clase sellada genérica — `T` es el tipo de entidad cuyas propiedades están disponibles como columnas tipadas.

```csharp
var result = new SqlQueryBuilder<Order>(new SqlServerDialect())
    .From("Orders", schema: "dbo")
    .Select(x => x.Id, x => x.Total)
    .Where(x => x.Total > 100)
    .OrderBy(x => x.CreatedAt, ascending: false)
    .Page(1, 20)
    .Build();
```

---

### SELECT

#### `Select` — múltiples columnas

**Firma**
```csharp
SqlQueryBuilder<T> Select(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega una o más columnas tipadas a la lista SELECT. Si nunca se llama, la consulta utiliza `SELECT *` por defecto.

**Ejemplo**
```csharp
builder.Select(x => x.Id, x => x.Name);
// → SELECT [Id], [Name] FROM ...
```

---

#### `Select` — columna única con alias

**Firma**
```csharp
SqlQueryBuilder<T> Select(Expression<Func<T, object>> column, string? alias)
```

**Descripción**
Agrega una columna tipada con alias opcional.

**Ejemplo**
```csharp
builder.Select(x => x.Name, "UserName");
// → SELECT [Name] AS [UserName] FROM ...
```

---

#### `SelectAll`

**Firma**
```csharp
SqlQueryBuilder<T> SelectAll()
```

**Descripción**
Restablece la lista de columnas a `SELECT *`, limpiando cualquier columna previamente agregada.

---

#### `SelectRaw`

**Firma**
```csharp
SqlQueryBuilder<T> SelectRaw(string rawSql)
```

**Descripción**
Agrega un fragmento SQL literal a la lista SELECT. Útil para expresiones que no se pueden representar mediante columnas tipadas.

**Ejemplo**
```csharp
builder.SelectRaw("GETDATE() AS [Now]");
// → SELECT GETDATE() AS [Now] FROM ...
```

---

#### `SelectRawIf`

**Firma**
```csharp
SqlQueryBuilder<T> SelectRawIf(bool condition, string rawSql)
```

**Descripción**
Agrega una expresión SELECT literal solo cuando `condition` es `true`.

---

#### `SelectIf`

**Firma**
```csharp
SqlQueryBuilder<T> SelectIf(bool condition, Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega una columna tipada solo cuando `condition` es `true`.

---

#### `SelectCount` — estrella

**Firma**
```csharp
SqlQueryBuilder<T> SelectCount(string? alias = null)
```

**Descripción**
Agrega `COUNT(*)` a la lista SELECT.

**Ejemplo**
```csharp
builder.SelectCount("total");
// → SELECT COUNT(*) AS [total] FROM ...
```

---

#### `SelectCount` — columna

**Firma**
```csharp
SqlQueryBuilder<T> SelectCount(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `COUNT([col])` a la lista SELECT.

---

#### `SelectCountDistinct`

**Firma**
```csharp
SqlQueryBuilder<T> SelectCountDistinct(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `COUNT(DISTINCT [col])` a la lista SELECT.

---

#### `SelectSum`

**Firma**
```csharp
SqlQueryBuilder<T> SelectSum(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `SUM([col])` a la lista SELECT.

---

#### `SelectAvg`

**Firma**
```csharp
SqlQueryBuilder<T> SelectAvg(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `AVG([col])` a la lista SELECT.

---

#### `SelectMin`

**Firma**
```csharp
SqlQueryBuilder<T> SelectMin(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `MIN([col])` a la lista SELECT.

---

#### `SelectMax`

**Firma**
```csharp
SqlQueryBuilder<T> SelectMax(Expression<Func<T, object>> column, string? alias = null)
```

**Descripción**
Agrega `MAX([col])` a la lista SELECT.

---

#### `SelectCase`

**Firma**
```csharp
SqlQueryBuilder<T> SelectCase(CaseWhenBuilder caseWhen)
```

**Descripción**
Agrega una expresión `CASE WHEN ... THEN ... ELSE ... END` a la lista SELECT, construida mediante `CaseWhenBuilder`.

**Ejemplo**
```csharp
var caseExpr = new CaseWhenBuilder()
    .When("[Status] = 1", "Activo")
    .When("[Status] = 2", "Inactivo")
    .Else("Desconocido")
    .As("EstadoLabel");

builder.SelectCase(caseExpr);
// → SELECT CASE WHEN [Status] = 1 THEN 'Activo' WHEN [Status] = 2 THEN 'Inactivo' ELSE 'Desconocido' END AS [EstadoLabel]
```

---

#### `SelectCoalesce`

**Firma**
```csharp
SqlQueryBuilder<T> SelectCoalesce(
    Expression<Func<T, object>> column, string fallbackSql, string alias)
```

**Descripción**
Agrega `COALESCE([col], fallbackSql) AS [alias]` a la lista SELECT.

**Ejemplo**
```csharp
builder.SelectCoalesce(x => x.Department, "'Sin Dept'", "Departamento");
// → SELECT COALESCE([Department], 'Sin Dept') AS [Departamento] FROM ...
```

---

#### `SelectCast`

**Firma**
```csharp
SqlQueryBuilder<T> SelectCast(
    Expression<Func<T, object>> column, string typeName, string alias)
```

**Descripción**
Agrega `CAST([col] AS typeName) AS [alias]` a la lista SELECT.

**Ejemplo**
```csharp
builder.SelectCast(x => x.Age, "FLOAT", "EdadDecimal");
// → SELECT CAST([Age] AS FLOAT) AS [EdadDecimal] FROM ...
```

---

#### `SelectConcat`

**Firma**
```csharp
SqlQueryBuilder<T> SelectConcat(string alias, params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega una expresión de concatenación de cadenas adaptada al dialecto. El operador varía por dialecto:
- SQL Server: `[col1] + [col2]`
- PostgreSQL / SQLite: `"col1" || "col2"`
- MySQL: `` CONCAT(`col1`, `col2`) ``

**Ejemplo**
```csharp
builder.SelectConcat("NombreCompleto", x => x.FirstName, x => x.LastName);
// SQL Server → SELECT [FirstName] + [LastName] AS [NombreCompleto]
// PostgreSQL → SELECT "FirstName" || "LastName" AS "NombreCompleto"
```

---

### Funciones de Ventana

#### `SelectRowNumber`

**Firma**
```csharp
SqlQueryBuilder<T> SelectRowNumber(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "RowNum")

// Sobrecarga multi-partición
SqlQueryBuilder<T> SelectRowNumber(
    IReadOnlyList<Expression<Func<T, object>>> partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "RowNum")
```

**Descripción**
Agrega `ROW_NUMBER() OVER (PARTITION BY [col] ORDER BY [col] ASC|DESC) AS [alias]`. Pasa `null` como `partitionBy` para omitir la cláusula PARTITION BY.

**Ejemplo**
```csharp
builder.SelectRowNumber(x => x.Department, x => x.Salary, ascending: false, alias: "RangoSalario");
// → SELECT ROW_NUMBER() OVER (PARTITION BY [Department] ORDER BY [Salary] DESC) AS [RangoSalario]
```

---

#### `SelectRank`

**Firma**
```csharp
SqlQueryBuilder<T> SelectRank(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "Rank")
```

**Descripción**
Agrega `RANK() OVER (...)`. Mismo comportamiento de saltos que el RANK estándar de SQL.

---

#### `SelectDenseRank`

**Firma**
```csharp
SqlQueryBuilder<T> SelectDenseRank(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "DenseRank")
```

**Descripción**
Agrega `DENSE_RANK() OVER (...)`. Sin saltos en los valores de ranking.

---

#### `SelectLag`

**Firma**
```csharp
SqlQueryBuilder<T> SelectLag(
    Expression<Func<T, object>> column,
    int offset,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `LAG([col], offset) OVER ([PARTITION BY ...] ORDER BY ...)`. Recupera el valor de una fila anterior dentro de la partición.

**Ejemplo**
```csharp
builder.SelectLag(x => x.Price, 1, null, x => x.CreatedAt, alias: "PrecioAnterior");
// → SELECT LAG([Price], 1) OVER (ORDER BY [CreatedAt] ASC) AS [PrecioAnterior]
```

---

#### `SelectLead`

**Firma**
```csharp
SqlQueryBuilder<T> SelectLead(
    Expression<Func<T, object>> column,
    int offset,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `LEAD([col], offset) OVER (...)`. Recupera el valor de una fila siguiente dentro de la partición.

---

#### `SelectFirstValue`

**Firma**
```csharp
SqlQueryBuilder<T> SelectFirstValue(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `FIRST_VALUE([col]) OVER (...)`. Recupera el primer valor en el marco de ventana ordenado.

---

#### `SelectLastValue`

**Firma**
```csharp
SqlQueryBuilder<T> SelectLastValue(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `LAST_VALUE([col]) OVER (...)`. Recupera el último valor en el marco de ventana ordenado.

---

#### `SelectSumOver`

**Firma**
```csharp
SqlQueryBuilder<T> SelectSumOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `SUM([col]) OVER ([PARTITION BY ...] [ORDER BY ...])`. Útil para totales acumulados. El alias por defecto es `Running{NombreColumna}`.

**Ejemplo**
```csharp
builder.SelectSumOver(x => x.Amount, x => x.CustomerId, x => x.CreatedAt, alias: "TotalAcumulado");
// → SELECT SUM([Amount]) OVER (PARTITION BY [CustomerId] ORDER BY [CreatedAt] ASC) AS [TotalAcumulado]
```

---

#### `SelectAvgOver`

**Firma**
```csharp
SqlQueryBuilder<T> SelectAvgOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `AVG([col]) OVER (...)`.

---

#### `SelectCountOver`

**Firma**
```csharp
SqlQueryBuilder<T> SelectCountOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `COUNT([col]) OVER (...)`.

---

#### `SelectMinOver`

**Firma**
```csharp
SqlQueryBuilder<T> SelectMinOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `MIN([col]) OVER (...)`.

---

#### `SelectMaxOver`

**Firma**
```csharp
SqlQueryBuilder<T> SelectMaxOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Descripción**
Agrega `MAX([col]) OVER (...)`.

---

#### `SelectWindowRaw`

**Firma**
```csharp
SqlQueryBuilder<T> SelectWindowRaw(string windowExpression, string alias)
```

**Descripción**
Agrega una expresión de función de ventana literal al SELECT. Útil cuando las sobrecargas tipadas no cubren tu caso.

**Ejemplo**
```csharp
builder.SelectWindowRaw("NTILE(4) OVER (ORDER BY [Score] DESC)", "Cuartil");
// → SELECT NTILE(4) OVER (ORDER BY [Score] DESC) AS [Cuartil]
```

---

### FROM

#### `From` — nombre de tabla

**Firma**
```csharp
SqlQueryBuilder<T> From(string tableName, string? schema = null)
```

**Descripción**
Establece la tabla FROM. Si no se llama, toma `typeof(T).Name` como valor por defecto. El esquema es opcional.

**Ejemplo**
```csharp
builder.From("Users", schema: "dbo");
// SQL Server → FROM [dbo].[Users]
// PostgreSQL → FROM "dbo"."Users"
```

---

#### `From` — subconsulta

**Firma**
```csharp
SqlQueryBuilder<T> From(SqlQueryResult subquery, string alias)
```

**Descripción**
Usa un `SqlQueryResult` precompilado como fuente FROM: `FROM (subquery) alias`.

**Ejemplo**
```csharp
var inner = new SqlQueryBuilder<User>(dialect)
    .From("Users")
    .Where(x => x.IsActive)
    .Build();

new SqlQueryBuilder<User>(dialect)
    .From(inner, "activos")
    .Select(x => x.Name)
    .Build();
// → SELECT "Name" FROM (SELECT * FROM "Users" WHERE "IsActive" = true) activos
```

---

### JOINs

Todos los métodos de join aceptan un nombre de tabla (entre comillas según el dialecto), un alias opcional y una condición ON como string literal.

#### `InnerJoin`

**Firma**
```csharp
SqlQueryBuilder<T> InnerJoin(string table, string? alias, string on)
```

**Ejemplo**
```csharp
builder.From("Users").InnerJoin("Orders", "o", "[Users].[Id] = [o].[UserId]");
// → FROM [Users] INNER JOIN [Orders] o ON [Users].[Id] = [o].[UserId]
```

---

#### `LeftJoin`

**Firma**
```csharp
SqlQueryBuilder<T> LeftJoin(string table, string? alias, string on)
```

**Descripción**
Agrega una cláusula `LEFT JOIN`.

---

#### `RightJoin`

**Firma**
```csharp
SqlQueryBuilder<T> RightJoin(string table, string? alias, string on)
```

**Descripción**
Agrega una cláusula `RIGHT JOIN`.

---

#### `FullOuterJoin`

**Firma**
```csharp
SqlQueryBuilder<T> FullOuterJoin(string table, string? alias, string on)
```

**Descripción**
Agrega una cláusula `FULL OUTER JOIN`.

---

#### `CrossJoin`

**Firma**
```csharp
SqlQueryBuilder<T> CrossJoin(string table, string? alias = null)
```

**Descripción**
Agrega una cláusula `CROSS JOIN`. No requiere condición ON.

---

#### `InnerJoinSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> InnerJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Descripción**
Agrega un `INNER JOIN` contra una tabla derivada (subconsulta). Los parámetros de la subconsulta se renombran automáticamente para evitar colisiones.

**Ejemplo**
```csharp
var sub = new SqlQueryBuilder<Order>(dialect)
    .From("Orders")
    .Select(x => x.UserId)
    .SelectSum(x => x.Total, "TotalGastado")
    .GroupBy(x => x.UserId)
    .Build();

builder.From("Users").InnerJoinSubquery(sub, "totales", "[Users].[Id] = [totales].[UserId]");
// → FROM [Users] INNER JOIN (SELECT [UserId], SUM([Total]) AS [TotalGastado] FROM [Orders] GROUP BY [UserId]) [totales] ON [Users].[Id] = [totales].[UserId]
```

---

#### `LeftJoinSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> LeftJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Descripción**
Agrega un `LEFT JOIN` contra una tabla derivada (subconsulta).

---

#### `RightJoinSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> RightJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Descripción**
Agrega un `RIGHT JOIN` contra una tabla derivada (subconsulta).

---

#### `FullOuterJoinSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> FullOuterJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Descripción**
Agrega un `FULL OUTER JOIN` contra una tabla derivada (subconsulta).

---

### WHERE

Múltiples llamadas WHERE se combinan con AND. La sobrecarga de `ValiFlow<T>` / `Expression` y la de `SqlWhereBuilder` usan prefijos de nombre de parámetro diferentes (`p` vs `pw`) y pueden coexistir sin conflictos.

#### `Where` — ValiFlow

**Firma**
```csharp
SqlQueryBuilder<T> Where(ValiFlow<T> filter)
```

**Descripción**
Establece la cláusula WHERE a partir de un filtro `ValiFlow<T>`. Los parámetros usan el prefijo `p`.

**Ejemplo**
```csharp
var filter = new ValiFlow<User>().EqualTo(x => x.IsActive, true).GreaterThan(x => x.Age, 18);
builder.From("Users").Where(filter);
// → WHERE [IsActive] = @p0 AND [Age] > @p1
```

---

#### `Where` — Expression

**Firma**
```csharp
SqlQueryBuilder<T> Where(Expression<Func<T, bool>> predicate)
```

**Descripción**
Establece la cláusula WHERE a partir de una expresión lambda. Los parámetros usan el prefijo `p`.

> **Nota:** Llamar tanto a `Where(ValiFlow<T>)` como a `Where(Expression<...>)` no está soportado — la segunda llamada sobreescribe la primera. Usa solo un predicado tipado; combínalo con `Where(SqlWhereBuilder)` para condiciones compuestas.

---

#### `Where` — SqlWhereBuilder (instancia)

**Firma**
```csharp
SqlQueryBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
```

**Descripción**
Establece la cláusula WHERE a partir de un `SqlWhereBuilder<T>` preconfigurado. Los parámetros usan el prefijo `pw`. Puede combinarse con la sobrecarga de predicado tipado.

---

#### `Where` — SqlWhereBuilder (inline)

**Firma**
```csharp
SqlQueryBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
```

**Descripción**
Configura la cláusula WHERE de forma inline usando una acción `SqlWhereBuilder<T>`.

**Ejemplo**
```csharp
builder.Where(w => w.EqualTo(x => x.IsActive, true).GreaterThan(x => x.Age, 18));
// → WHERE [IsActive] = @pw0 AND [Age] > @pw1
```

---

#### `WhereRaw`

**Firma**
```csharp
SqlQueryBuilder<T> WhereRaw(string rawSql)
```

**Descripción**
Agrega un fragmento SQL literal a la cláusula WHERE (combinado con AND). Los parámetros en el fragmento son responsabilidad del caller.

**Ejemplo**
```csharp
builder.WhereRaw("[CreatedAt] > DATEADD(day, -30, GETDATE())");
// → WHERE [CreatedAt] > DATEADD(day, -30, GETDATE())
```

---

#### `WhereExists`

**Firma**
```csharp
SqlQueryBuilder<T> WhereExists(SqlQueryResult subquery)
```

**Descripción**
Agrega `EXISTS (subquery)` a la cláusula WHERE. Los parámetros de la subconsulta se fusionan y renombran automáticamente.

**Ejemplo**
```csharp
var sub = new SqlQueryBuilder<Order>(dialect)
    .From("Orders")
    .WhereRaw("[Orders].[UserId] = [Users].[Id]")
    .Build();

builder.From("Users").WhereExists(sub);
// → WHERE EXISTS (SELECT * FROM [Orders] WHERE [Orders].[UserId] = [Users].[Id])
```

---

#### `WhereNotExists`

**Firma**
```csharp
SqlQueryBuilder<T> WhereNotExists(SqlQueryResult subquery)
```

**Descripción**
Agrega `NOT EXISTS (subquery)` a la cláusula WHERE.

---

#### `WhereInSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> WhereInSubquery<TValue>(Expression<Func<T, TValue>> column, SqlQueryResult subquery)
```

**Descripción**
Agrega `[col] IN (subquery)` a la cláusula WHERE. Los parámetros de la subconsulta se renombran automáticamente.

**Ejemplo**
```csharp
var sub = new SqlQueryBuilder<Order>(dialect)
    .From("Orders")
    .Select(x => x.UserId)
    .Build();

builder.From("Users").WhereInSubquery(x => x.Id, sub);
// → WHERE [Id] IN (SELECT [UserId] FROM [Orders])
```

---

#### `WhereNotInSubquery`

**Firma**
```csharp
SqlQueryBuilder<T> WhereNotInSubquery<TValue>(Expression<Func<T, TValue>> column, SqlQueryResult subquery)
```

**Descripción**
Agrega `[col] NOT IN (subquery)` a la cláusula WHERE.

---

#### `WhereIf` — sobrecarga builder

**Firma**
```csharp
SqlQueryBuilder<T> WhereIf(bool condition, Action<SqlWhereBuilder<T>> configure)
```

**Descripción**
Aplica una cláusula WHERE con `SqlWhereBuilder` solo cuando `condition` es `true`.

---

#### `WhereIf` — sobrecarga expression

**Firma**
```csharp
SqlQueryBuilder<T> WhereIf(bool condition, Expression<Func<T, bool>> predicate)
```

**Descripción**
Aplica un predicado WHERE lambda solo cuando `condition` es `true`.

---

### GROUP BY / HAVING

#### `GroupBy`

**Firma**
```csharp
SqlQueryBuilder<T> GroupBy(params Expression<Func<T, object>>[] columns)
```

**Descripción**
Agrega columnas GROUP BY.

**Ejemplo**
```csharp
builder.GroupBy(x => x.Department, x => x.Status);
// → GROUP BY [Department], [Status]
```

---

#### `GroupByRaw`

**Firma**
```csharp
SqlQueryBuilder<T> GroupByRaw(string rawSql)
```

**Descripción**
Agrega un fragmento SQL literal a la cláusula GROUP BY. Útil para consultas multi-tabla donde se necesitan nombres de columna calificados con la tabla.

**Ejemplo**
```csharp
builder.GroupByRaw("[Products].[Id], [Products].[Name]");
```

---

#### `GroupByIf`

**Firma**
```csharp
SqlQueryBuilder<T> GroupByIf(bool condition, Expression<Func<T, object>> column)
```

**Descripción**
Agrega una columna GROUP BY solo cuando `condition` es `true`.

---

#### `Having` — string literal

**Firma**
```csharp
SqlQueryBuilder<T> Having(string rawHavingSql)
```

**Descripción**
Establece una cláusula HAVING literal. Se usa después de `GroupBy`.

**Ejemplo**
```csharp
builder.GroupBy(x => x.Department).Having("COUNT(*) > 5");
// → GROUP BY [Department] HAVING COUNT(*) > 5
```

---

#### `Having` — SqlHavingBuilder (instancia)

**Firma**
```csharp
SqlQueryBuilder<T> Having(SqlHavingBuilder<T> havingBuilder)
```

**Descripción**
Establece la cláusula HAVING a partir de un `SqlHavingBuilder<T>`. Puede combinarse con la sobrecarga de string literal — ambas se unen con AND.

---

#### `Having` — SqlHavingBuilder (inline)

**Firma**
```csharp
SqlQueryBuilder<T> Having(Action<SqlHavingBuilder<T>> configure)
```

**Descripción**
Configura la cláusula HAVING de forma inline.

**Ejemplo**
```csharp
builder.Having(h => h.CountGreaterThan(5).SumGreaterThan(x => x.Amount, 1000m));
```

---

#### `HavingIf` — sobrecarga builder

**Firma**
```csharp
SqlQueryBuilder<T> HavingIf(bool condition, Action<SqlHavingBuilder<T>> configure)
```

**Descripción**
Aplica una cláusula HAVING fluida solo cuando `condition` es `true`.

---

#### `HavingIf` — sobrecarga string literal

**Firma**
```csharp
SqlQueryBuilder<T> HavingIf(bool condition, string rawHavingSql)
```

**Descripción**
Aplica una cláusula HAVING literal solo cuando `condition` es `true`.

---

### ORDER BY

#### `OrderBy`

**Firma**
```csharp
SqlQueryBuilder<T> OrderBy(Expression<Func<T, object>> column, bool ascending = true)
```

**Descripción**
Agrega una columna ORDER BY principal.

**Ejemplo**
```csharp
builder.OrderBy(x => x.CreatedAt, ascending: false);
// → ORDER BY [CreatedAt] DESC
```

---

#### `OrderBy` — con NullsOrder

**Firma**
```csharp
SqlQueryBuilder<T> OrderBy(Expression<Func<T, object>> column, bool ascending, NullsOrder nulls)
```

**Descripción**
Agrega ORDER BY con `NULLS FIRST` / `NULLS LAST` opcional. El parámetro `nulls` se ignora silenciosamente en dialectos que no lo soportan (SQL Server, MySQL).

**Ejemplo**
```csharp
builder.OrderBy(x => x.DeletedAt, ascending: true, NullsOrder.Last);
// PostgreSQL → ORDER BY "DeletedAt" ASC NULLS LAST
// SQL Server → ORDER BY [DeletedAt] ASC  (cláusula nulls omitida)
```

---

#### `ThenBy`

**Firma**
```csharp
SqlQueryBuilder<T> ThenBy(Expression<Func<T, object>> column, bool ascending = true)
```

**Descripción**
Agrega una columna ORDER BY secundaria. Funcionalmente equivalente a una segunda llamada a `OrderBy`.

---

#### `OrderByIf`

**Firma**
```csharp
SqlQueryBuilder<T> OrderByIf(bool condition, Expression<Func<T, object>> column, bool ascending = true)
```

**Descripción**
Aplica ORDER BY solo cuando `condition` es `true`.

---

#### `OrderByRaw`

**Firma**
```csharp
SqlQueryBuilder<T> OrderByRaw(string rawSql)
```

**Descripción**
Agrega una expresión ORDER BY literal textualmente. Útil para expresiones de ordenamiento multi-tabla o calculadas.

**Ejemplo**
```csharp
builder.OrderByRaw("[Products].[Price] DESC, [Name] ASC");
```

---

### Paginación

#### `Take`

**Firma**
```csharp
SqlQueryBuilder<T> Take(int count)
```

**Descripción**
Limita el número de filas devueltas. Se mapea a `TOP N` (SQL Server sin OFFSET) o `LIMIT N`.

**Ejemplo**
```csharp
builder.From("Users").Take(10);
// SQL Server → SELECT TOP 10 * FROM [Users]
// PostgreSQL → SELECT * FROM "Users" LIMIT 10
```

---

#### `Skip`

**Firma**
```csharp
SqlQueryBuilder<T> Skip(int count)
```

**Descripción**
Omite el número de filas especificado. Se mapea a OFFSET en todos los dialectos.

**Ejemplo**
```csharp
builder.From("Users").OrderBy(x => x.Id).Skip(20).Take(10);
// SQL Server → SELECT * FROM [Users] ORDER BY [Id] ASC OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY
// PostgreSQL → SELECT * FROM "Users" ORDER BY "Id" ASC LIMIT 10 OFFSET 20
```

> **Nota:** SQL Server requiere una cláusula ORDER BY cuando se usa OFFSET.

---

#### `Page`

**Firma**
```csharp
SqlQueryBuilder<T> Page(int pageNumber, int pageSize)
```

**Descripción**
Establece paginación basada en número de página (base 1). `Page(2, 20)` equivale a `Skip(20).Take(20)`.

**Ejemplo**
```csharp
builder.From("Users").OrderBy(x => x.Id).Page(3, 25);
// SQL Server → OFFSET 50 ROWS FETCH NEXT 25 ROWS ONLY
```

---

### DISTINCT / WithHint

#### `Distinct`

**Firma**
```csharp
SqlQueryBuilder<T> Distinct()
```

**Descripción**
Agrega `DISTINCT` a la cláusula SELECT.

**Ejemplo**
```csharp
builder.From("Orders").Select(x => x.CustomerId).Distinct();
// → SELECT DISTINCT [CustomerId] FROM [Orders]
```

---

#### `WithHint`

**Firma**
```csharp
SqlQueryBuilder<T> WithHint(string hint)
```

**Descripción**
Agrega un table hint después del FROM. Principalmente usado con SQL Server para hints como `NOLOCK`.

**Ejemplo**
```csharp
builder.From("Users").WithHint("NOLOCK");
// SQL Server → FROM [Users] WITH (NOLOCK)
```

> **Nota:** Este método genera el hint para todos los dialectos. Úsalo únicamente con SQL Server — otros dialectos incluirán un fragmento `WITH (...)` inválido.

---

### Operaciones de Conjunto

#### `Union`

**Firma**
```csharp
SqlQueryBuilder<T> Union(SqlQueryResult other)
```

**Descripción**
Agrega un `UNION` (eliminando duplicados) con una consulta precompilada.

**Ejemplo**
```csharp
builder.From("ActiveUsers").Union(
    new SqlQueryBuilder<User>(dialect).From("InactiveUsers").Build());
// → SELECT * FROM [ActiveUsers] UNION SELECT * FROM [InactiveUsers]
```

---

#### `UnionAll`

**Firma**
```csharp
SqlQueryBuilder<T> UnionAll(SqlQueryResult other)
```

**Descripción**
Agrega un `UNION ALL` (incluyendo duplicados) con una consulta precompilada.

---

#### `Except`

**Firma**
```csharp
SqlQueryBuilder<T> Except(SqlQueryResult other)
```

**Descripción**
Agrega `EXCEPT` — retorna filas de la consulta principal que no están en la otra consulta.

---

#### `Intersect`

**Firma**
```csharp
SqlQueryBuilder<T> Intersect(SqlQueryResult other)
```

**Descripción**
Agrega `INTERSECT` — retorna solo las filas que aparecen en ambas consultas.

---

### CTEs

#### `WithCte` — SqlQueryResult

**Firma**
```csharp
SqlQueryBuilder<T> WithCte(string name, SqlQueryResult cteQuery)
```

**Descripción**
Antepone una Expresión de Tabla Común: `WITH nombre AS (cteQuery)`. Múltiples llamadas agregan múltiples CTEs.

**Ejemplo**
```csharp
var activosCte = new SqlQueryBuilder<User>(dialect)
    .From("Users")
    .Where(w => w.EqualTo(x => x.IsActive, true))
    .Build();

new SqlQueryBuilder<User>(dialect)
    .WithCte("UsuariosActivos", activosCte)
    .From("UsuariosActivos")
    .Build();
// → WITH "UsuariosActivos" AS (SELECT * FROM "Users" WHERE ...) SELECT * FROM "UsuariosActivos"
```

---

#### `WithCte` — inline

**Firma**
```csharp
SqlQueryBuilder<T> WithCte(string name, Action<SqlQueryBuilder<T>> configure)
```

**Descripción**
Antepone un CTE definido de forma inline. Crea un `SqlQueryBuilder<T>` anidado internamente.

---

#### `WithRecursive`

**Firma**
```csharp
SqlQueryBuilder<T> WithRecursive(string name, SqlQueryResult anchor, SqlQueryResult recursive)
```

**Descripción**
Agrega un CTE recursivo. Genera: `WITH [RECURSIVE] nombre AS (anchor UNION ALL recursive)`. La palabra clave `RECURSIVE` se agrega automáticamente para dialectos que la requieren (PostgreSQL, SQLite, MySQL).

**Ejemplo**
```csharp
var anchor = new SqlQueryBuilder<Category>(dialect).From("Categories").Where(x => x.ParentId == null).Build();
var rec    = new SqlQueryBuilder<Category>(dialect).From("Categories").WhereRaw("[Categories].[ParentId] = [arbol].[Id]").Build();

builder.WithRecursive("arbol", anchor, rec).From("arbol").Build();
// PostgreSQL → WITH RECURSIVE "arbol" AS (... UNION ALL ...) SELECT * FROM "arbol"
// SQL Server → WITH [arbol] AS (... UNION ALL ...) SELECT * FROM [arbol]
```

---

### Bloqueo de Filas

#### `ForUpdate`

**Firma**
```csharp
SqlQueryBuilder<T> ForUpdate()
```

**Descripción**
Agrega `FOR UPDATE` al final de la consulta para bloqueo exclusivo de filas. No hace nada en dialectos que no lo soportan (SQL Server — usa `WithHint("UPDLOCK")`; SQLite — ignorado silenciosamente).

---

#### `ForShare`

**Firma**
```csharp
SqlQueryBuilder<T> ForShare()
```

**Descripción**
Agrega `FOR SHARE` al final de la consulta para bloqueo compartido de filas. No hace nada en dialectos que no lo soportan.

---

### Tag / Build / ToPreviewSql

#### `Tag` — simple

**Firma**
```csharp
SqlQueryBuilder<T> Tag(string description)
```

**Descripción**
Etiqueta la consulta. Cuando se llama `Build()`, la descripción se antepone como un comentario SQL (`-- descripción`). Útil para rastreo en logs.

**Ejemplo**
```csharp
builder.From("Users").Tag("Obtener usuarios activos").Build();
// SQL: -- Obtener usuarios activos
//      SELECT * FROM [Users]
```

---

#### `Tag` — con logger

**Firma**
```csharp
SqlQueryBuilder<T> Tag(string description, Action<string>? logger)
```

**Descripción**
Igual que el anterior, pero también invoca `logger` con `"[SQL] {descripción}"` cuando se llama `Build()`. Si `logger` es `null`, el tag solo se incrusta como comentario SQL.

**Ejemplo**
```csharp
builder.Tag("Obtener usuarios activos", msg => Console.WriteLine(msg));
// Salida en consola: [SQL] Obtener usuarios activos
```

---

#### `ToPreviewSql`

**Firma**
```csharp
string ToPreviewSql()
```

**Descripción**
Devuelve una vista previa del SQL en medio de la cadena fluida sin finalizar el constructor. Útil en la ventana de observación del depurador. Devuelve un mensaje alternativo si el estado del constructor está incompleto.

---

#### `Build`

**Firma**
```csharp
SqlQueryResult Build()
```

**Descripción**
Ensambla y devuelve el `SqlQueryResult` final. Esta llamada es terminal — el constructor puede reutilizarse pero el resultado es inmutable.

---
---

## Ejemplos avanzados

### 1) JOIN + WHERE + ORDER

```csharp
var q = new SqlQueryBuilder<Order>()
    .SelectAll()
    .From("Orders o")
    .Join("Users u", "o.UserId = u.Id")
    .Where(o => o.Status == "Open")
    .OrderByDesc(o => o.CreatedAt)
    .Take(100);
```

### 2) GROUP BY + HAVING

```csharp
var q = new SqlQueryBuilder<Order>()
    .SelectCount()
    .SelectRaw("o.CustomerId")
    .From("Orders o")
    .GroupByRaw("o.CustomerId")
    .HavingRaw("COUNT(*) > 5");
```

### 3) CTE + Window

```csharp
var q = new SqlQueryBuilder<Order>()
    .WithCte("recent", "SELECT * FROM Orders WHERE CreatedAt > @p0")
    .SelectRaw("Id, ROW_NUMBER() OVER (ORDER BY CreatedAt DESC) AS rn")
    .From("recent");
```
