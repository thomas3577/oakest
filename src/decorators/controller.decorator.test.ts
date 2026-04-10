import { assertEquals, assertExists } from '@std/assert';
import { Application, Router } from '@oak/oak';
import type { RouterContext } from '@oak/oak';

import { Get, Post } from './http-methods.decorator.ts';
import { body, ctx, custom, headers, ip, next, param, query, req, res } from './route-params.decorator.ts';
import { Controller } from './controller.decorator.ts';
import { registerMiddlewareMethodDecorator } from '../utils/router.util.ts';
import type { ControllerClass } from '../types.ts';

const mountController = (controller: { path?: string; route?: Router; init(routePrefix?: string): void }, routePrefix?: string) => {
  controller.init(routePrefix);

  assertExists(controller.path);
  assertExists(controller.route);

  const app = new Application();
  const router = new Router();

  router.use(controller.path, controller.route.routes(), controller.route.allowedMethods());
  app.use(router.routes());

  return app;
};

@Controller('users')
class ParameterController {
  @Post(':id', [ctx<RouterContext<string>>(), req<RouterContext<string>['request']>(), res<RouterContext<string>['response']>(), next<() => Promise<unknown>>(), query<URLSearchParams>(), param<Record<string, string>>(), body<Record<string, string>>(), headers<Record<string, string>>(), ip<string>()])
  create(
    requestContext: RouterContext<string>,
    request: RouterContext<string>['request'],
    response: RouterContext<string>['response'],
    nextFn: () => Promise<unknown>,
    searchParams: URLSearchParams,
    params: Record<string, string>,
    requestBody: Record<string, string>,
    requestHeaders: Record<string, string>,
    ipAddress: string,
  ) {
    return {
      path: requestContext.request.url.pathname,
      reqMatches: request === requestContext.request,
      resWritable: response.writable,
      nextType: typeof nextFn,
      query: searchParams.get('q'),
      param: params.id,
      body: requestBody.name,
      header: requestHeaders['x-test'],
      ip: ipAddress,
    };
  }
}

const middlewareEvents: string[] = [];

@Controller('tasks')
class RuntimeController {
  @Get(':id', [query<string | null>('filter'), param<string>('id'), custom<string>((routeContext, data) => `${routeContext.params.id}:${String(data)}`, 'extra')])
  index(
    filter: string | null,
    id: string,
    customValue: string,
  ) {
    middlewareEvents.push(`handler:${filter}:${id}:${customValue}`);

    return {
      filter,
      id,
      customValue,
    };
  }
}

const runtimeControllerPrototype = Object.getPrototypeOf(RuntimeController.prototype);

registerMiddlewareMethodDecorator(runtimeControllerPrototype, 'index', async (ctx, next) => {
  middlewareEvents.push('middleware:before');
  ctx.response.headers.set('x-middleware', 'ran');
  await next();
  middlewareEvents.push('middleware:after');
});

@Controller('empty')
class UndefinedResultController {
  @Get('noop')
  noop() {
    return undefined;
  }
}

@Controller('mapped')
class MappedArgsController {
  @Post(':id', [param<string>('id'), body<{ name: string }>(), query<string | null>('dryRun')])
  update(
    id: string,
    requestBody: { name: string },
    dryRun: string | null,
    ctx: RouterContext<string>,
  ) {
    return {
      id,
      bodyName: requestBody.name,
      dryRun,
      path: ctx.request.url.pathname,
    };
  }

  @Get()
  current(ctx: RouterContext<string>) {
    return {
      path: ctx.request.url.pathname,
    };
  }
}

Deno.test('Controller init() composes prefixes and injects standard route params', async () => {
  const app = mountController(new ParameterController() as unknown as ControllerClass, 'api');
  const response = await app.handle(
    new Request('http://localhost/api/users/123?q=abc', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-test': '1',
      },
      body: JSON.stringify({ name: 'oakest' }),
    }),
  );

  assertExists(response);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    path: '/api/users/123',
    reqMatches: true,
    resWritable: true,
    nextType: 'function',
    query: 'abc',
    param: '123',
    body: 'oakest',
    header: '1',
    ip: '',
  });
});

Deno.test('Controller routes execute middleware before handlers and resolve custom params', async () => {
  middlewareEvents.length = 0;

  const app = mountController(new RuntimeController() as unknown as ControllerClass);
  const response = await app.handle(new Request('http://localhost/tasks/42?filter=open'));

  assertExists(response);
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('x-middleware'), 'ran');
  assertEquals(await response.json(), {
    filter: 'open',
    id: '42',
    customValue: '42:extra',
  });
  assertEquals(middlewareEvents, [
    'middleware:before',
    'handler:open:42:42:extra',
    'middleware:after',
  ]);
});

Deno.test('Controller handlers that return undefined leave the response untouched', async () => {
  const app = mountController(new UndefinedResultController() as unknown as ControllerClass);
  const response = await app.handle(new Request('http://localhost/empty/noop'));

  assertExists(response);
  assertEquals(response.status, 404);
  assertEquals(await response.text(), '');
});

Deno.test('Controller handlers resolve mapped args and append ctx as the final implicit parameter', async () => {
  const app = mountController(new MappedArgsController() as unknown as ControllerClass);
  const response = await app.handle(
    new Request('http://localhost/mapped/123?dryRun=yes', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ name: 'oakest' }),
    }),
  );

  assertExists(response);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    id: '123',
    bodyName: 'oakest',
    dryRun: 'yes',
    path: '/mapped/123',
  });
});

Deno.test('Controller handlers without explicit route arg mapping receive ctx as the only parameter', async () => {
  const app = mountController(new MappedArgsController() as unknown as ControllerClass);
  const response = await app.handle(new Request('http://localhost/mapped'));

  assertExists(response);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    path: '/mapped',
  });
});

@Controller('invalid')
class InvalidMappedController {
  @Get('broken')
  broken(first: string, second: string) {
    return { first, second };
  }
}

Deno.test('Controller handlers with multiple parameters require explicit route arg mapping', async () => {
  const app = mountController(new InvalidMappedController() as unknown as ControllerClass);
  const response = await app.handle(new Request('http://localhost/invalid/broken'));

  assertExists(response);
  assertEquals(response.status, 500);
  assertEquals(await response.text(), 'Internal Server Error');
});
