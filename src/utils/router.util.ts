import { Router } from '@oak/oak';
import type { Context, Middleware, Next, RouterContext } from '@oak/oak';

import { MIDDLEWARE_METADATA, MODULE_METADATA, ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import type { ClassConstructor, ControllerClass, CreateRouterOption, ParamData, RouteArgsMetadata } from '../types.ts';
import { createInjector } from './injector.util.ts';
import { defineMetadata, getMetadata } from './metadata.util.ts';

type Injector = ReturnType<typeof createInjector>;

export const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isNil = (obj: any): obj is null | undefined => isUndefined(obj) || obj === null;

const mergeRoutePrefix = (prefix?: string, routePrefix?: string): string | undefined => {
  const normalizedPrefix = prefix?.replace(/\/+$/, '');
  const normalizedRoutePrefix = routePrefix?.replace(/^\/+/, '');

  if (normalizedPrefix && normalizedRoutePrefix) {
    return `${normalizedPrefix}/${normalizedRoutePrefix}`;
  }

  return normalizedPrefix || normalizedRoutePrefix;
};

const createRouter = (moduleOptions: CreateRouterOption, injector: Injector, controllerNames: Set<string>, prefix?: string, router = new Router()): Router<Record<string, any>> => {
  const { controllers, routePrefix } = moduleOptions;

  controllers?.forEach((Controller: ClassConstructor<unknown>) => {
    const controllerName = Object.getPrototypeOf(Controller).name || Controller.name || Controller.constructor.name;
    if (controllerNames.has(controllerName)) {
      return;
    }

    controllerNames.add(controllerName);

    const prefixFull = mergeRoutePrefix(prefix, routePrefix);
    const controller: ControllerClass = injector.resolve(Controller as unknown as new (...args: any[]) => ControllerClass);
    controller.init(prefixFull);

    const { path, route } = controller;

    if (!route) {
      throw new Error(`Controller ${Controller.name} has no route defined.`);
    }

    router.use(path ?? '', route.routes(), route.allowedMethods());
  });

  return router;
};

const getRouter = (module: ClassConstructor, injector: Injector, controllerNames: Set<string>, prefix?: string, router?: Router): Router<Record<string, any>> => {
  const moduleOption: CreateRouterOption = getMetadata(MODULE_METADATA, module.prototype) as CreateRouterOption;
  const newRouter: Router<Record<string, any>> = createRouter(moduleOption, injector, controllerNames, prefix, router);
  const prefixFull = mergeRoutePrefix(prefix, moduleOption.routePrefix);

  moduleOption.modules?.forEach((module) => getRouter(module, injector, controllerNames, prefixFull, newRouter)) || [];

  return newRouter;
};

const getProviders = (module: ClassConstructor, providers: ClassConstructor[] = []): ClassConstructor[] => {
  const moduleOption: CreateRouterOption = getMetadata(MODULE_METADATA, module.prototype) as CreateRouterOption;

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
  const injector = createInjector(getProviders(module));
  const router: Router<Record<string, any>> = getRouter(module, injector, new Set<string>());
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
  const middleware = getMetadata<Array<(ctx: Context, next: Next) => void>>(MIDDLEWARE_METADATA, target, methodName) || [];
  middleware.push(handler);

  defineMetadata(MIDDLEWARE_METADATA, middleware, target, methodName);
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
    const args: RouteArgsMetadata[] = getMetadata(ROUTE_ARGS_METADATA, target, methodName) || [];
    const hasParamData = isNil(data) || isString(data);
    const paramData = hasParamData ? data : undefined;

    args.push({
      paramType: RouteParamTypes.CUSTOM,
      index: paramIndex,
      data: paramData,
      handler,
    });

    defineMetadata(ROUTE_ARGS_METADATA, args, target, methodName);
  };
};
