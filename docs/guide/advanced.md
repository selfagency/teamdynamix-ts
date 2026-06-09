# Advanced Usage

## Raw HTTP client access

Every SDK domain call goes through `TeamDynamixFetchClient` at `client._client`. You can use it directly for endpoints not covered by the curated or auto-generated methods.

```ts
const raw = client._client

// Any path, any method
const result = await raw.request('/api/accounts', { method: 'GET' })

// With query params
const result = await raw.request('/api/tickets', {
  method: 'GET',
  params: { Page: '1', PageSize: '100' },
})

// Mutations
await raw.request('/api/tickets', {
  method: 'POST',
  body: { Title: 'New', PriorityID: 2 },
})
```

The raw client handles auth, retry, and timeout automatically — same middleware stack as the SDK methods.

## Loading the OpenAPI spec

```ts
import { loadSpec } from 'teamdynamix-ts'

const spec = await loadSpec()
console.log(spec.info.title)   // 'TeamDynamix Web API'
console.log(spec.paths)         // all paths
```

`loadSpec()` resolves to the spec bundled with the package (from `src/generated/openapi.json`). You can also pass a custom path:

```ts
const spec = await loadSpec({ specPath: '/path/to/custom-spec.json' })
```

## Runtime validation toggles

Validation mode is set at client creation, but you can inspect the compiled AJV validators:

```ts
import { compileSpec } from 'teamdynamix-ts'

const validators = await compileSpec(spec)
// → { request: Map<path, AjvValidator>, response: Map<path, AjvValidator> }

// Validate a request body manually:
const path = '/api/accounts/search'
const valid = validators.request.get(path)
if (valid) {
  const ok = valid(requestBody)
  if (!ok) console.log(valid.errors)  // AJV error objects
}
```

> Validation is most useful in `fail-closed` mode (throws on mismatch). In `fail-open` mode (default), validation errors are logged but never thrown — safe for production.

## Alias-based imports

The package exports everything at the top level. For tree-shaking:

```ts
import { createTeamDynamixClient, loginWithPassword } from 'teamdynamix-ts'
import { createTeamDynamixClient, loginWithServiceAccount } from 'teamdynamix-ts'
```

All SDK types, Zod schemas, and the `TeamDynamixClientError` class are also exported from the package top level:

```ts
import {
  TeamDynamixClientError,
  appIdSchema,
  customAttributeSchema,
  paginationSchema,
  tenantSchema,
} from 'teamdynamix-ts'
```

## Schema re-exports

Zod schemas are exported from the package for standalone use:

```ts
import { appIdSchema, paginationSchema, tenantSchema } from 'teamdynamix-ts'

const parsed = appIdSchema.parse(42)
// → 42

const result = paginationSchema.safeParse({ page: '1', pageSize: '50' })
// → { success: true, data: { page: 1, pageSize: 50 } }
```

Available schemas:

| Schema | Validates | TypeScript (via `z.infer`) |
|---|---|---|
| `appIdSchema` | `string \| number` | `string \| number` |
| `tenantSchema` | non-empty `string` | `string` |
| `paginationSchema` | `{ page, pageSize }` | `{ page: number, pageSize: number }` |
| `customAttributeSchema` | `{ ID, Value }` | `{ ID: string \| number, Value: unknown }` |
| `customAttributeDefinitionSchema` | `{ ID?, Name?, ... }` | `{ ID?: number, Name?: string, ... }` |
