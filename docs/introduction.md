---
title: Introduction
---

import Drawio from '@theme/Drawio';
import valiflowFlow from '@site/static/diagrams/valiflow-flow.drawio';

Vali-Flow is a modular ecosystem for building **strongly-typed filters** in .NET and executing them across multiple data stores.

At the core is **Vali-Flow.Core**, a dependency-free fluent builder that creates `Expression<Func<T, bool>>` trees and supports in-memory validation. On top of that, Vali-Flow provides **evaluators** for the stores you actually use:

- **EF Core** (relational)
- **InMemory** (tests, caching, local evaluation)
- **SQL** (Dapper / raw SQL)
- **NoSQL** (MongoDB, DynamoDB, Elasticsearch, Redis)

The goal is simple: **write one specification, evaluate it anywhere**.

## Flow diagram

<Drawio content={valiflowFlow} />

If you're new, start with the Quick Start. If you want to go deep, the Core docs include architecture, internals, and method reference.
