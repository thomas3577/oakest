// deno-lint-ignore-file no-explicit-any
import { Router, RouterContext } from '@oak/oak';
import { Reflect } from '@dx/inject';

import logger from '../utils/logger.ts';
import { ActionMetadata, RouteArgsMetadata } from '../types.ts';
import { RouteParamTypes } from '../enums.ts';
import { CONTROLLER_METADATA, METHOD_METADATA, MIDDLEWARE_METADATA, ROUTE_ARGS_METADATA } from '../const.ts';

type Next = () => Promise<unknown>;

type ControllerOptions = {
  path?: string;
  injectables: Array<string | symbol | null>;
};

/**
 * Controller decorator
 * @param {string | ControllerOptions} options - Path for the controller
 */
export function Controller<T extends { new (...instance: any[]): object }>(options?: string | ControllerOptions): (fn: T) => any {
  const path: string | undefined = typeof options === 'string' ? options : options?.path;
  const injectables = typeof options === 'string' ? [] : options?.injectables || [];

  return (fn: T): any => {
    Reflect.defineMetadata(CONTROLLER_METADATA, { injectables }, fn);

    return class extends fn {
      private _path?: string;
      private _route?: Router;

      init(routePrefix?: string) {
        const prefix = routePrefix ? `/${routePrefix}` : '';

        this._path = prefix + (path ? `/${path}` : '');

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
              logger.warn(`Response is not writable`);
            }
          });

          const fullPath = this.path + (meta.path ? `/${meta.path}` : '');
          logger.info(`Mapped: [${meta.method.toUpperCase()}]${fullPath}`);
        });

        this._route = route;
      }

      get path(): string | undefined {
        return this._path;
      }

      get route(): Router | undefined {
        return this._route;
      }
    };
  };
}

async function getContextData(args: RouteArgsMetadata, ctx: RouterContext<string>, next: Next) {
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
