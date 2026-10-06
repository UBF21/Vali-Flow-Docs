# Guide — Validation with Errors: WithMessage, WithError, and Validate

## The Difference Between IsValid and Validate

`IsValid` answers a single question: "Does the object pass all rules?" Returns `true` or `false`.

`Validate` answers a richer question: "Which rules does the object fail and why?" Returns a `ValidationResult` with the list of detailed errors.

```csharp
// IsValid: simple, fast
bool ok = rule.IsValid(user);

// Validate: detailed, with errors
ValidationResult result = rule.Validate(user);
result.IsValid          // bool
result.Errors           // IReadOnlyList<ValidationError>
result.Errors[0].ErrorCode    // string? — machine-readable code
result.Errors[0].Message      // string? — human-readable message
result.Errors[0].PropertyPath // string? — the property that failed
result.Errors[0].Severity     // Severity — Info/Warning/Error/Critical
```

---

## Adding Messages to Conditions

By default, each condition has no message. To add one, chain `.WithMessage()` immediately after the condition:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithMessage("Email is required")
    .MinLength(u => u.Email, 5)
        .WithMessage("Email must be at least 5 characters long")
    .IsEmail(u => u.Email)
        .WithMessage("Email format is not valid")
    .GreaterThan(u => u.Age, 18)
        .WithMessage("User must be of legal age");
```

`.WithMessage()` affects the condition that immediately precedes it in the chain.

---

## Adding an Error Code

`.WithError()` allows specifying both a code (useful for APIs that return structured errors) and a message:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("USER_EMAIL_REQUIRED", "Email is required")
    .IsEmail(u => u.Email)
        .WithError("USER_EMAIL_INVALID", "Email format is not valid")
    .GreaterThan(u => u.Age, 18)
        .WithError("USER_AGE_UNDERAGE", "User must be over 18 years old");
```

If only the code is needed (without a message), `null` can be passed as the second argument:

```csharp
.NotNull(u => u.Email).WithError("EMAIL_REQUIRED", null)
```

---

## Severity

Each condition can have a severity. This allows distinguishing critical errors from warnings:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("EMAIL_REQUIRED", "Email is required")
        .WithSeverity(Severity.Error)   // critical failure, user cannot continue
    .MinLength(u => u.Bio, 20)
        .WithMessage("Your bio could be more descriptive")
        .WithSeverity(Severity.Warning) // warning, does not block
    .MaxLength(u => u.Bio, 500)
        .WithMessage("Your bio is too long")
        .WithSeverity(Severity.Error);
```

`Severity` values are:

| Value | Suggested Use |
|---|---|
| `Severity.Info` | Suggestions or recommendations, do not block |
| `Severity.Warning` | Potentially problematic conditions |
| `Severity.Error` | Errors that prevent continuation (default) |
| `Severity.Critical` | Serious system or security errors |

`Severity.Info` only appears in `ValidationResult` when the condition **fails** and has an attached message. A failing `Info` condition without `WithMessage`/`WithError` is silently skipped in all result collections.

---

## Using Validate

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("EMAIL_REQUIRED", "Email is required")
    .IsEmail(u => u.Email)
        .WithError("EMAIL_INVALID", "Email does not have a valid format")
    .GreaterThan(u => u.Age, 18)
        .WithError("AGE_UNDERAGE", "Must be of legal age");

var user = new User { Email = "not-an-email", Age = 16 };
var result = rule.Validate(user);

Console.WriteLine(result.IsValid);  // false

foreach (var error in result.Errors)
{
    Console.WriteLine($"[{error.Severity}] {error.ErrorCode}: {error.Message}");
}

// Output:
// [Error] EMAIL_INVALID: Email does not have a valid format
// [Error] AGE_UNDERAGE: Must be of legal age
```

### Short-Circuit Behavior in Validate

`Validate` evaluates conditions in a manner similar to how `Build()` constructs the tree: it respects AND/OR logic. If an AND group fails on a condition, the remaining conditions in that group are not evaluated (same as `&&` in C#).

To evaluate absolutely all conditions (without short-circuiting), use `ValidateAll`:

```csharp
// Validate: stops at the first failing condition in each AND group
var result = rule.Validate(user);

// ValidateAll: evaluates ALL conditions, accumulates all errors
var result = rule.ValidateAll(user);
```

---

## Usage Example in a REST API

```csharp
// In a controller or command handler:

public class CreateUserCommand
{
    public string? Email { get; set; }
    public int Age { get; set; }
    public string? Name { get; set; }
}

// Rule with error messages
private static readonly ValiFlow<CreateUserCommand> _createUserRule =
    new ValiFlow<CreateUserCommand>()
        .NotNull(c => c.Email)
            .WithError("EMAIL_REQUIRED", "Email is required")
        .IsEmail(c => c.Email)
            .WithError("EMAIL_INVALID", "Email does not have a valid format")
        .NotNull(c => c.Name)
            .WithError("NAME_REQUIRED", "Name is required")
        .MinLength(c => c.Name, 2)
            .WithError("NAME_TOO_SHORT", "Name must be at least 2 characters long")
        .GreaterThan(c => c.Age, 0)
            .WithError("AGE_INVALID", "Age must be greater than 0");

// In the controller method:
[HttpPost]
public IActionResult CreateUser(CreateUserCommand command)
{
    var validation = _createUserRule.Validate(command);
    if (!validation.IsValid)
    {
        var errors = validation.Errors
            .Select(e => new { code = e.ErrorCode, message = e.Message })
            .ToList();

        return BadRequest(new { errors });
    }

    // process the command
    return Ok();
}
```

---

## PathProperty: Indicating the Property That Failed

The path of the property affected by an error can be specified explicitly. This is useful for APIs that map errors to form fields:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("REQUIRED", "Required field")
        .WithPropertyPath("email")           // for the front-end
    .NotNull(u => u.Address.City)
        .WithError("REQUIRED", "Required field")
        .WithPropertyPath("address.city");   // navigation path

// In the ValidationError:
error.PropertyPath  // "email" or "address.city"
```

---

## Lazy Messages (Message Factory)

For messages that depend on dynamic context (localization, object values, etc.), a function can be passed instead of a string:

```csharp
var rule = new ValiFlow<User>()
    .MinLength(u => u.Name, 2)
        .WithMessageFactory(() =>
            LocalizationService.Get("validation.name.min_length"));
        // The message is evaluated only when the condition fails
```

> The factory must not return `null`.

Internally, `ConditionEntry` stores the factory in `Func<string>? MessageFactory`. The factory evaluation happens when building the `ValidationError`, not when the rule is defined.

---

## Difference Between WithMessage and WithError

```csharp
// WithMessage: only the message, no code
.NotNull(u => u.Email).WithMessage("Email is required")
// error.ErrorCode → null
// error.Message   → "Email is required"

// WithError: code + message
.NotNull(u => u.Email).WithError("EMAIL_REQUIRED", "Email is required")
// error.ErrorCode → "EMAIL_REQUIRED"
// error.Message   → "Email is required"

// WithSeverity: changes severity (can be combined with WithMessage or WithError)
.NotNull(u => u.Email)
    .WithError("EMAIL_REQUIRED", "Email is required")
    .WithSeverity(Severity.Critical)
// error.Severity → Severity.Critical
```

---

## Static Rules vs. Per-Request Rules

To improve performance, define rules as static fields or singletons when possible. A rule without dynamic metadata is completely reusable:

```csharp
// Good: static rule, built once, reused on each request
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// Freeze happens on first use, then it is immutable and thread-safe.
```

If error messages must be localized (vary by language), use `WithMessageFactory()` with a factory that queries the request language at evaluation time:

```csharp
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithMessageFactory(() => _localizationService.Get("user.email.required"));
// The factory is evaluated in Validate(), not when the rule is constructed
// This allows the rule to be static even if messages are dynamic
```
