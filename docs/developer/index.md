# Developer Guide

How to build, test, and contribute to `teamdynamix-ts`.

## Setup

```bash
git clone https://github.com/selfagency/teamdynamix-ts
cd teamdynamix-ts
pnpm install
```

## Build

```bash
pnpm build
```

This runs:
1. `tsc` — type-check the full source
2. `vite build` — bundle the ESM SDK into `dist/`
3. `postbuild` script — writes a minimal `dist/package.json` for npm compatibility

Output in `dist/`:
```
dist/
├── index.js          # bundled ESM
├── index.js.map      # sourcemap
├── index.d.ts        # bundled types
├── index.d.ts.map    # types sourcemap
└── package.json      # dist-scoped package.json
```

## Test

```bash
pnpm test
```

Uses Vitest. Tests live in `tests/` and cover:

- **Client creation and auth** (`tests/auth.test.ts`) — login with password, service account, error handling
- **Config parsing** (`tests/config.test.ts`) — URL builder, environment, timeout, retry defaults
- **HTTP client** (`tests/client.test.ts`) — request formatting, auth headers, response parsing, retry
- **Runtime validation** (`tests/validation.test.ts`) — AJV compilation, request/response validation, `fail-closed` vs `fail-open`
- **Zod schema validation** (`tests/schemas.test.ts`) — appId, tenant, token, pagination, custom attribute schemas
- **SDK manifest completeness** (`tests/sdk.test.ts`) — route manifest loading and domain routing logic
- **SDK mutations** (`tests/sdk-mutations.test.ts`) — each curated mutation method wired correctly
- **Custom attributes** (`tests/custom-attributes.test.ts`) — registry, attribute value helpers, `buildCustomAttributeValue`
- **SDK request routing** (`tests/sdk-routing.test.ts`) — methodName → correct path and HTTP method
- **SDK edge cases** (`tests/sdk-edge.test.ts`) — error wrapping, destructive confirm guard, undefined/null handling

Run a single test file:

```bash
pnpm test tests/sdk-mutations.test.ts
```

## Lint & Format

```bash
pnpm lint       # oxlint
pnpm format     # oxfmt
pnpm format:check
pnpm typecheck  # tsc --noEmit
```

## Code quality

Fallow runs a deep code health check:

```bash
npx fallow audit
```

Detects: unused exports, circular dependencies, duplicate code, complexity hotspots, unused dependencies.

## Regenerate the OpenAPI spec

```bash
pnpm openapi:generate
```

This runs `scripts/parser/prepare-openapi-spec.ts` which:
1. Fetches the TeamDynamix Web API Swagger document
2. Dereferences all `$ref` pointers
3. Writes a clean OpenAPI 3.0 JSON file to `src/generated/openapi.json`

## Regenerate the SDK route manifest

```bash
pnpm generate:sdk-manifest
```

This runs `scripts/generate-sdk-manifest.ts` which:
1. Reads the dereferenced OpenAPI spec
2. Extracts all GET endpoints
3. Assigns each to a domain bucket based on API tags
4. Writes `src/generated/sdk-read-manifest.ts`

## Regenerate TypeScript types

```bash
pnpm generate:schema-types
```

Runs `openapi-typescript` against the cleaned spec to produce `src/generated/schema.d.ts`.

## Docs

```bash
pnpm docs:dev     # local preview at http://localhost:5173
pnpm docs:build   # production build
```

## Release

```bash
# Tag and push to trigger the Release workflow:
git tag v1.0.0
git push origin v1.0.0
```

The [Release workflow](https://github.com/selfagency/teamdynamix-ts/blob/main/.github/workflows/release.yml) handles:

1. CI checks pass gate
2. `pnpm build`
3. `pnpm publish` with OIDC provenance

## Project structure

```
├── src/
│   ├── client/              # SDK implementation
│   │   ├── auth.ts          # loginWithPassword, loginWithServiceAccount
│   │   ├── client.ts        # TeamDynamixFetchClient
│   │   ├── config.ts        # Config parsing and defaults
│   │   ├── index.ts         # Public barrel export
│   │   ├── retry.ts         # Exponential backoff with jitter
│   │   ├── spec.ts          # OpenAPI spec loader
│   │   ├── validation.ts    # AJV-based runtime validation
│   │   ├── schemas/         # Zod schemas
│   │   │   ├── index.ts
│   │   │   └── common.ts
│   │   ├── sdk/             # SDK domain wiring
│   │   │   ├── index.ts     # SdkRegistry builder
│   │   │   ├── types.ts     # Route definition types
│   │   │   ├── mutations.ts # Curated mutation methods
│   │   │   └── custom-attributes.ts
│   │   └── helpers/         # Standalone helpers
│   │       ├── helpers.ts
│   │       └── custom-attribute.ts
│   └── generated/           # Auto-generated files
│       ├── openapi.json     # Dereferenced OpenAPI spec
│       ├── sdk-read-manifest.ts
│       └── schema.d.ts      # openapi-typescript output
├── tests/                   # Vitest test suite
├── docs/                    # VitePress documentation
├── scripts/                 # Build and generation scripts
└── .github/workflows/       # CI, docs deploy, release
```
