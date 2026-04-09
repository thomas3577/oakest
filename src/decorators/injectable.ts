import { INJECTABLE_OPTIONS_METADATA, INJECTOR_INTERFACES_METADATA } from '../const.ts';
import { inject } from '../utils/injector.util.ts';

export type Implementing = string | symbol | string[] | symbol[];
export type ImplementingOptions = { implementing?: Implementing };
export type InjectableOptions = ImplementingOptions & { isSingleton?: boolean };

export { inject };

/**
 * Injectable decorator
 *
 * @param {ImplementingOptions} options - Implementing options
 */
export function Injectable({ implementing = [], isSingleton }: InjectableOptions = {}): ClassDecorator {
  const implementings = Array.isArray(implementing) ? implementing : [implementing];

  return (target: any) => {
    if (implementings.length > 0) {
      Reflect.defineMetadata(INJECTOR_INTERFACES_METADATA, implementings, target);
    }

    Reflect.defineMetadata(INJECTABLE_OPTIONS_METADATA, {
      isSingleton: isSingleton !== false,
    }, target);
  };
}
