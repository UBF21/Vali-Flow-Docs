# Collection Methods

`ValiFlow<T>` provides a rich set of methods for validating and filtering collection-typed properties. This covers emptiness checks, membership tests, count constraints, predicate projections, and uniqueness checks.

**Examples:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

---

## Emptiness

### `NotEmpty<TValue>`

Passes when the collection is **not null and not empty**.

```csharp
var rule = new ValiFlow<Product>()
    .NotEmpty<string>(x => x.Tags);
```

### `Empty<TValue>`

Passes when the collection is **null or empty**.

```csharp
var rule = new ValiFlow<Order>()
    .Empty<string>(x => x.Errors);
```

---

## Membership

### `In`

Passes when the selected scalar value is present in the provided list.

```csharp
var rule = new ValiFlow<Order>()
    .In(x => x.Status, ["Active", "Pending"]);
```

### `NotIn`

Passes when the selected scalar value is **not** present in the provided list.

```csharp
var rule = new ValiFlow<User>()
    .NotIn(x => x.Status, ["Banned", "Deleted"]);
```

### `Contains<TValue>`

Passes when the collection contains a specific value.

```csharp
var rule = new ValiFlow<Product>()
    .Contains<string>(x => x.Tags, "csharp");
```

---

## Count

### `Count<TValue>`

Passes when the collection has **exactly N** elements.

```csharp
var rule = new ValiFlow<Order>()
    .Count<OrderLine>(x => x.Items, 5);
```

### `CountEquals<TValue>`

Alias for `Count<TValue>` with clearer semantic intent.

```csharp
var rule = new ValiFlow<Order>()
    .CountEquals<OrderLine>(x => x.Items, 5);
```

### `CountBetween<TValue>`

Passes when the element count falls within `[min, max]` (inclusive).

```csharp
var rule = new ValiFlow<Product>()
    .CountBetween<string>(x => x.Tags, 1, 10);
```

### `MinCount<TValue>`

Passes when the collection has **at least N** elements. A `null` collection fails.

```csharp
var rule = new ValiFlow<Order>()
    .MinCount<OrderLine>(x => x.Items, 1);
```

### `MaxCount<TValue>`

Passes when the collection has **at most N** elements. A `null` collection fails.

```csharp
var rule = new ValiFlow<Order>()
    .MaxCount<OrderLine>(x => x.Items, 100);
```

---

## Predicates

### `Any<TValue>`

Passes when **at least one** element in the collection satisfies the predicate.

```csharp
var rule = new ValiFlow<Order>()
    .Any<OrderLine>(x => x.Items, item => item.Price > 0);
```

### `All<TValue>`

Passes when **all** elements in the collection satisfy the predicate.

```csharp
var rule = new ValiFlow<Order>()
    .All<OrderLine>(x => x.Items, item => item.IsActive);
```

### `None<TValue>`

Passes when **no** element satisfies the predicate. A `null` collection passes vacuously.

```csharp
var rule = new ValiFlow<Product>()
    .None<string>(x => x.Tags, t => t == "banned");
```

### `AllMatch<TValue>` — composable pattern

Accepts a **pre-built `ValiFlow<TValue>`** and passes when every element matches it. Ideal for reusing inner validation rules.

```csharp
// Reusable inner filter
var lineItemRule = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice);

// Compose into outer filter
var orderRule = new ValiFlow<Order>()
    .NotEmpty<OrderLine>(x => x.Lines)
    .AllMatch(x => x.Lines, lineItemRule); // reuse pre-built filter
```

### `EachItem<TValue>`

Inline builder variant of `AllMatch` — builds the inner rule with a lambda.

```csharp
var rule = new ValiFlow<Order>()
    .EachItem<OrderLine>(x => x.Items, item =>
        item.MinLength(x => x.ProductCode, 3));
```

### `AnyItem<TValue>`

Inline builder variant of `Any` — passes when at least one element satisfies the inline-built rule.

```csharp
var rule = new ValiFlow<Order>()
    .AnyItem<OrderLine>(x => x.Items, item =>
        item.GreaterThan(x => x.Price, 0));
```

---

## Uniqueness

### `HasDuplicates<TValue>`

Passes when the collection contains **duplicate** elements.

```csharp
var rule = new ValiFlow<Order>()
    .HasDuplicates<string>(x => x.Codes);
```

### `DistinctCount<TValue>`

Passes when the collection has **exactly N distinct** elements.

```csharp
var rule = new ValiFlow<Product>()
    .DistinctCount<string>(x => x.Tags, 3);
```

---

## Composable Pattern — Full Example

```csharp
// Inner rule: each order line must be valid
var lineItemRule = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice)
    .NotEmpty<string>(x => x.ProductCode);

// Outer rule: the order itself
var orderRule = new ValiFlow<Order>()
    .NotNull(x => x.CustomerId)
    .NotEmpty<OrderLine>(x => x.Lines)
    .MinCount<OrderLine>(x => x.Lines, 1)
    .MaxCount<OrderLine>(x => x.Lines, 100)
    .AllMatch(x => x.Lines, lineItemRule);

// Use in-memory
bool isValid = orderRule.IsValid(order);

// Use with IQueryable (ValiFlowQuery for EF Core)
Expression<Func<Order, bool>> expr = orderRule.Build();
var results = await dbContext.Orders.Where(expr).ToListAsync();
```

---

## Mini Examples

### 1) Enforce uniqueness

```csharp
var rule = new ValiFlow<Order>()
    .HasDuplicates<string>(o => o.Tags)
    .NotNull(o => o.CustomerId);
```

### 2) Count window

```csharp
var rule = new ValiFlow<Cart>()
    .MinCount<CartItem>(c => c.Items, 1)
    .MaxCount<CartItem>(c => c.Items, 50);
```
