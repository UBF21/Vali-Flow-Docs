---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Firestore** traduce un árbol de expresiones `ValiFlow<T>` en un `Google.Cloud.Firestore.Filter` nativo. A diferencia de los adaptadores SQL/MongoDB, este paquete no construye un documento ni un string — produce el objeto `Filter` real del SDK oficial `Google.Cloud.Firestore` (v4.4.0), así que el resultado se pasa directo a `Query.Where(filter)` / `CollectionReference.Where(filter)` sin ningún cast, wrapping ni paso de serialización.

<Drawio content={nosqlFlow} />

Como el adaptador está atado al tipo real del SDK, hereda tanto las capacidades reales del SDK como sus huecos reales. El motor de queries de Firestore es intencionalmente limitado comparado con una base de datos de propósito general: no hay operador de pattern-matching y no hay forma de negar un sub-filtro arbitrario. Ambas limitaciones están forzadas en el código (ver [Limitaciones](./limitations)) en vez de producir silenciosamente un filtro incorrecto.

---

## Instalacion

```bash
dotnet add package Vali-Flow.NoSql.Firestore
```

`Vali-Flow.NoSql` (la capa de IR) se incluye como dependencia transitiva. `Google.Cloud.Firestore` 4.4.0 es una dependencia directa — este paquete no intenta abstraerlo.

---

## Inicio rapido

```csharp
using Vali_Flow.Core.Builder;
using Vali_Flow.NoSql.Firestore.Extensions;
using Google.Cloud.Firestore;

var filter = new ValiFlow<User>()
    .EqualTo(x => x.IsActive, true)
    .GreaterThan(x => x.Age, 18);

Filter firestoreFilter = filter.ToFirestore();

FirestoreDb firestoreDb = FirestoreDb.Create("my-project-id");
CollectionReference collection = firestoreDb.Collection("users");
Query query = collection.Where(firestoreFilter);
QuerySnapshot snapshot = await query.GetSnapshotAsync();

foreach (DocumentSnapshot doc in snapshot.Documents)
{
    var user = doc.ConvertTo<User>();
}
```

---

## Más ejemplos

```csharp
// Filtro de rango + pertenencia
var filter = new ValiFlow<Order>()
    .GreaterThanOrEqualTo(o => o.Total, 100m)
    .LessThan(o => o.Total, 5000m)
    .In(o => o.RegionCode, new[] { "US", "CA", "MX" })
    .ToFirestore();
```
