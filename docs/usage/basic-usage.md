---
sidebar_position: 1
---
# Basic Usage

## Getting Started with Vali-Flow

Vali-Flow provides a fluent and flexible API for defining validation rules in .NET. This guide will show you how to create and apply basic validations using **ValiFlow**.

## Creating a Validation Instance

To start using **Vali-Flow**, create an instance of `ValiFlow`. This instance serves as the entry point for defining validation rules.

```csharp
ValiFlow validator = new ValiFlow();
```

## Adding Basic Validations

You can define validation rules using a fluent API. The core methods allow you to define validation logic for different data types.

### Validating a String

The following example ensures that a string is not null, has a minimum length of 5, and contains the word "B":

```csharp
var result = validator<string>
    .Add(val => val.Equals("Buzzi"))
    .IsNotNull(val => val)
    .MinLength(val => val, 5)
    .Contains(val => val, "B")
    .Evaluate("Buzzi");
```

If any of these conditions fail, Evaluate() will return **false**.

### Validating a Number

This example checks if a number is greater than 10 and less than 100:

```csharp
var result = validator<int>
    .IsGreaterThan(x => x, 10)
    .LessThan(x => x, 100)
    .Evaluate(98);
```
If any of these conditions fail, Evaluate() will return **false**.

### Validating a Collection of Numbers

Collections can also be validated. Here, we ensure that the collection contains at least one even number:

```csharp
var numbers = new List<int> { 2, 4, 6, 8 };

var result = validator
    .Add(n => n % 2 == 0)
    .EvaluateAll(numbers);

```



