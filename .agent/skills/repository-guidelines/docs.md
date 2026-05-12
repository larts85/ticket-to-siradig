# Repository Documentation

## Workflow Summary

To start developing on this repository:

1. Ensure you have Yarn installed.
2. Run `yarn install` (if it's the first time or `package.json` changed).
3. Use `yarn dev:clean` to start the app on port 2024.
4. For all modifications, follow the TypeScript and React best practices.

## Folder Meanings

- `/app`: The Next.js App Router root. Use page.tsx, layout.tsx, and loading.tsx appropriately.
- `/shared`: Common code across different features. Always check here before creating a new utility.
- `/supabase`: Everything related to the database, including migrations and types.
- `/tests`: Both E2E (Playwright) and common test utilities.

## Recommended VSCode Extensions

- ESLint
- Prettier - Code formatter
- Tailwind CSS IntelliSense (if requested)
- TypeScript Vue Plugin (Volar) - if relevant (not here)
- Supabase (for SQL and DB management)
