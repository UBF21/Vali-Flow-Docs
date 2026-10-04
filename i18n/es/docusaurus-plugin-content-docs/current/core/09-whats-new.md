---
sidebar_position: 9
---

# Novedades

## v2.0.3

### Corregido
- **`IsLastDayOfMonth()`** en `DateTimeExpressionQuery`, `DateTimeOffsetExpressionQuery`
  y `DateOnlyExpressionQuery` construía `DateTime.DaysInMonth(...)`, que
  ningún proveedor relacional de EF Core (SQL Server, PostgreSQL, SQLite,
  MySQL) puede traducir a SQL — cualquier llamada dentro de `IQueryable`
  lanzaba `InvalidOperationException`. Reemplazado por una fórmula
  agnóstica de proveedor basada en `Year`/`Month`/`Day` enteros, traducible
  en cualquier proveedor relacional. Verificado contra SQLite y PostgreSQL
  reales. Ver el
  [caso de estudio](architecture/06-ef-core-safety.md#caso-de-estudio-islastdayofmonth-y-el-contrato-ef-core-safe)
  para el detalle completo.

### Agregado
- `EfCoreRelationalTranslationTests`: tests de regresión que verifican que
  los métodos EF-Core-safe de `ValiFlowQuery<T>` realmente traducen contra
  un proveedor relacional real (SQLite), no solo `UseInMemoryDatabase`.

## v2.0.2

### Corregido
- `ComparisonExpression.Null()`/`NotNull()`: corregido un bug de
  `WHERE 0=1` cuando se usaba junto con `GlobalQueryFilter` de EF Core.

## v2.0.1

### Infraestructura
- Nuevos paquetes complementarios: `Vali-Flow.Core.Analyzers` y
  `Vali-Flow.Core.Generator`, ambos requieren `Vali-Flow.Core >= 2.0.0`.

---

Ver el [CHANGELOG.md](https://github.com/UBF21/Vali-Flow.Core/blob/main/CHANGELOG.md)
completo en GitHub para el historial de versiones completo, incluyendo
v1.x y v2.0.0.
