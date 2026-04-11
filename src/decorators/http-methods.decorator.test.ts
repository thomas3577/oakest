import { assertEquals, assertExists } from '@std/assert';

import { METHOD_METADATA } from '../const.ts';
import type { ActionMetadata } from '../types.ts';
import { getMetadata } from '../utils/metadata.util.ts';
import { body, param, query } from './route-params.decorator.ts';
import { Controller } from './controller.decorator.ts';
import { All, Delete, Get, Patch, Post, Put } from './http-methods.decorator.ts';

@Controller()
class HttpMethodController {
  @Get('list')
  list() {}

  @Post('create')
  create() {}

  @Put('replace')
  replace() {}

  @Patch('update')
  update() {}

  @Delete('remove')
  remove() {}

  @All()
  fallback() {}
}

Deno.test('HTTP method decorators register method metadata for each decorated handler', () => {
  const metadata = getMetadata<ActionMetadata[]>(METHOD_METADATA, HttpMethodController.prototype);

  assertExists(metadata);
  assertEquals(metadata, [
    { path: 'list', method: 'get', functionName: 'list' },
    { path: 'create', method: 'post', functionName: 'create' },
    { path: 'replace', method: 'put', functionName: 'replace' },
    { path: 'update', method: 'patch', functionName: 'update' },
    { path: 'remove', method: 'delete', functionName: 'remove' },
    { path: '', method: 'all', functionName: 'fallback' },
  ]);
});

@Controller()
class ResolverMethodController {
  @Post(':id', [param<string>('id'), body<{ name: string }>(), query<string | null>('dryRun')])
  create(_id: string, _body: { name: string }, _dryRun: string | null) {}
}

Deno.test('HTTP method decorators store optional args resolvers', () => {
  const metadata = getMetadata<ActionMetadata[]>(METHOD_METADATA, ResolverMethodController.prototype);

  assertExists(metadata);
  assertEquals(metadata, [
    {
      path: ':id',
      method: 'post',
      functionName: 'create',
      args: [
        { paramType: 6, data: 'id' },
        { paramType: 4, data: undefined },
        { paramType: 5, data: 'dryRun' },
      ],
    },
  ]);
});
