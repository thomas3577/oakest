import { Injectable as OriginalInjectable, InjectionOptions, Reflect } from '@dx/inject';

import { INJECTOR_INTERFACES_METADATA } from '../const.ts';

export type Implementing = string | symbol | string[] | symbol[];
export type ImplementingOptions = { implementing?: Implementing };
export type InjectableOptions = ImplementingOptions & InjectionOptions;

export function Injectable({ implementing = [], ...originalOptions }: InjectableOptions = {}): ClassDecorator {
  const implementations = Array.isArray(implementing) ? implementing : [implementing];

  return (target: any) => {
    if (implementations.length > 0) {
      Reflect.defineMetadata(INJECTOR_INTERFACES_METADATA, implementations, target);
    }

    return OriginalInjectable({ ...originalOptions })(target);
  };
}
