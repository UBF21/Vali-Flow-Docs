# String Methods

This page covers all string-related methods available in `ValiFlow<T>`. They are defined in `StringExpression<TBuilder, T>` and accessible directly from your `ValiFlow<T>` builder instance.

**Examples:** [`ValiFlow`](../examples/vali-flow.md) · [`Evaluators`](../examples/vali-flow-evaluator.md)

---

## Length

### `MinLength`

Passes when the string has at least N characters. Returns `false` for `null`.

```csharp
var rule = new ValiFlow<User>()
    .MinLength(x => x.Name, 3);
```

### `MaxLength`

Passes when the string has at most N characters. Returns `true` for `null`.

```csharp
var rule = new ValiFlow<User>()
    .MaxLength(x => x.Name, 100);
```

### `LengthBetween`

Passes when the string length falls within the inclusive range `[min, max]`.

```csharp
var rule = new ValiFlow<User>()
    .LengthBetween(x => x.Name, 3, 100);
```

### `ExactLength`

Passes when the string is exactly N characters long.

```csharp
var rule = new ValiFlow<Order>()
    .ExactLength(x => x.PostalCode, 5);
```

---

## Null / Empty / Whitespace

### `IsNullOrEmpty`

Passes when the value is `null` or an empty string (`""`).

```csharp
var rule = new ValiFlow<User>()
    .IsNullOrEmpty(x => x.Description);
```

### `IsNotNullOrEmpty`

Passes when the value is neither `null` nor `""`.

```csharp
var rule = new ValiFlow<User>()
    .IsNotNullOrEmpty(x => x.Name);
```

### `IsNullOrWhiteSpace`

Passes when the value is `null`, `""`, or consists solely of whitespace characters.

```csharp
var rule = new ValiFlow<Product>()
    .IsNullOrWhiteSpace(x => x.Code);
```

### `IsNotNullOrWhiteSpace`

Passes when the value contains at least one non-whitespace character.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNullOrWhiteSpace(x => x.Code);
```

### `IsTrimmed`

Passes when the value has no leading or trailing whitespace (equivalent to `value == value.Trim()`). Returns `true` for `null`.

```csharp
var rule = new ValiFlow<User>()
    .IsTrimmed(x => x.Name);
```

---

## Content

### `Contains` (single selector)

Passes when the string contains the given substring. Defaults to `StringComparison.OrdinalIgnoreCase`.

```csharp
// Case-insensitive (default)
var rule = new ValiFlow<Product>()
    .Contains(x => x.Name, "test");

// Explicit comparison
var rule = new ValiFlow<Product>()
    .Contains(x => x.Name, "test", StringComparison.Ordinal);
```

> **Note:** `string.Contains(string, StringComparison)` is not EF Core translatable.

### `Contains` (multi-selector)

Passes when the substring is found in any of the specified string properties (OR semantics). Uses `ToLower()` + single-argument `Contains` internally.

```csharp
var rule = new ValiFlow<Product>()
    .Contains("widget", x => x.Name, x => x.Description, x => x.Tags);
```

> **Note:** In-memory only — not EF Core translatable.

### `StartsWith`

Passes when the string begins with the given prefix. Uses `OrdinalIgnoreCase` by default.

```csharp
var rule = new ValiFlow<Order>()
    .StartsWith(x => x.Reference, "ORD");
```

### `EndsWith`

Passes when the string ends with the given suffix. Uses `OrdinalIgnoreCase` by default.

```csharp
var rule = new ValiFlow<User>()
    .EndsWith(x => x.Email, ".com");
```

### `EqualsIgnoreCase`

Passes when the string equals the target value, ignoring case (`StringComparison.OrdinalIgnoreCase`).

```csharp
var rule = new ValiFlow<Product>()
    .EqualsIgnoreCase(x => x.Code, "ABC");
```

### `IsUpperCase`

Passes when every alphabetic character in the string is uppercase.

```csharp
var rule = new ValiFlow<Product>()
    .IsUpperCase(x => x.Code);
```

### `IsLowerCase`

Passes when every alphabetic character in the string is lowercase.

```csharp
var rule = new ValiFlow<Product>()
    .IsLowerCase(x => x.Slug);
```

### `HasOnlyDigits`

Passes when the string is non-empty and contains only digit characters (`0`–`9`).

```csharp
var rule = new ValiFlow<User>()
    .HasOnlyDigits(x => x.Pin);
```

### `HasOnlyLetters`

Passes when the string is non-empty and contains only letter characters.

```csharp
var rule = new ValiFlow<User>()
    .HasOnlyLetters(x => x.Name);
```

### `HasLettersAndNumbers`

Passes when the string contains at least one letter and at least one digit.

```csharp
var rule = new ValiFlow<User>()
    .HasLettersAndNumbers(x => x.Password);
```

### `HasSpecialCharacters`

Passes when the string contains at least one character that is neither a letter nor a digit.

---

## Mini Examples

### 1) Basic email + domain guard

```csharp
var rule = new ValiFlow<User>()
    .IsEmail(u => u.Email)
    .EndsWith(u => u.Email, "@company.com");
```

### 2) Search across multiple fields (in-memory)

```csharp
var rule = new ValiFlow<Product>()
    .Contains("wireless", x => x.Name, x => x.Description, x => x.Tags);
```

```csharp
var rule = new ValiFlow<User>()
    .HasSpecialCharacters(x => x.Password);
```

---

## Format Validators

> **⚠️ Timeout:** All format validator methods use compiled `Regex` internally and will throw `RegexMatchTimeoutException` if the input causes catastrophic backtracking. Predefined pattern methods (IsEmail, IsUrl, etc.) have a 5-second timeout; `RegexMatch` has a 10-second timeout for user-supplied patterns. Wrap calls in `try/catch` if validating untrusted input.

All format validators use compiled regex patterns defined in `RegularExpressions/RegularExpression.cs`. They are evaluated in-memory.

### `IsEmail`

Passes when the value matches a standard email format.

```csharp
var rule = new ValiFlow<User>()
    .IsEmail(x => x.Email);
```

### `IsUrl`

Passes when the value is a valid HTTP/HTTPS URL.

```csharp
var rule = new ValiFlow<User>()
    .IsUrl(x => x.Website);
```

### `IsGuid`

Passes when the value is a valid GUID string (with or without hyphens).

```csharp
var rule = new ValiFlow<Order>()
    .IsGuid(x => x.ExternalId);
```

### `IsPhoneNumber`

Passes when the value matches an international or local phone number pattern.

```csharp
var rule = new ValiFlow<User>()
    .IsPhoneNumber(x => x.Phone);
```

### `IsJson`

Passes when the value appears to be a valid JSON object or array (structural pattern check, not full parse).

```csharp
var rule = new ValiFlow<Order>()
    .IsJson(x => x.Payload);
```

### `NotJson`

Passes when the value does not match the JSON pattern.

```csharp
var rule = new ValiFlow<Order>()
    .NotJson(x => x.Value);
```

### `IsBase64`

Passes when the value is a valid Base64-encoded string.

```csharp
var rule = new ValiFlow<User>()
    .IsBase64(x => x.Token);
```

### `NotBase64`

Passes when the value is not a valid Base64-encoded string.

```csharp
var rule = new ValiFlow<Order>()
    .NotBase64(x => x.Value);
```

### `IsCreditCard`

Passes when the value matches a Luhn-compatible credit card number pattern (digits, optional spaces/hyphens).

```csharp
var rule = new ValiFlow<Order>()
    .IsCreditCard(x => x.CardNumber);
```

### `IsIPv4`

Passes when the value is a valid IPv4 address (e.g., `192.168.1.1`).

```csharp
var rule = new ValiFlow<Order>()
    .IsIPv4(x => x.IpAddress);
```

### `IsIPv6`

Passes when the value is a valid IPv6 address.

```csharp
var rule = new ValiFlow<Order>()
    .IsIPv6(x => x.IpAddress);
```

### `IsHexColor`

Passes when the value is a valid CSS hex color in `#RGB` or `#RRGGBB` format.

```csharp
var rule = new ValiFlow<Product>()
    .IsHexColor(x => x.Color);
```

### `IsSlug`

Passes when the value contains only lowercase letters, digits, and hyphens (URL slug format).

```csharp
var rule = new ValiFlow<Product>()
    .IsSlug(x => x.UrlSlug);
```

---

## Pattern Matching

### `RegexMatch`

Passes when the value matches the provided regular expression pattern.

```csharp
var rule = new ValiFlow<Order>()
    .RegexMatch(x => x.PostalCode, @"^\d{5}$");
```

### `MatchesWildcard`

Passes when the value matches a wildcard pattern where `*` means any sequence of characters and `?` means exactly one character.

```csharp
var rule = new ValiFlow<Order>()
    .MatchesWildcard(x => x.FileName, "report_*.pdf");
```

> **Note:** In-memory only — not EF Core translatable.

### `IsOneOf`

Passes when the value exactly matches one of the entries in the provided list. An optional `StringComparison` parameter controls case sensitivity (defaults to `OrdinalIgnoreCase`).

```csharp
var rule = new ValiFlow<User>()
    .IsOneOf(x => x.Status, ["active", "inactive", "pending"]);

// Case-sensitive
var rule = new ValiFlow<User>()
    .IsOneOf(x => x.Role, ["Admin", "Editor"], StringComparison.Ordinal);
```

> **Note:** In-memory only — not EF Core translatable.

---

## Combined Example

The following rule validates a `User` entity covering the most common string requirements:

```csharp
var rule = new ValiFlow<User>()
    .IsNotNullOrWhiteSpace(x => x.Name)
    .MinLength(x => x.Name, 2)
    .MaxLength(x => x.Name, 100)
    .IsEmail(x => x.Email)
    .IsOneOf(x => x.Role, ["admin", "editor", "viewer"])
    .MinLength(x => x.Password, 8)
    .HasLettersAndNumbers(x => x.Password);

bool isValid = rule.Evaluate(user);

// Or build the expression tree for use with LINQ
Expression<Func<User, bool>> expr = rule.Build();
var validUsers = dbContext.Users.Where(expr).ToList(); // only non-in-memory methods
```
