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

- **Falso positivo del analyzer VF001**: `EqualToIgnoreCase`, `IsTrimmed`,
  `IsLowerCase` e `IsUpperCase` se marcaban incorrectamente como no
  EF-safe — cada uno tiene su propia reimplementación traducible y es
  EF-safe desde v1.7.0. Ver la
  [guía de seguridad EF Core](architecture/06-ef-core-safety.md) para el
  listado completo.
- **`NotNull<TValue>()` / `Null<TValue>()`**: ya no lanzan excepción cuando
  `TValue` cierra sobre un tipo valor no-nullable (`int`, `DateTime`,
  `bool`, `Guid`, `decimal`, cualquier `enum`) — la condición ahora se
  construye como una expresión trivialmente verdadera/falsa en vez de
  intentar una comparación con null que no aplica.
- **`BaseExpression.Add<TValue>()`**: el cuerpo del selector ahora se clona
  antes de sustituir el parámetro, evitando aliasing de nodos cuando un
  predicado referencia su parámetro más de una vez.

### Agregado
- `EfCoreRelationalTranslationTests`: tests de regresión que verifican que
  los métodos EF-Core-safe de `ValiFlowQuery<T>` realmente traducen contra
  un proveedor relacional real (SQLite), no solo `UseInMemoryDatabase`.
- **Diagnósticos `VFGEN001`/`VFGEN002` del generador**: warnings en tiempo
  de compilación cuando un campo marcado con `[ForwardInterface]` está mal
  configurado. Ver la
  [guía del source generator](architecture/05-source-generator.md#diagnósticos-vfgen001-y-vfgen002).
- **Pipeline de CI/CD**: build + matriz de tests en GitHub Actions
  (Windows/Linux × .NET 8/9) con gate de cobertura, más un workflow de
  Release manual para publicar en NuGet.

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
