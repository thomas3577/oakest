import { assertEquals } from '@std/assert';

import { defineMetadata, getMetadata, getOwnMetadata } from './metadata.util.ts';

Deno.test('defineMetadata() and getOwnMetadata() store class metadata on the exact target', () => {
  const classKey = Symbol('class-key');

  class MetadataBase {
    method() {}
  }

  class MetadataChild extends MetadataBase {
    override method() {}
  }

  defineMetadata(classKey, 'base-value', MetadataBase.prototype);

  assertEquals(getOwnMetadata(classKey, MetadataBase.prototype), 'base-value');
  assertEquals(getOwnMetadata(classKey, MetadataChild.prototype), undefined);
});

Deno.test('defineMetadata() and getOwnMetadata() store member metadata on the exact target', () => {
  const memberKey = Symbol('member-key');

  class MetadataBase {
    method() {}
  }

  class MetadataChild extends MetadataBase {
    override method() {}
  }

  defineMetadata(memberKey, 'member-value', MetadataBase.prototype, 'method');

  assertEquals(getOwnMetadata(memberKey, MetadataBase.prototype, 'method'), 'member-value');
  assertEquals(getOwnMetadata(memberKey, MetadataChild.prototype, 'method'), undefined);
});

Deno.test('getMetadata() resolves class and member metadata through the prototype chain', () => {
  const classKey = Symbol('class-key');
  const memberKey = Symbol('member-key');

  class MetadataBase {
    method() {}
  }

  class MetadataChild extends MetadataBase {
    override method() {}
  }

  defineMetadata(classKey, 'inherited-class', MetadataBase.prototype);
  defineMetadata(memberKey, 'inherited-member', MetadataBase.prototype, 'method');

  assertEquals(getMetadata(classKey, MetadataChild.prototype), 'inherited-class');
  assertEquals(getMetadata(memberKey, MetadataChild.prototype, 'method'), 'inherited-member');
});
