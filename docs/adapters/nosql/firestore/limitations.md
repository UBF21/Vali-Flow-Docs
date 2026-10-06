---
title: Limitations
---

Firestore is the provider with the most query-engine gaps among the Vali-Flow NoSql adapters. Unsupported nodes throw immediately at translation time rather than silently producing an incorrect filter.

| Limitation | Detail |
|-----------|--------|
| `Contains` / `StartsWith` / `EndsWith` | Throw `NotSupportedException`. Firestore has no LIKE, regex, or substring query operator. Filter client-side after fetching, or integrate a dedicated search index (Algolia, Elasticsearch, Typesense) for text search. |
| `.Not(inner)` | Throws `NotSupportedException` unconditionally. The SDK exposes no `Filter.Not(filter)` composition. Use `.NotEqualTo(x => x.Field, v)` directly instead of `.Not(f => f.EqualTo(x => x.Field, v))` — that reaches `Filter.NotEqualTo` via `EqualNode.IsNegated`. |
| Negated `.In(...)` | Not reachable yet. The SDK exposes `Filter.NotInArray(field, values)`, but the current IR's `InNode` has no `IsNegated` flag (unlike `EqualNode`), so no `ValiFlow<T>` method reaches it yet. |
| Nested `AND`/`OR` | Not a gap, just a shape note: chaining three or more conditions produces nested `Filter.And(a, Filter.And(b, c))` rather than a single flat call. Firestore accepts nested composite filters, so this is semantically equivalent — only relevant if you inspect the generated `Filter` for debugging. |

---
