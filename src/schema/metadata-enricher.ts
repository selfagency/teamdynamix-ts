import type { PathsObject } from './path-operation-generator.js';

export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
  version: string;
  'x-logo'?: {
    url: string;
    altText: string;
  };
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<
    string,
    {
      enum?: string[];
      default: string;
      description?: string;
    }
  >;
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect' | 'mutualTLS';
  description?: string;
  name?: string;
  in?: 'query' | 'header' | 'cookie';
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

export interface OpenAPIComponent {
  schemas: Record<string, unknown>;
  responses?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  examples?: Record<string, unknown>;
  requestBodies?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  securitySchemes: Record<string, OpenAPISecurityScheme>;
  links?: Record<string, unknown>;
  callbacks?: Record<string, unknown>;
  pathItems?: Record<string, unknown>;
}

export interface EnrichedOpenAPISpec {
  openapi: string;
  info: OpenAPIInfo;
  servers: OpenAPIServer[];
  paths: PathsObject;
  components: OpenAPIComponent;
  tags?: OpenAPITag[];
  externalDocs?: {
    description?: string;
    url: string;
  };
  security?: Record<string, string[]>[];
  'x-internal'?: boolean;
}

/**
 * Enriches OpenAPI specification with metadata and global definitions
 */
export class MetadataEnricher {
  private spec: Partial<EnrichedOpenAPISpec> = {};

  constructor() {
    this.initializeDefaults();
  }

  /**
   * Initialize spec with default metadata
   */
  private initializeDefaults(): void {
    this.spec = {
      openapi: '3.1.0',
      info: {
        title: 'TeamDynamix Web API',
        version: '1.0.0',
      },
      servers: [],
      components: {
        schemas: {},
        securitySchemes: {},
      },
      tags: [],
    };
  }

  /**
   * Set API info metadata
   */
  setInfo(info: Partial<OpenAPIInfo>): this {
    if (!this.spec.info) {
      this.spec.info = { title: '', version: '' };
    }
    this.spec.info = {
      ...this.spec.info,
      ...info,
    };
    return this;
  }

  /**
   * Add servers
   */
  addServers(servers: OpenAPIServer[]): this {
    if (!this.spec.servers) {
      this.spec.servers = [];
    }
    this.spec.servers.push(...servers);
    return this;
  }

  /**
   * Set paths and operations
   */
  setPaths(paths: PathsObject): this {
    this.spec.paths = paths;
    return this;
  }

  /**
   * Set component schemas
   */
  setSchemas(schemas: Record<string, unknown>): this {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {} };
    }
    this.spec.components.schemas = schemas;
    return this;
  }

  /**
   * Add security scheme
   */
  addSecurityScheme(name: string, scheme: OpenAPISecurityScheme): this {
    if (!this.spec.components) {
      this.spec.components = { schemas: {}, securitySchemes: {} };
    }
    this.spec.components.securitySchemes[name] = scheme;
    return this;
  }

  /**
   * Add tags with descriptions
   */
  addTags(tags: OpenAPITag[]): this {
    if (!this.spec.tags) {
      this.spec.tags = [];
    }
    this.spec.tags.push(...tags);
    return this;
  }

  /**
   * Set external documentation
   */
  setExternalDocs(docs: { description?: string; url: string }): this {
    this.spec.externalDocs = docs;
    return this;
  }

  /**
   * Set global security
   */
  setGlobalSecurity(security: Record<string, string[]>[]): this {
    this.spec.security = security;
    return this;
  }

  /**
   * Get the enriched spec
   */
  build(): EnrichedOpenAPISpec {
    if (!this.spec.openapi || !this.spec.info || !this.spec.servers || !this.spec.paths || !this.spec.components) {
      throw new Error('Incomplete OpenAPI specification');
    }

    return {
      openapi: this.spec.openapi,
      info: this.spec.info,
      servers: this.spec.servers,
      paths: this.spec.paths,
      components: this.spec.components,
      tags: this.spec.tags,
      externalDocs: this.spec.externalDocs,
      security: this.spec.security,
      'x-internal': this.spec['x-internal'],
    } as EnrichedOpenAPISpec;
  }
}

/**
 * Utility to extract and organize tags from operations
 */
export function extractTagsFromPaths(paths: PathsObject): Map<string, number> {
  const tagUsage = new Map<string, number>();

  for (const pathOps of Object.values(paths)) {
    for (const operation of Object.values(pathOps)) {
      const op = operation as any;
      if (op.tags && Array.isArray(op.tags)) {
        for (const tag of op.tags) {
          tagUsage.set(tag, (tagUsage.get(tag) || 0) + 1);
        }
      }
    }
  }

  return tagUsage;
}

/**
 * Generate standard OpenAPI tags with descriptions
 */
export function generateStandardTags(tagUsage: Map<string, number>): OpenAPITag[] {
  const tags: OpenAPITag[] = [];
  const tagDescriptions: Record<string, string> = {
    Accounts: 'Operations for managing accounts and departments',
    Assets: 'Operations for managing assets and inventory',
    Attachments: 'Operations for managing file attachments',
    'Attachments Infos': 'Information about attachments',
    Forms: 'Operations for managing forms',
    Imports: 'Operations for data import functionality',
    Issues: 'Operations for managing issues and tickets',
    Knowledgebase: 'Operations for managing knowledge base articles',
    Projects: 'Operations for managing projects',
    Reports: 'Operations for generating reports',
    'Saved Searches': 'Operations for managing saved searches',
    ServiceCatalog: 'Operations for managing service catalog items',
    'Status Tracking': 'Operations for status tracking',
    TaskTemplates: 'Operations for task template management',
    Tasks: 'Operations for managing tasks',
    'Ticket Categories': 'Operations for ticket categorization',
    'Ticket Statuses': 'Operations for ticket status management',
    Users: 'Operations for managing users and accounts',
    'Web Hooks': 'Operations for webhook management',
  };

  for (const [tag, usage] of tagUsage) {
    tags.push({
      name: tag,
      description: tagDescriptions[tag] || `${tag} operations (${usage} endpoints)`,
    });
  }

  return tags.sort((a, b) => a.name.localeCompare(b.name));
}
