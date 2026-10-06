---
title: SqlQueryBuilder
---

`SqlQueryBuilder<T>` is the main entry point for building complete SELECT queries. It is a sealed generic class — `T` is the entity type whose properties are available as typed columns.

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

## Reference

### SELECT

#### `Select` — multiple columns

**Signature**
```csharp
SqlQueryBuilder<T> Select(params Expression<Func<T, object>>[] columns)
```

**Description**
Adds one or more typed columns to the SELECT list. If never called, the query defaults to `SELECT *`.

**Example**
```csharp
builder.Select(x => x.Id, x => x.Name);
// → SELECT [Id], [Name] FROM ...
```

---

#### `Select` — single column with alias

**Signature**
```csharp
SqlQueryBuilder<T> Select(Expression<Func<T, object>> column, string? alias)
```

**Description**
Adds a single typed column, optionally aliased.

**Example**
```csharp
builder.Select(x => x.Name, "UserName");
// → SELECT [Name] AS [UserName] FROM ...
```

---

#### `SelectAll`

**Signature**
```csharp
SqlQueryBuilder<T> SelectAll()
```

**Description**
Resets the column list to `SELECT *`, clearing any previously added columns.

---

#### `SelectRaw`

**Signature**
```csharp
SqlQueryBuilder<T> SelectRaw(string rawSql)
```

**Description**
Appends a raw SQL fragment to the SELECT list. Use for expressions that cannot be expressed through typed columns.

**Example**
```csharp
builder.SelectRaw("GETDATE() AS [Now]");
// → SELECT GETDATE() AS [Now] FROM ...
```

---

#### `SelectRawIf`

**Signature**
```csharp
SqlQueryBuilder<T> SelectRawIf(bool condition, string rawSql)
```

**Description**
Adds a raw SELECT expression only when `condition` is `true`.

---

#### `SelectIf`

**Signature**
```csharp
SqlQueryBuilder<T> SelectIf(bool condition, Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds a typed column only when `condition` is `true`.

---

#### `SelectCount` — star

**Signature**
```csharp
SqlQueryBuilder<T> SelectCount(string? alias = null)
```

**Description**
Adds `COUNT(*)` to the SELECT list.

**Example**
```csharp
builder.SelectCount("total");
// → SELECT COUNT(*) AS [total] FROM ...
```

---

#### `SelectCount` — column

**Signature**
```csharp
SqlQueryBuilder<T> SelectCount(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `COUNT([col])` to the SELECT list.

---

#### `SelectCountDistinct`

**Signature**
```csharp
SqlQueryBuilder<T> SelectCountDistinct(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `COUNT(DISTINCT [col])` to the SELECT list.

---

#### `SelectSum`

**Signature**
```csharp
SqlQueryBuilder<T> SelectSum(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `SUM([col])` to the SELECT list.

---

#### `SelectAvg`

**Signature**
```csharp
SqlQueryBuilder<T> SelectAvg(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `AVG([col])` to the SELECT list.

---

#### `SelectMin`

**Signature**
```csharp
SqlQueryBuilder<T> SelectMin(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `MIN([col])` to the SELECT list.

---

#### `SelectMax`

**Signature**
```csharp
SqlQueryBuilder<T> SelectMax(Expression<Func<T, object>> column, string? alias = null)
```

**Description**
Adds `MAX([col])` to the SELECT list.

---

#### `SelectCase`

**Signature**
```csharp
SqlQueryBuilder<T> SelectCase(CaseWhenBuilder caseWhen)
```

**Description**
Adds a `CASE WHEN ... THEN ... ELSE ... END` expression to the SELECT list, built via `CaseWhenBuilder`.

**Example**
```csharp
var caseExpr = new CaseWhenBuilder()
    .When("[Status] = 1", "Active")
    .When("[Status] = 2", "Inactive")
    .Else("Unknown")
    .As("StatusLabel");

builder.SelectCase(caseExpr);
// → SELECT CASE WHEN [Status] = 1 THEN 'Active' WHEN [Status] = 2 THEN 'Inactive' ELSE 'Unknown' END AS [StatusLabel]
```

---

#### `SelectCoalesce`

**Signature**
```csharp
SqlQueryBuilder<T> SelectCoalesce(
    Expression<Func<T, object>> column, string fallbackSql, string alias)
```

**Description**
Adds `COALESCE([col], fallbackSql) AS [alias]` to the SELECT list.

**Example**
```csharp
builder.SelectCoalesce(x => x.Department, "'N/A'", "Dept");
// → SELECT COALESCE([Department], 'N/A') AS [Dept] FROM ...
```

---

#### `SelectCast`

**Signature**
```csharp
SqlQueryBuilder<T> SelectCast(
    Expression<Func<T, object>> column, string typeName, string alias)
```

**Description**
Adds `CAST([col] AS typeName) AS [alias]` to the SELECT list.

**Example**
```csharp
builder.SelectCast(x => x.Age, "FLOAT", "AgeFloat");
// → SELECT CAST([Age] AS FLOAT) AS [AgeFloat] FROM ...
```

---

#### `SelectConcat`

**Signature**
```csharp
SqlQueryBuilder<T> SelectConcat(string alias, params Expression<Func<T, object>>[] columns)
```

**Description**
Adds a dialect-aware string concatenation expression. The operator differs per dialect:
- SQL Server: `[col1] + [col2]`
- PostgreSQL / SQLite: `"col1" || "col2"`
- MySQL: `` CONCAT(`col1`, `col2`) ``

**Example**
```csharp
builder.SelectConcat("FullName", x => x.FirstName, x => x.LastName);
// SQL Server → SELECT [FirstName] + [LastName] AS [FullName]
// PostgreSQL → SELECT "FirstName" || "LastName" AS "FullName"
```

---

### Window Functions

#### `SelectRowNumber`

**Signature**
```csharp
SqlQueryBuilder<T> SelectRowNumber(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "RowNum")

// Multi-partition overload
SqlQueryBuilder<T> SelectRowNumber(
    IReadOnlyList<Expression<Func<T, object>>> partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "RowNum")
```

**Description**
Adds `ROW_NUMBER() OVER (PARTITION BY [col] ORDER BY [col] ASC|DESC) AS [alias]`. Pass `null` as `partitionBy` to omit the PARTITION BY clause.

**Example**
```csharp
builder.SelectRowNumber(x => x.Department, x => x.Salary, ascending: false, alias: "SalaryRank");
// → SELECT ROW_NUMBER() OVER (PARTITION BY [Department] ORDER BY [Salary] DESC) AS [SalaryRank]
```

---

#### `SelectRank`

**Signature**
```csharp
SqlQueryBuilder<T> SelectRank(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "Rank")
```

**Description**
Adds `RANK() OVER (...)`. Same gap behavior as standard SQL RANK.

---

#### `SelectDenseRank`

**Signature**
```csharp
SqlQueryBuilder<T> SelectDenseRank(
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = "DenseRank")
```

**Description**
Adds `DENSE_RANK() OVER (...)`. No gaps in ranking values.

---

#### `SelectLag`

**Signature**
```csharp
SqlQueryBuilder<T> SelectLag(
    Expression<Func<T, object>> column,
    int offset,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `LAG([col], offset) OVER ([PARTITION BY ...] ORDER BY ...)`. Retrieves the value from a previous row within the partition.

**Example**
```csharp
builder.SelectLag(x => x.Price, 1, null, x => x.CreatedAt, alias: "PrevPrice");
// → SELECT LAG([Price], 1) OVER (ORDER BY [CreatedAt] ASC) AS [PrevPrice]
```

---

#### `SelectLead`

**Signature**
```csharp
SqlQueryBuilder<T> SelectLead(
    Expression<Func<T, object>> column,
    int offset,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `LEAD([col], offset) OVER (...)`. Retrieves the value from a subsequent row within the partition.

---

#### `SelectFirstValue`

**Signature**
```csharp
SqlQueryBuilder<T> SelectFirstValue(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `FIRST_VALUE([col]) OVER (...)`. Retrieves the first value in the ordered window frame.

---

#### `SelectLastValue`

**Signature**
```csharp
SqlQueryBuilder<T> SelectLastValue(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>> orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `LAST_VALUE([col]) OVER (...)`. Retrieves the last value in the ordered window frame.

---

#### `SelectSumOver`

**Signature**
```csharp
SqlQueryBuilder<T> SelectSumOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `SUM([col]) OVER ([PARTITION BY ...] [ORDER BY ...])`. Useful for running totals. The alias defaults to `Running{ColumnName}`.

**Example**
```csharp
builder.SelectSumOver(x => x.Amount, x => x.CustomerId, x => x.CreatedAt, alias: "RunningTotal");
// → SELECT SUM([Amount]) OVER (PARTITION BY [CustomerId] ORDER BY [CreatedAt] ASC) AS [RunningTotal]
```

---

#### `SelectAvgOver`

**Signature**
```csharp
SqlQueryBuilder<T> SelectAvgOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `AVG([col]) OVER (...)`.

---

#### `SelectCountOver`

**Signature**
```csharp
SqlQueryBuilder<T> SelectCountOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `COUNT([col]) OVER (...)`.

---

#### `SelectMinOver`

**Signature**
```csharp
SqlQueryBuilder<T> SelectMinOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `MIN([col]) OVER (...)`.

---

#### `SelectMaxOver`

**Signature**
```csharp
SqlQueryBuilder<T> SelectMaxOver(
    Expression<Func<T, object>> column,
    Expression<Func<T, object>>? partitionBy,
    Expression<Func<T, object>>? orderBy,
    bool ascending = true,
    string? alias = null)
```

**Description**
Adds `MAX([col]) OVER (...)`.

---

#### `SelectWindowRaw`

**Signature**
```csharp
SqlQueryBuilder<T> SelectWindowRaw(string windowExpression, string alias)
```

**Description**
Adds a raw window function expression to SELECT. Use when the typed overloads don't cover your case.

**Example**
```csharp
builder.SelectWindowRaw("NTILE(4) OVER (ORDER BY [Score] DESC)", "Quartile");
// → SELECT NTILE(4) OVER (ORDER BY [Score] DESC) AS [Quartile]
```

---

### FROM

#### `From` — table name

**Signature**
```csharp
SqlQueryBuilder<T> From(string tableName, string? schema = null)
```

**Description**
Sets the FROM table. If not called, defaults to `typeof(T).Name`. Schema is optional.

**Example**
```csharp
builder.From("Users", schema: "dbo");
// SQL Server → FROM [dbo].[Users]
// PostgreSQL → FROM "dbo"."Users"
```

---

#### `From` — subquery

**Signature**
```csharp
SqlQueryBuilder<T> From(SqlQueryResult subquery, string alias)
```

**Description**
Uses a prebuilt `SqlQueryResult` as the FROM source: `FROM (subquery) alias`.

**Example**
```csharp
var inner = new SqlQueryBuilder<User>(dialect)
    .From("Users")
    .Where(x => x.IsActive)
    .Build();

new SqlQueryBuilder<User>(dialect)
    .From(inner, "active")
    .Select(x => x.Name)
    .Build();
// → SELECT "Name" FROM (SELECT * FROM "Users" WHERE "IsActive" = true) active
```

---

### JOINs

All join methods accept a table name (quoted by the dialect), an optional alias, and a raw ON condition string.

#### `InnerJoin`

**Signature**
```csharp
SqlQueryBuilder<T> InnerJoin(string table, string? alias, string on)
```

**Example**
```csharp
builder.From("Users").InnerJoin("Orders", "o", "[Users].[Id] = [o].[UserId]");
// → FROM [Users] INNER JOIN [Orders] o ON [Users].[Id] = [o].[UserId]
```

---

#### `LeftJoin`

**Signature**
```csharp
SqlQueryBuilder<T> LeftJoin(string table, string? alias, string on)
```

**Description**
Adds a `LEFT JOIN` clause.

---

#### `RightJoin`

**Signature**
```csharp
SqlQueryBuilder<T> RightJoin(string table, string? alias, string on)
```

**Description**
Adds a `RIGHT JOIN` clause.

---

#### `FullOuterJoin`

**Signature**
```csharp
SqlQueryBuilder<T> FullOuterJoin(string table, string? alias, string on)
```

**Description**
Adds a `FULL OUTER JOIN` clause.

---

#### `CrossJoin`

**Signature**
```csharp
SqlQueryBuilder<T> CrossJoin(string table, string? alias = null)
```

**Description**
Adds a `CROSS JOIN` clause. No ON condition is required.

---

#### `InnerJoinSubquery`

**Signature**
```csharp
SqlQueryBuilder<T> InnerJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Description**
Adds an `INNER JOIN` against a derived table (subquery). Parameters from the subquery are automatically remapped to avoid collisions.

**Example**
```csharp
var sub = new SqlQueryBuilder<Order>(dialect)
    .From("Orders")
    .Select(x => x.UserId)
    .SelectSum(x => x.Total, "TotalSpent")
    .GroupBy(x => x.UserId)
    .Build();

builder.From("Users").InnerJoinSubquery(sub, "totals", "[Users].[Id] = [totals].[UserId]");
// → FROM [Users] INNER JOIN (SELECT [UserId], SUM([Total]) AS [TotalSpent] FROM [Orders] GROUP BY [UserId]) [totals] ON [Users].[Id] = [totals].[UserId]
```

---

#### `LeftJoinSubquery`

**Signature**
```csharp
SqlQueryBuilder<T> LeftJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Description**
Adds a `LEFT JOIN` against a derived table (subquery).

---

#### `RightJoinSubquery`

**Signature**
```csharp
SqlQueryBuilder<T> RightJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Description**
Adds a `RIGHT JOIN` against a derived table (subquery).

---

#### `FullOuterJoinSubquery`

**Signature**
```csharp
SqlQueryBuilder<T> FullOuterJoinSubquery(SqlQueryResult subquery, string alias, string on)
```

**Description**
Adds a `FULL OUTER JOIN` against a derived table (subquery).

---

### WHERE

Multiple WHERE calls are ANDed together. The `ValiFlow<T>` / `Expression` overload and the `SqlWhereBuilder` overload use different parameter name prefixes (`p` vs `pw`) and can coexist safely.

#### `Where` — ValiFlow

**Signature**
```csharp
SqlQueryBuilder<T> Where(ValiFlow<T> filter)
```

**Description**
Sets the WHERE clause from a `ValiFlow<T>` filter. Parameters use the `p` prefix.

**Example**
```csharp
var filter = new ValiFlow<User>().EqualTo(x => x.IsActive, true).GreaterThan(x => x.Age, 18);
builder.From("Users").Where(filter);
// → WHERE [IsActive] = @p0 AND [Age] > @p1
```

---

#### `Where` — Expression

**Signature**
```csharp
SqlQueryBuilder<T> Where(Expression<Func<T, bool>> predicate)
```

**Description**
Sets the WHERE clause from a lambda expression. Parameters use the `p` prefix.

> **Note:** Calling both `Where(ValiFlow<T>)` and `Where(Expression<...>)` is not supported — the second call overwrites the first. Use only one typed predicate; combine with `Where(SqlWhereBuilder)` for composite conditions.

---

#### `Where` — SqlWhereBuilder (instance)

**Signature**
```csharp
SqlQueryBuilder<T> Where(SqlWhereBuilder<T> whereBuilder)
```

**Description**
Sets the WHERE clause from a pre-configured `SqlWhereBuilder<T>`. Parameters use the `pw` prefix. Can be combined with the typed predicate overload.

---

#### `Where` — SqlWhereBuilder (inline)

**Signature**
```csharp
SqlQueryBuilder<T> Where(Action<SqlWhereBuilder<T>> configure)
```

**Description**
Configures the WHERE clause inline using a `SqlWhereBuilder<T>` action.

**Example**
```csharp
builder.Where(w => w.EqualTo(x => x.IsActive, true).GreaterThan(x => x.Age, 18));
// → WHERE [IsActive] = @pw0 AND [Age] > @pw1
```

---

#### `WhereRaw`

**Signature**
```csharp
SqlQueryBuilder<T> WhereRaw(string rawSql)
```

**Description**
Appends a raw SQL fragment to the WHERE clause (ANDed with other conditions). Parameters in the raw fragment are the caller's responsibility.

**Example**
```csharp
builder.WhereRaw("[CreatedAt] > DATEADD(day, -30, GETDATE())");
// → WHERE [CreatedAt] > DATEADD(day, -30, GETDATE())
```

---

#### `WhereExists`

**Signature**
```csharp
SqlQueryBuilder<T> WhereExists(SqlQueryResult subquery)
```

**Description**
Appends `EXISTS (subquery)` to the WHERE clause. Subquery parameters are automatically merged and renamed.

**Example**
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

**Signature**
```csharp
SqlQueryBuilder<T> WhereNotExists(SqlQueryResult subquery)
```

**Description**
Appends `NOT EXISTS (subquery)` to the WHERE clause.

---

#### `WhereInSubquery`

**Signature**
```csharp
SqlQueryBuilder<T> WhereInSubquery<TValue>(Expression<Func<T, TValue>> column, SqlQueryResult subquery)
```

**Description**
Appends `[col] IN (subquery)` to the WHERE clause. Subquery parameters are automatically remapped.

**Example**
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

**Signature**
```csharp
SqlQueryBuilder<T> WhereNotInSubquery<TValue>(Expression<Func<T, TValue>> column, SqlQueryResult subquery)
```

**Description**
Appends `[col] NOT IN (subquery)` to the WHERE clause.

---

#### `WhereIf` — builder overload

**Signature**
```csharp
SqlQueryBuilder<T> WhereIf(bool condition, Action<SqlWhereBuilder<T>> configure)
```

**Description**
Applies a `SqlWhereBuilder` WHERE clause only when `condition` is `true`.

---

#### `WhereIf` — expression overload

**Signature**
```csharp
SqlQueryBuilder<T> WhereIf(bool condition, Expression<Func<T, bool>> predicate)
```

**Description**
Applies a lambda WHERE predicate only when `condition` is `true`.

---

### GROUP BY / HAVING

#### `GroupBy`

**Signature**
```csharp
SqlQueryBuilder<T> GroupBy(params Expression<Func<T, object>>[] columns)
```

**Description**
Adds GROUP BY columns.

**Example**
```csharp
builder.GroupBy(x => x.Department, x => x.Status);
// → GROUP BY [Department], [Status]
```

---

#### `GroupByRaw`

**Signature**
```csharp
SqlQueryBuilder<T> GroupByRaw(string rawSql)
```

**Description**
Adds a raw SQL fragment to the GROUP BY clause. Useful for multi-table queries where table-qualified column names are needed.

**Example**
```csharp
builder.GroupByRaw("[Products].[Id], [Products].[Name]");
```

---

#### `GroupByIf`

**Signature**
```csharp
SqlQueryBuilder<T> GroupByIf(bool condition, Expression<Func<T, object>> column)
```

**Description**
Adds a GROUP BY column only when `condition` is `true`.

---

#### `Having` — raw string

**Signature**
```csharp
SqlQueryBuilder<T> Having(string rawHavingSql)
```

**Description**
Sets a raw HAVING clause. Used after `GroupBy`.

**Example**
```csharp
builder.GroupBy(x => x.Department).Having("COUNT(*) > 5");
// → GROUP BY [Department] HAVING COUNT(*) > 5
```

---

#### `Having` — SqlHavingBuilder (instance)

**Signature**
```csharp
SqlQueryBuilder<T> Having(SqlHavingBuilder<T> havingBuilder)
```

**Description**
Sets the HAVING clause from a `SqlHavingBuilder<T>`. Can be combined with a raw HAVING string — both are ANDed.

---

#### `Having` — SqlHavingBuilder (inline)

**Signature**
```csharp
SqlQueryBuilder<T> Having(Action<SqlHavingBuilder<T>> configure)
```

**Description**
Configures the HAVING clause inline.

**Example**
```csharp
builder.Having(h => h.CountGreaterThan(5).SumGreaterThan(x => x.Amount, 1000m));
```

---

#### `HavingIf` — builder overload

**Signature**
```csharp
SqlQueryBuilder<T> HavingIf(bool condition, Action<SqlHavingBuilder<T>> configure)
```

**Description**
Applies a fluent HAVING clause only when `condition` is `true`.

---

#### `HavingIf` — raw string overload

**Signature**
```csharp
SqlQueryBuilder<T> HavingIf(bool condition, string rawHavingSql)
```

**Description**
Applies a raw HAVING clause only when `condition` is `true`.

---

### ORDER BY

#### `OrderBy`

**Signature**
```csharp
SqlQueryBuilder<T> OrderBy(Expression<Func<T, object>> column, bool ascending = true)
```

**Description**
Adds a primary ORDER BY column.

**Example**
```csharp
builder.OrderBy(x => x.CreatedAt, ascending: false);
// → ORDER BY [CreatedAt] DESC
```

---

#### `OrderBy` — with NullsOrder

**Signature**
```csharp
SqlQueryBuilder<T> OrderBy(Expression<Func<T, object>> column, bool ascending, NullsOrder nulls)
```

**Description**
Adds ORDER BY with optional `NULLS FIRST` / `NULLS LAST`. The `nulls` parameter is silently ignored on dialects that don't support it (SQL Server, MySQL).

**Example**
```csharp
builder.OrderBy(x => x.DeletedAt, ascending: true, NullsOrder.Last);
// PostgreSQL → ORDER BY "DeletedAt" ASC NULLS LAST
// SQL Server → ORDER BY [DeletedAt] ASC  (nulls clause omitted)
```

---

#### `ThenBy`

**Signature**
```csharp
SqlQueryBuilder<T> ThenBy(Expression<Func<T, object>> column, bool ascending = true)
```

**Description**
Adds a secondary ORDER BY column. Functionally equivalent to a second `OrderBy` call.

---

#### `OrderByIf`

**Signature**
```csharp
SqlQueryBuilder<T> OrderByIf(bool condition, Expression<Func<T, object>> column, bool ascending = true)
```

**Description**
Applies ORDER BY only when `condition` is `true`.

---

#### `OrderByRaw`

**Signature**
```csharp
SqlQueryBuilder<T> OrderByRaw(string rawSql)
```

**Description**
Appends a raw ORDER BY expression verbatim. Useful for multi-table or computed sort expressions.

**Example**
```csharp
builder.OrderByRaw("[Products].[Price] DESC, [Name] ASC");
```

---

### Pagination

#### `Take`

**Signature**
```csharp
SqlQueryBuilder<T> Take(int count)
```

**Description**
Limits the number of rows returned. Maps to `TOP N` (SQL Server without OFFSET) or `LIMIT N`.

**Example**
```csharp
builder.From("Users").Take(10);
// SQL Server → SELECT TOP 10 * FROM [Users]
// PostgreSQL → SELECT * FROM "Users" LIMIT 10
```

---

#### `Skip`

**Signature**
```csharp
SqlQueryBuilder<T> Skip(int count)
```

**Description**
Skips the specified number of rows. Maps to OFFSET in all dialects.

**Example**
```csharp
builder.From("Users").OrderBy(x => x.Id).Skip(20).Take(10);
// SQL Server → SELECT * FROM [Users] ORDER BY [Id] ASC OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY
// PostgreSQL → SELECT * FROM "Users" ORDER BY "Id" ASC LIMIT 10 OFFSET 20
```

> **Note:** SQL Server requires an ORDER BY clause when using OFFSET.

---

#### `Page`

**Signature**
```csharp
SqlQueryBuilder<T> Page(int pageNumber, int pageSize)
```

**Description**
Sets 1-based page pagination. `Page(2, 20)` is equivalent to `Skip(20).Take(20)`.

**Example**
```csharp
builder.From("Users").OrderBy(x => x.Id).Page(3, 25);
// SQL Server → OFFSET 50 ROWS FETCH NEXT 25 ROWS ONLY
```

---

### DISTINCT / WithHint

#### `Distinct`

**Signature**
```csharp
SqlQueryBuilder<T> Distinct()
```

**Description**
Adds `DISTINCT` to the SELECT clause.

**Example**
```csharp
builder.From("Orders").Select(x => x.CustomerId).Distinct();
// → SELECT DISTINCT [CustomerId] FROM [Orders]
```

---

#### `WithHint`

**Signature**
```csharp
SqlQueryBuilder<T> WithHint(string hint)
```

**Description**
Appends a table hint after FROM. Primarily used with SQL Server for hints like `NOLOCK`.

**Example**
```csharp
builder.From("Users").WithHint("NOLOCK");
// SQL Server → FROM [Users] WITH (NOLOCK)
```

> **Note:** This generates the hint for all dialects. Use only with SQL Server — other dialects will include an invalid `WITH (...)` fragment.

---

### Set Operations

#### `Union`

**Signature**
```csharp
SqlQueryBuilder<T> Union(SqlQueryResult other)
```

**Description**
Appends a `UNION` (deduplicating) with a prebuilt query.

**Example**
```csharp
var active = new SqlQueryBuilder<User>(dialect).From("ActiveUsers").Build();
var inactive = new SqlQueryBuilder<User>(dialect).From("InactiveUsers").Build();
active.Union(inactive);  // not fluent — use on the builder before Build()

// Fluent:
builder.From("ActiveUsers").Union(
    new SqlQueryBuilder<User>(dialect).From("InactiveUsers").Build());
// → SELECT * FROM [ActiveUsers] UNION SELECT * FROM [InactiveUsers]
```

---

#### `UnionAll`

**Signature**
```csharp
SqlQueryBuilder<T> UnionAll(SqlQueryResult other)
```

**Description**
Appends a `UNION ALL` (including duplicates) with a prebuilt query.

---

#### `Except`

**Signature**
```csharp
SqlQueryBuilder<T> Except(SqlQueryResult other)
```

**Description**
Appends `EXCEPT` — returns rows in the main query that are not in the other query.

---

#### `Intersect`

**Signature**
```csharp
SqlQueryBuilder<T> Intersect(SqlQueryResult other)
```

**Description**
Appends `INTERSECT` — returns only rows that appear in both queries.

---

### CTEs

#### `WithCte` — SqlQueryResult

**Signature**
```csharp
SqlQueryBuilder<T> WithCte(string name, SqlQueryResult cteQuery)
```

**Description**
Prepends a Common Table Expression: `WITH name AS (cteQuery)`. Multiple calls add multiple CTEs.

**Example**
```csharp
var activeCte = new SqlQueryBuilder<User>(dialect)
    .From("Users")
    .Where(w => w.EqualTo(x => x.IsActive, true))
    .Build();

new SqlQueryBuilder<User>(dialect)
    .WithCte("ActiveUsers", activeCte)
    .From("ActiveUsers")
    .Build();
// → WITH "ActiveUsers" AS (SELECT * FROM "Users" WHERE ...) SELECT * FROM "ActiveUsers"
```

---

#### `WithCte` — inline

**Signature**
```csharp
SqlQueryBuilder<T> WithCte(string name, Action<SqlQueryBuilder<T>> configure)
```

**Description**
Prepends a CTE defined inline. Creates a nested `SqlQueryBuilder<T>` internally.

---

#### `WithRecursive`

**Signature**
```csharp
SqlQueryBuilder<T> WithRecursive(string name, SqlQueryResult anchor, SqlQueryResult recursive)
```

**Description**
Adds a recursive CTE. Generates: `WITH [RECURSIVE] name AS (anchor UNION ALL recursive)`. The `RECURSIVE` keyword is added automatically for dialects that require it (PostgreSQL, SQLite, MySQL).

**Example**
```csharp
var anchor = new SqlQueryBuilder<Category>(dialect).From("Categories").Where(x => x.ParentId == null).Build();
var rec    = new SqlQueryBuilder<Category>(dialect).From("Categories").WhereRaw("[Categories].[ParentId] = [tree].[Id]").Build();

builder.WithRecursive("tree", anchor, rec).From("tree").Build();
// PostgreSQL → WITH RECURSIVE "tree" AS (... UNION ALL ...) SELECT * FROM "tree"
// SQL Server → WITH [tree] AS (... UNION ALL ...) SELECT * FROM [tree]
```

---

### Row Locking

#### `ForUpdate`

**Signature**
```csharp
SqlQueryBuilder<T> ForUpdate()
```

**Description**
Appends `FOR UPDATE` at the end of the query for exclusive row locking. No-op on dialects that don't support row locking (SQL Server — use `WithHint("UPDLOCK")` instead; SQLite — silently ignored).

---

#### `ForShare`

**Signature**
```csharp
SqlQueryBuilder<T> ForShare()
```

**Description**
Appends `FOR SHARE` at the end of the query for shared row locking. No-op on dialects that don't support it.

---

### Tag / Build / ToPreviewSql

#### `Tag` — simple

**Signature**
```csharp
SqlQueryBuilder<T> Tag(string description)
```

**Description**
Labels the query. When `Build()` is called, the description is prepended as a SQL comment (`-- description`). Useful for log tracing.

**Example**
```csharp
builder.From("Users").Tag("Get active users").Build();
// SQL: -- Get active users
//      SELECT * FROM [Users]
```

---

#### `Tag` — with logger

**Signature**
```csharp
SqlQueryBuilder<T> Tag(string description, Action<string>? logger)
```

**Description**
Same as above, but also invokes `logger` with `"[SQL] {description}"` when `Build()` is called. If `logger` is `null`, the tag is embedded only as a SQL comment.

**Example**
```csharp
builder.Tag("Get active users", msg => Console.WriteLine(msg));
// Console output: [SQL] Get active users
```

---

#### `ToPreviewSql`

**Signature**
```csharp
string ToPreviewSql()
```

**Description**
Returns a preview of the SQL mid-chain without finalizing the builder. Useful in a debugger watch window. Returns a fallback message if the builder state is incomplete.

---

#### `Build`

**Signature**
```csharp
SqlQueryResult Build()
```

**Description**
Assembles and returns the final `SqlQueryResult`. This call is terminal — the builder can be reused but the result is immutable.

---

## Advanced Examples

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
