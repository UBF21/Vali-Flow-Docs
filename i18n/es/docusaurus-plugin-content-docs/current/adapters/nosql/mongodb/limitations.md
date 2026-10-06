---
title: Limitations
---

MongoDB soporta todos los tipos de nodos IR. No hay operaciones que lancen `NotSupportedException`.

Una nota de comportamiento: pasar una lista vacía a `.In(...)` produce `{ field: { $in: [] } }`, que MongoDB evalúa como un filtro siempre falso (cero documentos retornados). Esto es consistente con los adaptadores de Elasticsearch y SQL.

Los nombres de campo en el filtro provienen directamente del nombre de la propiedad .NET. Para usar un nombre de campo MongoDB personalizado, aplica `[BsonElement("fieldName")]` en la propiedad de la entidad.
