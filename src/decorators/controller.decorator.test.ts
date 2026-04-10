import { assertEquals, assertExists } from '@std/assert';
import { Application, Router } from '@oak/oak';

import { Get, Post } from './http-methods.decorator.ts';
import { Body, Ctx, Headers, IP, Next, Param, Query, Req, Res } from './route-params.decorator.ts';
import { Controller } from './controller.decorator.ts';
import { registerCustomRouteParamDecorator, registerMiddlewareMethodDecorator } from '../utils/router.util.ts';

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
  @Post(':id')
  create(
    @Ctx() ctx: any,
    @Req() req: Request,
    @Res() res: any,
    @Next() next: () => Promise<unknown>,
    @Query() query: URLSearchParams,
    @Param() params: Record<string, string>,
    @Body() body: Record<string, string>,
    @Headers() headers: Record<string, string>,
    @IP() ip: string,
  ) {
    return {
      path: ctx.request.url.pathname,
      reqMatches: req === ctx.request,
      resWritable: res.writable,
      nextType: typeof next,
      query: query.get('q'),
      param: params.id,
      body: body.name,
      header: headers['x-test'],
      ip,
    };
  }
}

const middlewareEvents: string[] = [];

@Controller('tasks')
class RuntimeController {
  @Get(':id')
  index(
    @Query('filter') filter: string | null,
    @Param('id') id: string,
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

registerCustomRouteParamDecorator(runtimeControllerPrototype, 'index', 2)('extra')(((ctx: any, data: unknown) => `${ctx.params.id}:${String(data)}`) as any);

@Controller('empty')
class UndefinedResultController {
  @Get('noop')
  noop() {
    return undefined;
  }
}

Deno.test('Controller init() composes prefixes and injects standard route params', async () => {
  const app = mountController(new ParameterController() as any, 'api');
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

  const app = mountController(new RuntimeController() as any);
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
  const app = mountController(new UndefinedResultController() as any);
  const response = await app.handle(new Request('http://localhost/empty/noop'));

  assertExists(response);
  assertEquals(response.status, 404);
  assertEquals(await response.text(), '');
});
