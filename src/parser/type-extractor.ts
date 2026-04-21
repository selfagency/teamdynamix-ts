import type { ParsedType, ParsedTypeProperty } from './types.js';
import { MarkdownParser } from './markdown-parser.js';

/**
 * Extracts type definitions from member markdown files
 * Member files contain property definitions and type information
 */

export class TypeExtractor {
  /**
   * Extract type definition from a markdown file content
   * File path format: TeamDynamix.Api.Domain.Type.Property or TeamDynamix.Api.Domain.Type
   */
  static extractType(content: string, filePath: string): ParsedType | null {
    const parser = new MarkdownParser(content);
    const parsed = parser.parse();

    // Extract namespace and type name from file path
    // E.g., member/TeamDynamix.Api.Tickets.Ticket-2.md -> TeamDynamix.Api.Tickets, Ticket
    const nameArray = filePath.replace(/\.md$/, '').split('/').pop();

    if (!nameArray) return null;

    const nameParts = nameArray.split('.').filter(p => p);

    if (nameParts.length < 2) {
      return null;
    }

    // Remove numeric suffix if present (e.g., Ticket-2 -> Ticket)
    const lastPart = nameParts[nameParts.length - 1];
    if (!lastPart) return null;

    const match = lastPart.match(/^(.+?)-\d+$/);
    const cleanLastPart = match ? match[1] : lastPart;

    const fullName = [...nameParts.slice(0, -1), cleanLastPart].join('.');
    const namespace = nameParts.slice(0, -1).join('.');
    const name = cleanLastPart || 'Unknown';

    // Extract description and properties
    const description = parsed.description || '';
    const properties = this.extractProperties(content);

    return {
      namespace,
      name,
      fullName,
      description: description.trim(),
      properties,
      isEnum: this.isEnumType(content),
      isSearch: name.includes('Search'),
      isCreate: name.includes('Create'),
      isUpdate: name.includes('Edit') || name.includes('Update'),
    };
  }

  /**
   * Extract property definitions from type markdown content
   */
  private static extractProperties(content: string): ParsedTypeProperty[] {
    const properties: ParsedTypeProperty[] = [];
    const parser = new MarkdownParser(content);
    const keyValuePairs = parser.extractKeyValuePairs();

    // Property names are typically listed as section headings
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Look for property definition pattern
      if (line.match(/^#{1,4}\s+\w+/)) {
        const property = this.extractProperty(lines, i);
        if (property) {
          properties.push(property);
        }
      }

      i++;
    }

    return properties;
  }

  /**
   * Extract a single property definition
   */
  private static extractProperty(lines: string[], startLine: number): ParsedTypeProperty | null {
    const headerLine = lines[startLine];
    if (!headerLine) return null;
    const headerTrimmed = headerLine.trim();
    const propertyName = headerTrimmed.replace(/^#+\s+/, '').trim();

    if (!propertyName) {
      return null;
    }

    // Extract property metadata from following lines
    let type = 'string'; // default
    let description = '';
    let editable = false;
    let readOnly = false;
    let required = false;

    let i = startLine + 1;

    while (i < lines.length && i < startLine + 20) {
      const lineContent = lines[i];
      if (!lineContent) {
        i++;
        continue;
      }
      const line = lineContent.trim();

      // Stop at next header
      if (line.match(/^#+\s+\w+/)) {
        break;
      }

      if (line.includes('Data Type')) {
        const typeMatch = line.match(/:\s*\*?\*?([^*\n]+)\*?\*?/);
        if (typeMatch && typeMatch[1]) {
          type = typeMatch[1].trim();
        }
      }

      if (line === 'Editable') {
        editable = true;
      }

      if (line === 'Not Editable' || line === 'Read-Only') {
        readOnly = true;
      }

      if (line === 'Required') {
        required = true;
      }

      if (line && !line.includes(':')) {
        description += line + ' ';
      }

      i++;
    }

    return {
      name: propertyName,
      description: description.trim(),
      type,
      required,
      editable,
      readOnly: readOnly || !editable,
    };
  }

  /**
   * Check if the type is an enumeration
   */
  private static isEnumType(content: string): boolean {
    return content.includes('Enum') || content.includes('enumeration') || content.includes('enum values:');
  }

  /**
   * Extract enum values from content
   */
  static extractEnumValues(content: string): Array<{ name: string; value: string | number }> | undefined {
    const parser = new MarkdownParser(content);
    const table = parser.extractTable();

    if (!table || table.length < 2) {
      return undefined;
    }

    const values: Array<{ name: string; value: string | number }> = [];

    // Assume first column is name, second is value
    for (let i = 1; i < table.length; i++) {
      const row = table[i];
      if (row && row.length >= 2) {
        const name = row[0] || '';
        const valueStr = row[1] || '';
        if (name) {
          values.push({
            name,
            value: isNaN(Number(valueStr)) ? valueStr : Number(valueStr),
          });
        }
      }
    }

    return values.length > 0 ? values : undefined;
  }

  /**
   * Consolidate type variants (e.g., Type-1, Type-2, Type-3)
   * Returns a single consolidated type with all unique properties
   */
  static consolidateTypeVariants(types: ParsedType[]): ParsedType[] {
    const consolidated = new Map<string, ParsedType>();

    for (const type of types) {
      const key = type.fullName;

      if (!consolidated.has(key)) {
        consolidated.set(key, { ...type });
      } else {
        const existing = consolidated.get(key)!;

        // Merge properties, preferring more descriptive ones
        for (const prop of type.properties) {
          const existingProp = existing.properties.find(p => p.name === prop.name);

          if (!existingProp) {
            existing.properties.push(prop);
          } else if (prop.description && !existingProp.description) {
            existingProp.description = prop.description;
          }
        }

        // Merge descriptions
        if (type.description && !existing.description) {
          existing.description = type.description;
        }

        // Merge variants
        if (type.variants) {
          existing.variants = [...new Set([...(existing.variants || []), ...type.variants])];
        }
      }
    }

    return Array.from(consolidated.values());
  }
}
