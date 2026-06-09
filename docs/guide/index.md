# Guide

## What is teamdynamix-ts?

A **secure, Node-first TypeScript client** for the [TeamDynamix Web API](https://api.teamdynamix.com/help). It wraps the full REST surface with type-safe entry points, runtime request/response validation, automatic retry with backoff, and auth helpers that handle JWT lifecycle.

Packaged as `@selfagency/teamdynamix-ts` on npm.

## Architecture

```text
Client                SDK (10 domains)           Helpers
┌──────────┐         ┌────────────────┐         ┌──────────────┐
│ Config   │  ───→   │ discovery      │         │ findAccount  │
│ Auth     │  ───→   │ tickets        │         │ findUser     │
│ Retry    │  ───→   │ ticketRelations│         │ resolveCtx   │
│ Timeout  │  ───→   │ people         │         │ projectFields│
│ Val.     │  ───→   │ knowledgeBase  │         │ previewEntity│
│          │  ───→   │ assets         │         │ bulkAddUsers │
│          │  ───→   │ cmdb           │         │ runReport    │
│          │  ───→   │ services       │         └──────────────┘
│          │  ───→   │ projects       │
│          │  ───→   │ time           │
│          │  ───→   │ referenceData  │
│          │         └────────────────┘
│          │         ┌────────────────┐
│          │  ───→   │ registry       │  ← Custom attributes
│          │         └────────────────┘
└──────────┘
          TeamDynamixFetchClient
          (auth middleware, retry, validation)
```

## SDK domains

Every domain on the SDK object exposes **auto-generated read methods** — GET endpoints from the OpenAPI spec, method-named for consistency. Eight domains also have **curated mutation methods** (create, update, delete) that are hand-written for intentional API coverage.

| Domain | Auto reads | Mutations | Needs `appId` | Description |
|---|---|---|---|---|
| `discovery` | Yes | No | Some | Applications, auth status |
| `tickets` | Yes | **Yes** | Yes | Tickets CRUD, feed, workflow |
| `ticketRelationships` | Yes | **Yes** | Yes | Tasks, assets, contacts on tickets |
| `people` | Yes | **Yes** | No | Person lookup, groups, members |
| `knowledgeBase` | Yes | **Yes** | Yes | Articles |
| `assets` | Yes | **Yes** | Yes | Assets, contracts, models, feed |
| `cmdb` | Yes | **Yes** | Yes | Configuration items, types, vendors |
| `services` | Yes | **Yes** | Yes | Services, categories, offerings |
| `projects` | Yes | **Yes** | No | Projects, issues, risks, plans |
| `time` | Yes | **Yes** | No | Time entries, types, reports |
| `referenceData` | Yes | No | Some | Accounts, locations, statuses, roles |

## Public exports

Everything you can import from `teamdynamix-ts`:

```ts
// Client factory
createTeamDynamixClient(config)

// Auth helpers (token providers)
loginWithPassword({ username, password })
loginWithServiceAccount({ beid, webServicesKey })
createTokenProviderFromJWT(jwt)

// Standalone helper functions (operate on raw data)
projectFields(items, fields)
previewEntity(entity, options?)
bulkAddUsersToGroup(client, input)
runTicketReport(client, input)

// Type exports (via z.infer from exported schemas)
```

## Quick links

- **[Quick Start](./quick-start)** — install, authenticate, first query
- **[Client Configuration](./client-config)** — all config options explained
- **[SDK Domains](./sdk-domains)** — complete read-method reference
- **[SDK Mutations](./sdk-mutations)** — mutation signatures and examples
- **[Helper Functions](./helper-functions)** — projection, preview, bulk operations
- **[Custom Attributes](./custom-attributes)** — working with custom fields
- **[Error Handling](./error-handling)** — error types and recovery patterns
- **[Advanced Usage](./advanced)** — raw client, validation, schema exports
- **[API Reference](/api/)** — generated OpenAPI spec
