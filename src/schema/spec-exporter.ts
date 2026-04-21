import fs from 'fs';
import path from 'path';

/**
 * Exports OpenAPI specification in various formats
 */
export class SpecExporter {
  /**
   * Export spec as JSON (pretty-printed)
   */
  static exportJSON(spec: any, outputPath: string, pretty = true): void {
    const content = pretty ? JSON.stringify(spec, null, 2) : JSON.stringify(spec);
    fs.writeFileSync(outputPath, content, 'utf-8');
  }

  /**
   * Export spec as YAML
   */
  static exportYAML(spec: any, outputPath: string): void {
    // Simple YAML serialization (more complete than basic JSON replacement)
    const yaml = this.toYAML(spec, 0);
    fs.writeFileSync(outputPath, yaml, 'utf-8');
  }

  /**
   * Export spec as HTML documentation
   */
  static exportHTML(spec: any, outputPath: string): void {
    const html = this.generateHTMLDocs(spec);
    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  /**
   * Export spec as Markdown documentation
   */
  static exportMarkdown(spec: any, outputPath: string): void {
    const markdown = this.generateMarkdownDocs(spec);
    fs.writeFileSync(outputPath, markdown, 'utf-8');
  }

  /**
   * Simple YAML serializer
   */
  private static toYAML(obj: any, indent = 0): string {
    const indentStr = ' '.repeat(indent);
    const lines: string[] = [];

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj !== 'object') {
      if (typeof obj === 'string' && (obj.includes(':') || obj.includes('\n'))) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      obj.forEach(item => {
        const serialized = this.toYAML(item, indent + 2);
        if (typeof item === 'object' && item !== null) {
          lines.push(`- ${serialized.split('\n')[0]}`);
          if (serialized.includes('\n')) {
            serialized
              .split('\n')
              .slice(1)
              .forEach(line => {
                lines.push(`  ${line}`);
              });
          }
        } else {
          lines.push(`- ${serialized}`);
        }
      });
      return lines.join('\n');
    }

    // Object
    Object.entries(obj).forEach(([key, value]) => {
      const serialized = this.toYAML(value, indent + 2);
      if (serialized.includes('\n')) {
        lines.push(`${indentStr}${key}:`);
        serialized.split('\n').forEach(line => {
          lines.push(`${indentStr}  ${line}`);
        });
      } else {
        lines.push(`${indentStr}${key}: ${serialized}`);
      }
    });

    return lines.join('\n');
  }

  /**
   * Generate HTML documentation
   */
  private static generateHTMLDocs(spec: any): string {
    const title = spec.info?.title || 'API Documentation';
    const version = spec.info?.version || '1.0.0';
    const description = spec.info?.description || '';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${version}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    header h1 {
      font-size: 2.5em;
      margin-bottom: 10px;
    }
    header .version {
      font-size: 0.9em;
      opacity: 0.9;
    }
    header p {
      margin-top: 10px;
      opacity: 0.95;
    }
    .section {
      background: white;
      padding: 30px;
      margin-bottom: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h2 {
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
      color: #667eea;
    }
    h3 {
      color: #764ba2;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .endpoint {
      background: #f9f9f9;
      padding: 15px;
      margin: 15px 0;
      border-left: 4px solid #667eea;
      border-radius: 4px;
    }
    .method {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      font-size: 0.85em;
      margin-right: 10px;
    }
    .method.get { background: #61affe; }
    .method.post { background: #49cc90; }
    .method.put { background: #fca130; }
    .method.patch { background: #50e3c2; }
    .method.delete { background: #f93e3e; }
    .path {
      font-family: monospace;
      background: white;
      padding: 5px 10px;
      border-radius: 4px;
      margin-left: 10px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-card .number {
      font-size: 2.5em;
      font-weight: bold;
    }
    .stat-card .label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
      margin: 10px 0;
    }
    footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <div class="version">Version ${version}</div>
      ${description ? `<p>${description}</p>` : ''}
    </header>

    <div class="section">
      <h2>📊 Statistics</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="number">${Object.keys(spec.paths || {}).length}</div>
          <div class="label">API Endpoints</div>
        </div>
        <div class="stat-card">
          <div class="number">${Object.keys(spec.components?.schemas || {}).length}</div>
          <div class="label">Data Models</div>
        </div>
        <div class="stat-card">
          <div class="number">${Object.values(spec.paths || {}).reduce((count: number, path: any) => {
            return count + ['get', 'post', 'put', 'patch', 'delete'].filter(m => path[m]).length;
          }, 0)}</div>
          <div class="label">Operations</div>
        </div>
      </div>
    </div>

    ${
      spec.paths
        ? `<div class="section">
      <h2>🔌 Endpoints</h2>
      ${Object.entries(spec.paths)
        .slice(0, 20)
        .map(([path, methods]: [string, any]) => {
          return Object.entries(methods)
            .filter(([key]) => ['get', 'post', 'put', 'patch', 'delete'].includes(key))
            .map(([method, op]: [string, any]) => {
              return `<div class="endpoint">
                <span class="method ${method}">${method.toUpperCase()}</span>
                <span class="path">${path}</span>
                <p>${op.summary || 'No summary'}</p>
              </div>`;
            })
            .join('');
        })
        .join('')}
      ${Object.keys(spec.paths).length > 20 ? '<p>... and more</p>' : ''}
    </div>`
        : ''
    }

    <footer>
      <p>Generated on ${new Date().toISOString()}</p>
      <p>Powered by OpenAPI 3.1.0</p>
    </footer>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate Markdown documentation
   */
  private static generateMarkdownDocs(spec: any): string {
    const lines: string[] = [];

    lines.push(`# ${spec.info?.title || 'API Documentation'}\n`);

    if (spec.info?.version) {
      lines.push(`**Version:** ${spec.info.version}\n`);
    }

    if (spec.info?.description) {
      lines.push(`${spec.info.description}\n`);
    }

    if (spec.info?.contact) {
      lines.push('## Contact\n');
      if (spec.info.contact.name) {
        lines.push(`- **Name:** ${spec.info.contact.name}`);
      }
      if (spec.info.contact.url) {
        lines.push(`- **URL:** [${spec.info.contact.url}](${spec.info.contact.url})`);
      }
      if (spec.info.contact.email) {
        lines.push(`- **Email:** ${spec.info.contact.email}`);
      }
      lines.push('');
    }

    // Servers
    if (spec.servers && spec.servers.length > 0) {
      lines.push('## Servers\n');
      spec.servers.forEach((server: any) => {
        lines.push(`- **${server.url}**`);
        if (server.description) {
          lines.push(`  ${server.description}`);
        }
      });
      lines.push('');
    }

    // Authentication
    if (spec.components?.securitySchemes) {
      lines.push('## Authentication\n');
      Object.entries(spec.components.securitySchemes).forEach(([name, scheme]: [string, any]) => {
        lines.push(`### ${name}`);
        lines.push(`- **Type:** ${scheme.type}`);
        if (scheme.description) {
          lines.push(`- **Description:** ${scheme.description}`);
        }
        if (scheme.scheme) {
          lines.push(`- **Scheme:** ${scheme.scheme}`);
        }
        lines.push('');
      });
    }

    // Endpoints
    if (spec.paths) {
      lines.push('## Endpoints\n');

      Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
        Object.entries(methods)
          .filter(([key]) => ['get', 'post', 'put', 'patch', 'delete'].includes(key))
          .forEach(([method, op]: [string, any]) => {
            lines.push(`### ${method.toUpperCase()} ${path}\n`);
            if (op.summary) {
              lines.push(`${op.summary}\n`);
            }
            if (op.description) {
              lines.push(`${op.description}\n`);
            }
            if (op.parameters && op.parameters.length > 0) {
              lines.push('**Parameters:**\n');
              op.parameters.forEach((param: any) => {
                lines.push(`- \`${param.name}\` (${param.in}) ${param.required ? '*required*' : '*optional*'}`);
                if (param.description) {
                  lines.push(`  - ${param.description}`);
                }
              });
              lines.push('');
            }
            lines.push('');
          });
      });
    }

    // Models
    if (spec.components?.schemas) {
      lines.push('## Data Models\n');

      Object.entries(spec.components.schemas).forEach(([name, schema]: [string, any]) => {
        lines.push(`### ${name}\n`);
        if (schema.description) {
          lines.push(`${schema.description}\n`);
        }
        if (schema.properties) {
          lines.push('**Properties:**\n');
          Object.entries(schema.properties).forEach(([propName, prop]: [string, any]) => {
            lines.push(`- \`${propName}\` (${prop.type || 'object'}) ${prop.required ? '*required*' : '*optional*'}`);
            if (prop.description) {
              lines.push(`  - ${prop.description}`);
            }
          });
          lines.push('');
        }
        lines.push('');
      });
    }

    lines.push(`Generated on ${new Date().toISOString()}`);

    return lines.join('\n');
  }
}
