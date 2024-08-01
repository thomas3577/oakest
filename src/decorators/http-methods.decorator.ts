import { Reflect } from '@dx/inject';

import { METHOD_METADATA } from '../const.ts';
import type { ActionMetadata, HTTPMethods } from '../types.ts';

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
export type HttpMethod = (path?: string) => (target: unknown, functionName: string, _: PropertyDescriptor) => void;

function mappingMethod(method: HTTPMethods): HttpMethod {
  return (path = '') => (target: unknown, functionName: string, _: PropertyDescriptor) => {
    const meta: ActionMetadata = {
      path,
      method,
      functionName,
    };

    addMetadata(meta, target, METHOD_METADATA);
  };
}

function addMetadata<T>(value: T, target: unknown, key: symbol): void {
  const list = Reflect.getMetadata(key, target);
  if (list) {
    list.push(value);

    return;
  }

  Reflect.defineMetadata(key, [value], target);
}
