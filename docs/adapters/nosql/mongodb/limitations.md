---
title: Limitations
---

MongoDB supports all IR node types. There are no operations that throw `NotSupportedException`.

One behavioral note: passing an empty list to `.In(...)` produces `{ field: { $in: [] } }`, which MongoDB evaluates as an always-false filter (zero documents returned). This is consistent with the Elasticsearch and SQL adapters.

Field names in the filter come directly from the .NET property name. To use a custom MongoDB field name, apply `[BsonElement("fieldName")]` on the entity property.

---
