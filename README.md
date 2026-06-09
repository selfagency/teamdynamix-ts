# teamdynamix-ts

[![CI](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/selfagency/teamdynamix-ts/graph/badge.svg?token=TbW25stfHD)](https://codecov.io/gh/selfagency/teamdynamix-ts)

Secure Node-first TypeScript client for the TeamDynamix Web API,
generated from OpenAPI 3.1.

## Quick start

```ts
import { createTeamDynamixClient, loginWithPassword, projectFields } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: loginWithPassword({
    tenant: 'api',
    username: process.env.TD_USERNAME!,
    password: process.env.TD_PASSWORD!,
  }),
  environment: 'production',
  runtimeValidationMode: 'fail-closed',
});

const accounts = await client.referenceData.accounts();
const projected = projectFields(accounts, ['ID', 'Name']);
```

Or authenticate with an admin service account:

```ts
import { loginWithServiceAccount } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: loginWithServiceAccount({
    tenant: 'api',
    beid: process.env.TD_BEID!,
    webServicesKey: process.env.TD_WSKEY!,
  }),
});
```

## Curated helpers

```ts
import {
  bulkAddUsersToGroup, loginWithPassword, loginWithServiceAccount,
  previewEntity, projectFields, runTicketReport,
} from 'teamdynamix-ts';

const search = await runTicketReport(client, { appId: 1, searchId: 42 });
const summary = previewEntity(search.items[0] ?? {}, { bodyField: 'Description' });
const bulk = await bulkAddUsersToGroup(client, { groupId: 7, uids: ['u1', 'u2'] });
```

## Documentation

- Browse docs in `docs/` with VitePress.
- Local docs dev server: `pnpm run docs:dev`
- Build docs: `pnpm run docs:build`
- Preview built docs: `pnpm run docs:preview`

### API reference in docs

- Full spec page: `docs/api/spec.md`
- Operation pages: generated from `docs/operations/[operationId].paths.ts`
- Tag pages: generated from `docs/tags/[tag].paths.ts`
- Curated SDK helpers are exported from `teamdynamix-ts` and documented in the Guide

## Development commands

- `pnpm run typecheck` — strict TypeScript checks
- `pnpm run lint` — Oxlint
- `pnpm run format:check` — formatting verification
- `pnpm run lint:md` — markdown lint checks
- `pnpm run test` — Vitest suite

## Source of truth

- Canonical OpenAPI spec in repo: `src/spec/openapi.yaml`
- Enriched outputs and reports: `output/`
- Type generation source: `output/openapi-types.json`
- Generated declarations: `src/generated/schema.d.ts`

## More detail

See the full documentation in `docs/` for:

- SDK usage patterns and migration guidance
- Generated API reference
- contributor-focused architecture and workflow guidance
