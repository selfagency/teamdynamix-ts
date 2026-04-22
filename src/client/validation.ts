import { createRequire } from 'node:module';
import type { ValidateFunction } from 'ajv';
import type { DereferencedOpenApiSpec, OpenApiOperation } from './spec.js';

const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AjvLib = _require('ajv') as { default: new (opts: Record<string, unknown>) => import('ajv').default };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const addFormatsLib = _require('ajv-formats') as { default: (ajv: import('ajv').default) => void };

const JSON_CONTENT_TYPES = ['application/json', 'application/problem+json'];

const getJsonSchema = (content: Record<string, { schema?: unknown }> | undefined): unknown => {
  if (!content) return undefined;
  for (const [contentType, mediaType] of Object.entries(content)) {
    if (JSON_CONTENT_TYPES.includes(contentType) && mediaType?.schema !== undefined) {
      return mediaType.schema;
    }
  }
  const firstContent = Object.values(content)[0];
  return firstContent?.schema;
};

export class OpenApiRuntimeValidator {
  private readonly ajv: import('ajv').default;
  private readonly spec: DereferencedOpenApiSpec;
  private readonly requestValidators = new Map<string, ValidateFunction>();
  private readonly responseValidators = new Map<string, ValidateFunction>();

  constructor(spec: DereferencedOpenApiSpec) {
    this.spec = spec;
    this.ajv = new AjvLib.default({ allErrors: true, strict: false, validateFormats: true });
    addFormatsLib.default(this.ajv);
  }

  private operationFor(schemaPath: string, method: string): OpenApiOperation | undefined {
    const methodName = method.toLowerCase();
    const paths = this.spec.paths ?? {};
    for (const [pathKey, pathItem] of Object.entries(paths)) {
      if (pathKey !== schemaPath || !pathItem) {
        continue;
      }

      for (const [operationMethod, operation] of Object.entries(pathItem)) {
        if (operationMethod === methodName) {
          return operation as OpenApiOperation;
        }
      }
    }

    return undefined;
  }

  private compileRequestValidator(schemaPath: string, method: string): ValidateFunction | undefined {
    const key = `${method.toUpperCase()} ${schemaPath}`;
    const existing = this.requestValidators.get(key);
    if (existing) return existing;

    const operation = this.operationFor(schemaPath, method);
    if (!operation) return undefined;
    const schema = getJsonSchema(operation.requestBody?.content);
    if (!schema) return undefined;

    const validator = this.ajv.compile(schema);
    this.requestValidators.set(key, validator);
    return validator;
  }

  private compileResponseValidator(schemaPath: string, method: string, status: number): ValidateFunction | undefined {
    const key = `${method.toUpperCase()} ${schemaPath} ${status}`;
    const existing = this.responseValidators.get(key);
    if (existing) return existing;

    const operation = this.operationFor(schemaPath, method);
    if (!operation?.responses) return undefined;

    let response: { content?: Record<string, { schema?: unknown }> } | undefined;
    const statusKey = String(status);
    for (const [responseCode, responseDef] of Object.entries(operation.responses)) {
      if (responseCode === statusKey) {
        response = responseDef;
        break;
      }
      if (responseCode === 'default') {
        response = responseDef;
      }
    }

    if (!response) return undefined;

    const schema = getJsonSchema(response.content);
    if (!schema) return undefined;

    const validator = this.ajv.compile(schema);
    this.responseValidators.set(key, validator);
    return validator;
  }

  validateRequest(schemaPath: string, method: string, body: unknown): { valid: boolean; errors?: unknown } {
    const validator = this.compileRequestValidator(schemaPath, method);
    if (!validator) return { valid: true };

    const valid = validator(body);
    return {
      valid,
      errors: validator.errors ?? undefined,
    };
  }

  validateResponse(
    schemaPath: string,
    method: string,
    status: number,
    payload: unknown,
  ): { valid: boolean; errors?: unknown } {
    const validator = this.compileResponseValidator(schemaPath, method, status);
    if (!validator) return { valid: true };

    const valid = validator(payload);
    return {
      valid,
      errors: validator.errors ?? undefined,
    };
  }
}
