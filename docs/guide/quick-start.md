# Quick Start

## Install

```bash
npm install @selfagency/teamdynamix-ts
# or
pnpm add @selfagency/teamdynamix-ts
```

## Pick an auth method

TeamDynamix issues JWTs that expire in 24 hours. You can authenticate with either a **username/password** (for your own user) or an **admin service account** (BEID + WebServicesKey).

### Username / Password

```ts
import { createTeamDynamixClient, loginWithPassword } from 'teamdynamix-ts'

const { client, onLoginError } = await createTeamDynamixClient({
  tenant: 'mytenant',               // your TeamDynamix subdomain
  tokenProvider: loginWithPassword({
    tenant: 'mytenant',
    username: process.env.TD_USERNAME!,
    password: process.env.TD_PASSWORD!,
  }),
})
```

### Service account (BEID + WebServicesKey)

```ts
import { createTeamDynamixClient, loginWithServiceAccount } from 'teamdynamix-ts'

const { client } = await createTeamDynamixClient({
  tenant: 'mytenant',
  tokenProvider: loginWithServiceAccount({
    tenant: 'mytenant',
    beid: process.env.TD_BEID!,
    webServicesKey: process.env.TD_WSKEY!,
  }),
})
```

> The `onLoginError` callback receives any auth failure so you can handle it before any SDK call tries to use a bad token.

## Your first query

```ts
// List accounts (reference data — no appId needed)
const accounts = await client.referenceData.accounts()
console.log(accounts)
// → [{ ID: 1, Name: 'Corporate', ... }, ...]

// Get a single account
const account = await client.referenceData.accountsId({ params: { path: { id: 1 } } })
```

## Working with tickets (requires appId)

Most ticket operations require an **Application ID** (`appId`). This is the numeric ID of the TeamDynamix application you're targeting.

```ts
const APP_ID = 42

// Read
const ticket = await client.tickets.appIdTicketsId({
  params: { path: { appId: APP_ID, id: 123 } },
})

// Create
const created = await client.tickets.createTicket({
  appId: APP_ID,
  body: {
    Title: 'Printer not working',
    Description: 'HP LaserJet on floor 3 is offline',
    StatusID: 1,
    PriorityID: 2,
    TypeID: 1,
  },
})

// Update
const updated = await client.tickets.updateTicket({
  appId: APP_ID,
  ticketId: 123,
  body: { StatusID: 2 },
})

// Add comment
const feed = await client.tickets.addTicketComment({
  appId: APP_ID,
  ticketId: 123,
  body: { Comment: 'Rebooted the printer, it works now.' },
})
```

## Pagination

Read methods accept query params as `params.query`. The TeamDynamix API expects pagination via `Page` and `PageSize` query parameters:

```ts
const tickets = await client.tickets.appIdTicketsFeed({
  params: {
    path: { appId: APP_ID },
    query: { Page: '1', PageSize: '50' },
  },
})
```

## Field projection

Reduce payload size and noise by selecting only the fields you need:

```ts
import { projectFields } from 'teamdynamix-ts'

const accounts = await client.referenceData.accounts()
const names = projectFields(accounts, ['ID', 'Name'])
// → [{ ID: 1, Name: 'Corporate' }, { ID: 2, Name: 'IT' }, ...]
```

## Running a saved report

```ts
import { runTicketReport } from 'teamdynamix-ts'

const report = await runTicketReport(client, {
  appId: APP_ID,
  searchId: 5,            // saved search ID in TeamDynamix
  page: 1,
  pageSize: 100,
  filter: item => item.StatusName !== 'Closed',
})

console.log(report)
// → { items: [...], page: 1, pageSize: 100, hasMore: true }
```

## Adding users to a group in bulk

```ts
import { bulkAddUsersToGroup } from 'teamdynamix-ts'

const result = await bulkAddUsersToGroup(client, {
  groupId: 7,
  uids: ['user1@org.com', 'user2@org.com'],
  dryRun: true,   // simulate without mutating
})
```

## Next steps

- [Client Configuration](./client-config) — timeout, retry, validation, sandbox
- [SDK Domains](./sdk-domains) — every read method, organized by domain
- [SDK Mutations](./sdk-mutations) — create, update, delete operations
- [Helper Functions](./helper-functions) — projection, preview, bulk, report
- [Custom Attributes](./custom-attributes) — reading and writing custom fields
- [Error Handling](./error-handling) — `TeamDynamixClientError` types
