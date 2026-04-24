import { MarkdownParser } from './markdown-parser.js';
import type { ParsedType, ParsedTypeProperty } from './types.js';

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
   * Properties are defined in markdown tables with columns:
   * | Name | Editable? | Required? | Type | Nullable? | Summary |
   */
  private static extractProperties(content: string): ParsedTypeProperty[] {
    const properties: ParsedTypeProperty[] = [];
    const lines = content.split('\n');

    // Find the Properties section
    let inPropertiesSection = false;
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const trimmed = line.trim();

      // Detect start of Properties section
      if (trimmed.toLowerCase().includes('## properties') || trimmed.toLowerCase().includes('### properties')) {
        inPropertiesSection = true;
        inTable = false;
        continue;
      }

      // Exit Properties section when reaching another section
      if (inPropertiesSection && trimmed.match(/^#+\s+/)) {
        if (!trimmed.toLowerCase().includes('properties')) {
          break;
        }
      }

      // Skip header and separator lines
      if (trimmed.startsWith('|')) {
        if (trimmed.match(/\|\s*-+\s*\|/)) {
          // Separator line - start of actual table data
          inTable = true;
          continue;
        }

        if (inTable && inPropertiesSection) {
          // Parse table row
          const prop = this.parsePropertyTableRow(trimmed);
          if (prop) {
            properties.push(prop);
          }
        }
      }
    }

    return properties;
  }

  /**
   * Parse a single property table row
   * Format: | [PropertyName](link) | Editable? | Required? | Type | Nullable? | Summary |
   */
  private static parsePropertyTableRow(rowLine: string): ParsedTypeProperty | null {
    // Split by pipe and filter empty cells
    const cells = rowLine
      .split('|')
      .map(cell => cell.trim())
      .filter(cell => cell.length > 0);

    if (cells.length < 3) {
      return null;
    }

    // Extract property name (remove markdown link syntax)
    const cellZero = cells[0];
    if (!cellZero) {
      return null;
    }

    let name = cellZero;
    const linkMatch = name.match(/\[(.+?)\]/);
    if (linkMatch && linkMatch[1]) {
      name = linkMatch[1];
    }

    // Determine which columns we have based on count
    let type: string = 'string';
    let required = false;
    let editable = true;
    let readOnly = false;
    let description: string = '';
    let _isNullable = false;

    if (cells.length === 4) {
      // Format: Name | Type | Nullable? | Summary
      type = cells[1] || 'string';
      const cell2 = cells[2];
      if (cell2) {
        _isNullable = cell2.toLowerCase().includes('nullable');
      }
      description = cells[3] || '';
    } else if (cells.length === 5) {
      // Format: Name | Editable?/Required? | Type | Nullable? | Summary
      // or: Name | Type | Nullable? | Something | Summary
      const col2 = cells[1];
      if (col2) {
        const col2Lower = col2.toLowerCase();
        if (col2Lower.includes('editable') || col2Lower.includes('required')) {
          // Likely: Name | Editable? | Type | Nullable? | Summary
          editable = col2Lower.includes('editable');
          required = col2Lower.includes('required');
          type = cells[2] || 'string';
          const cell3 = cells[3];
          if (cell3) {
            _isNullable = cell3.toLowerCase().includes('nullable');
          }
          description = cells[4] || '';
        } else {
          // Likely: Name | Type | Nullable? | ??? | Summary
          type = col2 || 'string';
          const cell2b = cells[2];
          if (cell2b) {
            _isNullable = cell2b.toLowerCase().includes('nullable');
          }
          description = cells[4] || '';
        }
      }
    } else if (cells.length >= 6) {
      // Format: Name | Editable? | Required? | Type | Nullable? | Summary
      const col2 = cells[1];
      if (col2) {
        editable = col2.toLowerCase().includes('editable');
      }
      const col3 = cells[2];
      if (col3) {
        required = col3.toLowerCase().includes('required');
      }
      type = cells[3] || 'string';
      const cell4 = cells[4];
      if (cell4) {
        _isNullable = cell4.toLowerCase().includes('nullable');
      }
      description = cells[5] || '';
    }

    readOnly = !editable;

    const format = this.getTypeFormat(type);
    const prop: ParsedTypeProperty = {
      name,
      type: this.normalizeTypeName(type),
      required,
      editable,
      readOnly,
    };

    const trimmedDesc = description.trim();
    if (trimmedDesc) {
      prop.description = trimmedDesc;
    }

    if (format !== undefined) {
      prop.format = format;
    }

    return prop;
  }

  /**
   * Normalize type names by removing markdown links
   */
  private static normalizeTypeName(typeStr: string): string {
    // Remove markdown links: [Type](link)
    let normalized = typeStr.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    // Remove brackets and extra whitespace
    normalized = normalized.trim();
    return normalized || 'string';
  }

  /**
   * Get OpenAPI format for a .NET type
   */
  private static getTypeFormat(typeStr: string): string | undefined {
    const lowerType = typeStr.toLowerCase();
    if (lowerType.includes('datetime')) return 'date-time';
    if (lowerType.includes('guid')) return 'uuid';
    if (lowerType.includes('decimal')) return 'decimal';
    if (lowerType.includes('double')) return 'double';
    if (lowerType.includes('float')) return 'float';
    if (lowerType.includes('int32')) return 'int32';
    if (lowerType.includes('int64')) return 'int64';
    return undefined;
  }

  /**
   * Check if the type is an enumeration
   */
  private static isEnumType(content: string): boolean {
    return (
      content.toLowerCase().includes('enumeration') ||
      content.toLowerCase().includes('enum') ||
      content.toLowerCase().includes('bit flag')
    );
  }

  /**
   * Extract enum values from table content
   */
  static extractEnumValues(content: string): Array<{ name: string; value: string | number }> | undefined {
    const lines = content.split('\n');
    const values: Array<{ name: string; value: string | number }> = [];

    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Detect table
      if (trimmed.startsWith('|')) {
        if (trimmed.match(/\|\s*-+\s*\|/)) {
          inTable = true;
          continue;
        }

        if (inTable) {
          const cells = trimmed
            .split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);

          if (cells.length >= 2) {
            const nameCell = cells[0];
            const valueCell = cells[1];

            if (!nameCell || !valueCell) {
              continue;
            }

            // Extract name (remove markdown links)
            let name = nameCell.replace(/\[(.+?)\]\(.+?\)/g, '$1').trim();

            // Parse value (could be number or string)
            let value: string | number = valueCell;
            if (/^\d+$/.test(valueCell)) {
              value = parseInt(valueCell, 10);
            }

            if (name && value !== undefined) {
              values.push({ name, value });
            }
          }
        }
      }
    }

    return values.length > 0 ? values : undefined;
  }
}
