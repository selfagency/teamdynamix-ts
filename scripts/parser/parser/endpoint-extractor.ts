import type { ParsedEndpoint, ParsedParameter, ParsedResponse, ParsedSchema } from './types.js';

/**
 * Extracts endpoint definitions from section markdown files
 * Section files contain HTTP method + URL + parameters + return type
 */

export class EndpointExtractor {
  /**
   * Parse a section file and extract all endpoints
   * Section files use markdown headings like:
   * ### METHOD https://url Description
   */
  static extractEndpoints(content: string, sectionName: string): ParsedEndpoint[] {
    const endpoints: ParsedEndpoint[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Match h3 heading with HTTP method and URL
      // Pattern: ### GET https://rollins.teamdynamix.com/TDWebApi/api/accounts Copy URL
      const methodMatch = line.match(
        /^###\s+(GET|POST|PUT|PATCH|DELETE)\s+(https?:\/\/.+?)(\s+(Copy URL|Remarks|Parameters))?$/i,
      );

      if (methodMatch) {
        const endpoint = this.extractEndpoint(lines, i, methodMatch, sectionName);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }

      i++;
    }

    return endpoints;
  }

  /**
   * Extract a single endpoint definition starting at the given line
   */
  private static extractEndpoint(
    lines: string[],
    startLine: number,
    methodMatch: RegExpMatchArray,
    sectionName: string,
  ): ParsedEndpoint | null {
    const method = (methodMatch[1] || '').toUpperCase() as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    const fullUrl = methodMatch[2] || '';

    if (!method || !fullUrl) return null;

    // Parse the URL to extract path
    // Example: https://rollins.teamdynamix.com/TDWebApi/api/accounts
    // Should extract: /api/accounts
    let path = '/';
    const apiMatch = fullUrl.match(/\/api\/(.*)$/i);
    if (apiMatch) {
      path = `/api/${apiMatch[1]}`;
    } else {
      path = fullUrl;
    }

    // Generate operation ID from path
    const operationId = this.generateOperationId(method, path);

    // Find description by looking at following lines
    let summary = `${method} ${path}`;
    let description = '';
    let i = startLine + 1;

    // The line after the heading usually has the description
    if (i < lines.length) {
      const descLine = lines[i]?.trim();
      if (descLine && !descLine.startsWith('####') && !descLine.startsWith('###')) {
        summary = descLine;
        description = descLine;
        i++;
      }
    }

    // Extract parameters, request body, responses by parsing following lines
    const parameters: ParsedParameter[] = [];
    const responses: Record<string, ParsedResponse> = {};
    let requestBodySchema: ParsedSchema | undefined;
    const endSearch = Math.min(startLine + 100, lines.length);

    while (i < endSearch) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Stop at next endpoint definition
      if (/^###\s+(GET|POST|PUT|PATCH|DELETE)\s+https?:\/\//.test(line)) {
        break;
      }

      // Extract Parameters section (definition list format)
      if (line.startsWith('#### Parameters')) {
        i++;
        const params = this.extractParametersFromDefinitionList(lines, i);
        parameters.push(...params.parameters);
        i = params.nextLine;
        continue;
      }

      // Extract Returns section
      if (line.startsWith('#### Returns')) {
        i++;
        let returnDesc = '';
        let returnType = '';

        // Parse the return type (may be on next line)
        while (i < lines.length) {
          const retLine = lines[i]?.trim() || '';
          if (retLine.startsWith('####')) break;
          if (retLine && !retLine.startsWith('**')) {
            if ((!returnType && retLine.includes('TeamDynamix')) || retLine.includes('[]')) {
              returnType = retLine;
            } else if (retLine) {
              returnDesc = retLine;
            }
          }
          i++;
        }

        if (returnType) {
          responses['200'] = {
            description: returnDesc || 'Successful response',
            content: {
              'application/json': {
                schema: this.parseTypeReference(returnType),
              },
            },
          };
        }
        continue;
      }

      // Extract Request Body section
      if (line.startsWith('#### Request Body')) {
        i++;
        const bodyType = lines[i]?.trim() || '';
        if (bodyType && bodyType.includes('TeamDynamix')) {
          requestBodySchema = this.parseTypeReference(bodyType);
        }
        continue;
      }

      i++;
    }

    // Add default error responses
    responses['400'] = { description: 'Bad request' };
    responses['401'] = { description: 'Unauthorized' };
    responses['429'] = { description: 'Rate limited' };
    responses['500'] = { description: 'Internal server error' };

    const endpoint: ParsedEndpoint = {
      method,
      path,
      summary,
      description,
      operationId,
      parameters,
      responses,
      tags: [sectionName],
      security: ['bearerAuth'],
      rawUrl: `${method} ${fullUrl}`,
    };

    if (requestBodySchema) {
      endpoint.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: requestBodySchema,
          },
        },
      };
    }

    return endpoint;
  }

  /**
   * Extract parameters from definition list format
   * Format:
   * * Parameter Name
   *   :   ##### id
   *   Type
   *   :   Int32
   *   Source
   *   :   URI
   *   Description
   *   :   The account ID.
   */
  private static extractParametersFromDefinitionList(
    lines: string[],
    startLine: number,
  ): { parameters: ParsedParameter[]; nextLine: number } {
    const parameters: ParsedParameter[] = [];
    let i = startLine;
    let currentParam: Partial<ParsedParameter> | null = null;
    let lastKey = '';

    while (i < lines.length) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Stop if we hit the next section heading
      if (line.startsWith('####') || (line.startsWith('###') && !line.startsWith('#####'))) {
        break;
      }

      // Parameter name line starts with *
      if (line.startsWith('*') && !line.startsWith('*   :')) {
        if (currentParam && currentParam.name) {
          parameters.push(currentParam as ParsedParameter);
        }
        currentParam = {
          name: line.replace(/^\*\s*/, '').trim(),
          in: 'query',
          required: false,
          schema: { type: 'string' },
        };
        lastKey = 'name';
      }
      // Definition list value line starts with :
      else if (line.startsWith(':')) {
        const value = line.replace(/^:\s*/, '').trim();

        if (lastKey === 'name') {
          // This might be a type or a heading, skip heading-like values
          if (!value.startsWith('#')) {
            lastKey = 'type';
            if (currentParam) currentParam.schema = this.parseType(value);
          }
        } else if (lastKey === 'type') {
          lastKey = 'source';
          if (currentParam) {
            const sourceMap: Record<string, 'path' | 'query' | 'header' | 'cookie'> = {
              uri: 'path',
              query: 'query',
              body: 'query',
              header: 'header',
            };
            currentParam.in = sourceMap[value.toLowerCase()] || 'query';
          }
        } else if (lastKey === 'source') {
          lastKey = 'required';
          if (currentParam) {
            currentParam.required = value.toLowerCase() === 'required';
          }
        } else if (lastKey === 'required') {
          lastKey = 'description';
          if (currentParam) {
            currentParam.description = value;
          }
        }
      }

      i++;
    }

    if (currentParam && currentParam.name) {
      parameters.push(currentParam as ParsedParameter);
    }

    return { parameters, nextLine: i };
  }

  /**
   * Extract parameters from definition list format (alternative)
   */
  private static extractParameters(lines: string[], startLine: number, endLine: number): ParsedParameter[] {
    const parameters: ParsedParameter[] = [];
    for (let i = startLine; i < endLine && i < lines.length; i++) {
      const lineContent = lines[i];
      if (!lineContent) continue;
      const line = lineContent.trim();
      if (line.startsWith('- ')) {
        const param = this.parseParameter(line);
        if (param) {
          parameters.push(param);
        }
      }
    }
    return parameters;
  }

  /**
   * Parse a parameter line into a ParsedParameter
   * Expected format: "- name: Type (source, required/optional) description"
   */
  private static parseParameter(line: string): ParsedParameter | null {
    // Match patterns like:
    // - id: Int32 (URI, Required)
    // - search: String (Query, Optional)
    const match = line.match(/^-\s+([^:]+):\s+([^\s(]+)\s*\(([^,]+),\s*([^)]+)\)\s*(.*)$/);

    if (!match || !match[1] || !match[2] || !match[3]) {
      return null;
    }

    const name = match[1].trim();
    const type = match[2].trim();
    const source = match[3].trim();
    const required = (match[4]?.trim() || '').toLowerCase() === 'required';
    const description = (match[5] || '').trim();

    return {
      name,
      in: source.toLowerCase() as 'path' | 'query' | 'header' | 'cookie',
      required,
      description,
      schema: this.parseType(type),
    };
  }

  /**
   * Parse a .NET type string into OpenAPI schema
   */
  private static parseType(typeStr: string): ParsedSchema {
    const schema: ParsedSchema = {};

    if (typeStr === 'String') {
      schema.type = 'string';
    } else if (typeStr === 'Int32' || typeStr === 'Int64') {
      schema.type = 'integer';
      schema.format = typeStr === 'Int64' ? 'int64' : 'int32';
    } else if (typeStr === 'Boolean') {
      schema.type = 'boolean';
    } else if (typeStr === 'DateTime') {
      schema.type = 'string';
      schema.format = 'date-time';
    } else if (typeStr === 'Decimal' || typeStr === 'Double') {
      schema.type = 'number';
      schema.format = typeStr === 'Decimal' ? 'decimal' : 'double';
    } else {
      // Assume it's a reference type
      schema.$ref = `#/components/schemas/${typeStr}`;
    }

    return schema;
  }

  /**
   * Parse a type reference from a Returns line
   */
  private static parseTypeReference(typeStr: string | undefined): ParsedSchema {
    if (!typeStr || typeStr.length === 0) return { type: 'object' };
    const parts = typeStr.split('(');
    const cleaned = (parts[0] || '').trim(); // Remove any parenthetical notes
    return this.parseType(cleaned);
  }

  /**
   * Generate a camelCase operation ID from HTTP method and path
   */
  private static generateOperationId(method: string, path: string): string {
    // Convert path like /api/{appId}/tickets/{id} to parts
    const parts = path
      .split('/')
      .filter(p => p && !p.startsWith('{') && p !== 'api')
      .map(p => p.toLowerCase());

    // Camel case: get + tickets + by + id = getTicketsById
    const baseId = method.toLowerCase() + parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');

    return baseId;
  }
}
