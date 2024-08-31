export const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isNil = (obj: any): obj is null | undefined => isUndefined(obj) || obj === null;
