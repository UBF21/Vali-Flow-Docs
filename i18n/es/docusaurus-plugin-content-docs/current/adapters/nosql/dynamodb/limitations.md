---
title: Limitations
---

| Limitación | Detalle |
|-----------|---------|
| `EndsWith` | Lanza `NotSupportedException`. DynamoDB no tiene función de comodín al final. Usa `Contains` o `StartsWith`, o aplica el filtro del lado del cliente tras la recuperación. |
| Lista `In` > 100 valores | Lanza `InvalidOperationException`. El operador `IN` de DynamoDB soporta máximo 100 operandos. Divide la consulta o procesa los valores en lotes. |
| Lista `In` vacía | Produce `(attribute_exists(#f0) AND attribute_not_exists(#f0))` — una expresión siempre falsa. Ningún ítem coincide. |
| Llamada a `.ToDictionary()` requerida | `ExpressionAttributeNames` y `ExpressionAttributeValues` son `IReadOnlyDictionary<K,V>`. Los constructores de `ScanRequest` / `QueryRequest` requieren `Dictionary<K,V>`. Llama a `.ToDictionary()` en cada propiedad antes de asignar. |
