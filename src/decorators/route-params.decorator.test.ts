import { assertEquals, assertExists } from '@std/assert';

import { ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import type { RouteArgsMetadata } from '../types.ts';
import { getMetadata } from '../utils/metadata.util.ts';
import { Body, Ctx, Headers, IP, Next, Param, Query, Req, Res } from './route-params.decorator.ts';

class RouteParamController {
  handler(
    _ctx?: unknown,
    _req?: unknown,
    _res?: unknown,
    _next?: unknown,
    _query?: unknown,
    _param?: unknown,
    _body?: unknown,
    _headers?: unknown,
    _ip?: unknown,
  ) {}
}

class InvalidDataController {
  handler(_query?: unknown, _body?: unknown) {}
}

Deno.test('route param decorators store the expected metadata entries', () => {
  Req()(RouteParamController.prototype, 'handler', 1);
  Ctx()(RouteParamController.prototype, 'handler', 0);
  Res()(RouteParamController.prototype, 'handler', 2);
  Next()(RouteParamController.prototype, 'handler', 3);
  Query('search')(RouteParamController.prototype, 'handler', 4);
  Param('id')(RouteParamController.prototype, 'handler', 5);
  Body('name')(RouteParamController.prototype, 'handler', 6);
  Headers('x-token')(RouteParamController.prototype, 'handler', 7);
  IP()(RouteParamController.prototype, 'handler', 8);

  const metadata = getMetadata<RouteArgsMetadata[]>(ROUTE_ARGS_METADATA, RouteParamController.prototype, 'handler');

  assertExists(metadata);
  assertEquals(metadata, [
    { paramType: RouteParamTypes.REQUEST, index: 1, data: undefined },
    { paramType: RouteParamTypes.CONTEXT, index: 0, data: undefined },
    { paramType: RouteParamTypes.RESPONSE, index: 2, data: undefined },
    { paramType: RouteParamTypes.NEXT, index: 3, data: undefined },
    { paramType: RouteParamTypes.QUERY, index: 4, data: 'search' },
    { paramType: RouteParamTypes.PARAM, index: 5, data: 'id' },
    { paramType: RouteParamTypes.BODY, index: 6, data: 'name' },
    { paramType: RouteParamTypes.HEADERS, index: 7, data: 'x-token' },
    { paramType: RouteParamTypes.IP, index: 8, data: undefined },
  ]);
});

Deno.test('route param decorators ignore non-string custom data payloads', () => {
  Query({ invalid: true } as unknown as string)(InvalidDataController.prototype, 'handler', 0);
  Body(123 as unknown as string)(InvalidDataController.prototype, 'handler', 1);

  const metadata = getMetadata<RouteArgsMetadata[]>(ROUTE_ARGS_METADATA, InvalidDataController.prototype, 'handler');

  assertExists(metadata);
  assertEquals(metadata, [
    { paramType: RouteParamTypes.QUERY, index: 0, data: undefined },
    { paramType: RouteParamTypes.BODY, index: 1, data: undefined },
  ]);
});
