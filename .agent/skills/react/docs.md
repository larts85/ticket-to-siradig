# React Performance & Best Practices

## Memoization
- Use `useMemo` for heavy computation (e.g., long list processing).
- Use `useCallback` for stable function references in props.
- Wrap complex components with `React.memo` to prevent re-renders.

## Hydration (Next.js 15)
- Avoid discrepancies between server and client-rendered content.
- Use `useEffect` or `Suspense` for client-only data.
- Check search params and routing using `useSearchParams` and `useRouter` where appropriate.

## Testing React Components
- **Unit/Component Tests**: Test in isolation with RTL.
- **Integration Tests**: Test multiple components interacting together.
- Use `renderWithProvider` to provide required context.
- Verify user interactions with `fireEvent` and `waitFor`.

## Folder Organization
- Route segments follow Next.js conventions (page, layout, loading).
- Shared UI components in `shared/ui/`.
- Feature-specific components should be colocated.
