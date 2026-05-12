---
name: pageObjects
description: Guidelines for creating and using Page Object Models (POMs) in E2E testing
---

# Page Object Models (POMs)

Guidelines for maintaining robust and readable E2E tests using Playwright.

## Definition and Purpose

A POM encapsulates the interactions and state of application pages in dedicated objects, improving reusability, maintainability, and readability.

## Mandatory Structure

- **Location**: `e2e/pageObjects/`.
- **Base Class**: Must extend `BasePage` (from `e2e/pageObjects/BasePage.ts`).
- **Locators (Selectors)**:
  - Define as class properties (generally `private readonly`).
  - Use `data-testid` whenever possible.
- **Action Methods**: Encapsulate user actions (clicks, navigation, form filling).
- **Navigation Methods**: Methods like `navigate()` to go directly to a page.
- **Assertion/State Methods**: POMs should provide state queries or simple state checks, but actual `expect` calls belong in tests.

## Usage in Tests

- Import necessary Page Objects in `.spec.ts` files.
- Instantiate POMs, usually in `test.beforeEach`.
- Use POM methods for all UI interactions.

> [!IMPORTANT]
> **NO `expect` in POMs**. Assertions belong in test files (fixtures). Prefer classic `expect(page.locator(selector)).toBeVisible()` for clarity.
