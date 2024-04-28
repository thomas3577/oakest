import { Reflect } from '@dx/inject';

import { ActionMetadata, HTTPMethods } from '../types.ts';
import { METHOD_METADATA } from '../const.ts';

export const Get: HttpMethod = mappingMethod('get');
export const Post: HttpMethod = mappingMethod('post');
export const Put: HttpMethod = mappingMethod('put');
export const Patch: HttpMethod = mappingMethod('patch');
export const Delete: HttpMethod = mappingMethod('delete');
export const All: HttpMethod = mappingMethod('all');

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

function addMetadata<T>(value: T, target: unknown, key: symbol) {
  const list = Reflect.getMetadata(key, target);
  if (list) {
    list.push(value);

    return;
  }

  Reflect.defineMetadata(key, [value], target);
}
