import { assertStrictEquals } from '@std/assert';

import { Injectable } from '../decorators/injectable.ts';
import { createInjector, inject } from './injector.util.ts';

@Injectable()
class _SingletonService {}

class _SingletonConsumerA {
  constructor(readonly service = inject(_SingletonService)) {}
}

@Injectable()
class _SingletonConsumerB {
  constructor(readonly service = inject(_SingletonService)) {}
}

@Injectable()
class _SingletonRoot {
  constructor(
    readonly consumerA = inject(_SingletonConsumerA),
    readonly consumerB = inject(_SingletonConsumerB),
  ) {}
}

@Injectable()
class _MissingProviderConsumer {
  constructor(readonly service = inject(_SingletonService)) {}
}

@Injectable()
class _ExplicitTokenService {}

const EXPLICIT_TOKEN = Symbol('explicit-token');

@Injectable({ implementing: EXPLICIT_TOKEN })
class _ExplicitTokenImplementation extends _ExplicitTokenService {}

@Injectable()
class _ExplicitTokenConsumer {
  constructor(readonly service = inject<_ExplicitTokenService>(EXPLICIT_TOKEN)) {}
}

Deno.test('inject() reuses singleton services within the same object graph', () => {
  const root = createInjector([_SingletonService, _SingletonConsumerA, _SingletonConsumerB]).resolve(_SingletonRoot);

  assertStrictEquals(root.consumerA.service, root.consumerB.service);
});

Deno.test('createInjector() resolves implementing tokens through explicit Needle inject()', () => {
  const consumer = createInjector([_ExplicitTokenImplementation]).resolve(_ExplicitTokenConsumer);

  assertStrictEquals(consumer.service instanceof _ExplicitTokenImplementation, true);
});

Deno.test('createInjector() throws when an explicit Needle dependency is not provided', () => {
  let error: unknown;

  try {
    createInjector([]).resolve(_MissingProviderConsumer);
  } catch (caughtError) {
    error = caughtError;
  }

  assertStrictEquals(error instanceof Error, true);
  assertStrictEquals((error as Error).message.includes('No provider(s) found'), true);
});
