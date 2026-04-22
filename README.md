# teamdynamix-ts

[![CI](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/selfagency/teamdynamix-ts/graph/badge.svg?token=TbW25stfHD)](https://codecov.io/gh/selfagency/teamdynamix-ts)

Secure Node-first TypeScript client for the TeamDynamix Web API,
generated from OpenAPI 3.1.

## What this project provides

- Generated TypeScript types from the OpenAPI spec (`src/generated/schema.d.ts`)
- Secure typed fetch client (`openapi-fetch`) with:
  - Bearer token auth middleware
  - Zod v4 boundary validation for SDK inputs (tenant/token and shared helper contracts)
  - Request/response runtime validation
  - Bounded retry with backoff and `Retry-After` support
- Vitest + MSW test coverage for core client behavior

## Source of truth

- Enriched generated spec: `output/openapi.json`
- Generated TS declarations: `src/generated/schema.d.ts`

## Commands

- `pnpm run typecheck` — strict TypeScript checks
- `pnpm run test` — Vitest suite
- `pnpm run lint` — Oxlint
- `pnpm run format` — Oxfmt

## Client usage

```ts
import { createTeamDynamixClient } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: async () => process.env.TEAMDYNAMIX_TOKEN ?? '',
  environment: 'production',
  runtimeValidationMode: 'fail-closed',
});

const { data, error } = await client.GET('/api/accounts');
```

## Route-specific SDK surface

The returned `client` now exposes a domain-object API in addition to low-level HTTP methods:

- `client.discovery.<method>()`
- `client.tickets.<method>()`
- `client.ticketRelationships.<method>()`
- `client.people.<method>()`
- `client.knowledgeBase.<method>()`
- `client.assets.<method>()`
- `client.cmdb.<method>()`
- `client.services.<method>()`
- `client.projects.<method>()`
- `client.time.<method>()`
- `client.referenceData.<method>()`
- `client.helpers.<method>()` for discovery-first workflows

Example:

```ts
const { client, raw } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: async () => process.env.TEAMDYNAMIX_TOKEN ?? '',
});

// Route-specific domain method (generated from OpenAPI metadata)
const accounts = await client.referenceData.accounts();

// Curated guarded mutation with explicit confirm semantics
await client.ticketRelationships.removeTicketAsset({
  appId: 123,
  ticketId: 456,
  assetId: 789,
  confirm: true,
});

// Raw escape hatch for advanced/edge operations
const rawResponse = await raw.GET('/api/accounts');
```

### Migration examples

- Before: `await client.GET('/api/accounts')`
- After: `await client.referenceData.accounts()`
- Before: `await client.POST('/api/{appId}/tickets/{id}/feed', { ... })`
- After: `await client.tickets.addTicketComment({ appId, ticketId, body })`
- Before: `await client.DELETE('/api/{appId}/tickets/{id}/assets/{assetId}')`
- After: `await client.ticketRelationships.removeTicketAsset({ appId, ticketId, assetId, confirm: true })`

## Generated route manifests

- Full route manifest: `src/generated/sdk-route-manifest.json`
- Generated read-route manifest: `src/generated/sdk-read-manifest.ts`

Regenerate manifests from OpenAPI metadata:

- `pnpm run generate:client`
- `pnpm run generate:all`

## Security posture

- HTTPS-only base URL enforcement
- Authorization header injection via middleware (with route exclusions)
- Runtime request and response validation against OpenAPI schema
- Zod v4 parsing for client boundary inputs before request dispatch
- Retry limited to safe methods and retryable status codes
- Structured error taxonomy: auth / config / network / http / validation

## CI quality gates

The `quality` workflow enforces, in order:

1. `typecheck`
2. lint / format / markdown checks
3. tests
