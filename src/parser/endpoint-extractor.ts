import type { ParsedEndpoint, ParsedParameter, ParsedResponse, ParsedSchema } from './types.js';
import { MarkdownParser } from './markdown-parser.js';

/**
 * Extracts endpoint definitions from section markdown files
 * Section files contain HTTP method + URL + parameters + return type
 */

export class EndpointExtractor {
  /**
   * Parse a section file and extract all endpoints
   */
  static extractEndpoints(content: string, sectionName: string): ParsedEndpoint[] {
    const parser = new MarkdownParser(content);
    const parsed = parser.parse();
    const endpoints: ParsedEndpoint[] = [];

    // Look for patterns like "GET https://..."
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Match HTTP method + URL pattern
      const methodMatch = line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+https?:\/\/(.+?)(\{.+?\})?$/i);

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
    const method1 = methodMatch[1];
    if (!method1) return null;
    const methodStr = method1.toUpperCase();
    const method = methodStr as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

    const urlPart = methodMatch[2];
    if (!urlPart) return null;

    // Parse the URL to extract path
    const pathMatch = urlPart.match(/api\/(.+)$/);
    const pathPart = pathMatch?.[1];
    const path = pathPart ? `/api/${pathPart}` : `/api/${urlPart}`;

    // Generate operation ID from path
    const operationId = this.generateOperationId(method, path);

    // Find summary and description by looking at lines before method
    let summary = '';
    let description = '';
    let lookback = startLine - 1;

    while (lookback >= 0 && lookback < lines.length) {
      const prevLine = lines[lookback];
      if (!prevLine) break;
      const trimmedLine = prevLine.trim();

      if (trimmedLine.startsWith('###') || trimmedLine.startsWith('##')) {
        summary = trimmedLine.replace(/^#+\s*/, '').trim();
        break;
      }

      if (trimmedLine && !trimmedLine.startsWith('###') && !trimmedLine.startsWith('##')) {
        description = trimmedLine + '\n' + description;
      }

      lookback--;
      if (startLine - lookback > 20) break; // Limit lookback
    }

    // Extract parameters, request body, responses by parsing following lines
    const parameters: ParsedParameter[] = [];
    let requestBody = undefined;
    const responses: Record<string, ParsedResponse> = {};
    let i = startLine + 1;

    while (i < lines.length && i < startLine + 50) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Stop at next method definition
      if (/^(GET|POST|PUT|PATCH|DELETE)\s+https?:\/\//.test(line)) {
        break;
      }

      // Extract Parameters section
      if (line.startsWith('#### Parameters')) {
        i++;
        while (i < lines.length && lines[i] && !lines[i]!.trim().startsWith('####')) {
          const paramLine = lines[i]!.trim();

          if (paramLine.startsWith('- ')) {
            const param = this.parseParameter(paramLine);
            if (param) {
              parameters.push(param);
            }
          }

          i++;
        }
        continue;
      }

      // Extract Returns section
      if (line.startsWith('#### Returns')) {
        i++;
        const returnType = lines[i]?.trim() || '';
        if (returnType && !returnType.startsWith('####')) {
          responses['200'] = {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: this.parseTypeReference(returnType),
              },
            },
          };
        }
      }

      // Extract Rate Limitations
      if (line.startsWith('#### Rate Limitations')) {
        i++;
        const rateLimitLine = lines[i]?.trim() || '';
        if (rateLimitLine && !rateLimitLine.startsWith('####')) {
          // Extract rate limit info if needed
        }
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
      summary: summary || description.split('\n')[0] || 'API Endpoint',
      description: description.trim(),
      operationId,
      parameters,
      responses,
      tags: [sectionName],
      security: ['bearerAuth'],
      rawUrl: `${method} ${urlPart}`,
    };

    if (requestBody) {
      endpoint.requestBody = requestBody;
    }

    return endpoint;
  }

  /**
   * Extract parameters from lines
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
