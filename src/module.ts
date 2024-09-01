import type { Context, Middleware, Router } from '@oak/oak';
import type { Constructor } from '@dx/inject';

import { getRouter } from './router.ts';

/**
 * Assigns a module to a router.
 *
 * @param {Constructor} module - the module to assign
 *
 * @returns {Middleware<Record<string, any>, Context<Record<string, any>, Record<string, any>>>} the middleware
 */
export function assignModule(module: Constructor): Middleware<Record<string, any>, Context<Record<string, any>, Record<string, any>>> {
  const router: Router<Record<string, any>> = getRouter(module);

  return router.routes();
}
