---
id: vali-flow-nosql-dynamodb
title: Vali-Flow.NoSql.DynamoDB
sidebar_label: DynamoDB
---

# Changelog — Vali-Flow.NoSql.DynamoDB

All notable changes to this package are documented here.  
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) · Versioning: [SemVer](https://semver.org/)

---

## [Unreleased]

---

## [1.2.0] — 2026-10-06

### Added
- `ValiFlowDiagnostics` Activity tracing added to the translator.

---

## [1.0.0] — Initial release

### Added

- `DynamoFilterTranslator` — translates Vali-Flow IR nodes into DynamoDB `FilterExpression` strings and `ExpressionAttributeValues`
- `DynamoFilterExpression` — holds the expression string and the attribute value map
- Support for: equality, comparison, AND/OR/NOT, IN list, LIKE (`contains`, `begins_with`, `attribute_type`), null checks (`attribute_exists` / `attribute_not_exists`)
- `ValiFlowDynamoExtensions.ToDynamoFilter<T>()` — extension method on `ValiFlow<T>`
- XML documentation on all public types and members
