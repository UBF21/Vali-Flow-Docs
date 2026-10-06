---
title: Introduccion
---

import Drawio from '@theme/Drawio';
import valiflowFlow from '@site/static/diagrams/valiflow-flow.drawio';

Vali-Flow es un ecosistema modular para construir **filtros fuertemente tipados** en .NET y ejecutarlos en multiples almacenes de datos.

En el centro esta **Vali-Flow.Core**, un builder fluido sin dependencias que genera `Expression<Func<T, bool>>` y permite validacion in-memory. Encima de eso, Vali-Flow ofrece **evaluadores** para los stores que realmente usas:

- **EF Core** (relacional)
- **InMemory** (tests, cache, evaluacion local)
- **SQL** (Dapper / SQL crudo)
- **NoSQL** (MongoDB, DynamoDB, Elasticsearch, Redis)

El objetivo es simple: **escribir una especificacion y evaluarla en cualquier lado**.

## Diagrama de flujo

<Drawio content={valiflowFlow} />

Si eres nuevo, comienza con Quick Start. Si quieres ir profundo, la seccion Core incluye arquitectura, internals y referencia de metodos.
