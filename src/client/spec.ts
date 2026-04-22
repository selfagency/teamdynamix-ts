import SwaggerParser from '@apidevtools/swagger-parser';
import fs from 'node:fs/promises';
import path from 'node:path';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options' | 'trace';

export interface OpenApiOperation {
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: unknown }>;
  };
  responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
}

export interface DereferencedOpenApiSpec {
  paths?: Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;
}

const cache = new Map<string, DereferencedOpenApiSpec>();

export const defaultSpecPath = (): string => path.resolve(process.cwd(), 'src/generated/openapi.json');

export const loadDereferencedSpec = async (specPath: string): Promise<DereferencedOpenApiSpec> => {
  const resolved = path.resolve(specPath);
  const cached = cache.get(resolved);
  if (cached) {
    return cached;
  }

  await fs.access(resolved);
  const parsed = await SwaggerParser.dereference(resolved);
  const spec = parsed as DereferencedOpenApiSpec;
  cache.set(resolved, spec);
  return spec;
};
