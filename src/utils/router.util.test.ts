import { assertExists } from 'jsr:@std/assert@1.0.2';
import { Router } from '@oak/oak';
import { Reflect } from '@dx/inject';

import { MODULE_METADATA } from '../const.ts';
import { assignModule } from './router.util.ts';
import type { ModuleOptions } from '../types.ts';

class TestController {
  path = '';
  route = new Router();
  init() {}
}

class RootModule {}

class ChildModule {}

Deno.test('run assignModule()', async () => {
  const option: ModuleOptions = { controllers: [] };

  // Workaround: sync is too fast? And no way to set test timeout (https://github.com/denoland/deno/issues/11133)
  await new Promise((resolve) => {
    Reflect.defineMetadata(MODULE_METADATA, option, RootModule.prototype);
    resolve(null);
  });

  const middleware = assignModule(RootModule);
  assertExists(middleware);
});

Deno.test('run assignModule() with routePrefix & controllers', () => {
  const option: ModuleOptions = {
    controllers: [TestController],
    routePrefix: 'test',
  };
  Reflect.defineMetadata(MODULE_METADATA, option, RootModule.prototype);

  const middleware = assignModule(RootModule);
  assertExists(middleware);
});

Deno.test('run assignModule() with modules', () => {
  const option: ModuleOptions = {
    controllers: [],
    modules: [ChildModule],
    routePrefix: 'test',
  };
  const childOption: ModuleOptions = {
    controllers: [TestController],
    routePrefix: 'test2',
  };
  Reflect.defineMetadata(MODULE_METADATA, option, RootModule.prototype);
  Reflect.defineMetadata(MODULE_METADATA, childOption, ChildModule.prototype);

  const middleware = assignModule(RootModule);
  assertExists(middleware);
});
