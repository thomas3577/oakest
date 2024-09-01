import { bootstrap, setInjectionMetadata } from '@dx/inject';
import type { InjectionOptions } from '@dx/inject';

import { INJECTOR_INTERFACES_METADATA } from '../const.ts';

export type Implementing = string | symbol | string[] | symbol[];
export type ImplementingOptions = { implementing?: Implementing };
export type InjectableOptions = ImplementingOptions & InjectionOptions;

export { bootstrap as inject };

/**
 * Injectable decorator
 *
 * @param {InjectableOptions} options - Injectable options
 */
export function Injectable({ implementing = [], isSingleton }: InjectableOptions = {}): ClassDecorator {
  const implementings = Array.isArray(implementing) ? implementing : [implementing];

  return (target: any): void => {
    if (implementings.length > 0) {
      Reflect.defineMetadata(INJECTOR_INTERFACES_METADATA, implementings, target);
    }

    setInjectionMetadata(target, {
      isSingleton: isSingleton !== false,
    });
  };
}
