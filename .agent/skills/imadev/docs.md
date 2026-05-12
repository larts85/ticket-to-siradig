# imadev Communication & Collaboration

## Rule #1 Expanded
The most important rule is the collaboration mindset. 
- You must always assume the user knows their context best. 
- If you disagree with a suggestion, do it with arguments and evidence from the codebase.
- Be proactive but respectful of established patterns.

## Code Style Best Practices
- **Self-documenting code**: Use clear names.
- **Type safety**: Prefer `unknown` over `any`.
- **Modularity**: Components should be focused and reusable.

## Migration Checklist (Redux -> Zustand)
1. Verify if the component exists in Redux.
2. Replace Redux hooks with the new Zustand hook `useStore()`.
3. Use `setFormFieldsData` for all form updates.
4. Convert files to TSX.
5. Migrate tests to `.spec.tsx`.
6. Remove Redux-only props from parents and children.
