import { ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import { isNil, isString } from '../utils/router.util.ts';
import type { ParamData, RouteArgsMetadata } from '../types.ts';

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
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Req(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.REQUEST)(property);
}

/**
 * Context decorator
 *
 * @param {string} property - Property for the context
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Ctx(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.CONTEXT)(property);
}

/**
 * Response decorator
 *
 * @param {string} property - Property for the response
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Res(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.RESPONSE)(property);
}

/**
 * Next decorator
 *
 * @param {string} property - Property for the next
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Next(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.NEXT)(property);
}

/**
 * Query decorator
 *
 * @param {string} property - Property for the query
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Query(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.QUERY)(property);
}

/**
 * Param decorator
 *
 * @param {string} property - Property for the param
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Param(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.PARAM)(property);
}

/**
 * Body decorator
 *
 * @param {string} property - Property for the body
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Body(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.BODY)(property);
}

/**
 * Headers decorator
 *
 * @param {string} property - Property for the headers
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function Headers(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.HEADERS)(property);
}

/**
 * IP decorator
 *
 * @param {string} property - Property for the IP
 *
 * @returns {ParameterDecorator} - The request decorator
 */
export function IP(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.IP)(property);
}
