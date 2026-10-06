# Vali-Flow Core Examples

This page collects practical `ValiFlow<T>` examples that go beyond the method reference pages. Use them as patterns you can copy and adapt.

---

## 1) Validation with `When`, messages, and errors

```csharp
using ValiFlow.Builder;

var rule = new ValiFlow<Order>()
    .NotNull(o => o.CustomerId)
        .WithMessage("Customer is required.")
    .GreaterThan(o => o.Total, 0m)
        .WithMessage("Total must be greater than 0.")
    .IsNotNullOrEmpty(o => o.Reference)
        .WithError(new ValidationError("REF_EMPTY", "Reference cannot be empty"))
    .When(o => o.RequiresShipping, b => b
        .IsNotNullOrEmpty(x => x.ShippingAddress)
        .IsNotNullOrEmpty(x => x.ShippingCity));

var result = rule.Validate(order);
if (!result.IsValid)
{
    // Either use the first message...
    Console.WriteLine(result.ErrorMessage);

    // ...or cast the structured error
    if (result.Error is ValidationError err)
        Console.WriteLine($"{err.Code}: {err.Message}");
}
```

---

## 2) Grouped OR logic with `AddSubGroup`

```csharp
var rule = new ValiFlow<User>()
    // (Role == Admin OR Role == Manager)
    .AddSubGroup(g => g
        .EqualTo(u => u.Role, "Admin")
        .Or()
        .EqualTo(u => u.Role, "Manager"))
    // AND IsActive = true
    .IsTrue(u => u.IsActive);

Expression<Func<User, bool>> expr = rule.Build();
```

---

## 3) Collection rules with reusable inner spec

```csharp
var lineRule = new ValiFlow<OrderLine>()
    .GreaterThan(x => x.Quantity, 0)
    .Positive(x => x.UnitPrice)
    .MinLength(x => x.Sku, 3);

var orderRule = new ValiFlow<Order>()
    .NotEmpty<OrderLine>(o => o.Lines)
    .AllMatch(o => o.Lines, lineRule)
    .AnyItem<OrderLine>(o => o.Lines, item =>
        item.GreaterThan(x => x.Discount, 0));

bool ok = orderRule.IsValid(order);
```

---

## 4) Split DB-safe vs in-memory rules

```csharp
// DB-safe filter
var query = new ValiFlowQuery<User>()
    .NotNull(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// In-memory rules that are NOT SQL-translatable
var inMemory = new ValiFlow<User>()
    .IsEmail(u => u.Email)
    .IsNotNullOrEmpty(u => u.DisplayName);

// DB query
var users = await dbContext.Users.Where(query.Build()).ToListAsync();

// In-memory validation after loading
var validUsers = users.Where(u => inMemory.IsValid(u)).ToList();
```

---

## 5) Reuse a compiled predicate

```csharp
var rule = new ValiFlow<Product>()
    .GreaterThan(p => p.Stock, 0)
    .IsTrue(p => p.IsActive);

// Build once, reuse many times (cached after first compilation)
Func<Product, bool> predicate = rule.BuildCached();

var available = products.Where(predicate).ToList();
```
