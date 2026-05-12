---
name: node-express
description: Comprehensive Node.js and Express.js development standards and best practices for modern web development
---

# Node.js and Express.js Development Standards

## I. Project Structure and Organization

### Directory Layout

```
api
 ┣ constants
 ┃ ┣ constantsExample.ts
 ┃ ┣ constantsExample.types.ts
 ┣ services
 ┃ ┣ serviceExample
 ┃ ┃ ┣ serviceExample.controllers.spec.ts
 ┃ ┃ ┣ serviceExample.controllers.ts
 ┃ ┃ ┣ serviceExample.routes.spec.ts
 ┃ ┃ ┣ serviceExample.routes.ts
 ┃ ┃ ┣ serviceExample.services.spec.ts
 ┃ ┃ ┗ serviceExample.services.ts
 ┣ utils
 ┣ index.ts
```

### File Naming Conventions

- Use camelCase for files (e.g., `circuitBreaker.ts`).
- Group related functionality by API version (v1, v2, v3).
- Use `index.ts` files as "barrels" to export from directories.

## II. Error Handling

### Standardized Error Response Format

```typescript
{
  error: string // Error type
  message: string // Human-readable message
  statusCode: number // HTTP status code
}
```

### Async Error Handling

- Wrap async controller methods in try/catch blocks.
- Forward errors to Express error middleware via `next(error)`.
- Use circuit breakers for external service calls.

## III. API Design

### RESTful Principles

- Use proper HTTP methods (GET, POST, PUT, DELETE).
- Return appropriate status codes (200, 204, 400, 401, 403, 404, 422, 500).
- Include detailed error messages and adhere to versioning strategies.

## IV. Security Best Practices

- Validate all inputs using schema validation (TypeBox, Ajv).
- Sanitize input to prevent injection attacks.
- Protect sensitive data; never log secrets or system details.
- Use HTTPS for all communications.

## V. Testing and Monitoring

- Use Jest for unit and integration testing.
- Implement structured logging and track metrics using standard tools.
- Configure environment-specific management for fault tolerance.

> [!IMPORTANT]
> Always use circuit breakers for external service calls to handle degraded service gracefully.
