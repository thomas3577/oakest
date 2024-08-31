import type { Router, RouterContext } from '@oak/oak';
import type { RouteParamTypes } from './enums.ts';
import type { Constructor } from '@dx/inject';

export type HTTPMethods = 'get' | 'put' | 'patch' | 'post' | 'delete' | 'all';

/**
 * Action metadata
 */
export interface ActionMetadata {
  path: string;
  method: HTTPMethods;
  functionName: string;
}

/**
 * Module decorator options
 */
export interface ModuleOptions {
  controllers?: Constructor[];
  providers?: Constructor[];
  modules?: Constructor[];
  routePrefix?: string;
}

export type ParamData = Record<string, unknown> | string | number;

/**
 * Controller decorator options
 */
export type ControllerOptions = {
  path?: string;
  injectables: Array<string | symbol | null>;
};

/**
 * Controller base type
 */
export type ControllerClass = {
  path?: string;
  route?: Router;
  init(routePrefix?: string): void;
};

/**
 * Route arguments metadata
 */
export interface RouteArgsMetadata {
  paramType: RouteParamTypes;
  index: number;
  data?: ParamData;
  handler?: (ctx: RouterContext<string>, data?: ParamData) => any;
}
