# fastify-oas-loader

This plugin follows the intention of creating the OpenAPI Scheme first and thereby performing request parameter validation based on it.

This Plugin automatically sets the Fastify-Schema of the RouterOption by reading the pre-written OpenAPI Schema file('yaml', 'json').

After that, we expect Fastify to verify the request parameter based on the set Fastify-Schema.

## Installation

```bash
npm install fastify-oas-loader
```

## Example

This plugin read the given oasSchema and inject the Fastify-schema for matched router's option

```javascript
const fastify = require('fastify');
const oasSchema = require('fastify-oas-loader');

const app = fastify();
app.register(oasSchema, {
  documentPath: 'openapi3.schema.yaml',
  ignoreRouters: [
    {
      method: 'GET',
      path: '/health-check',
    },
  ],
});
```

or with ESM syntax:

```javascript
import fastify from 'fastify';
import oasSchema from 'fastify-oas-loader';

const app = fastify();
app.register(oasSchema, {
  documentPath: 'openapi3.schema.yaml', // relative path to project root dir, required
  ignoreRouters: [
    {
      method: 'GET',
      path: '/health-check',
    },
  ],
});

app.listen(3000);

// If you send request with invalid parameter schema, the server throws schema error
```

## options

| name          | type                                 | description                                                                                           |                |
| ------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- |
| documentPath  | string                               | OpenAPI schema file(yaml, json) path, relative to project root                                        | required       |
| ignoreRouters | `{ method: string, path: string }[]` | You can only register the router described in Schema., but you can alow some routers ignore this rule | optional       |
| log           | boolean                              | Whether to use the log. this plugin use `fastify.log.info()` & `fastify.log.warn()`                   | default `true` |
