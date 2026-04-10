import { assertNotStrictEquals, assertStrictEquals } from '@std/assert';

import { Injectable } from '../decorators/injectable.ts';
import { inject } from './injector.util.ts';

@Injectable()
class _SingletonService {}

@Injectable({ isSingleton: false })
class _TransientService {}

@Injectable()
class _SingletonConsumerA {
  constructor(readonly service: _SingletonService) {}
}

@Injectable()
class _SingletonConsumerB {
  constructor(readonly service: _SingletonService) {}
}

@Injectable()
class _SingletonRoot {
  constructor(
    readonly consumerA: _SingletonConsumerA,
    readonly consumerB: _SingletonConsumerB,
  ) {}
}

@Injectable()
class _TransientConsumerA {
  constructor(readonly service: _TransientService) {}
}

@Injectable()
class _TransientConsumerB {
  constructor(readonly service: _TransientService) {}
}

@Injectable()
class TransientRoot {
  constructor(
    readonly consumerA: _TransientConsumerA,
    readonly consumerB: _TransientConsumerB,
  ) {}
}

Deno.test('inject() reuses singleton services within the same object graph', () => {
  const root = inject(_SingletonRoot);

  assertStrictEquals(root.consumerA.service, root.consumerB.service);
});

Deno.test('inject() recreates transient services within the same object graph', () => {
  const root = inject(TransientRoot);

  assertNotStrictEquals(root.consumerA.service, root.consumerB.service);
});
