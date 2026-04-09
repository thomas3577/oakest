import { Container } from '@needle-di/core';

import { INJECTABLE_OPTIONS_METADATA, INJECTOR_INTERFACES_METADATA } from '../const.ts';
import type { ClassConstructor } from '../types.ts';

type InjectableToken = string | symbol | null;

type InjectableMetadata = {
  implementing: Array<string | symbol>;
  isSingleton: boolean;
};

type InjectableOptions = {
  isSingleton?: boolean;
};

const isClassConstructor = (value: unknown): value is ClassConstructor => typeof value === 'function';

const getInjectableMetadata = (target: ClassConstructor): InjectableMetadata => {
  const implementing = Reflect.getMetadata(INJECTOR_INTERFACES_METADATA, target) || [];
  const options: InjectableOptions = Reflect.getMetadata(INJECTABLE_OPTIONS_METADATA, target) || {};

  return {
    implementing,
    isSingleton: options.isSingleton !== false,
  };
};

class NeedleInjector {
  #container = new Container();
  #resolving: ClassConstructor[] = [];

  constructor(private readonly providers: ClassConstructor[] = []) {}

  resolve<T extends object>(target: ClassConstructor<T>, injectables: InjectableToken[] = []): T {
    return this.#instantiate(target, injectables);
  }

  #instantiate<T extends object>(target: ClassConstructor<T>, injectables: InjectableToken[] = []): T {
    const dependencies = this.#getDependencies(target, injectables);

    return new target(...dependencies);
  }

  #getDependencies(target: ClassConstructor, injectables: InjectableToken[] = []): unknown[] {
    const paramTypes: ClassConstructor[] = Reflect.getMetadata('design:paramtypes', target) || [];

    return paramTypes.map((requiredProvider, index) => {
      if (!isClassConstructor(requiredProvider)) {
        throw new Error(`Provider of type ${String(requiredProvider)} not found for ${target.name}`);
      }

      const provider = this.#findProvider(requiredProvider, injectables[index]);

      if (!provider) {
        throw new Error(`Provider of type ${requiredProvider.name} not found for ${target.name}`);
      }

      return this.#resolveProvider(provider);
    });
  }

  #resolveProvider<T extends object>(provider: ClassConstructor<T>): T {
    const { isSingleton } = getInjectableMetadata(provider);

    if (!isSingleton) {
      return this.#constructProvider(provider);
    }

    if (!this.#container.has(provider)) {
      this.#container.bind({
        provide: provider,
        useFactory: () => this.#constructProvider(provider),
      });
    }

    return this.#container.get(provider);
  }

  #constructProvider<T extends object>(provider: ClassConstructor<T>): T {
    if (this.#resolving.includes(provider)) {
      const cycle = [...this.#resolving, provider].map((entry) => entry.name).join(' -> ');

      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    this.#resolving.push(provider);

    try {
      return this.#instantiate(provider);
    } finally {
      this.#resolving.pop();
    }
  }

  #findProvider(requiredProvider: ClassConstructor, injectable?: InjectableToken): ClassConstructor | undefined {
    if (injectable !== undefined && injectable !== null) {
      const tokenMatch = this.providers.find((provider) => getInjectableMetadata(provider).implementing.includes(injectable));

      if (tokenMatch) {
        return tokenMatch;
      }
    }

    return this.providers.find((provider) => provider === requiredProvider || requiredProvider.prototype?.isPrototypeOf(provider.prototype)) || requiredProvider;
  }
}

export const createInjector = (providers: ClassConstructor[] = []): NeedleInjector => new NeedleInjector(providers);

export const inject = <T extends object>(target: ClassConstructor<T>): T => createInjector().resolve(target);
