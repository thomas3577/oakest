import '../utils/reflect-shim.ts';

import { METHOD_METADATA } from '../const.ts';
import type { ActionMetadata, HTTPMethods, RouteArgResolver } from '../types.ts';
import { defineMetadata, getMetadata } from '../utils/metadata.util.ts';

/**
 * HTTP Method GET
 *
 * @param {string} path - Path for the route
 */
export const Get: HttpMethod = mappingMethod('get');

/**
 * HTTP Method POST
 *
 * @param {string} path - Path for the route
 */
export const Post: HttpMethod = mappingMethod('post');

/**
 * HTTP Method PUT
 *
 * @param {string} path - Path for the route
 */
export const Put: HttpMethod = mappingMethod('put');

/**
 * HTTP Method PATCH
 *
 * @param {string} path - Path for the route
 */
export const Patch: HttpMethod = mappingMethod('patch');

/**
 * HTTP Method DELETE
 *
 * @param {string} path - Path for the route
 */
export const Delete: HttpMethod = mappingMethod('delete');

/**
 * HTTP Method OPTIONS
 *
 * @param {string} path - Path for the route
 */
export const All: HttpMethod = mappingMethod('all');

/**
 * HTTP Method
 */
export type HttpMethod = {
  (path?: string, args?: RouteArgResolver[]): (target: object, functionName: string, _: PropertyDescriptor) => void;
  (args: RouteArgResolver[]): (target: object, functionName: string, _: PropertyDescriptor) => void;
};

function mappingMethod(method: HTTPMethods): HttpMethod {
  return (pathOrArgs: string | RouteArgResolver[] = '', args?: RouteArgResolver[]) => (target: object, functionName: string, _: PropertyDescriptor) => {
    const path = Array.isArray(pathOrArgs) ? '' : pathOrArgs;
    const routeArgs = Array.isArray(pathOrArgs) ? pathOrArgs : args;
    const meta: ActionMetadata = {
      path,
      method,
      functionName,
    };

    if (routeArgs) {
      meta.args = routeArgs;
    }

    addMetadata(meta, target, METHOD_METADATA);
  };
}

function addMetadata<T>(value: T, target: object, key: symbol): void {
  const list = getMetadata<T[]>(key, target);
  if (list) {
    list.push(value);

    return;
  }

  defineMetadata(key, [value], target);
}
