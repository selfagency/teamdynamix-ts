import path from 'path';
import type { CrossReferenceMap, ParsedEndpoint, ParsedType } from './types.js';

/**
 * Builds and maintains cross-references between types and endpoints
 * Allows quick lookup of type definitions and relationship tracking
 */

export class CrossReferenceResolver {
  private types: Map<string, ParsedType> = new Map();
  private typeFiles: Map<string, string> = new Map();
  private endpoints: ParsedEndpoint[] = [];
  private sections: Map<string, string[]> = new Map();

  /**
   * Register a type definition
   */
  addType(type: ParsedType, filePath: string): void {
    this.types.set(type.fullName, type);
    this.typeFiles.set(type.fullName, filePath);
  }

  /**
   * Register multiple types
   */
  addTypes(types: ParsedType[], basePath: string): void {
    for (const type of types) {
      const filePath = this.generateTypePath(type, basePath);
      this.addType(type, filePath);
    }
  }

  /**
   * Register an endpoint
   */
  addEndpoint(endpoint: ParsedEndpoint): void {
    this.endpoints.push(endpoint);

    // Track endpoints by section/tag
    if (endpoint.tags && endpoint.tags.length > 0) {
      for (const tag of endpoint.tags) {
        if (!this.sections.has(tag)) {
          this.sections.set(tag, []);
        }

        const descriptions = this.sections.get(tag)!;
        descriptions.push(`${endpoint.method} ${endpoint.path}`);
      }
    }
  }

  /**
   * Register multiple endpoints
   */
  addEndpoints(endpoints: ParsedEndpoint[]): void {
    for (const endpoint of endpoints) {
      this.addEndpoint(endpoint);
    }
  }

  /**
   * Resolve a type reference by full name
   */
  resolveType(fullName: string): ParsedType | undefined {
    return this.types.get(fullName);
  }

  /**
   * Resolve a type reference by namespace and name
   */
  resolveTypeByName(namespace: string, name: string): ParsedType | undefined {
    const fullName = `${namespace}.${name}`;
    return this.types.get(fullName);
  }

  /**
   * Find all types in a namespace
   */
  findTypesByNamespace(namespace: string): ParsedType[] {
    const results: ParsedType[] = [];

    for (const type of this.types.values()) {
      if (type.namespace === namespace || type.namespace.startsWith(`${namespace}.`)) {
        results.push(type);
      }
    }

    return results;
  }

  /**
   * Find all Search types for a given base type
   */
  findSearchTypes(baseTypeName: string): ParsedType[] {
    const results: ParsedType[] = [];

    for (const type of this.types.values()) {
      if (type.name.includes(baseTypeName) && type.isSearch) {
        results.push(type);
      }
    }

    return results;
  }

  /**
   * Find all Create types for a given base type
   */
  findCreateTypes(baseTypeName: string): ParsedType[] {
    const results: ParsedType[] = [];

    for (const type of this.types.values()) {
      if (type.name.includes(baseTypeName) && type.isCreate) {
        results.push(type);
      }
    }

    return results;
  }

  /**
   * Find all Update types for a given base type
   */
  findUpdateTypes(baseTypeName: string): ParsedType[] {
    const results: ParsedType[] = [];

    for (const type of this.types.values()) {
      if (type.name.includes(baseTypeName) && type.isUpdate) {
        results.push(type);
      }
    }

    return results;
  }

  /**
   * Find endpoints by section/tag
   */
  findEndpointsByTag(tag: string): ParsedEndpoint[] {
    return this.endpoints.filter(endpoint => endpoint.tags?.includes(tag));
  }

  /**
   * Find endpoints by path pattern
   */
  findEndpointsByPath(pathPattern: RegExp | string): ParsedEndpoint[] {
    const pattern = typeof pathPattern === 'string' ? new RegExp(pathPattern) : pathPattern;

    return this.endpoints.filter(endpoint => pattern.test(endpoint.path));
  }

  /**
   * Get all types for which there are endpoints
   */
  getReferencedTypes(): ParsedType[] {
    const referenced = new Set<string>();

    for (const endpoint of this.endpoints) {
      this.collectReferencedTypes(endpoint, referenced);
    }

    return Array.from(referenced)
      .map(name => this.types.get(name))
      .filter(type => type !== undefined) as ParsedType[];
  }

  /**
   * Recursively collect all type references from an endpoint
   */
  private collectReferencedTypes(endpoint: ParsedEndpoint, collected: Set<string>): void {
    // Check response types
    for (const response of Object.values(endpoint.responses)) {
      const resp = response as { content?: { 'application/json'?: { schema?: { $ref?: string } } } };
      if (resp.content?.['application/json']?.schema?.$ref) {
        const refName = this.extractRefName(resp.content['application/json'].schema.$ref);
        if (refName) {
          collected.add(refName);
          const type = this.types.get(refName);
          if (type) {
            this.collectTypeReferences(type, collected);
          }
        }
      }
    }

    // Check request body types
    if (endpoint.requestBody?.content?.['application/json']?.schema?.$ref) {
      const refName = this.extractRefName(endpoint.requestBody.content['application/json'].schema.$ref);
      if (refName) {
        collected.add(refName);
        const type = this.types.get(refName);
        if (type) {
          this.collectTypeReferences(type, collected);
        }
      }
    }
  }

  /**
   * Recursively collect referenced types from a type definition
   */
  private collectTypeReferences(type: ParsedType, collected: Set<string>): void {
    for (const prop of type.properties) {
      // Extract type name if it looks like a reference
      if (!['string', 'integer', 'number', 'boolean', 'array'].includes(prop.type)) {
        collected.add(prop.type);
        const refType = this.types.get(prop.type);
        if (refType && !collected.has(prop.type)) {
          this.collectTypeReferences(refType, collected);
        }
      }
    }
  }

  /**
   * Extract type name from a $ref path
   * E.g., "#/components/schemas/User" -> "User"
   */
  private extractRefName(ref: string): string | null {
    const match = ref.match(/#\/components\/schemas\/(.+)$/);
    return match?.[1] ?? null;
  }

  /**
   * Get cross-reference map for export
   */
  getMap(): CrossReferenceMap {
    return {
      types: this.types,
      typeFiles: this.typeFiles,
      endpoints: this.endpoints,
      sections: this.sections,
    };
  }

  /**
   * Generate a file path for a type
   */
  private generateTypePath(type: ParsedType, basePath: string): string {
    const relativePath = type.fullName.replace(/\./g, '/') + '.md';
    return path.join(basePath, 'Home', 'member', relativePath);
  }

  /**
   * Validate cross-references
   * Returns array of missing references
   */
  validate(): Array<{ type: string; missing: string[] }> {
    const errors: Array<{ type: string; missing: string[] }> = [];

    for (const type of this.types.values()) {
      const missing: string[] = [];

      for (const prop of type.properties) {
        // Check if property type is a known reference
        if (!['string', 'integer', 'number', 'boolean', 'array'].includes(prop.type)) {
          if (!this.types.has(prop.type) && !prop.type.includes('[]')) {
            missing.push(prop.type);
          }
        }
      }

      if (missing.length > 0) {
        errors.push({
          type: type.fullName,
          missing,
        });
      }
    }

    return errors;
  }

  /**
   * Get statistics about the cross-reference graph
   */
  getStats(): {
    typeCount: number;
    endpointCount: number;
    sectionCount: number;
    unreferencedTypes: string[];
  } {
    const referencedTypes = new Set<string>();

    for (const type of this.getReferencedTypes()) {
      referencedTypes.add(type.fullName);
    }

    const unreferenced = Array.from(this.types.keys()).filter(name => !referencedTypes.has(name));

    return {
      typeCount: this.types.size,
      endpointCount: this.endpoints.length,
      sectionCount: this.sections.size,
      unreferencedTypes: unreferenced,
    };
  }
}
