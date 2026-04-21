import type { ParsedEndpoint, ParsedParameter, ParsedResponse } from '../parser/types.js';

export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

export interface OpenAPIOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  security?: Record<string, unknown>[];
}

export interface OpenAPIParameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  description?: string;
  required?: boolean;
  schema: OpenAPISchema;
}

export interface OpenAPIRequestBody {
  required?: boolean;
  content: {
    'application/json'?: {
      schema: OpenAPISchema;
    };
  };
}

export interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json'?: {
      schema: OpenAPISchema;
    };
  };
  headers?: Record<string, OpenAPIHeader>;
}

export interface OpenAPIHeader {
  description?: string;
  schema: OpenAPISchema;
}

export interface OpenAPISchema {
  $ref?: string;
  type?: string;
  format?: string;
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  description?: string;
  example?: unknown;
}

export interface PathsObject {
  [path: string]: OpenAPIPath;
}

export interface PathGenerationResult {
  paths: PathsObject;
  errors: PathGenerationError[];
}

export interface PathGenerationError {
  type: 'warning' | 'error';
  endpoint: string;
  message: string;
}

/**
 * Generates OpenAPI paths and operations from parsed endpoint definitions
 */
export class PathOperationGenerator {
  private paths: PathsObject = {};
  private errors: PathGenerationError[] = [];

  /**
   * Add endpoints to generate paths from
   */
  addEndpoints(endpoints: ParsedEndpoint[]): void {
    for (const endpoint of endpoints) {
      this.addEndpoint(endpoint);
    }
  }

  /**
   * Add a single endpoint
   */
  private addEndpoint(endpoint: ParsedEndpoint): void {
    try {
      // Normalize path (remove duplicate slashes, handle query params)
      let normalizedPath = endpoint.path;

      // Extract path parameters for path normalization
      const pathParams = this.extractPathParameters(endpoint.path);

      // Initialize path if it doesn't exist
      if (!this.paths[normalizedPath]) {
        this.paths[normalizedPath] = {};
      }

      // Create operation
      const operation: OpenAPIOperation = {
        responses: this.convertResponses(endpoint.responses),
      };

      // Add optional fields
      if (endpoint.summary) {
        operation.summary = endpoint.summary;
      }
      if (endpoint.description) {
        operation.description = endpoint.description;
      }
      if (endpoint.operationId) {
        operation.operationId = endpoint.operationId;
      }
      if (endpoint.tags) {
        operation.tags = endpoint.tags;
      }

      // Add parameters
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        operation.parameters = endpoint.parameters.map(p => this.convertParameter(p, pathParams));
      }

      // Add request body
      if (endpoint.requestBody) {
        operation.requestBody = {
          required: endpoint.requestBody.required,
          content: {
            'application/json': {
              schema: endpoint.requestBody.content['application/json']?.schema || { type: 'object' },
            },
          },
        };
      }

      // Add security
      if (endpoint.security && endpoint.security.length > 0) {
        operation.security = endpoint.security.map(sec => ({ [sec]: [] }));
      }

      // Add operation to path
      const methodKey = endpoint.method.toLowerCase();
      this.paths[normalizedPath][methodKey] = operation;
    } catch (error) {
      this.errors.push({
        type: 'error',
        endpoint: `${endpoint.method} ${endpoint.path}`,
        message: `Failed to generate operation: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  /**
   * Extract path parameters from a path string
   * e.g., /api/accounts/{id} -> ['id']
   */
  private extractPathParameters(path: string): Set<string> {
    const params = new Set<string>();
    const matches = path.matchAll(/\{([^}]+)\}/g);
    for (const match of matches) {
      if (match[1]) {
        params.add(match[1]);
      }
    }
    return params;
  }

  /**
   * Convert parsed parameter to OpenAPI parameter
   */
  private convertParameter(param: any, pathParams: Set<string>): OpenAPIParameter {
    // If parameter name is in the path, it should be marked as required
    const isPathParam = pathParams.has(param.name);

    return {
      name: param.name,
      in: isPathParam ? 'path' : param.in,
      description: param.description,
      required: isPathParam || param.required,
      schema: param.schema || { type: 'string' },
    };
  }

  /**
   * Convert parsed responses to OpenAPI responses
   */
  private convertResponses(responses: Record<string, ParsedResponse>): Record<string, OpenAPIResponse> {
    const converted: Record<string, OpenAPIResponse> = {};

    for (const [statusCode, response] of Object.entries(responses)) {
      const openApiResponse: OpenAPIResponse = {
        description: response.description || 'Response',
      };

      if (response.content?.['application/json']?.schema) {
        openApiResponse.content = {
          'application/json': {
            schema: response.content['application/json'].schema,
          },
        };
      }

      if (response.headers) {
        openApiResponse.headers = {};
        for (const [headerName, header] of Object.entries(response.headers)) {
          if (header.description || header.schema) {
            const headerObj: OpenAPIHeader = { schema: header.schema };
            if (header.description) {
              headerObj.description = header.description;
            }
            openApiResponse.headers[headerName] = headerObj;
          }
        }
      }

      converted[statusCode] = openApiResponse;
    }

    return converted;
  }

  /**
   * Generate all paths and return result
   */
  generate(): PathGenerationResult {
    return {
      paths: this.paths,
      errors: this.errors,
    };
  }

  /**
   * Get generated paths
   */
  getPaths(): PathsObject {
    return this.paths;
  }

  /**
   * Get generation errors
   */
  getErrors(): PathGenerationError[] {
    return this.errors;
  }

  /**
   * Get statistics
   */
  getStats(): {
    pathCount: number;
    operationCount: number;
    parameterCount: number;
    errorCount: number;
  } {
    let operationCount = 0;
    let parameterCount = 0;

    for (const pathItem of Object.values(this.paths)) {
      for (const operation of Object.values(pathItem) as OpenAPIOperation[]) {
        operationCount++;
        if (operation.parameters) {
          parameterCount += operation.parameters.length;
        }
      }
    }

    return {
      pathCount: Object.keys(this.paths).length,
      operationCount,
      parameterCount,
      errorCount: this.errors.length,
    };
  }
}
