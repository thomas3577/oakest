import { Router } from '@oak/oak';
import type { Context, Middleware, Next, RouterContext } from '@oak/oak';
import { bootstrap } from '@dx/inject';

import { CONTROLLER_METADATA, INJECTOR_INTERFACES_METADATA, MIDDLEWARE_METADATA, MODULE_METADATA, ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import type { ClassConstructor, ControllerClass, CreateRouterOption, ParamData, RouteArgsMetadata } from '../types.ts';

export const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isNil = (obj: any): obj is null | undefined => isUndefined(obj) || obj === null;

const controllerNames: string[] = [];

const createRouter = (moduleOptions: CreateRouterOption, providers: ClassConstructor[], prefix?: string, router = new Router()): Router<Record<string, any>> => {
  const { controllers, routePrefix } = moduleOptions;

  controllers?.forEach((Controller: ClassConstructor<unknown>) => {
    const ControllerTarget = Object.getPrototypeOf(Controller);
    if (controllerNames.includes(ControllerTarget.name)) {
      return;
    }

    controllerNames.push(ControllerTarget.name);

    const RequiredProviders: ClassConstructor<object>[] = (Reflect.getMetadata('design:paramtypes', ControllerTarget) || [])
      .map((RequiredProvider: ClassConstructor, idx: number) => {
        const { injectables } = Reflect.getMetadata(CONTROLLER_METADATA, Controller) || { injectables: [] };
        const Provider: ClassConstructor | undefined = providers.find((provider) => {
          const implementing = Reflect.getMetadata(INJECTOR_INTERFACES_METADATA, provider) || [];

          return (provider === RequiredProvider || Object.prototype.isPrototypeOf.call(provider.prototype, RequiredProvider.prototype) || implementing.includes(injectables[idx]));
        });

        if (!Provider) {
          throw new Error(`Provider of type ${RequiredProvider.name} not found for controller: ${Object.getPrototypeOf(Controller).name}`);
        }

        return Provider;
      });

    Reflect.defineMetadata('design:paramtypes', RequiredProviders, Controller);

    const prefixFull: string | undefined = prefix ? prefix + (routePrefix ? `/${routePrefix}` : '') : routePrefix;

    const controller: ControllerClass = bootstrap<ControllerClass>(Controller as unknown as new (...args: any[]) => ControllerClass);
    controller.init(prefixFull);

    const { path, route } = controller;

    if (!route) {
      throw new Error(`Controller ${Controller.name} has no route defined.`);
    }

    router.use(path ?? '', route.routes(), route.allowedMethods());
  });

  return router;
};

const getRouter = (module: ClassConstructor, prefix?: string, router?: Router): Router<Record<string, any>> => {
  const moduleOption: CreateRouterOption = Reflect.getMetadata(MODULE_METADATA, module.prototype);
  const providers: ClassConstructor[] = getProviders(module);
  const newRouter: Router<Record<string, any>> = createRouter(moduleOption, providers, prefix, router);

  moduleOption.modules?.forEach((module) => getRouter(module, moduleOption.routePrefix, newRouter)) || [];

  return newRouter;
};

const getProviders = (module: ClassConstructor, providers: ClassConstructor[] = []): ClassConstructor[] => {
  const moduleOption: CreateRouterOption = Reflect.getMetadata(MODULE_METADATA, module.prototype);

  providers = [...providers, ...(moduleOption.providers || [])];

  moduleOption.modules?.forEach((subModule) => {
    providers = getProviders(subModule, providers);
  });

  return [...new Set(providers)];
};

/**
 * Assigns a module to a router.
 *
 * @param {ClassConstructor} module - the module to assign
 *
 * @returns {Middleware<Record<string, any>, Context<Record<string, any>, Record<string, any>>>} the middleware
 */
export const assignModule = (module: ClassConstructor): Middleware<Record<string, any>, Context<Record<string, any>, Record<string, any>>> => {
  const router: Router<Record<string, any>> = getRouter(module);
  const routes = router.routes();

  return routes;
};

/**
 * Registers a decorator that can be added to a controller's
 * method. The handler will be called at runtime when the
 * endpoint method is invoked with the Context and Next parameters.
 *
 * @param {ClassConstructor} target - decorator's target
 * @param {string} methodName - decorator's method name
 * @param {(ctx: Context, next: Next) => void} handler - decorator's handler
 */
export const registerMiddlewareMethodDecorator = (target: ClassConstructor, methodName: string, handler: (ctx: Context, next: Next) => void): void => {
  const middleware = Reflect.getMetadata(MIDDLEWARE_METADATA, target, methodName) || [];
  middleware.push(handler);

  Reflect.defineMetadata(MIDDLEWARE_METADATA, middleware, target, methodName);
};

/**
 * Registers a custom route parameter decorator.
 *
 * @param {ClassConstructor} target - the target object
 * @param {string} methodName - the name of the method
 * @param {number} paramIndex - the index of the parameter
 *
 * @returns {(data?: ParamData) => (handler: (ctx: RouterContext<string>) => void) => void} a function that takes optional data and returns a function that requires the param's handler as only parameter
 */
export const registerCustomRouteParamDecorator = (target: ClassConstructor, methodName: string, paramIndex: number): (data?: ParamData) => (handler: (ctx: RouterContext<string>) => void) => void => {
  return (data?: ParamData) => (handler: (ctx: RouterContext<string>) => void) => {
    const args: RouteArgsMetadata[] = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, methodName) || [];
    const hasParamData = isNil(data) || isString(data);
    const paramData = hasParamData ? data : undefined;

    args.push({
      paramType: RouteParamTypes.CUSTOM,
      index: paramIndex,
      data: paramData,
      handler,
    });

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target, methodName);
  };
};
