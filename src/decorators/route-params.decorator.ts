import { Reflect } from '@dx/inject';
import { ROUTE_ARGS_METADATA } from '../const.ts';
import { RouteParamTypes } from '../enums.ts';
import { ParamData, RouteArgsMetadata } from '../types.ts';
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

export function Request(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.REQUEST)(property);
}

export function Context(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.CONTEXT)(property);
}

export function Response(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.RESPONSE)(property);
}

export function Next(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.NEXT)(property);
}

export function Query(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.QUERY)(property);
}

export function Param(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.PARAM)(property);
}

export function Body(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.BODY)(property);
}

export function Headers(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.HEADERS)(property);
}

export function IP(property?: string): ParameterDecorator {
  return createPipesRouteParamDecorator(RouteParamTypes.IP)(property);
}
