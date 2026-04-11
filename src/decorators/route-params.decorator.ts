import type { Request, Response, RouterContext } from '@oak/oak';

import { RouteParamTypes } from '../enums.ts';
import { isNil, isString } from '../utils/router.util.ts';
import type { ParamData, TypedRouteArgResolver } from '../types.ts';

type Next = () => Promise<unknown>;

// Type mapping from RouteParamTypes to their concrete return types
export type RouteParamReturn<TParam extends RouteParamTypes> =
  TParam extends RouteParamTypes.REQUEST ? Request :
  TParam extends RouteParamTypes.CONTEXT ? RouterContext<string> :
  TParam extends RouteParamTypes.RESPONSE ? Response :
  TParam extends RouteParamTypes.NEXT ? Next :
  TParam extends RouteParamTypes.BODY ? unknown :
  TParam extends RouteParamTypes.QUERY ? string | URLSearchParams :
  TParam extends RouteParamTypes.PARAM ? string | Record<string, string> :
  TParam extends RouteParamTypes.HEADERS ? string | undefined | Record<string, string> :
  TParam extends RouteParamTypes.IP ? string :
  unknown;

export type RouteArgResolverFactory = <T = unknown>(data?: ParamData) => TypedRouteArgResolver<T>;

export type CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData) => TypedRouteArgResolver<Awaited<ReturnType<THandler>>>;

const normalizeParamData = (data?: ParamData): ParamData | undefined => {
  return isNil(data) || isString(data) ? data : undefined;
};

function createRouteArgResolver<TParam extends RouteParamTypes>(paramType: TParam) {
  return (data?: ParamData): TypedRouteArgResolver<RouteParamReturn<TParam>> => {
    return {
      paramType,
      data: normalizeParamData(data),
    };
  };
}

export const req = createRouteArgResolver(RouteParamTypes.REQUEST);
export const ctx = createRouteArgResolver(RouteParamTypes.CONTEXT);
export const res = createRouteArgResolver(RouteParamTypes.RESPONSE);
export const next = createRouteArgResolver(RouteParamTypes.NEXT);
export const query = createRouteArgResolver(RouteParamTypes.QUERY);
export const param = createRouteArgResolver(RouteParamTypes.PARAM);
export const body = createRouteArgResolver(RouteParamTypes.BODY);
export const headers = createRouteArgResolver(RouteParamTypes.HEADERS);
export const ip = createRouteArgResolver(RouteParamTypes.IP);

export const custom: CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData): TypedRouteArgResolver<Awaited<ReturnType<THandler>>> => {
  return {
    paramType: RouteParamTypes.CUSTOM,
    data: normalizeParamData(data),
    handler,
  };
};