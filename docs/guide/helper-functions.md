# Helper Functions

Standalone functions exported from `teamdynamix-ts` for common tasks.

## `projectFields`

```ts
function projectFields<T extends Record<string, unknown>, K extends keyof T>(
  items: T[],
  fields: K[],
): Pick<T, K>[]
```

Reduces each object in an array to only the specified fields. Useful for trimming API responses.

```ts
import { projectFields } from 'teamdynamix-ts'

const accounts = await client.referenceData.accounts()
const names = projectFields(accounts, ['ID', 'Name'])
// → [{ ID: 1, Name: 'Corporate' }, ...]
```

## `previewEntity`

```ts
function previewEntity<T extends Record<string, unknown>>(
  entity: T,
  options?: { bodyField?: string; truncateAt?: number },
): string
```

Creates a human-readable summary of an entity. Extracts the body field and key attributes. Useful for logging or quick previews.

```ts
import { previewEntity } from 'teamdynamix-ts'

const ticket = await client.tickets.appIdTicketsId({
  params: { path: { appId: 1, id: 456 } },
})

console.log(previewEntity(ticket, { bodyField: 'Description' }))
// → Ticket #456: Printer not working (Priority: High, Status: Open)
//    Description: HP LaserJet on floor 3 is offline...
```

### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `bodyField` | `string` | `'Description'` | Field name containing the main body text |
| `truncateAt` | `number` | `200` | Max characters for the body preview |

## `bulkAddUsersToGroup`

```ts
function bulkAddUsersToGroup(
  client: TeamDynamixFetchClient,
  input: {
    groupId: string | number
    uids: Array<string | number>
    dryRun?: boolean
  },
): Promise<BulkResult>
```

Adds multiple users to a group in one call. Uses the `POST /api/groups/{id}/members` endpoint internally.

```ts
import { bulkAddUsersToGroup } from 'teamdynamix-ts'

const result = await bulkAddUsersToGroup(client, {
  groupId: 7,
  uids: ['user1@org.com', 'user2@org.com'],
  dryRun: true, // simulate without mutating
})

console.log(result)
// → { groupId: 7, added: 2, errors: [] }
```

The `dryRun` flag validates all inputs and checks group/user existence without making changes.

## `runTicketReport`

```ts
function runTicketReport(
  client: TeamDynamixFetchClient,
  input: {
    appId: string | number
    searchId: string | number
    page?: number
    pageSize?: number
    filter?: (item: unknown) => boolean
  },
): Promise<ReportPage>
```

Executes a saved ticket search/report and returns paginated results. The `filter` option is an in-memory post-filter (applied client-side after fetching the page).

```ts
import { runTicketReport } from 'teamdynamix-ts'

const report = await runTicketReport(client, {
  appId: 1,
  searchId: 5,
  page: 1,
  pageSize: 100,
  filter: (item) => item.StatusName !== 'Closed',
})

console.log(report)
// → {
//     items: [...],
//     page: 1,
//     pageSize: 100,
//     hasMore: false,
//   }
```

### Response shape

```ts
interface ReportPage {
  items: unknown[]
  page: number
  pageSize: number
  hasMore: boolean
}
```

`hasMore` is `true` when the returned item count equals the page size (indicating more pages available).
