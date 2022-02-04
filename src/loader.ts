import { OpenAPIV3 } from 'openapi-types';
import {
  OPENAPI_V3_HTTP_METHOD_MAP,
  isNonNull,
  PLUGIN_ERROR_NAME,
  PluginError,
} from './common';
import type {
  FastifyLoggerInstance,
  FastifySchema,
  HTTPMethods,
} from 'fastify';
import {
  OasFastifySchema,
  OpenAPIV3SchemaLoader,
  OPENAPI_REQUEST_METHOD,
  RouteOptionAlias,
} from './index.d';

/*
 * TODO: 리팩토링, Adaptor 모듈 분리
 *  - Parsing된 OpenAPIV3 Document 객체에서 스키마를 추출해내는 OpenApIV3Extractor
 *  - routeOption.schema 에다 파싱한 데이터를 집어넣는 RouteOptionInjector
 */

export function makeOpenAPI3SchemaLoader(props: {
  logger?: FastifyLoggerInstance;
}): OpenAPIV3SchemaLoader {
  function _doInfoLog(message: string) {
    if (props.logger != null) {
      props.logger.info(message);
    }
  }
  function _doWarnLog(message: string) {
    if (props.logger != null) {
      props.logger.warn(message);
    }
  }

  /**
   * @param document
   * @param path
   * @description Extract PathItem object from Document by Path.
   * @returns PathItem object of OpenAPI schema spec extracted from pathItem
   */
  function extractPathItemObject(
    document: OpenAPIV3.Document,
    path: string
  ): OpenAPIV3.PathItemObject {
    const pathItem = document.paths[path];
    if (!isNonNull(pathItem)) {
      throw new PluginError(
        `The path(${path}) is not described in schema. check your schema file`,
        PLUGIN_ERROR_NAME.INVALID_SCHEMA_FILE
      );
    }
    return pathItem;
  }

  /**
   * @param pathItemObject
   * @param httpMethod
   * @description Extract Request Operation object from PathItem object by HttpMethod
   * @returns Operation object of OpenAPI Schema spec extracted From PathItem object
   */
  function extractOperationObject(
    pathItemObject: OpenAPIV3.PathItemObject, //ReturnType<typeof getPathItemObject>,
    httpMethod: HTTPMethods | HTTPMethods[]
  ): OpenAPIV3.OperationObject {
    const httpMethodString: string = httpMethod.toString();
    if (!OPENAPI_V3_HTTP_METHOD_MAP.hasOwnProperty(httpMethodString)) {
      throw new PluginError(
        `The method(${httpMethodString}) is not supported yet`,
        PLUGIN_ERROR_NAME.ROUTER_METHOD_NOT_SUPPORTED
      );
    }
    const httpMethod_OpenAPIV3 =
      OPENAPI_V3_HTTP_METHOD_MAP[httpMethodString as OPENAPI_REQUEST_METHOD];

    const operation = pathItemObject[httpMethod_OpenAPIV3];
    if (operation == null) {
      throw new PluginError(
        `The method(${httpMethod}) is not described in schema. check your schema file`,
        PLUGIN_ERROR_NAME.INVALID_SCHEMA_FILE
      );
    }
    return operation;
  }

  function injectParameters(
    parameters: (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[],
    routeOption: RouteOptionAlias
  ) {
    parameters.forEach((param) => {
      if ('$ref' in param) {
        throw new PluginError(
          `The Validated OpenAPIDocument's ReferenceObject is not resolved. This case is not supported`,
          PLUGIN_ERROR_NAME.REFERENCE_OBJECT_NOT_SUPPORTED
        );
      }
      switch (param.in) {
        case 'query':
          routeOption.schema = _accumulateQueryParam(param, routeOption);
          return;
        case 'path':
          routeOption.schema = _accumulatePathParams(param, routeOption);
          return;
        case 'header':
          routeOption.schema = _accumulateHeaderParams(param, routeOption);
          return;
        case 'cookie':
          // pass, cannot support
          return;
        default:
          throw new PluginError(
            `ParameterObject in Document must be one of 'query', 'header', 'path', 'cookie', but ${param.in}`,
            PLUGIN_ERROR_NAME.INVALID_SCHEMA_FILE
          );
      }
    });
  }

  function _accumulateQueryParam(
    param: OpenAPIV3.ParameterObject,
    routeOption: RouteOptionAlias
  ): OasFastifySchema {
    // Clone current router schema. if not exist, make a new one.
    const newSchema = { ...routeOption.schema } as OasFastifySchema;

    // If not exist, make and initialize a new querystring schema
    if (newSchema.querystring == null) {
      newSchema.querystring = {
        type: 'object',
        required: [],
        properties: {},
      };
    }

    // Fill new schema with old values, and update values to include the new param's value
    newSchema.querystring = {
      ...newSchema.querystring,
      required: param.required
        ? [...newSchema.querystring.required, param.name]
        : [...newSchema.querystring.required],
    };
    if (param.schema == null) {
      newSchema.querystring.properties[param.name] = {
        type: 'string',
      };
    } else {
      if ('$ref' in param.schema) {
        throw new PluginError(
          `The Validated OpenAPIDocument's ReferenceObject is not resolved. This case is not supported`,
          PLUGIN_ERROR_NAME.REFERENCE_OBJECT_NOT_SUPPORTED
        );
      }
      newSchema.querystring.properties[param.name] = {
        type: param.schema.type,
      };
    }
    return newSchema;
  }

  function _accumulatePathParams(
    param: OpenAPIV3.ParameterObject,
    routeOption: RouteOptionAlias
  ) {
    _doWarnLog('path parameter is not supported yet');
    return routeOption.schema;
  }

  function _accumulateHeaderParams(
    param: OpenAPIV3.ParameterObject,
    routeOption: RouteOptionAlias
  ) {
    // TODO: To implement
    _doWarnLog('header parameter is not supported yet');
    return routeOption.schema;
  }

  function injectRequestBody(
    requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject,
    routeOption: RouteOptionAlias
  ) {
    if ('$ref' in requestBody) {
      throw new PluginError(
        `The Validated OpenAPIDocument's ReferenceObject is not resolved. This case is not supported`,
        PLUGIN_ERROR_NAME.REFERENCE_OBJECT_NOT_SUPPORTED
      );
    }
    if (
      requestBody.content['application/json'] != null &&
      requestBody.content['application/json'].schema != null
    ) {
      const schemaFromDocument = requestBody.content['application/json'].schema;
      if ('$ref' in schemaFromDocument) {
        throw new PluginError(
          `The Validated OpenAPIDocument's ReferenceObject is not resolved. This case is not supported`,
          PLUGIN_ERROR_NAME.REFERENCE_OBJECT_NOT_SUPPORTED
        );
      }
      routeOption.schema = { ...routeOption.schema };
      routeOption.schema.body = schemaFromDocument;
    }
    if (
      Object.keys(requestBody.content).some(
        (mediaType) => mediaType !== 'application/json'
      )
    ) {
      _doWarnLog(
        `Only application/json supported not yet. It is Passed to inject your schema: ${routeOption.path}.${routeOption.method} using another media type`
      );
    }
  }

  return {
    extractPathItemObject,
    extractOperationObject,
    injectParameters,
    injectRequestBody,
  };
}
