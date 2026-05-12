# Page Object Model (POM) Best Practices

## Core Principles
1. **Encapsulation**: Encapsulate page details into classes and methods.
2. **Reusability**: Reuse logic across multiple tests.
3. **Wait Strategies**: Avoid hardwaits; use Playwright assertions and `locator` waits.
4. **Naming**: Use camelCase for methods/variables, PascalCase for classes.

## Common Red Flags
- Page objects with hardcoded selector values.
- Methods with complex business logic (should be kept simple).
- Not using `this.page` correctly.
- Lack of clear method names.

## Verification Checklist
- [ ] Page object methods follow the Page Object Model pattern.
- [ ] Locator methods are descriptive.
- [ ] Tests use page objects for navigation and interactions.
