import type { HTTPMethods, RouteOptions } from 'fastify';
import type { OpenAPIV3 } from 'openapi-types';

export interface OpenAPIV3SchemaLoader {
  extractPathItemObject: (
    fromDocument: OpenAPIV3.Document,
    byPath: string
  ) => OpenAPIV3.PathItemObject;
  extractOperationObject: (
    fromPathObject: OpenAPIV3.PathItemObject,
    byMethod: HTTPMethods | HTTPMethods[]
  ) => OpenAPIV3.OperationObject;
  injectParameters: (
    parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[],
    toRouterOptions: RouteOptionAlias
  ) => void;
  injectRequestBody: (
    requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject,
    toRouterOptions: RouteOptionAlias
  ) => void;
}

export interface RouterIdentification {
  method: string;
  path: string;
}

export interface SchemaPluginOptions {
  documentPath: string;
  ignoreRouters?: RouterIdentification[];
  override?: boolean;
  log?: boolean;
}

export type RouteOptionAlias = RouteOptions & {
  routePath: string;
  path: string;
  prefix: string;
};
