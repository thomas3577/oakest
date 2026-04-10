# Oak Decorators

[![JSR Version](https://jsr.io/badges/@dx/oakest)](https://jsr.io/@dx/oakest)
[![JSR Score](https://jsr.io/badges/@dx/oakest/score)](https://jsr.io/@dx/oakest/score)
[![ci](https://github.com/thomas3577/oakest/actions/workflows/deno.yml/badge.svg)](https://github.com/thomas3577/oakest/actions/workflows/deno.yml)

**This is a fork of** [biga816/oak-decorators](https://github.com/biga816/oak-decorators)

NestJS-style decorators library for Deno's [oak](https://github.com/oakserver/oak).

## TL;DR Key features

- **Dependency Injection**: Simplify your code and testing process by injecting dependencies.
- **Modular Structure**: Organize your code into modules for better scalability and maintainability.
- **Decorators**: Configure route endpoint methods in a declarative style.
- **Controller Support**: Define your routes in a declarative way using controllers.
- **Custom Middleware Support**: Create middleware decorators to control access and flow to routes
- **Custom Middleware Params Support**: Create endpoint parameters decorators for parameter injection

For more info [check this issue](https://github.com/denoland/deno/issues/15197)

## Usage

Define controllers to handle HTTP endpoints

```typescript
// ./controllers/util-controller.ts
import { Controller, Get, Headers } from '@dx/oakest';

@Controller('util')
export class UtilController {
  @Get('user-agent')
  bounceUserAgent(@Headers('user-agent') userAgent: string) {
    return { status: 'ok', userAgent };
  }

  @Get('multiply')
  getRandomStuff(@Query('f1') factor1: number, @Query('f2') factor2: number) {
    return { status: 'ok', result: factor1 * factor2 };
  }
}
```

Define modules

```typescript
// ./app.module.ts
import { Module } from '@dx/oakest';
import { UtilController } from './app.controller.ts';

@Module({
  controllers: [UtilController],
  routePrefix: 'api/v1',
  modules: [], // optional submodules
})
export class AppModule {}
```

Register an app module with oak.

```typescript
// ./main.ts
import { Application } from '@oak/oak';
import { assignModule } from '@dx/oakest';
import { AppModule } from './app.module.ts';

const app = new Application();
app.use(assignModule(AppModule));

await app.listen({ port: 8000 });
```

Run your app and following endpoints will be available:

- `/api/v1/util/user-agent`
- `/api/v1/util/multiply?f1=2&f2=4`

## Breaking Changes

The current release includes a breaking DI change.

- `reflect-metadata` is no longer used.
- `emitDecoratorMetadata` is no longer required.
- Constructor dependency injection no longer works from parameter types alone.
- Constructor dependencies must now be declared explicitly with `inject(...)`.
- `@Controller({ injectables: [...] })` has been removed.
- The temporary generated DI registry workflow is not part of the final API.
- `@Injectable({ isSingleton: false })` is no longer supported in the Needle-based DI flow.

If your code relied on implicit constructor injection, update constructors before upgrading.

## Migration

### Constructor Injection

Before:

```typescript
import { Controller, Get } from '@dx/oakest';
import { UsersService } from './users.service.ts';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }
}
```

After:

```typescript
import { Controller, Get, inject } from '@dx/oakest';
import { UsersService } from './users.service.ts';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService = inject(UsersService)) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }
}
```

### Token-Based Injection

Before, token-based controller injection could be modeled indirectly through Oakest-specific metadata. That path has been removed.

After:

```typescript
import { inject, Injectable } from '@dx/oakest';

const LOGGER = Symbol('LOGGER');

@Injectable({ implementing: LOGGER })
export class ConsoleLogger {
  info(message: string) {
    console.log(message);
  }
}

export class UsersService {
  constructor(private readonly logger = inject<ConsoleLogger>(LOGGER)) {}
}
```

### Module Providers

This part does not change: injectable classes still need to be present in the module `providers` array.

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService, ConsoleLogger],
})
export class UsersModule {}
```

### Removed Controller Option

Before:

```typescript
@Controller({
  path: 'users',
  injectables: [SOME_TOKEN],
})
export class UsersController {}
```

After:

```typescript
@Controller('users')
export class UsersController {}
```

Move the dependency selection into explicit constructor injection instead of controller metadata.

### Upgrade Guide

If you are upgrading an existing app, use this order:

1. Update every constructor-injected dependency from `constructor(private readonly service: Service)` to `constructor(private readonly service = inject(Service))`.
2. Keep all injectable classes in the corresponding module `providers` arrays.
3. Remove any use of `@Controller({ injectables: [...] })` and move that selection logic into explicit constructor injection.
4. Remove any code or configuration that depended on `reflect-metadata` or emitted constructor metadata.

Typical failure modes after upgrading:

- `No provider(s) found`: the dependency is being requested with `inject(...)`, but the implementation is missing from the module `providers` array.
- token-based injection does not resolve: the provider is missing `@Injectable({ implementing: TOKEN })`, or the constructor is not using `inject<T>(TOKEN)`.
- constructor injection silently stopped working after the upgrade: the constructor was not converted to the explicit `inject(...)` style.

## Docs

### Modules

A module is a class annotated with a `@Module()` decorator. The `@Module()` decorator provides metadata that the application makes use of to organize the application structure.
Each application has at least one module, a root module, and each modules can have child modules.

The `@Module()` decorator takes those options:

| name          | description                                                                 |
| :------------ | :-------------------------------------------------------------------------- |
| `controllers` | the set of controllers defined in this module which have to be instantiated |
| `providers`   | the providers that will be instantiated by the injector                     |
| `modules`     | the set of modules defined as child modules of this module                  |
| `routePrefix` | the prefix name to be set in route as the common ULR for controllers.       |

```typescript
import { Module } from '@dx/oakest';
import { AppController } from './app.controller.ts';
import { SampleModule } from './sample/sample.module.ts';

@Module({
  modules: [SampleModule],
  controllers: [AppController],
  routePrefix: 'v1',
})
export class AppModule {}
```

### Controllers

#### Routing

A controller is a class annotated with a `@Controller()` decorator. Controllers are responsible for handling incoming requests and returning responses to the client.
The `@Controller()` decorator takes an optional route path prefix.

```typescript
import { Controller, Get } from '@dx/oakest';

@Controller('sample')
export class UsersController {
  @Get()
  findAll(): string {
    return 'OK';
  }
}
```

The `@Get()` HTTP request method decorator before the `findAll()` method tells the application to create a handler for a specific endpoint for HTTP requests.

For http methods, you can use `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()`, `@All()`.

#### Request object

Handlers often need access to the client request details.
HHere's a example to access the request object using `@Req()` decorator.

```typescript
import { Controller, Get, Request } from '@dx/oakest';

@Controller('sample')
export class SampleController {
  @Get()
  findAll(@Request() request: Request): string {
    return 'OK';
  }
}
```

Below is a list of the provided decorators.

| name |
| :--- |

| `@Request()`
| `@Response()`
| `@Next()`
| `@Query(key?: string)`
| `@Param(key?: string)`
| `@Body(key?: string)`
| `@Headers(name?: string)`
| `@Ip()`
| `@Context()`

### Providers

Providers are responsible for main business logic as services, repositories, factories, helpers, and so on.
The main idea of a provider is that it can be injected as a dependency. Depending on the environment, different implementations of a service can be provided.

```typescript
// ./sample.service.ts
import { Injectable } from '@dx/oakest';
import db from './db-service.ts';

@Injectable()
export class UserService {
  async getAllUsers() {
    const { error, data: users } = await db.users.getAll();
    return { status: 'ok', data: users };
  }
}

@Injectable()
export class MockUserService {
  getAllUsers() {
    return {
      status: 'ok',
      data: [
        {
          name: 'John Doe',
        },
        {
          name: 'Jane Doe',
        },
      ],
    };
  }
}

// ./sample.controller.ts
import { Controller, Get, inject } from '@dx/oakest';
import { UserService } from './sample.service.ts';

@Controller('users')
export class UsersController {
  constructor(private readonly userService = inject(UserService)) {}

  @Get()
  getAllUsers() {
    return await this.userService.getAllUsers();
  }
}

// ./sample.module.ts
import { Module } from '@dx/oakest';
import { UsersController } from './sample.controller.ts';
import { MockUserService, UserService } from './sample.service.ts';

@Module({
  controllers: [UsersController],
  providers: [
    Deno.env.get('DENO_ENV') === 'production' ? UserService : MockUserService,
  ],
})
export class SampleModule {}
```

### Explicit Injection

Oakest no longer relies on `reflect-metadata` or emitted constructor type metadata for dependency injection. Constructor dependencies are declared explicitly with Needle's `inject()` helper.

```typescript
import { Controller, Get, inject } from '@dx/oakest';

import { UsersService } from './users.service.ts';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService = inject(UsersService)) {}

  @Get()
  getAllUsers() {
    return this.usersService.getAllUsers();
  }
}
```

Notes:

- Dependencies must be requested explicitly in constructor default values.
- Providers still need to be registered in your module's `providers` array.
- `@Injectable({ implementing: TOKEN })` can still be used to bind string or symbol tokens and resolve them with `inject<T>(TOKEN)`.
- `isSingleton: false` is no longer supported in this Needle-based mode.
- `@Controller({ injectables: [...] })` is no longer part of the public API.

### Custom Middleware Decorators

It's possible to register middleware that can be used in controllers by means of decorators.

For instance, to protect routes based on user roles, you can create a `@RequiresRole` middleware decorator.

```typescript
// ./middleware.ts
import { registerMiddlewareMethodDecorator } from '@dx/oakest';
import { Context } from '@oak/oak';

function checkUserRoles(context: Context, roles: string[]) {
  // Logic to check the user role
  return false;
}

export function RequiresRole(roles: string[]) {
  return function (target, methodName) {
    const requiresRole = async (context, next) => {
      // Logic to check the user session or JWT for the required role
      if (checkUserRoles(context, roles)) {
        await next();
      } else {
        // handle unauthorized access
        context.response.status = 401;
        context.response.body = { error: 'Unauthorized' };
        return;
      }
    };
    registerMiddlewareMethodDecorator(target, methodName, requiresRole);
  };
}
```

Then you can use the `@RequiresRole` decorator in your controllers's methods.

```typescript
// ./sample.controller.ts
import RequireRole from './middleware.ts';

@Controller('users')
export default class SampleController {
  @Get('/')
  @RequiresRole(['admin'])
  getAllUsers() {
    // Logic to get all users
  }
}
```

### Custom endpoint parameters decorator

It's also possible to register custom parameters decorators to streamline data injection into endpoint handlers

It would be useful to have a shortcut to some data stored in the request's JWT.

The approach would involve having a high priority controller that parses the JWT and stores it in `context.state.jwtData`.

Then a param decorator could be defined as follows:

```typescript
export function JWT(propName?: string) {
  return function (targetClass: any, methodName: string, paramIndex: number) {
    const handler = (ctx: Context) => propName ? ctx.state.jwtData?.[propName] : ctx.state.jwtData;
    registerCustomRouteParamDecorator(
      targetClass,
      methodName,
      paramIndex,
    )(handler);
  };
}
```

And used in controllers like this:

```typescript
// sample-controller

@Get('my-subscriptions')
getUserSubscriptions(@JWT('sub') userId : string) {
  return await databaseService.getUserSubscriptions(userId);
}
```

Params resolution is asynchronous, so it is also possible to do things like retrieving session information from KV stores on demand. This would be a more efficient strategy than having a middleware that always retrieves session data if this is not desirable.

```typescript
export function SessionData() {
  return function (targetClass: any, methodName: string, paramIndex: number) {
    const handler = (ctx: Context) => ctx.state.jwtData?.sid ? await retrieveSession(ctx.state.jwtData?.sid) : null;
    registerCustomRouteParamDecorator(
      targetClass,
      methodName,
      paramIndex,
    )(handler);
  };
}
```

```typescript
// sample-controller

@Get('my-recent-products')
getUserSubscriptions(@SessionData() sessionData : any) {
  return sessionData.recentProducts
}
```
