import type { Constructor } from '@dx/inject';
import { Router } from '@oak/oak';
import { bootstrap } from '@dx/inject';

import type { ModuleOptions } from './types.ts';
import { CONTROLLER_METADATA, INJECTOR_INTERFACES_METADATA, MODULE_METADATA } from './const.ts';

const createRouter = ({ controllers, routePrefix }: ModuleOptions, providers: Constructor[], prefix?: string, router = new Router()): Router<Record<string, any>> => {
  controllers?.forEach((Controller) => {
    const RequiredProviders: Constructor<object>[] = (Reflect.getMetadata('design:paramtypes', Object.getPrototypeOf(Controller)) || [])
      .map((RequiredProvider: Constructor, idx: number) => {
        const { injectables } = Reflect.getMetadata(CONTROLLER_METADATA, Controller) || { injectables: [] };
        const Provider: Constructor | undefined = providers.find((provider) => {
          const implementing = Reflect.getMetadata(INJECTOR_INTERFACES_METADATA, provider) || [];

          return (provider === RequiredProvider || Object.prototype.isPrototypeOf.call(provider.prototype, RequiredProvider.prototype) || implementing.includes(injectables[idx]));
        });

        if (!Provider) {
          throw new Error(`Provider of type ${RequiredProvider.name} not found for controller: ${Object.getPrototypeOf(Controller).name}`);
        }

        return Provider;
      });

    Reflect.defineMetadata('design:paramtypes', RequiredProviders, Controller);

    const controller = bootstrap<any>(Controller);
    const prefixFull: string | undefined = prefix ? prefix + (routePrefix ? `/${routePrefix}` : '') : routePrefix;

    controller.init(prefixFull);

    const { path, route } = controller;

    if (!route) {
      throw new Error(`Controller ${Controller.name} has no route defined.`);
    }

    router.use(path ?? '', route.routes(), route.allowedMethods());
  });

  return router;
};

const getProviders = (module: Constructor, providers: Constructor[] = []): Constructor[] => {
  const moduleOption: ModuleOptions = Reflect.getMetadata(MODULE_METADATA, module.prototype);

  providers = [...providers, ...(moduleOption.providers || [])];

  moduleOption.modules?.forEach((subModule) => {
    providers = getProviders(subModule, providers);
  });

  return [...new Set(providers)];
};

export const getRouter = (module: Constructor, prefix?: string, router?: Router): Router<Record<string, any>> => {
  const mainModuleOption: ModuleOptions = Reflect.getMetadata(MODULE_METADATA, module.prototype);
  const providers: Constructor[] = getProviders(module);
  const newRouter: Router<Record<string, any>> = createRouter(mainModuleOption, providers, prefix, router);

  mainModuleOption.modules?.forEach((module) => getRouter(module, mainModuleOption.routePrefix, newRouter)) || [];

  return newRouter;
};
