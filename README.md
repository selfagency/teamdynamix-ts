# teamdynamix-ts

[![CI](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/selfagency/teamdynamix-ts/graph/badge.svg?token=TbW25stfHD)](https://codecov.io/gh/selfagency/teamdynamix-ts)

Secure Node-first TypeScript client for the TeamDynamix Web API,
generated from OpenAPI 3.1.

## What this project provides

- Generated TypeScript types from the OpenAPI spec (`src/generated/schema.d.ts`)
- Secure typed fetch client (`openapi-fetch`) with:
  - Bearer token auth middleware
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

## Security posture

- HTTPS-only base URL enforcement
- Authorization header injection via middleware (with route exclusions)
- Runtime request and response validation against OpenAPI schema
- Retry limited to safe methods and retryable status codes
- Structured error taxonomy: auth / config / network / http / validation

## CI quality gates

The `quality` workflow enforces, in order:

1. `typecheck`
2. lint / format / markdown checks
3. tests
