import { describe, expect, it } from 'vitest';
import openapiSpec from '../src/generated/openapi.json' with { type: 'json' };
import routeManifest from '../src/generated/sdk-route-manifest.json' with { type: 'json' };

const DOMAIN_SET = new Set([
  'discovery',
  'tickets',
  'ticketRelationships',
  'people',
  'knowledgeBase',
  'assets',
  'cmdb',
  'services',
  'projects',
  'time',
  'referenceData',
]);

type ManifestRoute = {
  domain: string;
  methodName: string;
  operationId: string;
  path: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
};

describe('SDK route manifest generation', () => {
  it('covers every OpenAPI GET operation exactly once in read manifest subset', () => {
    const manifest = routeManifest as ManifestRoute[];
    const manifestGet = manifest.filter(route => route.httpMethod === 'GET');

    const openApiGetKeys: string[] = [];
    for (const [pathKey, pathItem] of Object.entries(openapiSpec.paths ?? {})) {
      if (pathItem && typeof pathItem === 'object' && 'get' in pathItem) {
        openApiGetKeys.push(`GET ${pathKey}`);
      }
    }

    const manifestGetKeys = manifestGet.map(route => `GET ${route.path}`);
    expect(new Set(manifestGetKeys).size).toBe(manifestGetKeys.length);
    expect(manifestGetKeys.length).toBe(openApiGetKeys.length);
    expect(new Set(manifestGetKeys)).toEqual(new Set(openApiGetKeys));
  });

  it('uses only allowed SDK domain names and unique method names per domain', () => {
    const manifest = routeManifest as ManifestRoute[];
    const perDomain = new Map<string, Set<string>>();

    for (const route of manifest) {
      expect(DOMAIN_SET.has(route.domain)).toBe(true);
      const methods = perDomain.get(route.domain) ?? new Set<string>();
      expect(methods.has(route.methodName)).toBe(false);
      methods.add(route.methodName);
      perDomain.set(route.domain, methods);
    }
  });
});
