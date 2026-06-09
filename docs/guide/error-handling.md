# Error Handling

All errors thrown by the SDK are `TeamDynamixClientError` instances with a structured shape.

## Redacting sensitive data from errors

Use `redactAuthorization()` to strip Bearer tokens from strings (request bodies, error messages) before logging or reporting:

```ts
import { redactAuthorization } from 'teamdynamix-ts'

console.error(redactAuthorization(errorBody))
// 'Authorization: Bearer [REDACTED]'
```

The function replaces `Authorization: Bearer <token>` with `Authorization: Bearer [REDACTED]` in any string.

## Error type

```ts
class TeamDynamixClientError extends Error {
  readonly name: 'TeamDynamixClientError'
  readonly code: ClientErrorCode
  readonly status: number | undefined
  readonly schemaPath: string | undefined
  readonly method: string | undefined
  readonly details: unknown
  readonly cause: Error | undefined
}
```

## Error codes

| Code | Description | Cause |
|---|---|---|
| `AUTH_ERROR` | Authentication failed | Bad credentials, expired token, 401 response |
| `CONFIG_ERROR` | Client misconfiguration | Invalid tenant, missing token provider, bad retry policy |
| `HTTP_ERROR` | API returned an error status | 4xx or 5xx response |
| `NETWORK_ERROR` | Request failed at transport level | DNS failure, connection refused, timeout |
| `REQUEST_VALIDATION_ERROR` | Request body failed AJV validation | Payload doesn't match OpenAPI schema *(only in `fail-closed` mode)* |
| `RESPONSE_VALIDATION_ERROR` | Response body failed AJV validation | API returned unexpected shape *(only in `fail-closed` mode)* |

## HTTP errors

When the TeamDynamix API returns a non-2xx response:

```ts
try {
  await client.tickets.appIdTicketsId({
    params: { path: { appId: 1, id: 999999 } },
  })
} catch (error) {
  if (error instanceof TeamDynamixClientError && error.code === 'HTTP_ERROR') {
    console.error(`Status: ${error.status}`)
    // → 404
    console.error(`Domain: ${error.details?.domain}`)
    // → 'tickets'
    console.error(`Operation: ${error.details?.methodName}`)
    // → 'getTicket'
    console.error(`API error:`, error.details?.error)
    // → { Message: 'Ticket not found', ... }
  }
}
```

The `details` object on HTTP errors contains:

```ts
{
  domain: string     // SDK domain name (e.g. 'tickets')
  methodName: string  // SDK method name (e.g. 'getTicket')
  operationId: string // OpenAPI operationId
  error: unknown     // HTTP response body (usually an ApiError object)
}
```

## Auth errors

```ts
// Login failure captures in the onLoginError promise:
const { client, onLoginError } = await createTeamDynamixClient({ ... })

const err = await onLoginError
if (err) {
  console.error('Auth failed:', err)
  // → 'Invalid credentials' or 'API returned 401'
}
```

If the token refresher or initial login fails, you get an `AUTH_ERROR`:

```ts
try {
  const result = await client.tickets.appIdTicketsId({ params: { path: { appId: 1, id: 5 } } })
} catch (error) {
  if (error instanceof TeamDynamixClientError && error.code === 'AUTH_ERROR') {
    console.error('Auth failed:', error.message)
  }
}
```

## Validation errors (strict mode only)

When `runtimeValidationMode: 'fail-closed'`, the SDK validates every request body and response payload against the OpenAPI spec:

```ts
try {
  await client.tickets.createTicket({
    appId: 1,
    body: { Title: 'Test' }  // missing required fields
  })
} catch (error) {
  if (error instanceof TeamDynamixClientError && error.code === 'REQUEST_VALIDATION_ERROR') {
    console.error('Request invalid:', error.schemaPath)
    // → '/api/{appId}/tickets'
    console.error('Validation errors:', error.details?.errors)
    // → [{ keyword: 'required', missingProperty: 'StatusID', ... }]
  }
}
```

## Retry and network errors

Network errors (DNS, connection refused, timeout) get retried automatically per the retry policy. If all retries are exhausted:

```ts
try {
  await client.referenceData.accounts()
} catch (error) {
  if (error instanceof TeamDynamixClientError && error.code === 'NETWORK_ERROR') {
    console.error('Network failed:', error.message)
    // → 'fetch failed: connect ECONNREFUSED'
  }
}
```

## Auth-redirect (transparent 401 handling)

The SDK automatically handles expired tokens: if the API returns 401, the client calls the `tokenProvider` once to get a fresh token and retries the request. Errors from the refresh itself surface as `AUTH_ERROR`.

## Best practices

```ts
import { TeamDynamixClientError } from 'teamdynamix-ts'

try {
  const result = await client.tickets.appIdTicketsId({
    params: { path: { appId: 1, id: 456 } },
  })
} catch (error) {
  if (!(error instanceof TeamDynamixClientError)) throw error

  switch (error.code) {
    case 'HTTP_ERROR':
      if (error.status === 404) handleNotFound()
      else if (error.status === 403) handleForbidden()
      else handleOther(error)
      break
    case 'NETWORK_ERROR':
      scheduleRetry()
      break
    case 'AUTH_ERROR':
      triggerReauth()
      break
    default:
      console.error('SDK error:', error)
  }
}
```
