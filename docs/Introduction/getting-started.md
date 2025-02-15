---
sidebar_position: 2
---

# Getting Started

## Installation

To install **Vali-Flow**, simply add the NuGet package to your .NET project:

.NET CLI:

```sh
dotnet add package vali-flow
```

## Basic Usage

Once installed, you can start using **Vali-Flow** to define validation rules in a structured and fluent manner.

### Creating a Simple Validation

```csharp
ValiFlow builder = new ValiFlow<string>()
                        .Add(val => !string.IsNullOrWhiteSpace(val));


var result = validator.Evaluate("test");

if (result)
{
    Console.WriteLine("Validation passed!");
}
else
{
    Console.WriteLine("Validation failed");
}
```

## Next Steps

Now that you have installed **Vali-Flow** and seen a basic example, explore more advanced features:

- [Basic Usage](./usage/basic-usage.md)
- [Advanced Usage](./usage/advanced-usage.md)
- [API Reference](./api-reference/validation-methods.md)

