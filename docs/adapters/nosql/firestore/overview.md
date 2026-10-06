---
title: Overview
---

import Drawio from '@theme/Drawio';
import nosqlFlow from '@site/static/diagrams/nosql-flow.drawio';

**Vali-Flow.NoSql.Firestore** translates a `ValiFlow<T>` expression tree into a native `Google.Cloud.Firestore.Filter`. Unlike the SQL/MongoDB adapters, this one does not build a document or string — it produces the actual `Filter` object from the official `Google.Cloud.Firestore` SDK (v4.4.0), so the output is accepted directly by `Query.Where(filter)` / `CollectionReference.Where(filter)` with no cast, wrapping, or serialization step.

<Drawio content={nosqlFlow} />

Because the adapter is bound to the real SDK type, it inherits the real SDK's capabilities — and its real gaps. Firestore's query engine is intentionally limited compared to a general-purpose database: there is no pattern-matching operator and no way to negate an arbitrary sub-filter. Both limitations are enforced in code (see [Limitations](./limitations)) rather than silently producing an incorrect filter.

---

## Installation

```bash
dotnet add package Vali-Flow.NoSql.Firestore
```

`Vali-Flow.NoSql` (the IR layer) is included as a transitive dependency. `Google.Cloud.Firestore` 4.4.0 is a direct dependency — this package does not try to abstract it away.

---

## Quick Start

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

## More Examples

```csharp
// Range + membership filter
var filter = new ValiFlow<Order>()
    .GreaterThanOrEqualTo(o => o.Total, 100m)
    .LessThan(o => o.Total, 5000m)
    .In(o => o.RegionCode, new[] { "US", "CA", "MX" })
    .ToFirestore();
```
