import { createMetadataDecorator, defineMetadata, getMetadata, getOwnMetadata } from './metadata.util.ts';

type MetadataDecorator = (target: object, propertyKey?: string | symbol) => void;

type ReflectMetadataApi = typeof Reflect & {
  defineMetadata?: (metadataKey: string | symbol, value: unknown, target: object, propertyKey?: string | symbol) => void;
  getMetadata?: <T>(metadataKey: string | symbol, target: object, propertyKey?: string | symbol) => T | undefined;
  getOwnMetadata?: <T>(metadataKey: string | symbol, target: object, propertyKey?: string | symbol) => T | undefined;
  metadata?: (metadataKey: string | symbol, value: unknown) => MetadataDecorator;
};

const reflectApi = Reflect as ReflectMetadataApi;

if (!reflectApi.defineMetadata) {
  reflectApi.defineMetadata = defineMetadata;
}

if (!reflectApi.getMetadata) {
  reflectApi.getMetadata = getMetadata;
}

if (!reflectApi.getOwnMetadata) {
  reflectApi.getOwnMetadata = getOwnMetadata;
}

if (!reflectApi.metadata) {
  reflectApi.metadata = createMetadataDecorator;
}

export {};
