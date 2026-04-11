import { Router } from '@oak/oak';
import type { Context, Middleware, Next } from '@oak/oak';

import { MIDDLEWARE_METADATA, MODULE_METADATA } from '../const.ts';
import type { ClassConstructor, ControllerClass, CreateRouterOption } from '../types.ts';
import { createInjector } from './injector.util.ts';
import { getMetadata } from './metadata.util.ts';

type Injector = ReturnType<typeof createInjector>;
type MiddlewareHandler = (ctx: Context, next: Next) => void | Promise<void>;
type DecoratorMetadataBag = Record<PropertyKey, unknown>;
type MiddlewareRegistration = { functionName: string; handler: MiddlewareHandler };

export const isUndefined = (obj: unknown): obj is undefined => typeof obj === 'undefined';
export const isString = (fn: unknown): fn is string => typeof fn === 'string';
export const isNil = (obj: unknown): obj is null | undefined => isUndefined(obj) || obj === null;

const mergeRoutePrefix = (prefix?: string, routePrefix?: string): string | undefined => {
  const normalizedPrefix = prefix?.replace(/\/+$/, '');
  const normalizedRoutePrefix = routePrefix?.replace(/^\/+/, '');

  if (normalizedPrefix && normalizedRoutePrefix) {
    return `${normalizedPrefix}/${normalizedRoutePrefix}`;
  }

  return normalizedPrefix || normalizedRoutePrefix;
};

const getModuleOptions = (module: ClassConstructor): CreateRouterOption => {
  const moduleOption = getMetadata(MODULE_METADATA, module.prototype) as CreateRouterOption | undefined;

  if (!moduleOption) {
    throw new Error(`Module ${module.name || '<anonymous>'} is missing @Module() metadata.`);
  }

  return moduleOption;
};

const createRouter = (moduleOptions: CreateRouterOption, injector: Injector, controllerTargets: Set<ClassConstructor<unknown>>, prefix?: string, router = new Router()): Router<Record<string, unknown>> => {
  const { controllers, routePrefix } = moduleOptions;

  controllers?.forEach((Controller: ClassConstructor<unknown>) => {
    if (controllerTargets.has(Controller)) {
      return;
    }

    controllerTargets.add(Controller);

    const prefixFull = mergeRoutePrefix(prefix, routePrefix);
    const controller: ControllerClass = injector.resolve(Controller as ClassConstructor<ControllerClass>);
    controller.init(prefixFull);

    const { path, route } = controller;

    if (!route) {
      throw new Error(`Controller ${Controller.name} has no route defined.`);
    }

    router.use(path ?? '', route.routes(), route.allowedMethods());
  });

  return router;
};

const getRouter = (module: ClassConstructor, injector: Injector, controllerTargets: Set<ClassConstructor<unknown>>, prefix?: string, router?: Router): Router<Record<string, unknown>> => {
  const moduleOption = getModuleOptions(module);
  const newRouter: Router<Record<string, unknown>> = createRouter(moduleOption, injector, controllerTargets, prefix, router);
  const prefixFull = mergeRoutePrefix(prefix, moduleOption.routePrefix);

  moduleOption.modules?.forEach((module) => getRouter(module, injector, controllerTargets, prefixFull, newRouter)) || [];

  return newRouter;
};

const getProviders = (module: ClassConstructor, providers: ClassConstructor[] = []): ClassConstructor[] => {
  const moduleOption = getModuleOptions(module);

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
 * @returns {Middleware<Record<string, unknown>, Context<Record<string, unknown>, Record<string, unknown>>>} the middleware
 */
export const assignModule = (module: ClassConstructor): Middleware<Record<string, unknown>, Context<Record<string, unknown>, Record<string, unknown>>> => {
  const injector = createInjector(getProviders(module));
  const router: Router<Record<string, unknown>> = getRouter(module, injector, new Set<ClassConstructor<unknown>>());
  const routes = router.routes();

  return routes;
};

/**
 * Registers a decorator that can be added to a controller's
 * method. The handler will be called at runtime when the
 * endpoint method is invoked with the Context and Next parameters.
 *
 * @param {ClassMethodDecoratorContext} context - standard method decorator context
 * @param {MiddlewareHandler} handler - decorator handler
 */
export function registerMiddlewareMethodDecorator<This extends object, Args extends unknown[], Return>(
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
  handler: MiddlewareHandler,
): void {
  if (context.kind !== 'method' || context.static || context.private || typeof context.name !== 'string') {
    throw new Error('registerMiddlewareMethodDecorator() only supports public instance methods.');
  }

  const metadata = context.metadata as DecoratorMetadataBag;
  const registrations = (metadata[MIDDLEWARE_METADATA] as MiddlewareRegistration[] | undefined) ?? [];

  registrations.push({
    functionName: context.name,
    handler,
  });

  metadata[MIDDLEWARE_METADATA] = registrations;
}
