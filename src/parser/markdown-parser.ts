import fs from 'fs';
import path from 'path';

/**
 * Basic markdown parser for TeamDynamix API documentation
 * Handles:
 * - Headings (# ## ### etc)
 * - Code blocks
 * - Lists (unordered and ordered)
 * - Tables
 * - Bold, italic, links
 * - Key-value pairs in specific formats
 */

export interface MarkdownContent {
  title?: string;
  description?: string;
  sections: MarkdownSection[];
  frontmatter?: Record<string, unknown>;
  rawContent: string;
}

export interface MarkdownSection {
  level: number;
  title: string;
  content: string;
  subsections: MarkdownSection[];
}

export class MarkdownParser {
  private content: string;
  private lines: string[];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split('\n');
  }

  /**
   * Parse markdown content and extract structured information
   */
  parse(): MarkdownContent {
    const sections: MarkdownSection[] = [];
    let currentLevel = 0;
    let stack: MarkdownSection[] = [];

    for (const line of this.lines) {
      const headingMatch = line.match(/^(#+)\s+(.+)$/);

      if (headingMatch && headingMatch[1] && headingMatch[2]) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();

        // Pop stack until we're at the right level
        while (stack.length > 0) {
          const lastSection = stack[stack.length - 1];
          if (lastSection !== undefined && lastSection.level >= level) {
            stack.pop();
          } else {
            break;
          }
        }

        const section: MarkdownSection = {
          level,
          title,
          content: '',
          subsections: [],
        };

        if (stack.length === 0) {
          sections.push(section);
        } else {
          const parent = stack[stack.length - 1];
          if (parent !== undefined) {
            parent.subsections.push(section);
          }
        }

        stack.push(section);
      } else if (stack.length > 0) {
        // Append to current section
        const currentSection = stack[stack.length - 1];
        if (currentSection !== undefined) {
          currentSection.content += line + '\n';
        }
      }
    }

    const firstSection = sections[0];

    return {
      title: firstSection?.title || '',
      description: firstSection?.content.trim() || '',
      sections,
      rawContent: this.content,
    };
  }

  /**
   * Extract all lines matching a pattern
   */
  extractLines(pattern: RegExp): string[] {
    return this.lines.filter(line => pattern.test(line));
  }

  /**
   * Extract key-value pairs (e.g., "- Key: Value")
   */
  extractKeyValuePairs(): Record<string, string> {
    const pairs: Record<string, string> = {};

    for (const line of this.lines) {
      // Match patterns like "- Key: Value" or "* Key: Value"
      const match = line.match(/^[-*]\s*([^:]+):\s*(.+)$/);
      if (match && match[1] && match[2]) {
        const key = match[1].trim();
        const value = match[2].trim();
        pairs[key] = value;
      }
    }

    return pairs;
  }

  /**
   * Extract table content
   */
  extractTable(): string[][] | null {
    const tableLines = this.lines.filter(line => line.trim().startsWith('|') && line.trim().endsWith('|'));

    if (tableLines.length < 2) return null;

    return tableLines.map(line =>
      line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0),
    );
  }

  /**
   * Extract code blocks
   */
  extractCodeBlocks(language?: string): string[] {
    const blocks: string[] = [];
    let inBlock = false;
    let currentBlock = '';
    let blockLang = '';

    for (const line of this.lines) {
      if (line.startsWith('```')) {
        if (!inBlock) {
          inBlock = true;
          blockLang = line.replace(/^```/, '').trim();
        } else {
          inBlock = false;
          if (!language || blockLang === language) {
            blocks.push(currentBlock.trim());
          }
          currentBlock = '';
          blockLang = '';
        }
      } else if (inBlock) {
        currentBlock += line + '\n';
      }
    }

    return blocks;
  }

  /**
   * Extract list items
   */
  extractListItems(): string[] {
    return this.lines.filter(line => /^\s*[-*]\s+/.test(line)).map(line => line.replace(/^\s*[-*]\s+/, '').trim());
  }
  /**
   * Get a specific section by title (case-insensitive)
   */
  getSection(title: string): MarkdownSection | undefined {
    const titleLower = title.toLowerCase();

    const search = (sections: MarkdownSection[]): MarkdownSection | undefined => {
      for (const section of sections) {
        if (section.title.toLowerCase() === titleLower) {
          return section;
        }

        const found = search(section.subsections);
        if (found) return found;
      }

      return undefined;
    };

    return search(this.parse().sections);
  }

  /**
   * Get line number for a pattern
   */
  getLineNumber(pattern: RegExp): number {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      if (line && pattern.test(line)) {
        return i + 1;
      }
    }

    return -1;
  }
}

/**
 * Load and parse a markdown file
 */
export async function parseMarkdownFile(filePath: string): Promise<MarkdownContent> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const parser = new MarkdownParser(content);
  return parser.parse();
}

/**
 * Batch load multiple markdown files
 */
export async function parseMarkdownFiles(directory: string, pattern = /\.md$/): Promise<Map<string, MarkdownContent>> {
  const results = new Map<string, MarkdownContent>();
  const files = await fs.promises.readdir(directory, { recursive: true });

  for (const file of files) {
    if (pattern.test(file as string)) {
      const filePath = path.join(directory, file as string);
      try {
        const content = await parseMarkdownFile(filePath);
        results.set(file as string, content);
      } catch (error) {
        console.error(`Failed to parse ${filePath}:`, error);
      }
    }
  }

  return results;
}
