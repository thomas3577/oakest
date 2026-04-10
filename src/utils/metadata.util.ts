type MetadataTarget = object;
type MetadataKey = string | symbol;
type MetadataPropertyKey = string | symbol;

const classMetadataStore = new WeakMap<MetadataTarget, Map<MetadataKey, unknown>>();
const memberMetadataStore = new WeakMap<MetadataTarget, Map<MetadataPropertyKey, Map<MetadataKey, unknown>>>();

const getOrCreateClassMetadata = (target: MetadataTarget): Map<MetadataKey, unknown> => {
  let metadata = classMetadataStore.get(target);

  if (!metadata) {
    metadata = new Map<MetadataKey, unknown>();
    classMetadataStore.set(target, metadata);
  }

  return metadata;
};

const getOrCreateMemberMetadata = (target: MetadataTarget, propertyKey: MetadataPropertyKey): Map<MetadataKey, unknown> => {
  let properties = memberMetadataStore.get(target);

  if (!properties) {
    properties = new Map<MetadataPropertyKey, Map<MetadataKey, unknown>>();
    memberMetadataStore.set(target, properties);
  }

  let metadata = properties.get(propertyKey);

  if (!metadata) {
    metadata = new Map<MetadataKey, unknown>();
    properties.set(propertyKey, metadata);
  }

  return metadata;
};

const getOwnMetadataValue = <T>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: MetadataPropertyKey): T | undefined => {
  if (propertyKey === undefined) {
    return classMetadataStore.get(target)?.get(metadataKey) as T | undefined;
  }

  return memberMetadataStore.get(target)?.get(propertyKey)?.get(metadataKey) as T | undefined;
};

export const defineMetadata = <T>(metadataKey: MetadataKey, value: T, target: MetadataTarget, propertyKey?: MetadataPropertyKey): void => {
  if (propertyKey === undefined) {
    getOrCreateClassMetadata(target).set(metadataKey, value);

    return;
  }

  getOrCreateMemberMetadata(target, propertyKey).set(metadataKey, value);
};

export const getOwnMetadata = <T>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: MetadataPropertyKey): T | undefined => {
  return getOwnMetadataValue<T>(metadataKey, target, propertyKey);
};

export const getMetadata = <T>(metadataKey: MetadataKey, target: MetadataTarget, propertyKey?: MetadataPropertyKey): T | undefined => {
  let current: object | null = target;

  while (current) {
    const value = getOwnMetadataValue<T>(metadataKey, current, propertyKey);

    if (value !== undefined) {
      return value;
    }

    current = Object.getPrototypeOf(current);
  }

  return undefined;
};

export const createMetadataDecorator = (metadataKey: MetadataKey, value: unknown) => {
  return (target: MetadataTarget, propertyKey?: MetadataPropertyKey) => {
    defineMetadata(metadataKey, value, target, propertyKey);
  };
};
