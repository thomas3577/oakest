import type { RouterContext } from '@oak/oak';
import type { Constructor } from '@dx/inject';
import { Reflect } from '@dx/inject';

import { ROUTE_ARGS_METADATA } from './const.ts';
import { RouteParamTypes } from './enums.ts';
import type { RouteArgsMetadata } from './types.ts';

/**
 * Registers a custom route parameter decorator.
 *
 * @param {Constructor} target - the target object
 * @param {string} methodName - the name of the method
 * @param {number} paramIndex - the index of the parameter
 *
 * @return {(handler: (ctx: RouterContext<string>) => void) => void} a function that takes optional data and returns a function that requires the param's handler as only parameter
 */
export const registerCustomRouteParamDecorator = (target: Constructor, methodName: string, paramIndex: number): (handler: (ctx: RouterContext<string>) => void) => void => {
  return ((handler: (ctx: RouterContext<string>) => void) => {
    const args: RouteArgsMetadata[] = Reflect.getMetadata(ROUTE_ARGS_METADATA, target, methodName) || [];

    args.push({
      paramType: RouteParamTypes.CUSTOM,
      index: paramIndex,
      handler,
    });

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, args, target, methodName);
  });
};
