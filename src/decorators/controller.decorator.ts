import '../utils/reflect-shim.ts';

import { Router } from '@oak/oak';
import type { RouterContext } from '@oak/oak';
import * as log from '@std/log';

import { RouteParamTypes } from '../enums.ts';
import { METHOD_METADATA, MIDDLEWARE_METADATA, ROUTE_ARGS_METADATA } from '../const.ts';
import type { ActionMetadata, ControllerClass, HTTPMethods, RouteArgsMetadata } from '../types.ts';
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
          const argsMetadataList: RouteArgsMetadata[] = getMetadata(ROUTE_ARGS_METADATA, fn.prototype, meta.functionName) || [];
          const middlewaresMetadata = getMetadata(MIDDLEWARE_METADATA, fn.prototype, meta.functionName);
          const middlewares = Array.isArray(middlewaresMetadata) ? middlewaresMetadata : middlewaresMetadata ? [middlewaresMetadata] : [];

          (route as RouterMethodInvoker)[meta.method](`/${meta.path}`, ...middlewares, async (context: RouterContext<string>, next: Next) => {
            const inputs = await Promise.all(
              argsMetadataList
                .sort((a, b) => a.index - b.index)
                .map(async (data) => await getContextData(data, context, next)),
            );

            const result = await (this as unknown as ControllerMethodMap)[meta.functionName](...inputs);
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

async function getContextData(args: RouteArgsMetadata, ctx: RouterContext<string>, next: Next): Promise<unknown> {
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
