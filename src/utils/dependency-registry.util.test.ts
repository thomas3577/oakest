import { assertEquals } from '@std/assert';

import type { ClassConstructor } from '../types.ts';
import { clearDependencies, getDependencies, hasRegisteredDependencies, registerDependencies } from './dependency-registry.util.ts';
import { inject } from './injector.util.ts';

class ExampleService {}

class ExampleConsumer {
  constructor(readonly service: ExampleService) {}
}

const resetState = () => {
  clearDependencies(ExampleConsumer as ClassConstructor);
};

Deno.test.afterEach(() => {
  resetState();
});

Deno.test('dependency registry stores constructor dependencies', () => {
  registerDependencies(ExampleConsumer as ClassConstructor, [ExampleService]);

  assertEquals(hasRegisteredDependencies(ExampleConsumer as ClassConstructor), true);
  assertEquals(getDependencies(ExampleConsumer as ClassConstructor), [ExampleService]);
});

Deno.test('inject() resolves dependencies from the registry before design:paramtypes', () => {
  registerDependencies(ExampleConsumer as ClassConstructor, [ExampleService]);

  const consumer = inject(ExampleConsumer);

  assertEquals(consumer.service instanceof ExampleService, true);
});

Deno.test('inject() throws when dependencies are missing from the registry', () => {
  const error = (() => {
    try {
      inject(ExampleConsumer);
      return undefined;
    } catch (caughtError) {
      return caughtError;
    }
  })();

  assertEquals(error instanceof Error, true);
  assertEquals((error as Error).message.includes('No registered constructor dependencies found for ExampleConsumer'), true);
});
