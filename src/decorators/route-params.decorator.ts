import type { Request, Response, RouterContext } from '@oak/oak';

import { RouteParamTypes } from '../enums.ts';
import { isNil, isString } from '../utils/router.util.ts';
import type { ParamData, TypedRouteArgResolver } from '../types.ts';

type Next = () => Promise<unknown>;

// Type mapping from RouteParamTypes to their concrete return types
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

export type RouteArgResolverFactory<TDefault = unknown> = <T = TDefault>(data?: ParamData) => TypedRouteArgResolver<T>;

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

export const req: RouteArgResolverFactory<Request> = createRouteArgResolver(RouteParamTypes.REQUEST);
export const ctx: RouteArgResolverFactory<RouterContext<string>> = createRouteArgResolver(RouteParamTypes.CONTEXT);
export const res: RouteArgResolverFactory<Response> = createRouteArgResolver(RouteParamTypes.RESPONSE);
export const next: RouteArgResolverFactory<Next> = createRouteArgResolver(RouteParamTypes.NEXT);
export const query: RouteArgResolverFactory<string | URLSearchParams> = createRouteArgResolver(RouteParamTypes.QUERY);
export const param: RouteArgResolverFactory<string | Record<string, string>> = createRouteArgResolver(RouteParamTypes.PARAM);
export const body: RouteArgResolverFactory<unknown> = createRouteArgResolver(RouteParamTypes.BODY);
export const headers: RouteArgResolverFactory<string | undefined | Record<string, string>> = createRouteArgResolver(RouteParamTypes.HEADERS);
export const ip: RouteArgResolverFactory<string> = createRouteArgResolver(RouteParamTypes.IP);

export const custom: CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData): TypedRouteArgResolver<Awaited<ReturnType<THandler>>> => {
  return {
    paramType: RouteParamTypes.CUSTOM,
    data: normalizeParamData(data),
    handler,
  };
};
