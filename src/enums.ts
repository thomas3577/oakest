/** Kinds of values a route argument resolver can provide. */
export enum RouteParamTypes {
  REQUEST,
  CONTEXT,
  RESPONSE,
  NEXT,
  BODY,
  QUERY,
  PARAM,
  HEADERS,
  SESSION,
  FILE,
  FILES,
  HOST,
  IP,
  CUSTOM,
}
