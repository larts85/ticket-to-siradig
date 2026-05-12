# Frontend Code Review Guidelines

## Core Principles
1. **No Duplication**: Check if a component or helper already exists in `shared/`.
2. **Type Safety**: Avoid using `any`; use specific interfaces or `unknown`.
3. **Accessibility (a11y)**: Check for ARIA roles and proper semantic HTML.
4. **Performance**: Avoid unnecessary re-renders; use `memo`, `useMemo`, and `useCallback` appropriately.

## Common Red Flags
- Components with more than 300 lines of code.
- Hardcoded sensitive values (use `.env` or constants).
- Lack of unit/component tests for complex business logic.
- Poor naming (use camelCase for functions/vars, PascalCase for components).

## Verification Checklist
- [ ] TypeScript compilation passes (`yarn tsc`).
- [ ] No ESLint warnings in touched files.
- [ ] Tests passed for modified components.
- [ ] Responsive design verified (mobile/desktop).
