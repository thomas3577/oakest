import { InjectionOptions, Reflect, setInjectionMetadata } from '@dx/inject';

import { INJECTOR_INTERFACES_METADATA } from '../const.ts';

export type Implementing = string | symbol | string[] | symbol[];
export type ImplementingOptions = { implementing?: Implementing };
export type InjectableOptions = ImplementingOptions & InjectionOptions;

/**
 * Injectable decorator
 * @param {ImplementingOptions} options - Implementing options
 */
export function Injectable({ implementing = [], isSingleton }: InjectableOptions = {}): ClassDecorator {
  const implementings = Array.isArray(implementing) ? implementing : [implementing];

  return (target: any) => {
    if (implementings.length > 0) {
      Reflect.defineMetadata(INJECTOR_INTERFACES_METADATA, implementings, target);
    }

    setInjectionMetadata(target, {
      isSingleton: isSingleton !== false,
    });
  };
}
