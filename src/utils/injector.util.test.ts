import { assertNotStrictEquals, assertStrictEquals } from '@std/assert';

import { Injectable } from '../decorators/injectable.ts';
import type { ClassConstructor } from '../types.ts';
import { clearDependencies, registerDependencies } from './dependency-registry.util.ts';
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

const registerTestDependencies = () => {
  registerDependencies(_SingletonConsumerA as ClassConstructor, [_SingletonService]);
  registerDependencies(_SingletonConsumerB as ClassConstructor, [_SingletonService]);
  registerDependencies(_SingletonRoot as ClassConstructor, [_SingletonConsumerA, _SingletonConsumerB]);
  registerDependencies(_TransientConsumerA as ClassConstructor, [_TransientService]);
  registerDependencies(_TransientConsumerB as ClassConstructor, [_TransientService]);
  registerDependencies(TransientRoot as ClassConstructor, [_TransientConsumerA, _TransientConsumerB]);
};

const clearTestDependencies = () => {
  clearDependencies(_SingletonConsumerA as ClassConstructor);
  clearDependencies(_SingletonConsumerB as ClassConstructor);
  clearDependencies(_SingletonRoot as ClassConstructor);
  clearDependencies(_TransientConsumerA as ClassConstructor);
  clearDependencies(_TransientConsumerB as ClassConstructor);
  clearDependencies(TransientRoot as ClassConstructor);
};

Deno.test.beforeEach(() => {
  registerTestDependencies();
});

Deno.test.afterEach(() => {
  clearTestDependencies();
});

Deno.test('inject() reuses singleton services within the same object graph', () => {
  const root = inject(_SingletonRoot);

  assertStrictEquals(root.consumerA.service, root.consumerB.service);
});

Deno.test('inject() recreates transient services within the same object graph', () => {
  const root = inject(TransientRoot);

  assertNotStrictEquals(root.consumerA.service, root.consumerB.service);
});
