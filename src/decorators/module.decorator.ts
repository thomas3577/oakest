import { Reflect } from '@reflect';
import { MODULE_METADATA } from '../const.ts';
import { ClassConstructor, CreateRouterOption } from '../types.ts';

export function Module<T>(data: CreateRouterOption): (target: ClassConstructor<T>) => void {
  return (target: ClassConstructor<T>) => {
    Reflect.defineMetadata(MODULE_METADATA, data, target.prototype);
  };
}
