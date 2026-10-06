---
title: Limitations
---

Elasticsearch soporta todos los tipos de nodos IR. No hay operaciones que lancen `NotSupportedException`.

Notas de comportamiento:

- **IsNull** mapea a `bool { must_not: [exists { field }] }`. Coincide con documentos donde el campo está ausente o es explícitamente `null`, que es el comportamiento estándar de Elasticsearch.
- **Lista In vacía** mapea a `bool { must_not: [match_all {}] }` — una consulta siempre falsa. Ningún documento coincide.
- **Consultas de rango** convierten el valor a `double`. Si el campo almacena fechas, usa `customConverter` para producir una `DateRangeQuery` en su lugar.
- Los nombres de campo provienen directamente del nombre de la propiedad .NET. Para usar un nombre de campo Elasticsearch personalizado, configura tus mappings de índice o la configuración del serializador en consecuencia.
