---
name: general
description: General development instructions and conventions for the Dyarti codebase
---

# General Instructions for the Dyarti Codebase

## Structure and General Conventions

- The project is organized primarily under the `/app` folder, following a modular structure by business domain.
- Folder and file names should be descriptive and follow the convention of using snake_case for special internal classification folders.
- Files and folders should inherit the name of the main feature to maintain coherence and traceability.
- Type files should have the `.types.ts` extension and helper files `.helpers.ts`.
- Unit tests should be in `.spec.ts` or `.spec.tsx` files next to the file they test.

## Migrations and Code Standards

- Whenever possible, migrate files from CommonJS to ESM (ECMAScript Modules).
- Migrate files from JavaScript to TypeScript progressively. Prioritize migration of new or edited files.
- Maintain compatibility with the TypeScript typing system and leverage global types defined in `/types`.
- When editing or creating a file, update or create corresponding unit tests. If a file is created from scratch, its associated unit test file should also be created.

## Development Best Practices

- Modularize components and separate reusable logic into custom hooks or utils files.
- Reuse existing components and types whenever possible.
- Document new actions, components, or services following the pattern of specific instruction files.
- Avoid code and component duplication.

## Testing

- The project uses Jest for unit and integration tests. Tests should cover business requirements and the main function of the component.
- Extensive mocks should be modularized in `mocks.ts` files to maintain test readability.
- Tests should run and pass correctly before committing.
