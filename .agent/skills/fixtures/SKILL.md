---
name: fixtures
description: Guidelines for writing Playwright test files (fixtures) in the flows-e2e repository
---

## AI Assistant Instructions for Writing Test Files (Fixtures) with Playwright in `flows-e2e`

AI Assistant, this document describes the guidelines and best practices you should follow when helping to write or modify test files (fixtures or specs) using Playwright in the `flows-e2e` repository. These files are located in the `e2e/fixtures/` directory.

### 1. Purpose of Test Files (`.spec.ts`) - Your Understanding

- **Content**: These files contain the logic for E2E tests.
- **They Define**:
  - **Test Suites (`describe` blocks)**: To group related tests.
  - **Test Cases (`test` or `it` blocks)**: For individual scenarios.
  - **Test Steps**: You should use Page Objects (see `pageObjects.instructions.md`) to interact with the application and perform assertions to verify behavior.

### 2. Test File Structure - How You Should Generate/Assist It

Guide the user so that test files follow a structure similar to this:

```typescript
import { test } from '../../../pageObjects'
import { ActionTypes } from '../../../types/actionTypes'

test('Creates challenge in Gamification', async ({ gamificationList }) => {
  await gamificationList.landOnPage()
  await gamificationList.createChallenge()
  await gamificationList.checkForCanvasWorkflow([ActionTypes.EVENT])
})
```

### 3. Using Page Objects - Your Role

- **Import**: Ensure the correct Page Objects are imported from `e2e/pageObjects/`.
- **Instantiation**: Guide to instantiate Page Objects, usually in `test.beforeEach`.
- **Interaction**: Emphasize the use of Page Object methods for UI interactions. This is key to keeping tests clean and decoupled from UI implementation.

### 4. Test Data Management - How to Advise

- **Small/Specific Data**: Can be defined in the test if not reusable.
- **Reusable/Complex Data**:
  - Guide to define them in TypeScript/JSON files within `e2e/data/` (e.g. `e2e/data/users.ts`).
  - Ensure they are imported correctly.
  ```typescript
  // Reminder from e2e/data/users.ts:
  export const TEST_USERS = {
    admin: {
      username: 'admin-at-example.com',
      password: process.env.ADMIN_PASSWORD,
    },
    // ...
  }
  ```
- **Sensitive Data (Passwords, Tokens)**:
  - **NEVER** hardcode them directly.
  - They should always be handled through environment variables (e.g. `process.env.USER_PASSWORD`).
  - Guide the user to configure their `.env` file (and remind them it should not be committed).
  - They can be referenced in `e2e/constants/config.ts` if needed for application logic, but the actual value comes from `.env`.

### 5. Assertions - Your Guidelines

- **Library**: DO NOT use `expect` or `page` inside fixtures, you must consume only instances of pageObject which are stracted from `test` function callback:
  ```typescript
  test('test name', async ({ pageObjectInstance }) => {
    await pageObjectInstance.myMethod()
  })
  ```
- **Clarity**: Assertions should be clear and verify critical results.
- **Descriptive Messages**: **Always** include a descriptive message in assertions. This is vital for debugging.
  - `expect(element, 'Descriptive message of why it fails').toBeVisible();`

### 6. Organization and Naming - Standards to Follow

- **Fixtures Root Directory**: `e2e/fixtures/`.
- **Subdirectories**: To group by functionality (e.g. `e2e/fixtures/workflow/`).
- **File Names**: kebab-case or camelCase, followed by `.fixtures.spec.ts` or `.spec.ts` (e.g. `create-workflow.fixtures.spec.ts`).
- **Suite Names (`describe`)**: Descriptive of functionality (e.g. `'User Authentication'`). If possible, try not to use it, in order to simplify test extension structure and avoid unnecessary nesting.
- **Test Case Names (`test`)**: Clear about scenario and expected result (e.g. `'should login successfully with valid credentials'`).

### 7. ActionTypes Function Execution Order and avoidExecution Pattern

**CRITICAL UNDERSTANDING**: In `actionFormFilling` files (e.g., `e2e/pageObjects/workflow/actionFormFilling/actionsByCategory/notifications/whatsapp.ts`):

- **Execution Order**: Functions are executed in **alphabetical order** by their export names when called via `fillFormFields()` method.
- **ValidateActionsByCategories vs ActionSpecificTests**:
  - `ValidateActionsByCategories` tests run ALL exported functions from an actionType file in alphabetical order
  - `ActionSpecificTests` run SPECIFIC individual functions using `fillFormFieldByIndividualFunction()`

**avoidExecution Pattern**:

```typescript
export const myTestFunction: FillActionFormFunction = async ({
  page,
  expect,
  avoidExecution = true, // Default to true for ValidateActionsByCategories
}) => {
  // Skip execution if avoidExecution is true
  if (avoidExecution) {
    return
  }

  // Test logic here...
}
```

**When to use avoidExecution**:

- **Default `true`**: For functions that should NOT run in `ValidateActionsByCategories` tests
- **Set to `false`**: Only when called specifically from `ActionSpecificTests` using `fillFormFieldByIndividualFunction()`

**ActionSpecificTests Pattern**:

```typescript
// In e2e/fixtures/workflow/ActionSpecificTests/
await actionFormFilling.fillFormFieldByIndividualFunction({
  action: ACTIONS.find((action) => action.type === ActionTypes.WHATSAPP)!,
  callbackName: 'validateSpecificBugFix',
  props: {
    avoidExecution: false, // Execute the function
  },
})
```

### 8. Your Guiding Principles When Working with Fixtures

- **Atomic and Independent Tests**: Each `test` should be independent. Use `test.beforeEach` for common setup and `test.afterEach` for cleanup if necessary.
- **Avoid `page.waitForTimeout()`**: **Don't suggest this**. Playwright has auto-wait. For specific conditions, use web assertions like `await expect(locator).toBeVisible();`.
- **One Flow per Test**: Ideally, each test verifies a specific flow or condition.
- **Key References**: Remind the user (and yourself) to consult `e2e/README.md` and `CODING_GUIDELINES.md` (mentioned in `general.instructions.md`).
- **Comments**: Encourage adding comments for complex logic or non-obvious decisions.
- **Routing**: Each folder inside `e2e/fixtures` or `e2e/pageObjects` represent a page of FLOWS aplication.
- **Function Naming**: Consider alphabetical execution order when naming functions in actionTypes files.

AI Assistant, by applying these guidelines, you will help me create and maintain test files that are robust, readable, and easy to maintain for the Flows application.
