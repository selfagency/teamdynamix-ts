# teamdynamix-ts

[![CI](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/selfagency/teamdynamix-ts/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/selfagency/teamdynamix-ts/graph/badge.svg?token=TbW25stfHD)](https://codecov.io/gh/selfagency/teamdynamix-ts)
[![npm](https://img.shields.io/npm/v/%40selfagency%2Fteamdynamix-ts)](https://www.npmjs.com/package/@selfagency/teamdynamix-ts)

**Type-safe TeamDynamix Web API client for Node.js** — auto-generated reads, curated mutations, runtime validation, and auth helpers.

```bash
npm install @selfagency/teamdynamix-ts
```

```ts
import { createTeamDynamixClient, loginWithPassword } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'mytenant',
  tokenProvider: loginWithPassword({
    tenant: 'mytenant',
    username: process.env.TD_USERNAME!,
    password: process.env.TD_PASSWORD!,
  }),
});

const accounts = await client.referenceData.accounts();
```

## Full documentation

**[teamdynamix-ts.self.agency](https://teamdynamix-ts.self.agency)** — quick start, SDK domain reference, mutation signatures, error handling, and API spec.

| Page                                                                            | Contents                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| [Quick Start](https://teamdynamix-ts.self.agency/guide/quick-start)             | Install, auth (password + service account), first queries, pagination |
| [Client Config](https://teamdynamix-ts.self.agency/guide/client-config)         | Timeout, retry policy, validation modes, sandbox                      |
| [SDK Domains](https://teamdynamix-ts.self.agency/guide/sdk-domains)             | All 150+ read methods across 10 domains                               |
| [SDK Mutations](https://teamdynamix-ts.self.agency/guide/sdk-mutations)         | Create, update, delete with safety gates                              |
| [Helper Functions](https://teamdynamix-ts.self.agency/guide/helper-functions)   | projection, preview, bulk insert, report runner                       |
| [Custom Attributes](https://teamdynamix-ts.self.agency/guide/custom-attributes) | Reading and writing custom fields                                     |
| [Error Handling](https://teamdynamix-ts.self.agency/guide/error-handling)       | Error codes, HTTP errors, auth errors, validation errors              |
| [API Reference](https://teamdynamix-ts.self.agency/api)                         | Interactive OpenAPI spec                                              |
| [Developer Guide](https://teamdynamix-ts.self.agency/developer)                 | Build, test, release, project structure                               |

## Development

```bash
pnpm install
pnpm test          # Vitest
pnpm typecheck     # tsc --noEmit
pnpm lint          # oxlint
pnpm docs:dev      # VitePress local preview
```

## Release

```bash
git tag v1.0.0
git push origin v1.0.0
```

The Release workflow builds, OIDC-authenticates with npm, and publishes with `--provenance`.
