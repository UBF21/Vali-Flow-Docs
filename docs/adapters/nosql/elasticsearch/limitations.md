---
title: Limitations
---

Elasticsearch supports all IR node types. There are no operations that throw `NotSupportedException`.

Behavioral notes:

- **IsNull** maps to `bool { must_not: [exists { field }] }`. This matches documents where the field is absent or explicitly `null`, which is standard Elasticsearch behavior.
- **Empty In list** maps to `bool { must_not: [match_all {}] }` — an always-false query. No documents match.
- **Range queries** convert the value to `double`. If the field stores dates, use a `customConverter` to produce a `DateRangeQuery` instead.
- Field names come directly from the .NET property name. To use a custom Elasticsearch field name, configure your index mappings or serializer settings accordingly.

---
