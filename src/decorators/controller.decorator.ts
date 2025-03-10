import { Router } from '@oak/oak';
import type { RouterContext } from '@oak/oak';
import * as log from '@std/log';

import { RouteParamTypes } from '../enums.ts';
import { CONTROLLER_METADATA, METHOD_METADATA, MIDDLEWARE_METADATA, ROUTE_ARGS_METADATA } from '../const.ts';
import type { ActionMetadata, ControllerClass, RouteArgsMetadata } from '../types.ts';

type Next = () => Promise<unknown>;

type ControllerOptions = {
  path?: string;
  injectables: Array<string | symbol | null>;
};

/**
 * Controller decorator
 *
 * @param {string | ControllerOptions} options - Path for the controller
 */
export function Controller<T extends { new (...instance: any[]): object }>(options?: string | ControllerOptions): (fn: T) => any {
  const path: string | undefined = typeof options === 'string' ? options : options?.path;
  const injectables: Array<string | symbol | null> = typeof options === 'string' ? [] : options?.injectables || [];

  const result = (fn: T) => {
    Reflect.defineMetadata(CONTROLLER_METADATA, { injectables }, fn);

    return class extends fn implements ControllerClass {
      #path?: string;
      #route?: Router;

      init(routePrefix?: string): void {
        const prefix = routePrefix ? `/${routePrefix}` : '';

        this.#path = prefix + (path ? `/${path}` : '');

        const route = new Router();
        const list: ActionMetadata[] = Reflect.getMetadata(METHOD_METADATA, fn.prototype) || [];

        list.forEach((meta: ActionMetadata) => {
          const argsMetadataList: RouteArgsMetadata[] = Reflect.getMetadata(ROUTE_ARGS_METADATA, fn.prototype, meta.functionName) || [];
          const middlewaresMetadata = Reflect.getMetadata(MIDDLEWARE_METADATA, fn.prototype, meta.functionName);
          const middlewares = Array.isArray(middlewaresMetadata) ? middlewaresMetadata : middlewaresMetadata ? [middlewaresMetadata] : [];

          (route as any)[meta.method](`/${meta.path}`, ...middlewares, async (context: RouterContext<string>, next: Next) => {
            const inputs = await Promise.all(
              argsMetadataList
                .sort((a, b) => a.index - b.index)
                .map(async (data) => await getContextData(data, context, next)),
            );

            const result = await (this as any)[meta.functionName](...inputs);
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
    };
  };

  return result;
}

function logMapping(meta: ActionMetadata, path?: string): void {
  const fullPath = path + (meta.path ? `/${meta.path}` : '');
  const methodName = `${meta.method.toUpperCase()}`.padStart(6);

  log.info(`${methodName} ${fullPath}`);
}

type TContextData =
  | RouterContext<string, Record<string, any>, Record<string, any>>
  | Request
  | Response
  | Next
  | URLSearchParams
  | Record<string, any>
  | URLSearchParams
  | string
  | null
  | undefined;

async function getContextData(args: RouteArgsMetadata, ctx: RouterContext<string>, next: Next): Promise<TContextData> {
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
