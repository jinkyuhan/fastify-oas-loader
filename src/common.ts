import { OpenAPIV3 } from 'openapi-types';
import { OPENAPI_REQUEST_METHOD } from './index.d';

export const OPENAPI_V3_HTTP_METHOD_MAP: Record<
  OPENAPI_REQUEST_METHOD,
  OpenAPIV3.HttpMethods
> = {
  get: OpenAPIV3.HttpMethods.GET,
  GET: OpenAPIV3.HttpMethods.GET,
  put: OpenAPIV3.HttpMethods.PUT,
  PUT: OpenAPIV3.HttpMethods.PUT,
  post: OpenAPIV3.HttpMethods.POST,
  POST: OpenAPIV3.HttpMethods.POST,
  delete: OpenAPIV3.HttpMethods.DELETE,
  DELETE: OpenAPIV3.HttpMethods.DELETE,
  options: OpenAPIV3.HttpMethods.OPTIONS,
  OPTIONS: OpenAPIV3.HttpMethods.OPTIONS,
  head: OpenAPIV3.HttpMethods.HEAD,
  HEAD: OpenAPIV3.HttpMethods.HEAD,
  patch: OpenAPIV3.HttpMethods.PATCH,
  PATCH: OpenAPIV3.HttpMethods.PATCH,
  trace: OpenAPIV3.HttpMethods.TRACE,
  TRACE: OpenAPIV3.HttpMethods.TRACE,
} as const;

export const PLUGIN_ERROR_NAME = {
  SWAGGER_PARSER_ERROR: 'SWAGGER_PARSER_ERROR',
  NOT_SUPPORTED_DOCUMENT_VERSION: 'NOT_SUPPORTED_DOCUMENT_VERSION',
  INVALID_SCHEMA_FILE: 'INVALID_SCHEMA_FILE',
  REFERENCE_OBJECT_NOT_SUPPORTED: 'REFERENCE_OBJECT_NOT_SUPPORTED',
  ROUTER_METHOD_NOT_SUPPORTED: 'ROUTER_METHOD_NOT_SUPPORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export function isNonNull<T extends unknown>(
  input: T
): input is NonNullable<T> {
  return input !== null && input !== undefined;
}

export class PluginError extends Error {
  constructor(
    message: string,
    name?: typeof PLUGIN_ERROR_NAME[keyof typeof PLUGIN_ERROR_NAME]
  ) {
    super(message);
    this.name = name ?? PLUGIN_ERROR_NAME.UNKNOWN;
  }
}

export function throwReferenceObjectError() {
  throw new PluginError(
    `The Validated OpenAPIDocument's ReferenceObject is not resolved. This case is not supported`,
    PLUGIN_ERROR_NAME.REFERENCE_OBJECT_NOT_SUPPORTED
  );
}
