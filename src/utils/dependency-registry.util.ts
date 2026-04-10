import type { ClassConstructor } from '../types.ts';

const dependencyRegistry = new WeakMap<ClassConstructor, ClassConstructor[]>();

export const registerDependencies = (target: ClassConstructor, dependencies: ClassConstructor[]): void => {
  dependencyRegistry.set(target, [...dependencies]);
};

export const getDependencies = (target: ClassConstructor): ClassConstructor[] | undefined => {
  return dependencyRegistry.get(target);
};

export const hasRegisteredDependencies = (target: ClassConstructor): boolean => {
  return dependencyRegistry.has(target);
};

export const clearDependencies = (target: ClassConstructor): void => {
  dependencyRegistry.delete(target);
};
