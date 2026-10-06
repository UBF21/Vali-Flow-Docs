---
title: Limitations
---

| Limitation | Detail |
|-----------|--------|
| `EndsWith` | Throws `NotSupportedException`. DynamoDB has no trailing-wildcard function. Use `Contains` or `StartsWith`, or apply the filter client-side after retrieval. |
| `In` list > 100 values | Throws `InvalidOperationException`. DynamoDB's `IN` operator supports at most 100 operands. Split the query or batch the values. |
| Empty `In` list | Produces `(attribute_exists(#f0) AND attribute_not_exists(#f0))` — an always-false expression. No items match. |
| `ToDictionary()` call required | `ExpressionAttributeNames` and `ExpressionAttributeValues` are `IReadOnlyDictionary<K,V>`. The `ScanRequest` / `QueryRequest` constructors require `Dictionary<K,V>`. Call `.ToDictionary()` on each property before assigning. |

---
