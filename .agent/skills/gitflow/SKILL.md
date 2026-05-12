---
name: gitflow
description: Git workflow guidelines, branching strategy, and commit conventions
---

# Gitflow and Branching Strategy

Guidelines for managing branches, commits, and pull requests.

## Workflow Summary

1. **Current Branch**: Always check your current branch with `git branch --show-current`.
2. **Remote Sync**: Check for remote branches with `git branch -r`.
3. **Diffing**: Do a `git diff` to `origin/develop` (or `origin/master`) to see changes before finalizing.
4. **Commits**: Use short, imperative subjects like `fix`, `feat`, or `chore`.

## Commit Message Guidelines

- **Concise**: Keep messages brief but descriptive.
- **Prefixes**: Prefer prefixes like `fix:`, `feat:`, or `chore:`.
- **Subject**: Imperative mood (e.g., "add feature" NOT "added feature").

## Pull Request Guidelines

- Follow `.github/pull_request_template.md`.
- Explain the goal, list task requirements, and mark the change type.
- Attach screenshots or video for UI changes.
- Keep PRs in draft until lint, type checks, and affected tests pass.

> [!TIP]
> Perform comprehensive dependency analysis before any commit to ensure atomic and stable changes.
