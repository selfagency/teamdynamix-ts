import type { ParsedEndpoint, ParsedResponse } from '../parser/types.js';

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
  private canonicalPathBySignature = new Map<string, string>();

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
      const normalized = this.normalizeEndpointPath(endpoint.path);
      const normalizedPath = normalized.path;

      // Extract path parameters for path normalization
      const pathParams = this.extractPathParameters(normalizedPath);

      // Initialize path if it doesn't exist
      if (!this.paths[normalizedPath]) {
        this.paths[normalizedPath] = {};
      }

      // Create operation
      const operation: OpenAPIOperation = {
        responses: this.convertResponses(endpoint.responses),
      };

      const has2xxResponse = Object.keys(operation.responses).some(code => /^2\d\d$/.test(code));
      if (!has2xxResponse) {
        operation.responses['200'] = {
          description: 'Successful response',
        };
      }

      // Add optional fields
      if (endpoint.summary) {
        operation.summary = endpoint.summary;
      }
      if (endpoint.description) {
        operation.description = endpoint.description;
      }

      // Generate unique operationId based on method + path
      const methodKey = endpoint.method.toLowerCase();
      operation.operationId = this.generateOperationId(methodKey, normalizedPath);

      if (endpoint.tags) {
        operation.tags = endpoint.tags;
      }

      // Add parameters - only extract from path and properly formed query params
      const parameters: OpenAPIParameter[] = [];

      // First, add path parameters extracted from the URL
      for (const paramName of pathParams) {
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `The ${paramName} parameter`,
        });
      }

      // Add query params extracted from query template in original path
      for (const qp of normalized.queryParams) {
        if (!pathParams.has(qp.name)) {
          parameters.push({
            name: qp.name,
            in: 'query',
            required: qp.required,
            schema: { type: 'string' },
            description: `The ${qp.name} query parameter`,
          });
        }
      }

      // Then, add query/header/cookie parameters from endpoint definition
      // Only if they're properly formed and not path parameters
      if (endpoint.parameters && endpoint.parameters.length > 0) {
        for (const param of endpoint.parameters) {
          const remappedName = normalized.pathParamRenameMap.get(param.name) || param.name;
          // Skip if this parameter is already in path parameters
          if (!pathParams.has(remappedName)) {
            // Only add if it has a valid name (not placeholder like "Parameter Name")
            if (remappedName && remappedName !== 'Parameter Name' && remappedName.trim()) {
              parameters.push(this.convertParameter({ ...param, name: remappedName }, pathParams));
            }
          }
        }
      }

      // Remove duplicate parameters by (in,name)
      const dedupedParameters: OpenAPIParameter[] = [];
      const seenParams = new Set<string>();
      for (const p of parameters) {
        const key = `${p.in}:${p.name}`;
        if (!seenParams.has(key)) {
          seenParams.add(key);
          dedupedParameters.push(p);
        }
      }

      if (dedupedParameters.length > 0) {
        operation.parameters = dedupedParameters;
      }

      // Add request body
      if (endpoint.requestBody) {
        operation.requestBody = {
          required: endpoint.requestBody.required,
          content: {
            'application/json': {
              schema: this.cleanSchema(endpoint.requestBody.content['application/json']?.schema || { type: 'object' }),
            },
          },
        };
      }

      // Add security
      if (endpoint.security && endpoint.security.length > 0) {
        operation.security = endpoint.security.map(sec => ({ [sec]: [] }));
      }

      // Add operation to path
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
   * Generate unique operationId from method and path
   * e.g., GET /api/accounts/{id} -> getAccountsById
   */
  private generateOperationId(method: string, path: string): string {
    // Remove /api prefix if present
    let cleanPath = path.replace(/^\/api\//, '');

    // Replace {param} with capitalized word
    cleanPath = cleanPath.replace(/\{([^}]+)\}/g, (_, param) => {
      // Capitalize the param name
      return param.charAt(0).toUpperCase() + param.slice(1);
    });

    // Convert path segments to camelCase
    const segments = cleanPath.split('/').filter(s => s.length > 0);
    const camelCase = segments
      .map((seg, i) => {
        if (i === 0) {
          return seg;
        }
        return seg.charAt(0).toUpperCase() + seg.slice(1);
      })
      .join('');

    // Add method prefix
    return method.toLowerCase() + camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * Clean schema by removing markdown links and fixing $ref values
   */
  private cleanSchema(schema: any): any {
    if (!schema) {
      return schema;
    }

    const cleaned = { ...schema };

    // Fix $ref values that might contain markdown links
    if (cleaned.$ref && typeof cleaned.$ref === 'string') {
      // Remove markdown link syntax: [text](url) -> extract just the reference name
      const refMatch = cleaned.$ref.match(/\[([^\]]+)\]/);
      if (refMatch) {
        // Extract type name from markdown link
        cleaned.$ref = `#/components/schemas/${refMatch[1]}`;
      }
      // If $ref ends with / (empty), remove it
      if (cleaned.$ref.endsWith('/')) {
        delete cleaned.$ref;
        cleaned.type = 'object';
      }
    }

    // Recursively clean nested schemas
    if (cleaned.items) {
      cleaned.items = this.cleanSchema(cleaned.items);
    }
    if (cleaned.properties) {
      cleaned.properties = Object.entries(cleaned.properties).reduce(
        (acc, [key, value]) => {
          acc[key] = this.cleanSchema(value);
          return acc;
        },
        {} as Record<string, any>,
      );
    }

    return cleaned;
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

  private normalizeEndpointPath(path: string): {
    path: string;
    queryParams: Array<{ name: string; required: boolean }>;
    pathParamRenameMap: Map<string, string>;
  } {
    const [rawPath, rawQuery] = path.split('?');
    const cleanPath = rawPath || path;

    const queryParams: Array<{ name: string; required: boolean }> = [];
    if (rawQuery) {
      for (const part of rawQuery.split('&')) {
        const [name, value] = part.split('=');
        if (!name) continue;
        const trimmedName = name.trim();
        if (!trimmedName) continue;
        const required = typeof value === 'string' && /^\{[^}]+\}$/.test(value.trim());
        queryParams.push({ name: trimmedName, required });
      }
    }

    const signature = cleanPath.replace(/\{[^}]+\}/g, '{}');
    const canonicalPath = this.canonicalPathBySignature.get(signature) || cleanPath;
    if (!this.canonicalPathBySignature.has(signature)) {
      this.canonicalPathBySignature.set(signature, canonicalPath);
    }

    const pathParamRenameMap = new Map<string, string>();
    if (canonicalPath !== cleanPath) {
      const canonicalNames = [...canonicalPath.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
      const incomingNames = [...cleanPath.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
      for (let i = 0; i < Math.min(canonicalNames.length, incomingNames.length); i++) {
        const incoming = incomingNames[i];
        const canonical = canonicalNames[i];
        if (incoming && canonical && incoming !== canonical) {
          pathParamRenameMap.set(incoming, canonical);
        }
      }
    }

    return {
      path: canonicalPath,
      queryParams,
      pathParamRenameMap,
    };
  }

  /**
   * Convert parsed parameter to OpenAPI parameter
   */
  private convertParameter(param: any, pathParams: Set<string>): OpenAPIParameter {
    // Use actual parameter name or fallback
    const paramName = param.name && param.name !== 'Parameter Name' ? param.name : `param${Date.now()}`;

    // If parameter name is in the path, it should be marked as required in path
    const isPathParam = pathParams.has(paramName);

    return {
      name: paramName,
      in: isPathParam ? 'path' : param.in || 'query',
      description: param.description || `The ${paramName} parameter`,
      required: isPathParam || param.required || isPathParam, // path params are always required
      schema: this.cleanSchema(param.schema || { type: 'string' }),
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
        const schema = this.cleanSchema(response.content['application/json'].schema);
        openApiResponse.content = {
          'application/json': {
            schema,
          },
        };
      }

      if (response.headers) {
        openApiResponse.headers = {};
        for (const [headerName, header] of Object.entries(response.headers)) {
          if (header.description || header.schema) {
            const headerObj: OpenAPIHeader = { schema: this.cleanSchema(header.schema) };
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
