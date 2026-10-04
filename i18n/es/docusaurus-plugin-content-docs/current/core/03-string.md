---
sidebar_position: 3
---

# Métodos de Cadenas

Esta página cubre todos los métodos relacionados con strings disponibles en `ValiFlow<T>`. Están definidos en `StringExpression<TBuilder, T>` y son accesibles directamente desde tu instancia del builder `ValiFlow<T>`.

---

## Longitud

### `MinLength`

Pasa cuando el string tiene al menos N caracteres. Retorna `false` para `null`.

```csharp
var rule = new ValiFlow<User>()
    .MinLength(x => x.Name, 3);
```

### `MaxLength`

Pasa cuando el string tiene como máximo N caracteres. Retorna `true` para `null`.

```csharp
var rule = new ValiFlow<User>()
    .MaxLength(x => x.Name, 100);
```

### `LengthBetween`

Pasa cuando la longitud del string se encuentra dentro del rango inclusivo `[min, max]`.

```csharp
var rule = new ValiFlow<User>()
    .LengthBetween(x => x.Name, 3, 100);
```

### `ExactLength`

Pasa cuando el string tiene exactamente N caracteres.

```csharp
var rule = new ValiFlow<Order>()
    .ExactLength(x => x.PostalCode, 5);
```

---

## Null / Empty / Whitespace

### `IsNullOrEmpty`

Pasa cuando el valor es `null` o un string vacío (`""`).

```csharp
var rule = new ValiFlow<User>()
    .IsNullOrEmpty(x => x.Description);
```

### `IsNotNullOrEmpty`

Pasa cuando el valor no es `null` ni `""`.

```csharp
var rule = new ValiFlow<User>()
    .IsNotNullOrEmpty(x => x.Name);
```

### `IsNullOrWhiteSpace`

Pasa cuando el valor es `null`, `""`, o contiene únicamente caracteres de espacio en blanco.

```csharp
var rule = new ValiFlow<Product>()
    .IsNullOrWhiteSpace(x => x.Code);
```

### `IsNotNullOrWhiteSpace`

Pasa cuando el valor contiene al menos un carácter que no sea espacio en blanco.

```csharp
var rule = new ValiFlow<Product>()
    .IsNotNullOrWhiteSpace(x => x.Code);
```

### `IsTrimmed`

Pasa cuando el valor no tiene espacios en blanco al inicio ni al final (equivalente a `value == value.Trim()`). Retorna `true` para `null`.

```csharp
var rule = new ValiFlow<User>()
    .IsTrimmed(x => x.Name);
```

---

## Contenido

### `Contains` (selector único)

Pasa cuando el string contiene la subcadena indicada. Por defecto usa `StringComparison.OrdinalIgnoreCase`.

```csharp
// Sin distinción de mayúsculas (por defecto)
var rule = new ValiFlow<Product>()
    .Contains(x => x.Name, "test");

// Con comparación explícita
var rule = new ValiFlow<Product>()
    .Contains(x => x.Name, "test", StringComparison.Ordinal);
```

> **Nota:** `string.Contains(string, StringComparison)` no es traducible por EF Core.

### `Contains` (múltiples selectores)

Pasa cuando la subcadena se encuentra en cualquiera de las propiedades string indicadas (semántica OR). Internamente usa `ToLower()` más `Contains` de un solo argumento.

```csharp
var rule = new ValiFlow<Product>()
    .Contains("widget", x => x.Name, x => x.Description, x => x.Tags);
```

> **Nota:** Solo en memoria — no traducible por EF Core.

### `StartsWith`

Pasa cuando el string comienza con el prefijo indicado. Por defecto usa `OrdinalIgnoreCase`.

```csharp
var rule = new ValiFlow<Order>()
    .StartsWith(x => x.Reference, "ORD");
```

### `EndsWith`

Pasa cuando el string termina con el sufijo indicado. Por defecto usa `OrdinalIgnoreCase`.

```csharp
var rule = new ValiFlow<User>()
    .EndsWith(x => x.Email, ".com");
```

### `EqualsIgnoreCase`

Pasa cuando el string es igual al valor objetivo sin distinción de mayúsculas (`StringComparison.OrdinalIgnoreCase`).

```csharp
var rule = new ValiFlow<Product>()
    .EqualsIgnoreCase(x => x.Code, "ABC");
```

### `IsUpperCase`

Pasa cuando todos los caracteres alfabéticos del string están en mayúsculas.

```csharp
var rule = new ValiFlow<Product>()
    .IsUpperCase(x => x.Code);
```

### `IsLowerCase`

Pasa cuando todos los caracteres alfabéticos del string están en minúsculas.

```csharp
var rule = new ValiFlow<Product>()
    .IsLowerCase(x => x.Slug);
```

### `HasOnlyDigits`

Pasa cuando el string no está vacío y contiene únicamente dígitos (`0`–`9`).

```csharp
var rule = new ValiFlow<User>()
    .HasOnlyDigits(x => x.Pin);
```

### `HasOnlyLetters`

Pasa cuando el string no está vacío y contiene únicamente letras.

```csharp
var rule = new ValiFlow<User>()
    .HasOnlyLetters(x => x.Name);
```

### `HasLettersAndNumbers`

Pasa cuando el string contiene al menos una letra y al menos un dígito.

```csharp
var rule = new ValiFlow<User>()
    .HasLettersAndNumbers(x => x.Password);
```

### `HasSpecialCharacters`

Pasa cuando el string contiene al menos un carácter que no sea letra ni dígito.

```csharp
var rule = new ValiFlow<User>()
    .HasSpecialCharacters(x => x.Password);
```

---

## Validadores de Formato

Todos los validadores de formato usan patrones de regex compilados definidos en `RegularExpressions/RegularExpression.cs`. Se evalúan en memoria.

### `IsEmail`

Pasa cuando el valor tiene un formato de correo electrónico estándar.

```csharp
var rule = new ValiFlow<User>()
    .IsEmail(x => x.Email);
```

### `IsUrl`

Pasa cuando el valor es una URL HTTP/HTTPS válida.

```csharp
var rule = new ValiFlow<User>()
    .IsUrl(x => x.Website);
```

### `IsGuid`

Pasa cuando el valor es un string GUID válido (con o sin guiones).

```csharp
var rule = new ValiFlow<Order>()
    .IsGuid(x => x.ExternalId);
```

### `IsPhoneNumber`

Pasa cuando el valor coincide con un patrón de número telefónico internacional o local.

```csharp
var rule = new ValiFlow<User>()
    .IsPhoneNumber(x => x.Phone);
```

### `IsJson`

Pasa cuando el valor parece ser un objeto o array JSON válido (verificación estructural de patrón, sin parseo completo).

```csharp
var rule = new ValiFlow<Order>()
    .IsJson(x => x.Payload);
```

### `NotJson`

Pasa cuando el valor no coincide con el patrón JSON.

```csharp
var rule = new ValiFlow<Order>()
    .NotJson(x => x.Value);
```

### `IsBase64`

Pasa cuando el valor es un string codificado en Base64 válido.

```csharp
var rule = new ValiFlow<User>()
    .IsBase64(x => x.Token);
```

### `NotBase64`

Pasa cuando el valor no es un string codificado en Base64 válido.

```csharp
var rule = new ValiFlow<Order>()
    .NotBase64(x => x.Value);
```

### `IsCreditCard`

Pasa cuando el valor coincide con un patrón de número de tarjeta de crédito compatible con Luhn (dígitos, con espacios u guiones opcionales).

```csharp
var rule = new ValiFlow<Order>()
    .IsCreditCard(x => x.CardNumber);
```

### `IsIPv4`

Pasa cuando el valor es una dirección IPv4 válida (p. ej. `192.168.1.1`).

```csharp
var rule = new ValiFlow<Order>()
    .IsIPv4(x => x.IpAddress);
```

### `IsIPv6`

Pasa cuando el valor es una dirección IPv6 válida.

```csharp
var rule = new ValiFlow<Order>()
    .IsIPv6(x => x.IpAddress);
```

### `IsHexColor`

Pasa cuando el valor es un color hexadecimal CSS válido en formato `#RGB` o `#RRGGBB`.

```csharp
var rule = new ValiFlow<Product>()
    .IsHexColor(x => x.Color);
```

### `IsSlug`

Pasa cuando el valor contiene únicamente letras minúsculas, dígitos y guiones (formato de slug para URLs).

```csharp
var rule = new ValiFlow<Product>()
    .IsSlug(x => x.UrlSlug);
```

---

## Coincidencia de Patrones

### `RegexMatch`

Pasa cuando el valor coincide con la expresión regular proporcionada.

```csharp
var rule = new ValiFlow<Order>()
    .RegexMatch(x => x.PostalCode, @"^\d{5}$");
```

### `MatchesWildcard`

Pasa cuando el valor coincide con un patrón wildcard donde `*` representa cualquier secuencia de caracteres y `?` representa exactamente un carácter.

```csharp
var rule = new ValiFlow<Order>()
    .MatchesWildcard(x => x.FileName, "report_*.pdf");
```

> **Nota:** Solo en memoria — no traducible por EF Core.

### `IsOneOf`

Pasa cuando el valor coincide exactamente con una de las entradas de la lista proporcionada. Un parámetro `StringComparison` opcional controla la distinción de mayúsculas (por defecto `OrdinalIgnoreCase`).

```csharp
var rule = new ValiFlow<User>()
    .IsOneOf(x => x.Status, ["active", "inactive", "pending"]);

// Con distinción de mayúsculas
var rule = new ValiFlow<User>()
    .IsOneOf(x => x.Role, ["Admin", "Editor"], StringComparison.Ordinal);
```

> **Nota:** Solo en memoria — no traducible por EF Core.

---

## Ejemplo Combinado

La siguiente regla valida una entidad `User` cubriendo los requisitos de string más comunes:

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

// O construir el árbol de expresiones para usar con LINQ
Expression<Func<User, bool>> expr = rule.Build();
var validUsers = dbContext.Users.Where(expr).ToList(); // solo métodos no en-memoria
```
