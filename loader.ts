import { OPENAPI_REQUEST_METHOD, OPENAPI_V3_HTTP_METHOD_MAP } from './common';
import { OpenAPIV3 } from 'openapi-types';
import { OpenAPIV3SchemaLoader, RouteOptionAlias } from './type';
import { isNonNull, PLUGIN_ERROR_NAME, PluginError } from './common';
import type {
  FastifyLoggerInstance,
  FastifySchema,
  HTTPMethods,
} from 'fastify';

/*
 * TODO: 리팩토링, Adaptor 모듈 분리
 *  - Parsing된 OpenAPIV3 Document 객체에서 스키마를 추출해내는 OpenApIV3Extractor
 *  - routeOption.schema 에다 파싱한 데이터를 집어넣는 RouteOptionInjector
 */

export function makeOpenAPI3SchemaLoader(props: {
  logger?: FastifyLoggerInstance;
}): OpenAPIV3SchemaLoader {
  // Currently not used
  // function doInfoLog(message: string) {
  //   if (props.logger != null) {
  //     props.logger.info(message);
  //   }
  // }
  function doWarnLog(message: string) {
    if (props.logger != null) {
      props.logger.warn(message);
    }
  }

  function extractPathItemObject(
    fromDocument: OpenAPIV3.Document,
    byPath: string
  ): OpenAPIV3.PathItemObject {
    if (!isNonNull(fromDocument.paths[byPath])) {
      throw new PluginError(
        `The path(${byPath}) is not described in schema. check your schema file`,
        PLUGIN_ERROR_NAME.INVALID_SCHEMA_FILE
      );
    }
    return fromDocument.paths[byPath]!;
  }

  function extractOperationObject(
    fromPathItemObject: OpenAPIV3.PathItemObject, //ReturnType<typeof getPathItemObject>,
    byMethod: HTTPMethods | HTTPMethods[]
  ): OpenAPIV3.OperationObject {
    const httpMethod: string = byMethod.toString();
    if (!OPENAPI_V3_HTTP_METHOD_MAP.hasOwnProperty(httpMethod)) {
      throw new PluginError(
        `The method(${httpMethod}) is not supported yet`,
        PLUGIN_ERROR_NAME.ROUTER_METHOD_NOT_SUPPORTED
      );
    }
    const httpMethod_OpenAPIV3 =
      OPENAPI_V3_HTTP_METHOD_MAP[httpMethod as OPENAPI_REQUEST_METHOD];
    if (fromPathItemObject[httpMethod_OpenAPIV3] == null) {
      throw new PluginError(
        `The method(${byMethod}) is not described in schema. check your schema file`,
        PLUGIN_ERROR_NAME.INVALID_SCHEMA_FILE
      );
    }
    return fromPathItemObject[httpMethod_OpenAPIV3]!;
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
          routeOption.schema = accumulateQueryParam(param, routeOption);
          return;
        case 'path':
          routeOption.schema = accumulatePathParams(param, routeOption);
          return;
        case 'header':
          routeOption.schema = accumulateHeaderParams(param, routeOption);
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

  interface JsonSchema {
    type: 'object';
    required: string[];
    properties: { [name: string]: object };
  }
  interface OasFastifySchema extends FastifySchema {
    body?: JsonSchema;
    querystring?: JsonSchema;
    params?: JsonSchema;
    headers?: JsonSchema;
    response?: JsonSchema;
  }
  function accumulateQueryParam(
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

  function accumulatePathParams(
    param: OpenAPIV3.ParameterObject,
    routeOption: RouteOptionAlias
  ) {
    doWarnLog('path parameter is not supported yet');
    return routeOption.schema;
  }

  function accumulateHeaderParams(
    param: OpenAPIV3.ParameterObject,
    routeOption: RouteOptionAlias
  ) {
    // To implement
    doWarnLog('header parameter is not supported yet');
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
      routeOption.schema = schemaFromDocument;
    }
    if (
      Object.keys(requestBody.content).some(
        (mediaType) => mediaType !== 'application/json'
      )
    ) {
      doWarnLog(
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
