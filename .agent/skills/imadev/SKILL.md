---
name: imadev
description: Development guidelines based on imadev.md, focusing on code quality, behavior and communication.
---

# imadev Guidelines

These guidelines focus on maintaining high-quality code and effective communication during development.

## Rule #1: Respectful Collaboration
- **Don't be condescending**. Don't assume corrections or suggestions are correct without first analyzing them.
- If you disagree with a suggestion, explain why with clear arguments.

## Code Comment Guidelines
- Avoid unnecessary comments that state the obvious.
- Focus on explaining WHY something is done, not WHAT is being done.

## State Management Migration (Redux to Zustand)
- Follow the established migration process:
  1. Identify components using `handleReduxStateChange`.
  2. Map Redux actions to Zustand's `setFormFieldsData`.
  3. Ensure both component and its test are migrated to TypeScript together.
  4. Always check if the parent component needs props updates after removing Redux logic.

## ListSelector Options
- IDs: Use `SNAKE_CASE` (e.g., `DEFAULT_OPTION`).
- Names: Use human-readable text (e.g., `"Default Option"`).
- Names should be user-friendly and easy to understand.
