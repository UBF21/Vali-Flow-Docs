# Vali-Flow — Visión general de la arquitectura

import Drawio from '@theme/Drawio';
import architectureOverview from '@site/static/diagrams/architecture-overview.drawio';
import dataFlow from '@site/static/diagrams/data-flow.drawio';

## Mapa del sistema

<Drawio content={architectureOverview} />

---

## Responsabilidades de cada paquete

### Vali-Flow.Core

La base. Provee el constructor fluido `ValiFlow<T>` — un DSL para construir árboles de expresión que representan condiciones de filtro. También provee `ValiSort<T>` para ordenamiento dinámico.

Core **no ejecuta nada**. Solo construye un árbol de nodos IR (Representación Intermedia). Cada paquete downstream consume ese árbol a su manera.

### Vali-Flow (EF Core)

Traduce las condiciones de `ValiFlow<T>` en expresiones LINQ y las evalúa contra un `DbContext` mediante EF Core. Provee:

- `ValiFlowEvaluator<T>` — la clase evaluadora principal
- `BasicSpecification<T>` / `QuerySpecification<T>` — el patrón de especificación para desacoplar los criterios de consulta de la ejecución
- Superficie completa de lectura + escritura asíncrona (30+ métodos)
- Opciones específicas de EF: `AsNoTracking`, `AsSplitQuery`, `IgnoreQueryFilters`, includes

### Vali-Flow.InMemory

Traduce las condiciones de `ValiFlow<T>` en delegados compilados y los evalúa contra un `IEnumerable<T>`. Completamente sincrónico. Sin dependencia de EF Core.

Espeja la API del evaluador EF Core para que el código que construye filtros y especificaciones pueda testearse sin una base de datos.

### Vali-Flow.Sql

Recorre el árbol de expresiones usando un `ExpressionVisitor` y emite fragmentos SQL parametrizados. El visitor es consciente del dialecto — cada `ISqlDialect` controla el estilo de comillas, el prefijo de parámetros y los operadores insensibles a mayúsculas.

También provee un `SqlQueryBuilder<T>` fluido para construir sentencias SELECT / INSERT / UPDATE / DELETE / MERGE completas.

### Vali-Flow.NoSql (base)

Contiene el `ExpressionToIRVisitor` — un `ExpressionVisitor` que convierte una expresión `ValiFlow<T>` en un árbol de nodos IR serializables. Cada adaptador NoSQL hereda este visitor y emite su consulta nativa desde el árbol IR.

### Adaptadores NoSQL

Cada adaptador tiene una única responsabilidad: convertir nodos IR al formato de consulta esperado por su driver.

| Paquete | Tipo de salida | Dependencia del driver |
|---------|---------------|----------------------|
| `Vali-Flow.NoSql.MongoDB` | `BsonDocument` | `MongoDB.Bson` |
| `Vali-Flow.NoSql.Elasticsearch` | `Query` | `Elastic.Clients.Elasticsearch` |
| `Vali-Flow.NoSql.DynamoDB` | `DynamoFilterExpression` | `AWSSDK.DynamoDBv2` |
| `Vali-Flow.NoSql.Redis` | `string` (DSL de RediSearch) | `NRedisStack` |

---

## Flujo de datos

<Drawio content={dataFlow} />

---

## Principios de diseño clave

**Patrón de especificación**
Los criterios de consulta se expresan como especificaciones (`BasicSpecification<T>`, `QuerySpecification<T>`) que llevan el filtro, los includes, el ordenamiento y la paginación. El evaluador recibe una spec — esto desacopla "qué consultar" de "cómo ejecutarlo".

**Separación de responsabilidades**
`ValiFlow<T>` nunca ejecuta nada. Es un value object puro que representa una condición. Los traductores son clases separadas que lo consumen. Esto permite usar el mismo filtro con diferentes backends.

**IR inmutable**
Cada nodo de condición es un record sellado con propiedades `init`-only. El árbol IR construido por `ValiFlow<T>` no puede mutarse después de la construcción — seguro para compartir entre hilos.

**Salida parametrizada**
Cada adaptador (SQL, DynamoDB, Elasticsearch, Redis) emite consultas parametrizadas. Los valores de usuario nunca se interpolan en la cadena de consulta, previniendo ataques de inyección.

**Sin reflexión en tiempo de consulta**
Los evaluadores EF Core e InMemory compilan la expresión `ValiFlow<T>` una vez a un `Func<T, bool>` o expresión LINQ. Las evaluaciones subsiguientes usan el delegado compilado directamente.

---

## Estructura de la solución

```
Vali-Flow.sln
```

Todos los paquetes apuntan a `net8.0` y `net9.0`, y tambien corren sin modificaciones en **.NET 10** gracias a la compatibilidad hacia adelante de .NET.

---

## Ver también

- [Decisiones de diseño](design-decisions.md)
- [Guía de primeros pasos](../guides/getting-started.md)
- [Guía de contribución](../internal/contributing.md)