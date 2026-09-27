import type { Context, Next, Router, RouterContext } from '@oak/oak';

import type { RouteParamTypes } from './enums.ts';

export type HTTPMethods = 'get' | 'put' | 'patch' | 'post' | 'delete' | 'all';

export interface ActionMetadata {
  path: string;
  method: HTTPMethods;
  functionName: string;
  args?: RouteArgResolver[];
}

/**
 * Options for the `@Module()` decorator.
 */
export interface CreateRouterOption {
  /** Controllers defined in this module. */
  controllers?: ClassConstructor[];
  /** Providers that will be instantiated by the injector. */
  providers?: ClassConstructor[];
  /** Child modules of this module. */
  modules?: ClassConstructor[];
  /** Common URL prefix for all controllers of this module. */
  routePrefix?: string;
}

/**
 * Additional data passed to a route argument resolver, e.g. the key in `param('id')`.
 */
export type ParamData = Record<string, unknown> | string | number;

/**
 * Controller base type
 */
export type ControllerClass = {
  /** Full path of the controller, set by `init()`. */
  path?: string;
  /** Oak router with the controller routes, set by `init()`. */
  route?: Router;
  /** Builds the router, optionally below `routePrefix`. */
  init(routePrefix?: string): void;
};

/**
 * Describes how a single handler argument is resolved from the request.
 */
export interface RouteArgResolver {
  /** Kind of value to resolve. */
  paramType: RouteParamTypes;
  /** Optional key or data for the resolver. */
  data?: ParamData;
  /** Resolver function, only used by `custom(...)`. */
  handler?: (ctx: RouterContext<string>, data?: ParamData) => unknown;
}

/**
 * A {@linkcode RouteArgResolver} carrying the type of the resolved value.
 */
export interface TypedRouteArgResolver<T = unknown> extends RouteArgResolver {
  /** Type marker only, never set at runtime. */
  readonly __type?: T;
}

/**
 * Any class constructor.
 */
// deno-lint-ignore no-explicit-any -- Constructor parameter types must stay permissive for assignability across decorated classes.
export type ClassConstructor<T = object> = new (...args: any[]) => T;

/**
 * Constructor of a class that can be decorated with `@Controller()`.
 */
export type ControllerConstructor = new (...instance: never[]) => object;

/**
 * Standard method decorator returned by `@Get()`, `@Post()`, ...
 */
export type RouteMethodDecorator = <This, Args extends unknown[], Return>(
  value: (this: This, ...args: Args) => Return,
  context: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => Return>,
) => void;

/**
 * Middleware registered with `registerMiddlewareMethodDecorator()`.
 */
export type MiddlewareHandler = (ctx: Context, next: Next) => void | Promise<void>;
