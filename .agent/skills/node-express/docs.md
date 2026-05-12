# Node & Express Server Patterns

## Error Handling
- Create custom error classes extending `Error` for domain-specific errors.
- Always handle Promise rejections in `async` functions with `try/catch`.
- Use a central error handler for all routes.

## Async/Await
- Use `async/await` for cleaner, more readable asynchronous code.
- Ensure all `async` functions return `Promise<T>`.

## Middleware
- Use middleware for authentication, logging, and validation.
- Standardize the response format: `{ success: true, data: T } | { success: false, error: E }`.

## Node & Express Configuration
- Keep secrets in `.env` files and use `dotenv` for configuration.
- Follow the Twelve-Factor App principles for deployment.
- Use `npm run build` or `npm run dev` for server initialization.
- Use standard HTTP status codes: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `500 Internal Server Error`.
