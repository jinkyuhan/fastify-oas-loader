import fp from 'fastify-plugin';
import SwaggerParser from '@apidevtools/swagger-parser';
import { PluginError, PLUGIN_ERROR_NAME } from './common';
import { makeOpenAPI3SchemaLoader } from './loader';
import { OpenAPIV3 } from 'openapi-types';
import type { FastifyPluginCallback } from 'fastify';
import {
  RouteOptionAlias,
  RouterIdentification,
  SchemaPluginOptions,
} from './index.d';

const oasSchemaPlugin: FastifyPluginCallback<SchemaPluginOptions> = async (
  fastify,
  opts,
  done
) => {
  try {
    const oas = await SwaggerParser.validate(opts.documentPath, {});
    // TODO: Add oas support version and check type by version.
    if ('openapi' in oas && oas.openapi.startsWith('3.0')) {
      fastify.addHook('onRoute', (routeOption) => {
        if (opts.log) {
          fastify.log.info(
            `Trying to load the schema for [${routeOption.method} ${routeOption.url}]`
          );
        }
        if (_isIgnoredRouter(opts.ignoreRouters ?? [], routeOption)) {
          done();
          return;
        }
        const loader = makeOpenAPI3SchemaLoader({
          logger: opts.log ? fastify.log : undefined,
        });
        const pathItemObject = loader.extractPathItemObject(
          oas as OpenAPIV3.Document,
          routeOption.path
        );
        const httpMethodObject = loader.extractOperationObject(
          pathItemObject,
          routeOption.method
        );
        if (httpMethodObject.parameters != null) {
          loader.injectParameters(httpMethodObject.parameters, routeOption);
        }
        if (httpMethodObject.requestBody != null) {
          loader.injectRequestBody(httpMethodObject.requestBody, routeOption);
        }
      });
      done();
    }

    throw new PluginError(
      `This openapi version(${
        'swagger' in oas ? 'swagger: ' + oas.swagger : 'openapi: ' + oas.openapi
      }) is not supported yet`,
      PLUGIN_ERROR_NAME.NOT_SUPPORTED_DOCUMENT_VERSION
    );
  } catch (err) {
    if (err instanceof PluginError) {
      throw PluginError;
    } else if (err instanceof Error) {
      throw new PluginError(
        err.message,
        PLUGIN_ERROR_NAME.SWAGGER_PARSER_ERROR
      );
    } else {
      throw err;
    }
  }
};
function _isIgnoredRouter(
  ignoreList: RouterIdentification[],
  routeOption: RouteOptionAlias
) {
  return ignoreList.some(
    (toIgnore) =>
      toIgnore.method === routeOption.method.toString() &&
      toIgnore.path === routeOption.url
  );
}

export default fp(oasSchemaPlugin);
