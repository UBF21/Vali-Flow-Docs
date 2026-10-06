---
title: Dialects
---

Cada constructor y método de extensión requiere una instancia de `ISqlDialect`. Selecciona el que corresponda a tu motor de base de datos.

| Característica | `SqlServerDialect` | `PostgreSqlDialect` | `MySqlDialect` | `SqliteDialect` | `OracleDialect` |
|---|---|---|---|---|---|
| **Prefijo de parámetro** | `@` | `@` | `@` | `@` | `:` |
| **Comillas de columna** | `[col]` | `"col"` | `` `col` `` | `"col"` | `"col"` |
| **Comillas de tabla** | `[tbl]` | `"tbl"` | `` `tbl` `` | `"tbl"` | `"tbl"` |
| **LIKE sin distinción de mayúsculas** | `LOWER([col]) LIKE LOWER(@p)` | `"col" ILIKE @p` | `` LOWER(`col`) LIKE LOWER(@p) `` | `LOWER("col") LIKE LOWER(@p)` | `LOWER("col") LIKE LOWER(:p)` |
| **TOP / LIMIT** | `TOP N` (sin OFFSET) / `OFFSET … ROWS FETCH NEXT N ROWS ONLY` | `LIMIT N OFFSET M` | `LIMIT N OFFSET M` | `LIMIT N OFFSET M` | `FETCH FIRST N ROWS ONLY` |
| **Soporte TRUNCATE** | Sí | Sí | Sí | No (lanza excepción) | Sí |
| **Soporte MERGE** | Sí | No | No | No | No |
| **OUTPUT INSERTED/DELETED** | Sí | No | No | No | No |
| **Cláusula RETURNING** | No | Sí | Sí (solo INSERT) | Sí | No |
| **ON CONFLICT** | No | Sí | No | Sí | No |
| **ON DUPLICATE KEY** | No | No | Sí | No | No |
| **INSERT OR IGNORE/REPLACE** | No | No | No | Sí | No |
| **FOR UPDATE / FOR SHARE** | No (usa `WithHint`) | Sí | Sí | No (ignorado silenciosamente) | Sí |
| **NULLS FIRST/LAST** | No (ignorado silenciosamente) | Sí | No | Sí | Sí |
| **Palabra clave CTE recursiva** | *(omitida)* | `RECURSIVE` | `RECURSIVE` | `RECURSIVE` | *(omitida)* |
| **UPDATE … FROM/JOIN** | Sí (FROM después de SET) | Sí (FROM después de SET) | Sí (JOIN antes de SET) | No | No |
| **IS DISTINCT FROM** | Emulado | Nativo | Emulado | Nativo | Emulado |
| **Extracción de parte de fecha** | `DATEPART(part, col)` | `EXTRACT(part FROM col)` | `EXTRACT(part FROM col)` | `strftime('%Y', col)` | `EXTRACT(part FROM col)` |
| **Timestamp actual** | `GETDATE()` | `NOW()` | `NOW()` | `CURRENT_TIMESTAMP` | `SYSDATE` |
| **Longitud de cadena** | `LEN(col)` | `LENGTH(col)` | `LENGTH(col)` | `LENGTH(col)` | `LENGTH(col)` |
| **Concatenación de cadenas** | `a + b` | `a \|\| b` | `CONCAT(a, b)` | `a \|\| b` | `a \|\| b` |
| **Recorte de espacios** | `LTRIM(RTRIM(col))` | `TRIM(col)` | `TRIM(col)` | `TRIM(col)` | `TRIM(col)` |

**Uso**

```csharp
ISqlDialect dialect = new SqlServerDialect();
ISqlDialect dialect = new PostgreSqlDialect();
ISqlDialect dialect = new MySqlDialect();
ISqlDialect dialect = new SqliteDialect();
ISqlDialect dialect = new OracleDialect();
```

---
