import { MODULE_METADATA } from '../const.ts';
import type { ClassConstructor, CreateRouterOption } from '../types.ts';

/**
 * Module decorator
 *
 * @param {CreateRouterOption} data - Module data
 */
export function Module<T>(data: CreateRouterOption): (target: ClassConstructor<T>) => void {
  return (target: ClassConstructor<T>) => {
    Reflect.defineMetadata(MODULE_METADATA, data, target.prototype);
  };
}
