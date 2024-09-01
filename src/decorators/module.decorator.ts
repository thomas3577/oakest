import type { Constructor } from '@dx/inject';

import type { ModuleOptions } from '../types.ts';
import { MODULE_METADATA } from '../const.ts';

/**
 * Module decorator
 *
 * @param {ModuleOptions} options - Module options
 */
export function Module<T>(options: ModuleOptions): (target: Constructor<T>) => void {
  return (target: Constructor<T>): void => {
    Reflect.defineMetadata(MODULE_METADATA, options, target.prototype);
  };
}
