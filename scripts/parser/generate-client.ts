import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '../..');
const outputSpecPath = path.join(projectRoot, 'output', 'openapi-types.json');
const generatedDir = path.join(projectRoot, 'src', 'generated');
const generatedSpecPath = path.join(generatedDir, 'openapi.json');
const metadataPath = path.join(generatedDir, 'client-metadata.json');
const sdkRouteManifestPath = path.join(generatedDir, 'sdk-route-manifest.json');
const sdkReadManifestTsPath = path.join(generatedDir, 'sdk-read-manifest.ts');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;
const VERB_PREFIX = /^(get|post|put|patch|delete)/;
const DOMAIN_ORDER = [
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
] as const;

type SdkDomainName = (typeof DOMAIN_ORDER)[number];

interface OpenApiOperation {
  operationId?: string;
  tags?: string[];
}

interface SdkRouteManifestEntry {
  domain: SdkDomainName;
  methodName: string;
  operationId: string;
  path: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  tags: string[];
  mutating: boolean;
  destructive: boolean;
}

const normalizeMethodName = (operationId: string, method: string, pathKey: string): string => {
  const candidate = operationId.replace(VERB_PREFIX, '');
  if (candidate.length > 0) {
    return `${candidate.charAt(0).toLowerCase()}${candidate.slice(1)}`;
  }
  const normalizedPath = pathKey
    .replace(/^\//, '')
    .replace(/\{([^}]+)\}/g, 'By$1')
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
  return `${method.toLowerCase()}${normalizedPath}`;
};

const mapDomain = (pathKey: string, tags: string[]): SdkDomainName => {
  const hasTag = (value: string): boolean => tags.includes(value);

  if (pathKey.startsWith('/api/auth') || hasTag('Applications')) return 'discovery';
  if (
    pathKey.includes('/tickets/{id}/assets') ||
    pathKey.includes('/tickets/{id}/contacts') ||
    pathKey.includes('/tickets/{ticketId}/tasks') ||
    hasTag('TicketTasks')
  ) {
    return 'ticketRelationships';
  }
  if (
    hasTag('Tickets') ||
    hasTag('TicketTypes') ||
    hasTag('TicketPriorities') ||
    hasTag('TicketUrgencies') ||
    hasTag('TicketImpacts') ||
    hasTag('TicketSources') ||
    hasTag('TicketReports') ||
    hasTag('BlackoutWindows') ||
    hasTag('MaintenanceActivites')
  ) {
    return 'tickets';
  }
  if (hasTag('People') || hasTag('Group') || hasTag('UserManagement')) return 'people';
  if (hasTag('KnowledgeBase')) return 'knowledgeBase';
  if (
    hasTag('Assets') ||
    hasTag('AssetStatuses') ||
    hasTag('ProductModels') ||
    hasTag('ProductTypes') ||
    hasTag('Contracts')
  ) {
    return 'assets';
  }
  if (
    hasTag('ConfigurationItems') ||
    hasTag('ConfigurationItemTypes') ||
    hasTag('ConfigurationRelationshipTypes') ||
    hasTag('ConfigurationItemReports') ||
    hasTag('MaintenanceSchedules') ||
    hasTag('Vendors') ||
    hasTag('IntuneAssets')
  ) {
    return 'cmdb';
  }
  if (hasTag('ServiceCatalog')) return 'services';
  if (
    hasTag('Projects') ||
    hasTag('Plans') ||
    hasTag('Issues') ||
    hasTag('Risks') ||
    hasTag('Links') ||
    hasTag('Tasks') ||
    hasTag('ProjectTypes') ||
    hasTag('ProjectTemplates') ||
    hasTag('ProjectRequests') ||
    hasTag('Files') ||
    hasTag('Folders')
  ) {
    return 'projects';
  }
  if (hasTag('Time') || hasTag('DaysOff')) return 'time';
  return 'referenceData';
};

const isDestructivePath = (pathKey: string): boolean => {
  const normalized = pathKey.toLowerCase();
  return normalized.includes('/assets/{assetid}') || normalized.includes('/contacts/{contactuid}');
};

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
if (!fs.existsSync(outputSpecPath)) {
  throw new Error(`Expected generated OpenAPI spec at ${outputSpecPath}. Run "pnpm run parse:all" first.`);
}

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
if (!fs.existsSync(generatedDir)) {
  // nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
  fs.mkdirSync(generatedDir, { recursive: true });
}

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
const specRaw = fs.readFileSync(outputSpecPath, 'utf8');
const spec = JSON.parse(specRaw) as {
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, unknown> };
};

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.copyFileSync(outputSpecPath, generatedSpecPath);

const routeManifest: SdkRouteManifestEntry[] = [];
const usedMethodNames = new Map<string, number>();
for (const [pathKey, pathItem] of Object.entries(spec.paths ?? {})) {
  for (const method of HTTP_METHODS) {
    const operation = pathItem?.[method];
    if (!operation) {
      continue;
    }
    const tags = operation.tags ?? [];
    const operationId = operation.operationId ?? `${method}${pathKey.replace(/[^a-zA-Z0-9]/g, '')}`;
    const domain = mapDomain(pathKey, tags);
    const baseMethodName = normalizeMethodName(operationId, method.toUpperCase(), pathKey);
    const key = `${domain}:${baseMethodName}`;
    const collisionCount = usedMethodNames.get(key) ?? 0;
    usedMethodNames.set(key, collisionCount + 1);
    const methodName = collisionCount === 0 ? baseMethodName : `${baseMethodName}${collisionCount + 1}`;
    routeManifest.push({
      domain,
      methodName,
      operationId,
      path: pathKey,
      httpMethod: method.toUpperCase() as SdkRouteManifestEntry['httpMethod'],
      tags,
      mutating: method !== 'get',
      destructive: method === 'delete' && isDestructivePath(pathKey),
    });
  }
}

const readManifest = routeManifest.filter(route => route.httpMethod === 'GET');

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.writeFileSync(sdkRouteManifestPath, JSON.stringify(routeManifest, null, 2));

const readManifestTs = `import type { SdkRouteDefinition } from '../client/sdk/types.js';\n\nexport const SDK_READ_ROUTE_MANIFEST = ${JSON.stringify(
  readManifest,
  null,
  2,
)} satisfies ReadonlyArray<SdkRouteDefinition>;\n`;

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.writeFileSync(sdkReadManifestTsPath, readManifestTs);

const metadata = {
  generatedAt: new Date().toISOString(),
  source: 'output/openapi-types.json',
  copiedTo: 'src/generated/openapi.json',
  stats: {
    pathCount: Object.keys(spec.paths ?? {}).length,
    schemaCount: Object.keys(spec.components?.schemas ?? {}).length,
    routeCount: routeManifest.length,
    readRouteCount: readManifest.length,
    domains: DOMAIN_ORDER,
  },
};

// nosemgrep: javascript.lang.security.detect-non-literal-fs-filename
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('✓ Copied OpenAPI spec to src/generated/openapi.json');
console.log(`✓ Wrote route manifests (${routeManifest.length} routes, ${readManifest.length} read routes)`);
console.log(`✓ Wrote client metadata (${metadata.stats.pathCount} paths, ${metadata.stats.schemaCount} schemas)`);
