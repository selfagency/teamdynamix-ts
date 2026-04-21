import type { OpenAPISchema } from './path-operation-generator.js';

export interface ExampleValue {
  summary: string;
  value: unknown;
}

export interface EnrichedSchema extends OpenAPISchema {
  examples?: ExampleValue[];
  'x-examples'?: Record<string, unknown>;
  'x-constraints'?: string[];
  'x-validationRules'?: string[];
  'x-relatedOperations'?: string[];
}

export interface OperationEnrichment {
  operationId: string;
  examples?: {
    request?: ExampleValue[];
    response?: Record<string, ExampleValue[]>;
  };
  validationRules?: string[];
  commonErrors?: Array<{
    code: string;
    description: string;
  }>;
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  prerequisites?: string[];
  relatedOperations?: string[];
  remarks?: string;
}

/**
 * Enriches OpenAPI spec with examples, validation rules, and additional metadata
 */
export class ExampleEnricher {
  private schemaExamples: Map<string, unknown> = new Map();
  private operationExamples: Map<string, OperationEnrichment> = new Map();

  /**
   * Add example for a schema type
   */
  addSchemaExample(typeName: string, example: unknown): this {
    this.schemaExamples.set(typeName, example);
    return this;
  }

  /**
   * Add enrichment for an operation
   */
  addOperationEnrichment(operationId: string, enrichment: OperationEnrichment): this {
    this.operationExamples.set(operationId, enrichment);
    return this;
  }

  /**
   * Get schema example
   */
  getSchemaExample(typeName: string): unknown {
    return this.schemaExamples.get(typeName);
  }

  /**
   * Get operation enrichment
   */
  getOperationEnrichment(operationId: string): OperationEnrichment | undefined {
    return this.operationExamples.get(operationId);
  }

  /**
   * Generate examples for common types
   */
  static generateTypeExamples(): Map<string, unknown> {
    const examples = new Map<string, unknown>();

    // Account example
    examples.set('Accounts', {
      id: 1,
      name: 'Development Department',
      code: 'DEV',
      description: 'Software development department',
      isActive: true,
      createdDate: '2023-01-15T10:30:00Z',
      modifiedDate: '2024-01-20T14:45:00Z',
      manager: {
        uid: 'user-123',
        name: 'John Manager',
      },
    });

    // Task example
    examples.set('Task', {
      id: 101,
      uid: 'task-uuid-123',
      title: 'Implement new feature',
      description: 'Add user authentication module',
      status: 'In Progress',
      priority: 'High',
      assignee: {
        uid: 'user-456',
        name: 'Jane Developer',
      },
      dueDate: '2024-02-28T17:00:00Z',
      createdDate: '2024-01-15T09:00:00Z',
      modifiedDate: '2024-01-20T11:30:00Z',
    });

    // Issue example
    examples.set('Issue', {
      id: 2001,
      uid: 'issue-uuid-456',
      title: 'Login page not responsive',
      description: 'The login page breaks on mobile devices',
      category: 'Bug',
      severity: 'High',
      status: 'Open',
      requestor: {
        uid: 'user-789',
        name: 'End User',
      },
      createdDate: '2024-01-18T08:00:00Z',
    });

    // Search/Create Request example
    examples.set('AccountSearch', {
      pageSize: 50,
      pageNumber: 1,
      isActive: true,
      searchText: 'Development',
    });

    // Response wrapper
    examples.set('PagedResult', {
      pageSize: 50,
      pageNumber: 1,
      totalRecords: 1,
      results: [
        {
          id: 1,
          name: 'Development Department',
        },
      ],
    });

    return examples;
  }

  /**
   * Generate common validation rules by type
   */
  static getValidationRules(typeName: string): string[] {
    const rules: Record<string, string[]> = {
      Accounts: [
        'name: Required, max 500 characters',
        'code: Required, max 50 characters, must be unique',
        'isActive: Boolean flag',
      ],
      Task: [
        'title: Required, max 1000 characters',
        'status: Must be valid status (Open, In Progress, Closed, etc.)',
        'priority: Must be High, Medium, Low, or Urgent',
      ],
      Issue: [
        'title: Required, max 1000 characters',
        'category: Must be valid category type',
        'severity: Must be Critical, High, Medium, or Low',
      ],
    };
    return rules[typeName] || [];
  }

  /**
   * Generate common errors for operations
   */
  static getCommonErrors(): Array<{ code: string; description: string }> {
    return [
      { code: '400', description: 'Bad Request - Invalid parameters' },
      { code: '401', description: 'Unauthorized - Missing or invalid authentication' },
      { code: '403', description: 'Forbidden - Insufficient permissions' },
      { code: '404', description: 'Not Found - Resource does not exist' },
      { code: '409', description: 'Conflict - Resource already exists' },
      { code: '422', description: 'Unprocessable Entity - Validation failed' },
      { code: '429', description: 'Too Many Requests - Rate limit exceeded' },
      { code: '500', description: 'Internal Server Error' },
      { code: '503', description: 'Service Unavailable' },
    ];
  }

  /**
   * Generate rate limit info
   */
  static getRateLimitInfo(operationType: string): { requestsPerMinute: number; requestsPerHour: number } {
    // Based on TeamDynamix API documentation patterns
    const limits: Record<string, { requestsPerMinute: number; requestsPerHour: number }> = {
      read: { requestsPerMinute: 60, requestsPerHour: 3600 },
      write: { requestsPerMinute: 30, requestsPerHour: 1800 },
      search: { requestsPerMinute: 60, requestsPerHour: 3600 },
    };

    return limits[operationType] ?? { requestsPerMinute: 60, requestsPerHour: 3600 };
  }
}

/**
 * Inject examples and enrichment into OpenAPI spec
 */
export function enrichSpecWithExamples(spec: any, enricher: ExampleEnricher): any {
  const enrichedSpec = JSON.parse(JSON.stringify(spec));

  // Add examples to schemas
  if (enrichedSpec.components?.schemas) {
    const examples = ExampleEnricher.generateTypeExamples();

    for (const [schemaName, schema] of Object.entries(enrichedSpec.components.schemas)) {
      const example = examples.get(schemaName) || enricher.getSchemaExample(schemaName);
      if (example) {
        (schema as any).example = example;
      }

      // Add validation rules as custom extension
      const rules = ExampleEnricher.getValidationRules(schemaName);
      if (rules.length > 0) {
        (schema as any)['x-validationRules'] = rules;
      }
    }
  }

  // Add enrichment to operations
  if (enrichedSpec.paths) {
    for (const pathOps of Object.values(enrichedSpec.paths) as any[]) {
      for (const operation of Object.values(pathOps) as any[]) {
        const op = operation as any;
        if (op.operationId) {
          const enrichment = enricher.getOperationEnrichment(op.operationId);

          // Add examples
          if (enrichment?.examples) {
            if (!op['x-examples']) {
              op['x-examples'] = {};
            }
            op['x-examples'] = enrichment.examples;
          }

          // Add common errors
          const commonErrors = ExampleEnricher.getCommonErrors();
          if (!op['x-commonErrors']) {
            op['x-commonErrors'] = commonErrors;
          }

          // Add rate limit info
          const operationType = op.tags?.[0]?.toLowerCase().includes('search')
            ? 'search'
            : op.method === 'get'
              ? 'read'
              : 'write';
          op['x-rateLimit'] = ExampleEnricher.getRateLimitInfo(operationType);

          // Add prerequisites
          if (enrichment?.prerequisites) {
            op['x-prerequisites'] = enrichment.prerequisites;
          }

          // Add related operations
          if (enrichment?.relatedOperations) {
            op['x-relatedOperations'] = enrichment.relatedOperations;
          }
        }
      }
    }
  }

  return enrichedSpec;
}
