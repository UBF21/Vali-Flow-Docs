---
title: Dialects
---

Every builder and extension method requires an `ISqlDialect` instance. Choose the one matching your database engine.

| Feature | `SqlServerDialect` | `PostgreSqlDialect` | `MySqlDialect` | `SqliteDialect` | `OracleDialect` |
|---|---|---|---|---|---|
| **Parameter prefix** | `@` | `@` | `@` | `@` | `:` |
| **Column quoting** | `[col]` | `"col"` | `` `col` `` | `"col"` | `"col"` |
| **Table quoting** | `[tbl]` | `"tbl"` | `` `tbl` `` | `"tbl"` | `"tbl"` |
| **Case-insensitive LIKE** | `LOWER([col]) LIKE LOWER(@p)` | `"col" ILIKE @p` | `` LOWER(`col`) LIKE LOWER(@p) `` | `LOWER("col") LIKE LOWER(@p)` | `LOWER("col") LIKE LOWER(:p)` |
| **TOP / LIMIT** | `TOP N` (no OFFSET) / `OFFSET … ROWS FETCH NEXT N ROWS ONLY` | `LIMIT N OFFSET M` | `LIMIT N OFFSET M` | `LIMIT N OFFSET M` | `FETCH FIRST N ROWS ONLY` |
| **TRUNCATE support** | Yes | Yes | Yes | No (throws) | Yes |
| **MERGE support** | Yes | No | No | No | No |
| **OUTPUT INSERTED/DELETED** | Yes | No | No | No | No |
| **RETURNING clause** | No | Yes | Yes (INSERT only) | Yes | No |
| **ON CONFLICT** | No | Yes | No | Yes | No |
| **ON DUPLICATE KEY** | No | No | Yes | No | No |
| **INSERT OR IGNORE/REPLACE** | No | No | No | Yes | No |
| **FOR UPDATE / FOR SHARE** | No (use `WithHint`) | Yes | Yes | No (silently ignored) | Yes |
| **NULLS FIRST/LAST** | No (silently ignored) | Yes | No | Yes | Yes |
| **Recursive CTE keyword** | *(omitted)* | `RECURSIVE` | `RECURSIVE` | `RECURSIVE` | *(omitted)* |
| **UPDATE … FROM/JOIN** | Yes (FROM after SET) | Yes (FROM after SET) | Yes (JOIN before SET) | No | No |
| **IS DISTINCT FROM** | Emulated | Native | Emulated | Native | Emulated |
| **Date part extraction** | `DATEPART(part, col)` | `EXTRACT(part FROM col)` | `EXTRACT(part FROM col)` | `strftime('%Y', col)` | `EXTRACT(part FROM col)` |
| **Current timestamp** | `GETDATE()` | `NOW()` | `NOW()` | `CURRENT_TIMESTAMP` | `SYSDATE` |
| **String length** | `LEN(col)` | `LENGTH(col)` | `LENGTH(col)` | `LENGTH(col)` | `LENGTH(col)` |
| **String concatenation** | `a + b` | `a \|\| b` | `CONCAT(a, b)` | `a \|\| b` | `a \|\| b` |
| **Trim** | `LTRIM(RTRIM(col))` | `TRIM(col)` | `TRIM(col)` | `TRIM(col)` | `TRIM(col)` |

**Usage**

```csharp
ISqlDialect dialect = new SqlServerDialect();
ISqlDialect dialect = new PostgreSqlDialect();
ISqlDialect dialect = new MySqlDialect();
ISqlDialect dialect = new SqliteDialect();
ISqlDialect dialect = new OracleDialect();
```

---
