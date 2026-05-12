# Next.js 15 Best Practices

## Server Components (RSC)
- Fetch data in Server Components by default.
- Use `Suspense` for loading states.
- Minimize `use client` to only where interactivity is needed.

## Routing (App Router)
- Segments must be lowercase and descriptive.
- Use `page.tsx` for route entry.
- Use `layout.tsx` for shared UI across subroutes.
- Use `loading.tsx` and `error.tsx` for fallback states.

## Data Fetching
- Use standard `fetch` with caching options.
- Use `revalidatePath` and `revalidateTag` for on-demand revalidation.

## SEO
- Use metadata objects in `page.tsx`.
- Use standard HTML tags for SEO purposes.
