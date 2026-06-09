# Client Configuration

## `createTeamDynamixClient(config)`

```ts
function createTeamDynamixClient(
  config: TeamDynamixClientConfig
): Promise<{ client: TeamDynamixClient; onLoginError: Promise<string | undefined> }>
```

Creates the SDK client. Returns both the `client` object and an `onLoginError` promise that resolves with the error message if initial token acquisition fails.

## Config options

```ts
interface TeamDynamixClientConfig {
  tenant: string
  tokenProvider: () => string | Promise<string>
  environment?: 'production' | 'sandbox'
  baseUrl?: string
  timeoutMs?: number
  runtimeValidationMode?: 'fail-closed' | 'fail-open'
  specPath?: string
  unauthenticatedPaths?: string[]
  retryPolicy?: Partial<RetryPolicy>
  onRetry?: (context: {
    schemaPath: string
    method: string
    attempt: number
    delayMs: number
    reason: string
  }) => void
}
```

### `tenant` (required)

Your TeamDynamix subdomain. Used to build the default base URL:

```ts
// tenant: 'mytenant' → baseUrl: 'https://mytenant.teamdynamix.com/TDWebApi'
```

### `tokenProvider` (required)

A function that returns a Bearer token string. Use the built-in auth helpers:

```ts
// Username/password — logs in on every token request (simple, stateless)
tokenProvider: loginWithPassword({
  tenant: 'mytenant',
  username: process.env.TD_USERNAME!,
  password: process.env.TD_PASSWORD!,
})

// Service account — same pattern, different credentials
tokenProvider: loginWithServiceAccount({
  tenant: 'mytenant',
  beid: process.env.TD_BEID!,
  webServicesKey: process.env.TD_WSKEY!,
})
```

The client calls `tokenProvider()` before every request and automatically retries once with a fresh token if the API returns 401.

You can also supply a pre-acquired JWT:

```ts
tokenProvider: () => 'eyJhbGciOiJIUzI1NiIs...'
```

### `environment` (optional, default: `'production'`)

- `'production'` — uses `https://{tenant}.teamdynamix.com/TDWebApi`
- `'sandbox'` — uses `https://{tenant}.sandbox.teamdynamix.com/TDWebApi`

Use the sandbox environment for development and testing. Overridden by `baseUrl` if set.

### `baseUrl` (optional)

Override the full API base URL. Useful for proxies or local testing:

```ts
baseUrl: 'http://localhost:8080/proxy'
```

### `timeoutMs` (optional, default: `30000`)

Request timeout in milliseconds.

### `runtimeValidationMode` (optional, default: `'fail-open'`)

Controls AJV-based request/response validation against the OpenAPI spec:

- `'fail-open'` — validation errors are logged but never thrown (safe default for production)
- `'fail-closed'` — throws `TeamDynamixClientError` with `code: 'REQUEST_VALIDATION_ERROR'` or `'RESPONSE_VALIDATION_ERROR'` when the payload doesn't match the spec

### `specPath` (optional, default: resolved from `src/generated/openapi.json`)

Path to the dereferenced OpenAPI JSON spec used for runtime validation. Only needed if you customized the spec location.

### `unauthenticatedPaths` (optional)

Array of URL path patterns that should be called without an auth header. The client matches these as prefixes:

```ts
unauthenticatedPaths: ['/api/auth/login', '/api/health']
```

## Retry policy

```ts
interface RetryPolicy {
  maxRetries: number           // default: 3
  initialDelayMs: number      // default: 250
  maxDelayMs: number          // default: 5000
  backoffMultiplier: number   // default: 2 (exponential)
  jitterRatio: number         // default: 0.2 (±20% random jitter)
  retryOnStatuses: Set<number> // default: {429, 502, 503, 504}
  retryOnNetworkError: boolean // default: true
  retryUnsafeMethods: boolean  // default: false
}
```

Override individual fields:

```ts
createTeamDynamixClient({
  // ...auth config...
  retryPolicy: {
    maxRetries: 5,
    retryOnStatuses: new Set([429, 500, 502, 503, 504]),
  },
})
```

> By default, only safe HTTP methods (GET, HEAD, OPTIONS, TRACE) are retried. Set `retryUnsafeMethods: true` to also retry POST/PUT/PATCH/DELETE.

### `onRetry` callback

Fired before each retry attempt. Useful for logging:

```ts
createTeamDynamixClient({
  // ...config...
  onRetry: ({ schemaPath, method, attempt, delayMs, reason }) => {
    console.warn(`[${method} ${schemaPath}] retry #${attempt} in ${delayMs}ms — ${reason}`)
  },
})
```

## Config presets

| Use case | `environment` | `runtimeValidationMode` | `retryPolicy.maxRetries` |
|---|---|---|---|
| Production | `'production'` | `'fail-open'` | 3 |
| Integration tests | `'sandbox'` | `'fail-closed'` | 1 |
| Script/CLI | `'production'` | `'fail-open'` | 0 (no retry) |

## Examples

### Minimal config (production, quick)

```ts
const { client } = await createTeamDynamixClient({
  tenant: 'mytenant',
  tokenProvider: loginWithPassword({
    tenant: 'mytenant',
    username: process.env.TD_USERNAME!,
    password: process.env.TD_PASSWORD!,
  }),
})
```

### Strict config (catch validation errors early)

```ts
const { client, onLoginError } = await createTeamDynamixClient({
  tenant: 'mytenant',
  tokenProvider: loginWithServiceAccount({
    tenant: 'mytenant',
    beid: process.env.TD_BEID!,
    webServicesKey: process.env.TD_WSKEY!,
  }),
  runtimeValidationMode: 'fail-closed',
  timeoutMs: 10000,
  retryPolicy: {
    maxRetries: 1,
    jitterRatio: 0,
  },
  onRetry: (ctx) => console.warn('Retry:', ctx),
})
```
