import type { RouteOptions } from 'fastify';
import oasSchemaLoader from './index';

export interface RouterIdentification {
  method: string;
  path: string;
}

export interface SchemaPluginOptions {
  documentPath: string;
  ignoreRouters?: RouterIdentification[];
  log?: boolean;
}

export type RouteOptionAlias = RouteOptions & {
  routePath: string;
  path: string;
  prefix: string;
};

export type OPENAPI_REQUEST_METHOD =
  | 'get'
  | 'GET'
  | 'put'
  | 'PUT'
  | 'post'
  | 'POST'
  | 'delete'
  | 'DELETE'
  | 'options'
  | 'OPTIONS'
  | 'head'
  | 'HEAD'
  | 'patch'
  | 'PATCH'
  | 'trace'
  | 'TRACE';

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

export interface JsonSchema {
  type: 'object';
  required: string[];
  properties: { [name: string]: object };
}

export interface OasFastifySchema extends FastifySchema {
  body?: JsonSchema;
  querystring?: JsonSchema;
  params?: JsonSchema;
  headers?: JsonSchema;
  response?: JsonSchema;
}

export default oasSchemaLoader;
