import type { Context, Next } from '@oak/oak';
import type { Constructor } from '@dx/inject';
import { Reflect } from '@dx/inject';

import { MIDDLEWARE_METADATA } from './const.ts';

/**
 * Registers a decorator that can be added to a controller's
 * method. The handler will be called at runtime when the
 * endpoint method is invoked with the Context and Next parameters.
 *
 * @param {Constructor} target decorator's target
 * @param {string} methodName decorator's method name
 * @param {(ctx: Context, next: Next) => void} handler decorator's handler
 */
export const registerMiddlewareMethodDecorator = (target: Constructor, methodName: string, handler: (ctx: Context, next: Next) => void): void => {
  const middleware = Reflect.getMetadata(MIDDLEWARE_METADATA, target, methodName) || [];
  middleware.push(handler);

  Reflect.defineMetadata(MIDDLEWARE_METADATA, middleware, target, methodName);
};
