# Test Fixtures Best Practices

## Core Principles
1. **Isolation**: Tests should run in isolation.
2. **Setup/Teardown**: Use `test.beforeEach` and `test.afterEach` for setup and cleanup.
3. **Data Management**: Use fixtures for data setup and configuration.
4. **Mocking**: Use Playwright methods for mocking network requests.

## Common Red Flags
- Fixtures with hardcoded test data.
- Hardcoded sensitive values (use `.env` or constants).
- Lack of clear method names.

## Verification Checklist
- [ ] Test files follow the fixture pattern.
- [ ] Fixture methods are descriptive.
- [ ] Tests use fixtures for setup and data.
