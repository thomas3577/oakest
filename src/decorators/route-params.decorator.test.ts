import { assertEquals, assertExists } from '@std/assert';

import { RouteParamTypes } from '../enums.ts';
import { body, ctx, custom, headers, ip, next, param, query, req, res } from './route-params.decorator.ts';

Deno.test('route arg resolvers create the expected metadata shape', () => {
  assertEquals(req(), { paramType: RouteParamTypes.REQUEST, data: undefined });
  assertEquals(ctx(), { paramType: RouteParamTypes.CONTEXT, data: undefined });
  assertEquals(res(), { paramType: RouteParamTypes.RESPONSE, data: undefined });
  assertEquals(next(), { paramType: RouteParamTypes.NEXT, data: undefined });
  assertEquals(query('search'), { paramType: RouteParamTypes.QUERY, data: 'search' });
  assertEquals(param('id'), { paramType: RouteParamTypes.PARAM, data: 'id' });
  assertEquals(body('name'), { paramType: RouteParamTypes.BODY, data: 'name' });
  assertEquals(headers('x-token'), { paramType: RouteParamTypes.HEADERS, data: 'x-token' });
  assertEquals(ip(), { paramType: RouteParamTypes.IP, data: undefined });
});

Deno.test('route arg resolvers ignore non-string custom data payloads', () => {
  assertEquals(query({ invalid: true } as unknown as string), { paramType: RouteParamTypes.QUERY, data: undefined });
  assertEquals(body(123 as unknown as string), { paramType: RouteParamTypes.BODY, data: undefined });
});

Deno.test('custom() creates a custom resolver', () => {
  const handler = () => 'ok';
  const resolver = custom<string>(handler, 'payload');

  assertExists(resolver.handler);
  assertEquals(resolver.paramType, RouteParamTypes.CUSTOM);
  assertEquals(resolver.data, 'payload');
  assertEquals(resolver.handler, handler);
});
