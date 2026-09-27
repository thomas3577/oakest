import type { Next, Request, Response, RouterContext } from '@oak/oak';

import { RouteParamTypes } from '../enums.ts';
import { isNil, isString } from '../utils/router.util.ts';
import type { ParamData, TypedRouteArgResolver } from '../types.ts';

/** Maps a {@linkcode RouteParamTypes} to the type of its resolved value. */
export type RouteParamReturn<TParam extends RouteParamTypes> = TParam extends RouteParamTypes.REQUEST ? Request
  : TParam extends RouteParamTypes.CONTEXT ? RouterContext<string>
  : TParam extends RouteParamTypes.RESPONSE ? Response
  : TParam extends RouteParamTypes.NEXT ? Next
  : TParam extends RouteParamTypes.BODY ? unknown
  : TParam extends RouteParamTypes.QUERY ? string | URLSearchParams
  : TParam extends RouteParamTypes.PARAM ? string | Record<string, string>
  : TParam extends RouteParamTypes.HEADERS ? string | undefined | Record<string, string>
  : TParam extends RouteParamTypes.IP ? string
  : unknown;

/** Creates a {@linkcode TypedRouteArgResolver}, optionally for a specific key. */
export type RouteArgResolverFactory<TDefault = unknown> = <T = TDefault>(data?: ParamData) => TypedRouteArgResolver<T>;

/** Creates a {@linkcode TypedRouteArgResolver} from a custom handler. */
export type CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData) => TypedRouteArgResolver<Awaited<ReturnType<THandler>>>;

const normalizeParamData = (data?: ParamData): ParamData | undefined => {
  return isNil(data) || isString(data) ? data : undefined;
};

function createRouteArgResolver<TParam extends RouteParamTypes>(paramType: TParam): RouteArgResolverFactory<RouteParamReturn<TParam>> {
  return <T = RouteParamReturn<TParam>>(data?: ParamData): TypedRouteArgResolver<T> => {
    return {
      paramType,
      data: normalizeParamData(data),
    } as TypedRouteArgResolver<T>;
  };
}

/** Resolves the Oak request (`ctx.request`). */
export const req: RouteArgResolverFactory<Request> = createRouteArgResolver(RouteParamTypes.REQUEST);
/** Resolves the full Oak router context. */
export const ctx: RouteArgResolverFactory<RouterContext<string>> = createRouteArgResolver(RouteParamTypes.CONTEXT);
/** Resolves the Oak response (`ctx.response`). */
export const res: RouteArgResolverFactory<Response> = createRouteArgResolver(RouteParamTypes.RESPONSE);
/** Resolves Oak's `next` function. */
export const next: RouteArgResolverFactory<Next> = createRouteArgResolver(RouteParamTypes.NEXT);
/** Resolves all query params as `URLSearchParams`, or a single value with `query(key)`. */
export const query: RouteArgResolverFactory<string | URLSearchParams> = createRouteArgResolver(RouteParamTypes.QUERY);
/** Resolves all route params, or a single one with `param(key)`. */
export const param: RouteArgResolverFactory<string | Record<string, string>> = createRouteArgResolver(RouteParamTypes.PARAM);
/** Resolves the parsed JSON body, or a single property with `body(key)`. */
export const body: RouteArgResolverFactory<unknown> = createRouteArgResolver(RouteParamTypes.BODY);
/** Resolves all headers as an object, or a single header with `headers(name)`. */
export const headers: RouteArgResolverFactory<string | undefined | Record<string, string>> = createRouteArgResolver(RouteParamTypes.HEADERS);
/** Resolves the client IP. */
export const ip: RouteArgResolverFactory<string> = createRouteArgResolver(RouteParamTypes.IP);

/**
 * Resolves a custom value. The handler may be async; its return type becomes the argument type.
 *
 * @example
 * ```ts
 * @Get('me', [custom((ctx) => ctx.state.user)])
 * ```
 */
export const custom: CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData): TypedRouteArgResolver<Awaited<ReturnType<THandler>>> => {
  return {
    paramType: RouteParamTypes.CUSTOM,
    data: normalizeParamData(data),
    handler,
  };
};
