import { Reflect } from '@dx/inject';

import { MODULE_METADATA } from '../const.ts';
import type { ClassConstructor, ModuleOptions } from '../types.ts';

/**
 * Module decorator
 *
 * @param {ModuleOptions} options - Module options
 */
export function Module<T>(options: ModuleOptions): (target: ClassConstructor<T>) => void {
  return (target: ClassConstructor<T>) => {
    Reflect.defineMetadata(MODULE_METADATA, options, target.prototype);
  };
}
