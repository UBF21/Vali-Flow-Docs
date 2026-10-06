---
title: Extension Methods
---
---

## Ejemplos avanzados

### 1) Count con nombre de tabla

```csharp
var countResult = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .ToSqlCount(new SqlServerDialect(), tableName: "Users");
```

### 2) Overload con Expression

```csharp
Expression<Func<Order, bool>> expr = o => o.Total > 100m && o.Status == "Open";
var sql = expr.ToSql(new PostgreSqlDialect());
```
