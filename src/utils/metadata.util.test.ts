import { assertEquals, assertStrictEquals } from '@std/assert';

import { createMetadataDecorator, defineMetadata, getMetadata, getOwnMetadata } from './metadata.util.ts';
import './reflect-shim.ts';

type ReflectMetadataApi = typeof Reflect & {
  defineMetadata?: (metadataKey: string | symbol, value: unknown, target: object, propertyKey?: string | symbol) => void;
  getMetadata?: <T>(metadataKey: string | symbol, target: object, propertyKey?: string | symbol) => T | undefined;
  getOwnMetadata?: <T>(metadataKey: string | symbol, target: object, propertyKey?: string | symbol) => T | undefined;
  metadata?: (metadataKey: string | symbol, value: unknown) => ((target: object, propertyKey?: string | symbol) => void) | undefined;
};

const CLASS_KEY = Symbol('class-key');
const MEMBER_KEY = Symbol('member-key');
const DECORATOR_KEY = Symbol('decorator-key');
const SHIM_KEY = Symbol('shim-key');
const reflectApi = Reflect as ReflectMetadataApi;

class MetadataBase {
  method() {}
}

class MetadataChild extends MetadataBase {
  override method() {}
}

Deno.test('defineMetadata() and getOwnMetadata() store class metadata on the exact target', () => {
  defineMetadata(CLASS_KEY, 'base-value', MetadataBase.prototype);

  assertEquals(getOwnMetadata(CLASS_KEY, MetadataBase.prototype), 'base-value');
  assertEquals(getOwnMetadata(CLASS_KEY, MetadataChild.prototype), undefined);
});

Deno.test('defineMetadata() and getOwnMetadata() store member metadata on the exact target', () => {
  defineMetadata(MEMBER_KEY, 'member-value', MetadataBase.prototype, 'method');

  assertEquals(getOwnMetadata(MEMBER_KEY, MetadataBase.prototype, 'method'), 'member-value');
  assertEquals(getOwnMetadata(MEMBER_KEY, MetadataChild.prototype, 'method'), undefined);
});

Deno.test('getMetadata() resolves class and member metadata through the prototype chain', () => {
  defineMetadata(CLASS_KEY, 'inherited-class', MetadataBase.prototype);
  defineMetadata(MEMBER_KEY, 'inherited-member', MetadataBase.prototype, 'method');

  assertEquals(getMetadata(CLASS_KEY, MetadataChild.prototype), 'inherited-class');
  assertEquals(getMetadata(MEMBER_KEY, MetadataChild.prototype, 'method'), 'inherited-member');
});

Deno.test('createMetadataDecorator() writes metadata for class members', () => {
  const decorator = createMetadataDecorator(DECORATOR_KEY, 'decorated-value');

  decorator(MetadataBase.prototype, 'method');

  assertEquals(getMetadata(DECORATOR_KEY, MetadataBase.prototype, 'method'), 'decorated-value');
});

Deno.test('reflect shim exposes metadata helpers backed by the internal store', () => {
  reflectApi.defineMetadata?.(SHIM_KEY, 'shim-class', MetadataBase.prototype);
  reflectApi.defineMetadata?.(SHIM_KEY, 'shim-member', MetadataBase.prototype, 'method');

  assertEquals(reflectApi.getOwnMetadata?.(SHIM_KEY, MetadataBase.prototype), 'shim-class');
  assertEquals(reflectApi.getMetadata?.(SHIM_KEY, MetadataChild.prototype), 'shim-class');
  assertEquals(reflectApi.getOwnMetadata?.(SHIM_KEY, MetadataBase.prototype, 'method'), 'shim-member');
  assertEquals(reflectApi.getMetadata?.(SHIM_KEY, MetadataChild.prototype, 'method'), 'shim-member');
});

Deno.test('reflect shim metadata() decorator writes through to the shared metadata store', () => {
  const shimDecorator = reflectApi.metadata?.(SHIM_KEY, 'shim-decorator');

  assertStrictEquals(typeof shimDecorator, 'function');

  shimDecorator?.(MetadataChild.prototype, 'method');

  assertEquals(getMetadata(SHIM_KEY, MetadataChild.prototype, 'method'), 'shim-decorator');
});
