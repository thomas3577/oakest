import { assertEquals, assertExists } from '@std/assert';
import { Application } from '@oak/oak';

import { Controller } from '../decorators/controller.decorator.ts';
import { Get } from '../decorators/http-methods.decorator.ts';
import { inject, Injectable } from '../decorators/injectable.ts';
import { Module } from '../decorators/module.decorator.ts';
import type { ClassConstructor } from '../types.ts';
import { assignModule } from './router.util.ts';

const handleModuleRequest = async (module: ClassConstructor, path: string) => {
  const app = new Application();
  app.use(assignModule(module));

  const response = await app.handle(new Request(`http://localhost${path}`));

  assertExists(response);

  return response;
};

@Controller('health')
class BasicController {
  @Get('ping')
  ping() {
    return 'pong';
  }
}

@Module({ controllers: [BasicController] })
class BasicModule {}

Deno.test('assignModule() exposes controller routes', async () => {
  const response = await handleModuleRequest(BasicModule, '/health/ping');

  assertEquals(response.status, 200);
  assertEquals(await response.text(), 'pong');
});

@Controller('leaf')
class LeafController {
  @Get('ping')
  ping() {
    return 'nested';
  }
}

@Module({ controllers: [LeafController], routePrefix: 'leaf-prefix' })
class LeafModule {}

@Module({ modules: [LeafModule], routePrefix: 'mid-prefix' })
class MidModule {}

@Module({ modules: [MidModule], routePrefix: 'root-prefix' })
class NestedRootModule {}

Deno.test('assignModule() composes routePrefix values across nested modules', async () => {
  const response = await handleModuleRequest(NestedRootModule, '/root-prefix/mid-prefix/leaf-prefix/leaf/ping');

  assertEquals(response.status, 200);
  assertEquals(await response.text(), 'nested');
});

@Controller('repeat')
class RepeatedController {
  @Get('ping')
  ping() {
    return 'repeat';
  }
}

@Module({ controllers: [RepeatedController], routePrefix: 'repeat-prefix' })
class RepeatedModule {}

Deno.test('assignModule() does not leak controller deduplication across separate router builds', async () => {
  const firstResponse = await handleModuleRequest(RepeatedModule, '/repeat-prefix/repeat/ping');
  const secondResponse = await handleModuleRequest(RepeatedModule, '/repeat-prefix/repeat/ping');

  assertEquals(firstResponse.status, 200);
  assertEquals(await firstResponse.text(), 'repeat');
  assertEquals(secondResponse.status, 200);
  assertEquals(await secondResponse.text(), 'repeat');
});

@Injectable()
class SharedProvider {
  readonly id = 'shared-provider';
}

@Controller('parent')
class ParentProviderController {
  constructor(readonly shared = inject(SharedProvider)) {}

  @Get('id')
  id() {
    return this.shared.id;
  }
}

@Controller('child')
class ChildProviderController {
  constructor(readonly shared = inject(SharedProvider)) {}

  @Get('id')
  id() {
    return this.shared.id;
  }
}

@Module({ controllers: [ChildProviderController], providers: [SharedProvider] })
class ProviderChildModule {}

@Module({ controllers: [ParentProviderController], providers: [SharedProvider], modules: [ProviderChildModule] })
class ProviderRootModule {}

Deno.test('assignModule() aggregates deduplicated providers across nested modules', async () => {
  const parentResponse = await handleModuleRequest(ProviderRootModule, '/parent/id');
  const childResponse = await handleModuleRequest(ProviderRootModule, '/child/id');

  assertEquals(parentResponse.status, 200);
  assertEquals(await parentResponse.text(), 'shared-provider');
  assertEquals(childResponse.status, 200);
  assertEquals(await childResponse.text(), 'shared-provider');
});
