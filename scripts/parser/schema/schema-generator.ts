import type { ParsedType, ParsedTypeProperty, ParsedSchema } from '../parser/types.js';

/**
 * OpenAPI 3.1 Schema Object for components/schemas
 * Follows JSON Schema 2020-12 plus OpenAPI 3.1 extensions
 */
export interface OpenAPISchema {
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  $ref?: string;
  enum?: (string | number | boolean | null)[];
  default?: unknown;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  examples?: unknown[];
  oneOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
  additionalProperties?: boolean | OpenAPISchema;
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
  xml?: {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  };
}

/**
 * Schema consolidation result for types with variants
 */
export interface ConsolidatedSchema {
  baseSchema: OpenAPISchema;
  variants: {
    search?: OpenAPISchema;
    create?: OpenAPISchema;
    update?: OpenAPISchema;
  };
  allVersions: OpenAPISchema[];
}

/**
 * Generates OpenAPI 3.1 schemas from parsed type definitions
 */
export class SchemaGenerator {
  private schemas: Map<string, OpenAPISchema> = new Map();
  private consolidatedSchemas: Map<string, ConsolidatedSchema> = new Map();
  private typeMap: Map<string, ParsedType> = new Map();
  private errors: Array<{ type: string; message: string }> = [];

  /**
   * Add types to the generator for schema conversion
   */
  addTypes(types: ParsedType[]): void {
    for (const type of types) {
      this.typeMap.set(type.fullName, type);
    }
  }

  /**
   * Generate all schemas from added types
   */
  generate(): {
    schemas: Record<string, OpenAPISchema>;
    consolidated: Record<string, ConsolidatedSchema>;
    errors: Array<{ type: string; message: string }>;
  } {
    this.schemas.clear();
    this.consolidatedSchemas.clear();
    this.errors = [];

    // First pass: generate all base schemas
    for (const type of this.typeMap.values()) {
      const schema = this.convertTypeToSchema(type);
      const schemaName = this.getSchemaName(type);
      this.schemas.set(schemaName, schema);
    }

    // Second pass: consolidate variants
    this.consolidateVariants();

    return {
      schemas: Object.fromEntries(this.schemas),
      consolidated: Object.fromEntries(this.consolidatedSchemas),
      errors: this.errors,
    };
  }

  /**
   * Convert a single ParsedType to OpenAPI schema
   */
  private convertTypeToSchema(type: ParsedType): OpenAPISchema {
    const schema: OpenAPISchema = {};

    if (type.name) {
      schema.title = type.name;
    }
    if (type.description) {
      schema.description = type.description;
    }

    // Handle enumerations
    if (type.isEnum && type.enumValues && type.enumValues.length > 0) {
      schema.type = 'string';
      schema.enum = type.enumValues.map(e => e.value);
      const firstValue = type.enumValues[0];
      if (firstValue) {
        schema.examples = [firstValue.value];
      }
      return schema;
    }

    // Handle regular objects
    schema.type = 'object';
    schema.properties = {};
    const required: string[] = [];

    for (const prop of type.properties) {
      const propSchema = this.convertPropertyToSchema(prop, type);
      schema.properties[prop.name] = propSchema;

      if (prop.required) {
        required.push(prop.name);
      }
    }

    // Set required array if not empty
    if (required.length > 0) {
      schema.required = required;
    }

    // Add base type reference if applicable
    if (type.baseType) {
      const baseTypeName = this.getSchemaNameFromFullName(type.baseType);
      schema.allOf = [
        { $ref: `#/components/schemas/${baseTypeName}` },
        {
          type: 'object',
          properties: schema.properties,
          ...(schema.required && { required: schema.required }),
        },
      ];
      delete schema.properties;
      delete schema.required;
    }

    return schema;
  }

  /**
   * Convert a ParsedTypeProperty to OpenAPI schema
   */
  private convertPropertyToSchema(prop: ParsedTypeProperty, _parentType: ParsedType): OpenAPISchema {
    const schema: OpenAPISchema = {};

    if (prop.description) {
      schema.description = prop.description;
    }

    // Handle enumeration properties
    if (prop.enum && prop.enum.length > 0) {
      schema.enum = prop.enum;
      schema.type = typeof prop.enum[0] === 'number' ? 'integer' : 'string';
      return schema;
    }

    // Convert .NET types to OpenAPI types
    const typeMapping = this.mapDotNetType(prop.type);
    Object.assign(schema, typeMapping);

    // Handle read-only and write-only
    if (prop.readOnly) {
      schema.readOnly = true;
    }
    if (prop.editable === false) {
      schema.readOnly = true;
    }

    // Set format if available
    if (prop.format) {
      schema.format = prop.format;
    }

    // Set default if available
    if (prop.default !== undefined) {
      schema.default = prop.default;
    }

    return schema;
  }

  /**
   * Map .NET type names to OpenAPI types
   */
  private mapDotNetType(dotNetType: string): OpenAPISchema {
    // Handle array types
    if (dotNetType.endsWith('[]')) {
      const elementType = dotNetType.slice(0, -2);
      return {
        type: 'array',
        items: this.mapDotNetType(elementType),
      };
    }

    // Handle generic types like List<T>, Nullable<T>, etc.
    const genericMatch = dotNetType.match(/^(\w+)<(.+)>$/);
    if (genericMatch && genericMatch[1] && genericMatch[2]) {
      const genericType = genericMatch[1];
      const innerType = genericMatch[2];

      if (genericType === 'List' || genericType === 'IEnumerable') {
        return {
          type: 'array',
          items: this.mapDotNetType(innerType),
        };
      }

      if (genericType === 'Nullable') {
        return this.mapDotNetType(innerType);
      }

      // Generic dictionary or similar
      return {
        type: 'object',
        additionalProperties: true,
      };
    }

    // Map primitive .NET types to OpenAPI types
    const primitiveMap: Record<string, OpenAPISchema> = {
      String: { type: 'string' },
      Int32: { type: 'integer', format: 'int32' },
      Int64: { type: 'integer', format: 'int64' },
      Double: { type: 'number', format: 'double' },
      Float: { type: 'number', format: 'float' },
      Decimal: { type: 'number', format: 'decimal' },
      Boolean: { type: 'boolean' },
      Guid: { type: 'string', format: 'uuid' },
      DateTime: { type: 'string', format: 'date-time' },
      DateTimeOffset: { type: 'string', format: 'date-time' },
      Date: { type: 'string', format: 'date' },
      TimeSpan: { type: 'string', format: 'duration' },
      Byte: { type: 'integer', format: 'int32' },
      Object: { type: 'object' },
    };

    if (primitiveMap[dotNetType]) {
      return primitiveMap[dotNetType];
    }

    // If it's a custom type, create a reference
    if (this.typeMap.has(dotNetType)) {
      const refName = this.getSchemaNameFromFullName(dotNetType);
      return {
        $ref: `#/components/schemas/${refName}`,
      };
    }

    // Unknown type - default to object
    this.errors.push({
      type: 'UnknownType',
      message: `Unknown .NET type: ${dotNetType}`,
    });

    return { type: 'object' };
  }

  /**
   * Consolidate type variants (Search, Create, Update) into one schema group
   */
  private consolidateVariants(): void {
    const baseTypes = new Map<string, ParsedType[]>();

    // Group types by base name (without variant suffix)
    for (const type of this.typeMap.values()) {
      const baseName = this.getBaseTypeName(type.name);

      if (!baseTypes.has(baseName)) {
        baseTypes.set(baseName, []);
      }
      const typeList = baseTypes.get(baseName);
      if (typeList) {
        typeList.push(type);
      }
    }

    // Process each base type group
    for (const [baseName, types] of baseTypes) {
      if (types.length === 1) {
        // Single type, no consolidation needed
        continue;
      }

      // Sort types: base first, then Search, Create, Update
      const sorted = this.sortTypeVariants(types);
      const baseType = sorted[0];
      if (!baseType) {
        continue;
      }

      const baseSchemaName = this.getSchemaName(baseType);
      const baseSchema = this.schemas.get(baseSchemaName);

      if (!baseSchema) {
        continue;
      }

      const consolidated: ConsolidatedSchema = {
        baseSchema,
        variants: {},
        allVersions: [baseSchema],
      };

      // Process variants
      for (let i = 1; i < sorted.length; i++) {
        const variantType = sorted[i];
        if (!variantType) {
          continue;
        }

        const variantSchemaName = this.getSchemaName(variantType);
        const variantSchema = this.schemas.get(variantSchemaName);

        if (!variantSchema) {
          continue;
        }

        consolidated.allVersions.push(variantSchema);

        if (variantType.isSearch) {
          consolidated.variants.search = variantSchema;
        } else if (variantType.isCreate) {
          consolidated.variants.create = variantSchema;
        } else if (variantType.isUpdate) {
          consolidated.variants.update = variantSchema;
        }
      }

      this.consolidatedSchemas.set(baseName, consolidated);
    }
  }

  /**
   * Extract base name from type name (e.g., "Account" from "Account-2" or "AccountSearch")
   */
  private getBaseTypeName(typeName: string): string {
    // Remove numeric suffixes like "-2", "-3"
    const withoutNumbers = typeName.replace(/-\d+$/, '');

    // Remove variant suffixes
    const withoutVariants = withoutNumbers
      .replace(/Search$/, '')
      .replace(/Create$/, '')
      .replace(/Update$/, '');

    return withoutVariants || withoutNumbers;
  }

  /**
   * Sort type variants with base type first
   */
  private sortTypeVariants(types: ParsedType[]): ParsedType[] {
    const sorted: ParsedType[] = [];

    // Add base type first (one without variant flags)
    const base = types.find(t => !t.isSearch && !t.isCreate && !t.isUpdate);
    if (base) sorted.push(base);

    // Add search variant
    const search = types.find(t => t.isSearch);
    if (search) sorted.push(search);

    // Add create variant
    const create = types.find(t => t.isCreate);
    if (create) sorted.push(create);

    // Add update variant
    const update = types.find(t => t.isUpdate);
    if (update) sorted.push(update);

    // Add remaining types
    for (const type of types) {
      if (!sorted.includes(type)) {
        sorted.push(type);
      }
    }

    return sorted;
  }

  /**
   * Generate schema name from parsed type
   */
  private getSchemaName(type: ParsedType): string {
    return this.sanitizeSchemaName(type.fullName);
  }

  /**
   * Generate schema name from full type name string
   */
  private getSchemaNameFromFullName(fullName: string): string {
    return this.sanitizeSchemaName(fullName);
  }

  /**
   * Sanitize type name for use as OpenAPI schema name
   * Removes special characters and dots
   */
  private sanitizeSchemaName(name: string): string {
    return name
      .replace(/^TeamDynamix\.Api\./, '') // Remove API prefix
      .replace(/\./g, '_') // Replace dots with underscores
      .replace(/[^a-zA-Z0-9_]/g, '') // Remove other special chars
      .replace(/^(\d)/, '_$1'); // Prefix numeric names
  }
}
