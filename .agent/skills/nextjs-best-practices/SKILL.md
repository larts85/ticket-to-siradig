---
name: nextjs-best-practices
description: Best practices for developing with Next.js App Router and associated technologies
---

# Next.js Best Practices

Guidelines for building robust applications with Next.js 15.

## App Router and Components

- Use Server Components by default; only use `'use client'` when necessary for interactivity or browser APIs.
- Organize routes under the `app/` directory following modular patterns.
- Colocate tests (`*.spec.tsx`) next to the components they verify.

## Data Fetching and State

- Leverage Next.js built-in data fetching and caching mechanisms.
- Use `fetch` with appropriate revalidation tags.
- Manage global state with Zustand when needed, otherwise prefer URL state or local React state.

## Optimization and Deployment

- Optimize images using `next/image`.
- Ensure proper SEO with metadata and semantic HTML.
- Follow the Vercel deployment guidelines and monitoring practices.

> [!NOTE]
> Refer to the official Next.js documentation for the latest features and security updates.
