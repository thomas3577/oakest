import { RouterContext } from '@oak/oak';
import { RouteParamTypes } from './enums.ts';

export type HTTPMethods = 'get' | 'put' | 'patch' | 'post' | 'delete' | 'all';

export interface ActionMetadata {
  path: string;
  method: HTTPMethods;
  functionName: string;
}

export interface CreateRouterOption {
  controllers?: ClassConstructor[];
  providers?: ClassConstructor[];
  modules?: ClassConstructor[];
  routePrefix?: string;
}

export type ParamData = Record<string, unknown> | string | number;

export interface RouteArgsMetadata {
  paramType: RouteParamTypes;
  index: number;
  data?: ParamData;
  handler?: (ctx: RouterContext<string>, data?: ParamData) => any;
}

export type ClassConstructor<T = object> = new (...args: any[]) => T;
