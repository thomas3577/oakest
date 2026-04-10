import '../utils/reflect-shim.ts';

import { Router } from '@oak/oak';
import type { RouterContext } from '@oak/oak';
import * as log from '@std/log';

import { RouteParamTypes } from '../enums.ts';
import { METHOD_METADATA, MIDDLEWARE_METADATA } from '../const.ts';
import type { ActionMetadata, ControllerClass, HTTPMethods, RouteArgResolver } from '../types.ts';
import { getMetadata } from '../utils/metadata.util.ts';

type Next = () => Promise<unknown>;
type ControllerConstructor = new (...instance: never[]) => object;
type RouterMethodInvoker = Router & Record<HTTPMethods, (path: string, ...handlers: unknown[]) => Router>;
type ControllerMethodMap = Record<string, (...args: unknown[]) => unknown>;

/**
 * Controller decorator
 *
 * @param {string} options - Path for the controller
 */
export function Controller<T extends ControllerConstructor>(options?: string): (fn: T) => T {
  const path: string | undefined = options;

  const result = (fn: T) => {
    const BaseController = fn as ControllerConstructor;

    return class extends BaseController implements ControllerClass {
      #path?: string;
      #route?: Router;

      init(routePrefix?: string): void {
        const prefix = routePrefix ? `/${routePrefix}` : '';

        this.#path = prefix + (path ? `/${path}` : '');

        const route = new Router();
        const list: ActionMetadata[] = getMetadata(METHOD_METADATA, fn.prototype) || [];

        list.forEach((meta: ActionMetadata) => {
          const middlewaresMetadata = getMetadata(MIDDLEWARE_METADATA, fn.prototype, meta.functionName);
          const middlewares = Array.isArray(middlewaresMetadata) ? middlewaresMetadata : middlewaresMetadata ? [middlewaresMetadata] : [];

          (route as RouterMethodInvoker)[meta.method](`/${meta.path}`, ...middlewares, async (context: RouterContext<string>, next: Next) => {
            const handler = (this as unknown as ControllerMethodMap)[meta.functionName];
            const inputs = await resolveHandlerInputs(handler, meta.args, context, next);

            const result = await handler.apply(this, inputs);
            if (result === undefined) return;

            if (context.response.writable) {
              context.response.body = result;
            } else {
              log.warn(`Response is not writable`);
            }
          });

          logMapping(meta, this.path);
        });

        this.#route = route;
      }

      get path(): string | undefined {
        return this.#path;
      }

      get route(): Router | undefined {
        return this.#route;
      }
    } as unknown as T;
  };

  return result;
}

function logMapping(meta: ActionMetadata, path?: string): void {
  const fullPath = path + (meta.path ? `/${meta.path}` : '');
  const methodName = `${meta.method.toUpperCase()}`.padStart(6);

  log.info(`${methodName} ${fullPath}`);
}

async function resolveHandlerInputs(
  handler: (...args: unknown[]) => unknown,
  routeArgs: RouteArgResolver[] | undefined,
  context: RouterContext<string>,
  next: Next,
): Promise<unknown[]> {
  if (routeArgs && routeArgs.length > 0) {
    const inputs = await Promise.all(routeArgs.map(async (data) => await getContextData(data, context, next)));
    const parameterCount = handler.length;

    if (parameterCount === inputs.length) {
      return inputs;
    }

    if (parameterCount === inputs.length + 1) {
      return [...inputs, context];
    }

    throw new Error(`Handler ${handler.name || '<anonymous>'} expects ${parameterCount} parameters, but route mapping resolved ${inputs.length} argument(s). Only an optional trailing ctx parameter is supported.`);
  }

  if (handler.length === 1) {
    return [context];
  }

  if (handler.length > 1) {
    throw new Error(`Handler ${handler.name || '<anonymous>'} expects ${handler.length} parameters, but no route argument mapping was provided. Use @Get/@Post/... with resolver arguments or accept only ctx as a single parameter.`);
  }

  return [];
}

async function getContextData(args: RouteArgResolver, ctx: RouterContext<string>, next: Next): Promise<unknown> {
  const { paramType, data } = args;
  const req = ctx.request;
  const res = ctx.response;

  switch (paramType) {
    case RouteParamTypes.CONTEXT: {
      return ctx;
    }
    case RouteParamTypes.REQUEST: {
      return req;
    }
    case RouteParamTypes.RESPONSE: {
      return res;
    }
    case RouteParamTypes.NEXT: {
      return next;
    }
    case RouteParamTypes.QUERY: {
      const query: URLSearchParams = ctx.request.url.searchParams;

      return data ? query.get(data.toString()) : query;
    }
    case RouteParamTypes.PARAM: {
      const params = ctx.params;

      return data ? params[data.toString()] : params;
    }
    case RouteParamTypes.BODY: {
      const value = await req.body.json();

      return data ? value[data.toString()] : value;
    }
    case RouteParamTypes.HEADERS: {
      const header: Headers = req.headers;

      return data ? header.get(data.toString()) : Object.fromEntries(header);
    }
    case RouteParamTypes.IP: {
      return req.ip;
    }
    case RouteParamTypes.CUSTOM: {
      return await args.handler!(ctx, data);
    }
    default: {
      return;
    }
  }
}
