---
title: Limitations
---

| Limitación | Detalle |
|-----------|---------|
| `IsNull` / `IsNotNull` | Lanza `NotSupportedException`. RediSearch no tiene consulta nativa de existencia de campo. Maneja las verificaciones de nulos a nivel de aplicación o usa un valor centinela en tu índice. |
| Lista `In` vacía | Produce `(-*)` — una negación del token de coincidencia total, que siempre es falso. |
| `In` numérico/cadena mixto | Lanza `InvalidOperationException`. Todos los valores no nulos en una sola llamada `In` deben ser del mismo tipo. |
| Campos de patrón | `Contains`, `StartsWith` y `EndsWith` apuntan a campos TEXT. El campo debe estar indexado como `TEXT` en tu schema RediSearch para que la búsqueda con prefijo/sufijo funcione correctamente. |
| DIALECT 2 | Los valores de tag con comillas requieren DIALECT 2. NRedisStack 1.3.0+ lo agrega automáticamente. Las versiones anteriores requieren `new Query(query).Dialect(2)`. |
