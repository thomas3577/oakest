# Changelog

## 0.1.0

- Switched Oakest to standard decorators and removed the need for `experimentalDecorators` in `deno.json`.
- Removed legacy parameter decorators in favor of route argument resolvers on `@Get/@Post/...`.
- Removed `reflect-metadata` and emitted constructor metadata from the DI flow.
- Switched constructor injection to explicit `inject(...)` usage with `@needle-di/core`.
- Updated custom middleware decorator integration to use standard decorator context via `registerMiddlewareMethodDecorator(context, handler)`
