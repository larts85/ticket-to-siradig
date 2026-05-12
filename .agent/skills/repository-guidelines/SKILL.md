---
name: repository-guidelines
description: Core repository guidelines, project structure, and development commands for Dyarti
---

# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js 15 App Router project. Route files live in `app/`, including page components, API handlers under `app/api/`, and feature-local tests such as `page.spec.tsx`. Shared UI, hooks, stores, and utilities live in `shared/`. Static assets belong in `public/`. Database configuration and SQL migrations live in `supabase/`. End-to-end coverage is organized under `tests/e2e/` with `fixtures/`, `pageObjects/`, `config/`, and shared constants.

## Build, Test, and Development Commands

Use Yarn for local work because `yarn.lock` is committed.

- `yarn dev:clean`: kill all running processes and start the app locally on port `2024`.
- `yarn build`: create the production build.
- `yarn start`: run the built app.
- `yarn lint`: run Next.js ESLint rules.
- `yarn tsc`: run TypeScript checks with no emit.
- `yarn test`: run Jest unit and component tests.
- `yarn test:coverage`: generate coverage in `coverage/`.
- `yarn test:e2e`: run Playwright tests from `tests/e2e/fixtures`.

## Coding Style & Naming Conventions

TypeScript is the default. Follow the repository formatting rules: 2-space indentation, single quotes, no semicolons, trailing commas where valid in ES5, and LF line endings. Run `yarn format` before submitting larger changes. Use `PascalCase` for React components, `camelCase` for variables/functions, and keep route folders aligned with URL segments. Prefer colocated `*.spec.tsx` tests next to the component or route they verify.

## Commit & Pull Request Guidelines

Recent history uses short, imperative subjects such as `fix`, `hide campaigns`, and `chore: refine seo...`. Prefer concise commit messages with an optional prefix like `fix:`, `feat:`, or `chore:`. Pull requests should follow `.github/pull_request_template.md`: explain the goal, list task requirements, mark the change type, and attach screenshots or video for UI changes. Keep PRs in draft until lint, type checks, and affected tests pass.
