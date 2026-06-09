# API Reference

## Package exports

Everything exported from `@selfagency/teamdynamix-ts`:

### Client

| Export | Kind | Description |
|---|---|---|
| `createTeamDynamixClient` | Function | Creates the HTTP client with auth, retry, and validation |
| `createTeamDynamixSdk` | Function | Creates the full SDK (10 domains + mutations + helpers + registry) |
| `TeamDynamixClientConfig` | Type (interface) | Client configuration options |

### Auth helpers

| Export | Kind | Description |
|---|---|---|
| `loginWithPassword` | Function | Token provider via username/password login |
| `loginWithServiceAccount` | Function | Token provider via BEID + WebServicesKey |
| `createTokenProviderFromJWT` | Function | Wraps a pre-acquired JWT as a token provider |

### SDK domains

| Export | Kind | Description |
|---|---|---|
| `TeamDynamixSdk` | Type (interface) | Full SDK shape with all domains and mutations |
| `SdkDomainName` | Type (union) | `'discovery' \| 'tickets' \| ... \| 'referenceData'` |
| `SdkRouteDefinition` | Type (interface) | Route metadata used by the request pipeline |
| `SdkRequestOptions` | Type (interface) | Options for raw client requests |

### Standalone helpers

| Export | Kind | Description |
|---|---|---|
| `projectFields` | Function | Projection — reduces objects to selected fields |
| `previewEntity` | Function | Human-readable entity preview |
| `bulkAddUsersToGroup` | Function | Bulk-add members to a group |
| `runTicketReport` | Function | Run a saved ticket search with pagination |

### Helper return types

| Export | Kind | Description |
|---|---|---|
| `BulkResult` | Type (interface) | Return type of `bulkAddUsersToGroup` |
| `ReportPage` | Type (interface) | Return type of `runTicketReport` |

### Error handling

| Export | Kind | Description |
|---|---|---|
| `TeamDynamixClientError` | Class | All SDK errors are instances of this |
| `redactAuthorization` | Function | Strips Bearer tokens from strings for safe logging |

### Zod schemas

| Export | Kind | Description |
|---|---|---|
| `appIdSchema` | `z.ZodSchema` | Validates `string \| number` app IDs |
| `confirmTrueSchema` | `z.ZodSchema` | Validates `true` literal (safety gate) |
| `customAttributeSchema` | `z.ZodSchema` | Validates `{ ID, Name?, Value? }` |
| `paginationSchema` | `z.ZodSchema` | Validates `{ page?, pageSize? }` |
| `searchTextSchema` | `z.ZodSchema` | Validates non-empty search text (max 500 chars) |
| `tenantSchema` | `z.ZodSchema` | Validates non-empty tenant string |
| `tokenSchema` | `z.ZodSchema` | Validates non-empty token string |

### SDK types (internal)

The following types are used by the SDK internally but may be useful for type annotations:

| Export | Kind | Description |
|---|---|---|
| `TeamDynamixSdk` | Type | Full SDK interface with all 10 domains |
| `RetryPolicy` | Type | Retry configuration shape |
| `RuntimeValidationMode` | Type | `'fail-closed' \| 'fail-open'` |
| `SdkDomainName` | Type | Union of all domain names |
| `SdkRouteDefinition` | Type | Route metadata interface |
| `SdkRequestOptions` | Type | Raw request options interface |
| `BulkResult` | Type | Bulk operation result |
| `ReportPage` | Type | Paginated report result |

## SDK domain methods

Each SDK domain has **auto-generated read methods** (all GET endpoints from the OpenAPI spec). See [SDK Domains](/guide/sdk-domains) for the complete list with signatures.

Eight domains also have **curated mutation methods** — see [SDK Mutations](/guide/sdk-mutations).

## Raw client

For endpoints not covered by SDK methods, use `client._client`:

```ts
const result = await client._client.request('/api/accounts', {
  method: 'GET',
  params: { Page: '1' },
})
```

See [Advanced Usage](/guide/advanced) for details.
