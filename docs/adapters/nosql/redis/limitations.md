---
title: Limitations
---

| Limitation | Detail |
|-----------|--------|
| `IsNull` / `IsNotNull` | Throws `NotSupportedException`. RediSearch has no native field-existence query. Handle null checks at the application level or use a sentinel value in your index. |
| Empty `In` list | Produces `(-*)` — a negation of the match-all token, which is always false. |
| Mixed numeric/string `In` | Throws `InvalidOperationException`. All non-null values in a single `In` call must be of the same kind. |
| Pattern fields | `Contains`, `StartsWith`, and `EndsWith` target TEXT fields. The field must be indexed as `TEXT` in your RediSearch schema for prefix/suffix search to work correctly. |
| DIALECT 2 | Quoted tag values require DIALECT 2. NRedisStack 1.3.0+ appends it automatically. Older versions require `new Query(query).Dialect(2)`. |

---
