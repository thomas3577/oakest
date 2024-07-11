import { Reflect } from '@dx/inject';

import { ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import type { ParamData, RouteArgsMetadata } from '../types.ts';
import { isNil, isString } from '../utils/router.util.ts';

function createPipesRouteParamDecorator(paramType: RouteParamTypes) {
  return (data?: ParamData): ParameterDecorator => (target, key, index) => {
    const args: RouteArgsMetadata[] = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, key as string | symbol) || [];
    const hasParamData = isNil(data) || isString(data);
    const paramData = hasParamData ? data : undefined;

    args.push({
      paramType,
      index,
      data: paramData,
    });

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target, key as string | symbol);
  };
}

/**
 * Request decorator
 *
 * @param {string} property - Property for the request
 */
export function Request(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.REQUEST)(property);
}

export const Req = Request;

/**
 * Context decorator
 *
 * @param {string} property - Property for the context
 *
 * @returns {ParameterDecorator}
 */
export function Context(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.CONTEXT)(property);
}

export const Ctx = Context;

/**
 * Response decorator
 *
 * @param {string} property - Property for the response
 *
 * @returns {ParameterDecorator}
 */
export function Response(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.RESPONSE)(property);
}

export const Res = Response;

/**
 * Next decorator
 *
 * @param {string} property - Property for the next
 *
 * @returns {ParameterDecorator}
 */
export function Next(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.NEXT)(property);
}

/**
 * Query decorator
 *
 * @param {string} property - Property for the query
 *
 * @returns {ParameterDecorator}
 */
export function Query(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.QUERY)(property);
}

/**
 * Param decorator
 *
 * @param {string} property - Property for the param
 *
 * @returns {ParameterDecorator}
 */
export function Param(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.PARAM)(property);
}

/**
 * Body decorator
 *
 * @param {string} property - Property for the body
 *
 * @returns {ParameterDecorator}
 */
export function Body(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.BODY)(property);
}

/**
 * Headers decorator
 *
 * @param {string} property - Property for the headers
 *
 * @returns {ParameterDecorator}
 */
export function Headers(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.HEADERS)(property);
}

/**
 * IP decorator
 *
 * @param {string} property - Property for the IP
 *
 * @returns {ParameterDecorator}
 */
export function IP(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.IP)(property);
}
