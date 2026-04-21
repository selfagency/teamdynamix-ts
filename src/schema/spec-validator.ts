/**
 * OpenAPI 3.1.0 specification validator
 * Validates generated specs against OpenAPI schema and best practices
 */

export interface ValidationError {
  severity: 'error' | 'warning';
  location: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  stats: {
    totalPaths: number;
    totalSchemas: number;
    totalOperations: number;
    schemasWithExamples: number;
    operationsWithRateLimits: number;
  };
}

export class SpecValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate complete OpenAPI specification
   */
  validate(spec: any): ValidationResult {
    this.errors = [];
    this.warnings = [];

    // Validate structure
    this.validateSpecStructure(spec);
    this.validateInfo(spec.info);
    this.validateServers(spec.servers);
    this.validatePaths(spec.paths);
    this.validateComponents(spec.components);
    this.validateSecurity(spec.security, spec.components?.securitySchemes);

    // Collect stats
    const stats = this.collectStats(spec);

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats,
    };
  }

  private validateSpecStructure(spec: any): void {
    if (!spec.openapi) {
      this.errors.push({
        severity: 'error',
        location: 'root',
        message: 'Missing required field: openapi',
        suggestion: 'Add "openapi": "3.1.0" to spec root',
      });
    } else if (!spec.openapi.startsWith('3.1')) {
      this.warnings.push({
        severity: 'warning',
        location: 'root.openapi',
        message: `OpenAPI version ${spec.openapi} may not be 3.1.x`,
      });
    }

    if (!spec.info) {
      this.errors.push({
        severity: 'error',
        location: 'root.info',
        message: 'Missing required field: info',
      });
    }

    if (!spec.paths) {
      this.warnings.push({
        severity: 'warning',
        location: 'root.paths',
        message: 'No paths defined in specification',
      });
    }
  }

  private validateInfo(info: any): void {
    if (!info) return;

    if (!info.title) {
      this.errors.push({
        severity: 'error',
        location: 'info.title',
        message: 'Missing required field: info.title',
      });
    }

    if (!info.version) {
      this.errors.push({
        severity: 'error',
        location: 'info.version',
        message: 'Missing required field: info.version',
      });
    }

    if (!info.description) {
      this.warnings.push({
        severity: 'warning',
        location: 'info.description',
        message: 'Missing recommended field: info.description',
      });
    }
  }

  private validateServers(servers: any[] | undefined): void {
    if (!servers || servers.length === 0) {
      this.warnings.push({
        severity: 'warning',
        location: 'servers',
        message: 'No servers defined; clients may not know the API endpoint',
      });
    } else {
      servers.forEach((server, idx) => {
        if (!server.url) {
          this.errors.push({
            severity: 'error',
            location: `servers[${idx}].url`,
            message: 'Server must have a url property',
          });
        }
      });
    }
  }

  private validatePaths(paths: any): void {
    if (!paths) return;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) continue;

      const item = pathItem as any;
      const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

      for (const method of httpMethods) {
        const operation = item[method];
        if (!operation) continue;

        // Validate operation
        if (!operation.summary) {
          this.warnings.push({
            severity: 'warning',
            location: `paths.${path}.${method}.summary`,
            message: 'Missing recommended field: summary',
          });
        }

        if (!operation.operationId) {
          this.errors.push({
            severity: 'error',
            location: `paths.${path}.${method}.operationId`,
            message: 'Missing required field: operationId',
          });
        }

        // Validate responses
        if (!operation.responses) {
          this.errors.push({
            severity: 'error',
            location: `paths.${path}.${method}.responses`,
            message: 'Missing required field: responses',
          });
        } else {
          this.validateResponses(operation.responses, `paths.${path}.${method}`);
        }

        // Validate parameters
        if (operation.parameters) {
          operation.parameters.forEach((param: any, idx: number) => {
            if (!param.name) {
              this.errors.push({
                severity: 'error',
                location: `paths.${path}.${method}.parameters[${idx}].name`,
                message: 'Parameter must have a name',
              });
            }
            if (!param.in) {
              this.errors.push({
                severity: 'error',
                location: `paths.${path}.${method}.parameters[${idx}].in`,
                message: 'Parameter must have an in property (query, path, header, cookie)',
              });
            }
          });
        }
      }
    }
  }

  private validateResponses(responses: any, location: string): void {
    if (!responses['200'] && !responses['201'] && !responses['default']) {
      this.warnings.push({
        severity: 'warning',
        location: `${location}.responses`,
        message: 'No success response (200/201) or default response defined',
      });
    }

    for (const [statusCode, response] of Object.entries(responses)) {
      if (typeof response !== 'object' || response === null) continue;

      const resp = response as any;
      if (!resp.description) {
        this.errors.push({
          severity: 'error',
          location: `${location}.responses.${statusCode}.description`,
          message: 'Response must have a description',
        });
      }
    }
  }

  private validateComponents(components: any): void {
    if (!components) return;

    // Validate schemas
    if (components.schemas) {
      for (const [schemaName, schema] of Object.entries(components.schemas)) {
        const s = schema as any;

        if (!s.type && !s.$ref && !s.allOf && !s.oneOf && !s.anyOf) {
          this.warnings.push({
            severity: 'warning',
            location: `components.schemas.${schemaName}`,
            message: 'Schema has no type information',
          });
        }

        // Check for circular references (basic check)
        if (s.properties) {
          for (const [propName, prop] of Object.entries(s.properties)) {
            const p = prop as any;
            if (p.$ref && p.$ref.includes(schemaName)) {
              this.warnings.push({
                severity: 'warning',
                location: `components.schemas.${schemaName}.properties.${propName}`,
                message: 'Potential circular reference detected',
              });
            }
          }
        }
      }
    }

    // Validate security schemes
    if (components.securitySchemes) {
      for (const [schemeName, scheme] of Object.entries(components.securitySchemes)) {
        const s = scheme as any;
        if (!s.type) {
          this.errors.push({
            severity: 'error',
            location: `components.securitySchemes.${schemeName}.type`,
            message: 'Security scheme must have a type',
          });
        }
      }
    }
  }

  private validateSecurity(security: any, securitySchemes: any): void {
    if (!security) return;

    if (Array.isArray(security)) {
      security.forEach((requirement, idx) => {
        for (const schemeName of Object.keys(requirement)) {
          if (securitySchemes && !securitySchemes[schemeName]) {
            this.errors.push({
              severity: 'error',
              location: `security[${idx}].${schemeName}`,
              message: `Referenced security scheme "${schemeName}" not defined in components.securitySchemes`,
            });
          }
        }
      });
    }
  }

  private collectStats(spec: any): ValidationResult['stats'] {
    let totalPaths = 0;
    let totalSchemas = 0;
    let totalOperations = 0;
    let schemasWithExamples = 0;
    let operationsWithRateLimits = 0;

    if (spec.paths) {
      totalPaths = Object.keys(spec.paths).length;

      for (const pathItem of Object.values(spec.paths)) {
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
        for (const method of methods) {
          if ((pathItem as any)[method]) {
            totalOperations++;

            // Check for rate limits
            if ((pathItem as any)[method]['x-rateLimit']) {
              operationsWithRateLimits++;
            }
          }
        }
      }
    }

    if (spec.components?.schemas) {
      totalSchemas = Object.keys(spec.components.schemas).length;

      for (const schema of Object.values(spec.components.schemas)) {
        if ((schema as any).example) {
          schemasWithExamples++;
        }
      }
    }

    return {
      totalPaths,
      totalSchemas,
      totalOperations,
      schemasWithExamples,
      operationsWithRateLimits,
    };
  }

  /**
   * Generate validation report in Markdown
   */
  static generateReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('# OpenAPI Specification Validation Report\n');

    if (result.valid) {
      lines.push('## ✅ Validation Passed\n');
      lines.push('The specification is valid and ready for use.\n');
    } else {
      lines.push('## ❌ Validation Failed\n');
      lines.push(`Found ${result.errors.length} error(s) and ${result.warnings.length} warning(s).\n`);
    }

    // Statistics
    lines.push('## Statistics\n');
    lines.push(`- **Total paths:** ${result.stats.totalPaths}`);
    lines.push(`- **Total operations:** ${result.stats.totalOperations}`);
    lines.push(`- **Total schemas:** ${result.stats.totalSchemas}`);
    lines.push(`- **Schemas with examples:** ${result.stats.schemasWithExamples}/${result.stats.totalSchemas}`);
    lines.push(
      `- **Operations with rate limits:** ${result.stats.operationsWithRateLimits}/${result.stats.totalOperations}\n`,
    );

    // Errors
    if (result.errors.length > 0) {
      lines.push('## Errors\n');
      result.errors.forEach((err, idx) => {
        lines.push(`${idx + 1}. **${err.location}**`);
        lines.push(`   - ${err.message}`);
        if (err.suggestion) {
          lines.push(`   - Suggestion: ${err.suggestion}`);
        }
      });
      lines.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push('## Warnings\n');
      result.warnings.forEach((warn, idx) => {
        lines.push(`${idx + 1}. **${warn.location}**`);
        lines.push(`   - ${warn.message}`);
      });
      lines.push('');
    }

    lines.push('## Recommendations\n');
    lines.push('- Ensure all schemas have example values for better documentation');
    lines.push('- Add rate limit information to all operations');
    lines.push('- Include descriptions for all paths and operations');
    lines.push('- Define security schemes if authentication is required');

    return lines.join('\n');
  }
}
