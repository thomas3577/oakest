import type { RouterContext } from '@oak/oak';

import { RouteParamTypes } from '../enums.ts';
import { isNil, isString } from '../utils/router.util.ts';
import type { ParamData, TypedRouteArgResolver } from '../types.ts';

export type RouteArgResolverFactory = <T = unknown>(data?: ParamData) => TypedRouteArgResolver<T>;

export type CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData) => TypedRouteArgResolver<Awaited<ReturnType<THandler>>>;

const normalizeParamData = (data?: ParamData): ParamData | undefined => {
  return isNil(data) || isString(data) ? data : undefined;
};

function createRouteArgResolver(paramType: RouteParamTypes): RouteArgResolverFactory {
  return <T = unknown>(data?: ParamData): TypedRouteArgResolver<T> => {
    return {
      paramType,
      data: normalizeParamData(data),
    };
  };
}

export const req: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.REQUEST);
export const ctx: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.CONTEXT);
export const res: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.RESPONSE);
export const next: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.NEXT);
export const query: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.QUERY);
export const param: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.PARAM);
export const body: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.BODY);
export const headers: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.HEADERS);
export const ip: RouteArgResolverFactory = createRouteArgResolver(RouteParamTypes.IP);

export const custom: CustomRouteArgResolverFactory = <THandler extends (ctx: RouterContext<string>, data?: ParamData) => unknown>(handler: THandler, data?: ParamData): TypedRouteArgResolver<Awaited<ReturnType<THandler>>> => {
  return {
    paramType: RouteParamTypes.CUSTOM,
    data: normalizeParamData(data),
    handler,
  };
};
