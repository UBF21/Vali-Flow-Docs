# Vali-Flow — Architecture Overview

import Drawio from '@theme/Drawio';
import architectureOverview from '@site/static/diagrams/architecture-overview.drawio';
import dataFlow from '@site/static/diagrams/data-flow.drawio';

## System map

<Drawio content={architectureOverview} />

---

## Package responsibilities

### Vali-Flow.Core

The foundation. Provides the `ValiFlow<T>` fluent builder — a DSL for constructing expression trees that represent filter conditions. Also provides `ValiSort<T>` for dynamic ordering.

Core does **not** execute anything. It only builds a tree of IR (Intermediate Representation) nodes. Each downstream package consumes that tree in its own way.

### Vali-Flow (EF Core)

Translates `ValiFlow<T>` conditions into LINQ expressions and evaluates them against a `DbContext` via EF Core. Provides:

- `ValiFlowEvaluator<T>` — the main evaluator class
- `BasicSpecification<T>` / `QuerySpecification<T>` — the specification pattern for decoupling query criteria from execution
- Full async read + write surface (30+ methods)
- EF-specific options: `AsNoTracking`, `AsSplitQuery`, `IgnoreQueryFilters`, includes

### Vali-Flow.InMemory

Translates `ValiFlow<T>` conditions into compiled delegates and evaluates them against an `IEnumerable<T>`. Fully synchronous. No EF Core dependency.

Mirrors the EF Core evaluator API so code that builds filters and specifications can be tested without a database.

### Vali-Flow.Sql

Walks the expression tree using an `ExpressionVisitor` and emits parameterized SQL fragments. The visitor is dialect-aware — each `ISqlDialect` controls quoting style, parameter prefix, and case-insensitive operators.

Also provides a fluent `SqlQueryBuilder<T>` for constructing full SELECT / INSERT / UPDATE / DELETE / MERGE statements.

### Vali-Flow.NoSql (base)

Contains the `ExpressionToIRVisitor` — an `ExpressionVisitor` that converts a `ValiFlow<T>` expression into a tree of serializable IR nodes. Each NoSQL adapter inherits this visitor and emits its technology-specific query from the IR tree.

### NoSQL adapters

Each adapter has a single responsibility: convert IR nodes to the query format expected by its driver.

| Package | Output type | Driver dependency |
|---------|------------|------------------|
| `Vali-Flow.NoSql.MongoDB` | `BsonDocument` | `MongoDB.Bson` |
| `Vali-Flow.NoSql.Elasticsearch` | `Query` | `Elastic.Clients.Elasticsearch` |
| `Vali-Flow.NoSql.DynamoDB` | `DynamoFilterExpression` | `AWSSDK.DynamoDBv2` |
| `Vali-Flow.NoSql.Redis` | `string` (RediSearch DSL) | `NRedisStack` |

---

## Data flow

<Drawio content={dataFlow} />

---

## Key design principles

**Specification pattern**
Query criteria are expressed as specifications (`BasicSpecification<T>`, `QuerySpecification<T>`) that carry the filter, includes, ordering, and pagination. The evaluator receives a spec — this decouples "what to query" from "how to execute it."

**Separation of concerns**
`ValiFlow<T>` never executes anything. It is a pure value object representing a condition. Translators are separate classes that consume it. This allows the same filter to be used with different backends.

**Immutable IR**
Each condition node is a sealed record with `init`-only properties. The IR tree built by `ValiFlow<T>` cannot be mutated after construction — safe to share across threads.

**Parameterized output**
Every adapter (SQL, DynamoDB, Elasticsearch, Redis) emits parameterized queries. User values are never interpolated into the query string, preventing injection attacks.

**No reflection at query time**
The EF Core and InMemory evaluators compile the `ValiFlow<T>` expression once to a `Func<T, bool>` or LINQ expression. Subsequent evaluations use the compiled delegate directly.

---

## Solution structure

```
Vali-Flow.sln
```

All packages target `net8.0` and `net9.0`.

---

## See also

- [Design decisions](design-decisions.md)
- [Getting started guide](../guides/getting-started.md)
- [Contributing](../internal/contributing.md)