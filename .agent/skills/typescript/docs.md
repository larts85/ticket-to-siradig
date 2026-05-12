# TypeScript Specific Patterns

## Custom Parameter Destructuring
When functions receive objects as parameters, use destructuring with inline type annotations:
```typescript
function Greet({ name, age }: { name: string; age: number }) {
  // ...
}
```

## Explicit Return Types
Always specify explicit return types for public functions to improve readability and catch errors.

## Discrimination Unions
Use discriminated unions (tagged unions) for state management.
```typescript
type Result<T, E> = { success: true; data: T } | { success: false; error: E };
```

## TypeScript Best Practices
- **Prefer interfaces** for public APIs.
- **Prefer types** for unions/intersections/internal types.
- **Enable strict mode** in `tsconfig.json`.
- Use **Generics** `<T>` for reusability.
- Use **Readonly** properties to enforce immutability.
