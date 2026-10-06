# Ejemplos de Vali-Flow Evaluator

Esta página muestra patrones comunes de uso para los evaluadores (EF Core e InMemory). Ambos usan el mismo builder `ValiFlow<T>`.

---

## 1) EF Core — consultas paginadas

```csharp
var filter = new ValiFlow<Order>()
    .IsTrue(o => o.IsActive)
    .GreaterThan(o => o.Total, 0m);

var spec = new QuerySpecification<Order>()
    .WithFilter(filter)
    .WithOrderBy(o => o.CreatedAt, ascending: false)
    .WithPagination(page: 1, pageSize: 20);

var evaluator = new ValiFlowEvaluator<Order>(dbContext);
PagedResult<Order> page = await evaluator.EvaluatePagedAsync(spec);
```

---

## 2) EF Core — ítems fallidos (filtro negado)

```csharp
var filter = new ValiFlow<Order>()
    .IsTrue(o => o.IsPaid)
    .GreaterThan(o => o.Total, 0m);

var spec = new QuerySpecification<Order>()
    .WithFilter(filter)
    .WithOrderBy(o => o.CreatedAt, ascending: false)
    .WithTop(50);

var evaluator = new ValiFlowEvaluator<Order>(dbContext);

// Ítems que NO cumplen el filtro
IQueryable<Order> failed = await evaluator.EvaluateQueryFailedAsync(spec);
var list = await failed.ToListAsync();
```

---

## 3) EF Core — agrupación + agregados

```csharp
var spec = new BasicSpecification<Order>()
    .WithFilter(new ValiFlow<Order>().IsTrue(o => o.IsActive));

var evaluator = new ValiFlowEvaluator<Order>(dbContext);

// Total por cliente
Dictionary<int, decimal> totalByCustomer = await evaluator.EvaluateSumByGroupAsync(
    spec,
    o => o.CustomerId,
    o => o.Total);
```

---

## 4) InMemory — evaluar y contar

```csharp
var filter = new ValiFlow<Product>()
    .IsTrue(p => p.IsActive)
    .LessThan(p => p.Price, 100m);

var evaluator = new ValiFlowEvaluator<Product, int>(products, filter, p => p.Id);

var all = evaluator.EvaluateAll<int>(null);
var count = evaluator.EvaluateCount(null);
```

---

## 5) InMemory — invertir un filtro

```csharp
var filter = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0);

var evaluator = new ValiFlowEvaluator<Product, int>(products, filter, p => p.Id);

// Productos con Stock <= 0
var outOfStock = evaluator.EvaluateAll<int>(null, negateCondition: true);
```
