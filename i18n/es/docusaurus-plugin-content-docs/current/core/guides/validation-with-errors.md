# Guía — Validación con Errores: WithMessage, WithError y Validate

## La diferencia entre IsValid y Validate

`IsValid` responde una sola pregunta: "¿pasa el objeto todas las reglas?" Retorna `true` o `false`.

`Validate` responde una pregunta más rica: "¿qué reglas falla el objeto y por qué?" Retorna un `ValidationResult` con la lista de errores detallados.

```csharp
// IsValid: simple, rápido
bool ok = rule.IsValid(user);

// Validate: detallado, con errores
ValidationResult result = rule.Validate(user);
result.IsValid          // bool
result.Errors           // IReadOnlyList<ValidationError>
result.Errors[0].ErrorCode    // string? — código machine-readable
result.Errors[0].Message      // string? — mensaje legible
result.Errors[0].PropertyPath // string? — la propiedad que falló
result.Errors[0].Severity     // Severity — Info/Warning/Error/Critical
```

---

## Agregar mensajes a las condiciones

Por defecto, cada condición no tiene mensaje. Para agregar uno, se encadena `.WithMessage()` inmediatamente después de la condición:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithMessage("El email es obligatorio")
    .MinLength(u => u.Email, 5)
        .WithMessage("El email debe tener al menos 5 caracteres")
    .IsEmail(u => u.Email)
        .WithMessage("El formato del email no es válido")
    .GreaterThan(u => u.Age, 18)
        .WithMessage("El usuario debe ser mayor de edad");
```

`.WithMessage()` afecta a la condición que aparece inmediatamente antes en la cadena.

---

## Agregar código de error

`.WithError()` permite especificar tanto un código (útil para APIs que retornan errores estructurados) como un mensaje:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("USER_EMAIL_REQUIRED", "El email es obligatorio")
    .IsEmail(u => u.Email)
        .WithError("USER_EMAIL_INVALID", "El formato del email no es válido")
    .GreaterThan(u => u.Age, 18)
        .WithError("USER_AGE_UNDERAGE", "El usuario debe ser mayor de 18 años");
```

Si solo se necesita el código (sin mensaje), se puede pasar `null` como segundo argumento:

```csharp
.NotNull(u => u.Email).WithError("EMAIL_REQUIRED", null)
```

---

## Severidad

Cada condición puede tener una severidad. Esto permite distinguir errores críticos de advertencias:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("EMAIL_REQUIRED", "El email es requerido")
        .WithSeverity(Severity.Error)   // falla crítica, el usuario no puede continuar
    .MinLength(u => u.Bio, 20)
        .WithMessage("La bio podría ser más descriptiva")
        .WithSeverity(Severity.Warning) // advertencia, no bloquea
    .MaxLength(u => u.Bio, 500)
        .WithMessage("La bio es demasiado larga")
        .WithSeverity(Severity.Error);
```

Los valores de `Severity` son:

| Valor | Uso sugerido |
|---|---|
| `Severity.Info` | Sugerencias o recomendaciones, no bloquean |
| `Severity.Warning` | Condiciones potencialmente problemáticas |
| `Severity.Error` | Errores que impiden continuar (default) |
| `Severity.Critical` | Errores graves del sistema o de seguridad |

---

## Usar Validate

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("EMAIL_REQUIRED", "El email es obligatorio")
    .IsEmail(u => u.Email)
        .WithError("EMAIL_INVALID", "El email no tiene formato válido")
    .GreaterThan(u => u.Age, 18)
        .WithError("AGE_UNDERAGE", "Debe ser mayor de edad");

var user = new User { Email = "no-es-email", Age = 16 };
var result = rule.Validate(user);

Console.WriteLine(result.IsValid);  // false

foreach (var error in result.Errors)
{
    Console.WriteLine($"[{error.Severity}] {error.ErrorCode}: {error.Message}");
}

// Output:
// [Error] EMAIL_INVALID: El email no tiene formato válido
// [Error] AGE_UNDERAGE: Debe ser mayor de edad
```

### Comportamiento de cortocircuito en Validate

`Validate` evalúa las condiciones de forma similar a cómo `Build()` construye el árbol: respeta la lógica AND/OR. Si un grupo AND falla en una condición, las condiciones restantes de ese grupo no se evalúan (igual que `&&` en C#).

Para evaluar absolutamente todas las condiciones (sin cortocircuito), usar `ValidateAll`:

```csharp
// Validate: se detiene en la primera condicion que falla de cada grupo AND
var result = rule.Validate(user);

// ValidateAll: evalua TODAS las condiciones, acumula todos los errores
var result = rule.ValidateAll(user);
```

---

## Ejemplo de uso en una API REST

```csharp
// En un controller o command handler:

public class CreateUserCommand
{
    public string? Email { get; set; }
    public int Age { get; set; }
    public string? Name { get; set; }
}

// Regla con mensajes de error
private static readonly ValiFlow<CreateUserCommand> _createUserRule =
    new ValiFlow<CreateUserCommand>()
        .NotNull(c => c.Email)
            .WithError("EMAIL_REQUIRED", "El email es requerido")
        .IsEmail(c => c.Email)
            .WithError("EMAIL_INVALID", "El email no tiene un formato válido")
        .NotNull(c => c.Name)
            .WithError("NAME_REQUIRED", "El nombre es requerido")
        .MinLength(c => c.Name, 2)
            .WithError("NAME_TOO_SHORT", "El nombre debe tener al menos 2 caracteres")
        .GreaterThan(c => c.Age, 0)
            .WithError("AGE_INVALID", "La edad debe ser mayor que 0");

// En el método del controller:
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

    // procesar el comando
    return Ok();
}
```

---

## PathProperty: indicar la propiedad que falló

Se puede especificar explícitamente la ruta de la propiedad afectada por un error. Esto es útil para APIs que mapean errores a campos de formularios:

```csharp
var rule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithError("REQUIRED", "Campo requerido")
        .WithPropertyPath("email")           // para el front-end
    .NotNull(u => u.Address.City)
        .WithError("REQUIRED", "Campo requerido")
        .WithPropertyPath("address.city");   // ruta de navegación

// En el ValidationError:
error.PropertyPath  // "email" o "address.city"
```

---

## Mensajes lazy (factory de mensaje)

Para mensajes que dependen de un contexto dinámico (localización, valores del objeto, etc.) se puede pasar una función en lugar de un string:

```csharp
var rule = new ValiFlow<User>()
    .MinLength(u => u.Name, 2)
        .WithMessageFactory(() =>
            LocalizationService.Get("validation.name.min_length"));
        // El mensaje se evalúa solo cuando la condición falla
```

Internamente, `ConditionEntry` almacena la factory en `Func<string>? MessageFactory`. La evaluación de la factory ocurre en el momento de construir el `ValidationError`, no cuando se define la regla.

---

## Diferencia entre WithMessage y WithError

```csharp
// WithMessage: solo el mensaje, sin código
.NotNull(u => u.Email).WithMessage("El email es obligatorio")
// error.ErrorCode → null
// error.Message   → "El email es obligatorio"

// WithError: código + mensaje
.NotNull(u => u.Email).WithError("EMAIL_REQUIRED", "El email es obligatorio")
// error.ErrorCode → "EMAIL_REQUIRED"
// error.Message   → "El email es obligatorio"

// WithSeverity: cambia la severidad (se puede combinar con WithMessage o WithError)
.NotNull(u => u.Email)
    .WithError("EMAIL_REQUIRED", "El email es obligatorio")
    .WithSeverity(Severity.Critical)
// error.Severity → Severity.Critical
```

---

## Reglas estáticas vs. reglas por request

Para mejorar el rendimiento, definir las reglas como campos estáticos o singletons cuando sea posible. Una regla sin metadatos dinámicos es completamente reutilizable:

```csharp
// Bien: regla estática, construida una sola vez, reutilizada en cada request
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
    .IsEmail(u => u.Email)
    .GreaterThan(u => u.Age, 18);

// El freeze ocurre en el primer uso, después es inmutable y thread-safe.
```

Si los mensajes de error deben ser localizados (varían por idioma), usar `WithMessageFactory()` con una factory que consulte el idioma del request en tiempo de evaluación:

```csharp
private static readonly ValiFlow<User> _userRule = new ValiFlow<User>()
    .NotNull(u => u.Email)
        .WithMessageFactory(() => _localizationService.Get("user.email.required"));
// La factory se evalúa en Validate(), no en la construcción de la regla
// Así la regla puede ser estática aunque los mensajes sean dinámicos
```
