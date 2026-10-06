# Vali-Flow Evaluator Examples

This page shows common usage patterns for the evaluator packages (EF Core and InMemory). The same `ValiFlow<T>` builder powers both.

---

## 1) EF Core — paged queries

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

## 2) EF Core — failed items (negated filter)

```csharp
var filter = new ValiFlow<Order>()
    .IsTrue(o => o.IsPaid)
    .GreaterThan(o => o.Total, 0m);

var spec = new QuerySpecification<Order>()
    .WithFilter(filter)
    .WithOrderBy(o => o.CreatedAt, ascending: false)
    .WithTop(50);

var evaluator = new ValiFlowEvaluator<Order>(dbContext);

// Items that do NOT satisfy the filter
IQueryable<Order> failed = await evaluator.EvaluateQueryFailedAsync(spec);
var list = await failed.ToListAsync();
```

---

## 3) EF Core — grouping + aggregates

```csharp
var spec = new BasicSpecification<Order>()
    .WithFilter(new ValiFlow<Order>().IsTrue(o => o.IsActive));

var evaluator = new ValiFlowEvaluator<Order>(dbContext);

// Total by customer
Dictionary<int, decimal> totalByCustomer = await evaluator.EvaluateSumByGroupAsync(
    spec,
    o => o.CustomerId,
    o => o.Total);
```

---

## 4) InMemory — evaluate and count

```csharp
var filter = new ValiFlow<Product>()
    .IsTrue(p => p.IsActive)
    .LessThan(p => p.Price, 100m);

var evaluator = new ValiFlowEvaluator<Product, int>(products, filter, p => p.Id);

var all = evaluator.EvaluateAll<int>(null);
var count = evaluator.EvaluateCount(null);
```

---

## 5) InMemory — invert a filter

```csharp
var filter = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0);

var evaluator = new ValiFlowEvaluator<Product, int>(products, filter, p => p.Id);

// Products with Stock <= 0
var outOfStock = evaluator.EvaluateAll<int>(null, negateCondition: true);
```
