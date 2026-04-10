import { assertEquals, assertExists } from '@std/assert';

import { METHOD_METADATA } from '../const.ts';
import type { ActionMetadata } from '../types.ts';
import { getMetadata } from '../utils/metadata.util.ts';
import { All, Delete, Get, Patch, Post, Put } from './http-methods.decorator.ts';

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

class ManualMethodController {
  first() {}
  second() {}
}

Deno.test('HTTP method decorators append metadata entries instead of overwriting previous ones', () => {
  const firstDescriptor = Object.getOwnPropertyDescriptor(ManualMethodController.prototype, 'first');
  const secondDescriptor = Object.getOwnPropertyDescriptor(ManualMethodController.prototype, 'second');

  assertExists(firstDescriptor);
  assertExists(secondDescriptor);

  Get('first')(ManualMethodController.prototype, 'first', firstDescriptor);
  Post('second')(ManualMethodController.prototype, 'second', secondDescriptor);

  const metadata = getMetadata<ActionMetadata[]>(METHOD_METADATA, ManualMethodController.prototype);

  assertExists(metadata);
  assertEquals(metadata, [
    { path: 'first', method: 'get', functionName: 'first' },
    { path: 'second', method: 'post', functionName: 'second' },
  ]);
});
