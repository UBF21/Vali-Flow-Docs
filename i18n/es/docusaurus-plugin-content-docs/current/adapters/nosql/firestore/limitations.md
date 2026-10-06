---
title: Limitations
---

Firestore es el proveedor con más huecos reales en su motor de queries entre los adaptadores NoSql de Vali-Flow. Los nodos no soportados lanzan de inmediato al momento de traducir, en vez de producir silenciosamente un filtro incorrecto.

| Limitación | Detalle |
|-----------|--------|
| `Contains` / `StartsWith` / `EndsWith` | Lanzan `NotSupportedException`. Firestore no tiene operador de query LIKE, regex, ni de substring. Filtrá del lado del cliente después de obtener los datos, o integrá un índice de búsqueda dedicado (Algolia, Elasticsearch, Typesense) para texto. |
| `.Not(inner)` | Lanza `NotSupportedException` incondicionalmente. El SDK no expone una composición `Filter.Not(filter)`. Usá `.NotEqualTo(x => x.Field, v)` directamente en vez de `.Not(f => f.EqualTo(x => x.Field, v))` — eso sí llega a `Filter.NotEqualTo` vía `EqualNode.IsNegated`. |
| `.In(...)` negado | Todavía no alcanzable. El SDK expone `Filter.NotInArray(field, values)`, pero el `InNode` del IR actual no tiene un flag `IsNegated` (a diferencia de `EqualNode`), así que ningún método de `ValiFlow<T>` llega ahí todavía. |
| `AND`/`OR` anidados | No es un hueco, solo una nota de forma: encadenar tres o más condiciones produce un `Filter.And(a, Filter.And(b, c))` anidado en vez de una única llamada plana. Firestore acepta filtros compuestos anidados, así que es semánticamente equivalente — solo relevante si inspeccionás el `Filter` generado para debuggear. |

---
