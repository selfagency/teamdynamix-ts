# SDK Mutations

Mutation methods are **curated** — hand-written to cover the most useful write operations on each domain. Every mutation accepts a structured input object (path params + body) and validates it at runtime with Zod before sending the request.

## Destruction safety

Methods that delete or have destructive side effects require `confirm: true` in their input to execute. This prevents accidental calls.

```ts
// This will throw:
await client.tickets.deleteTicket({ appId: 1, ticketId: 5 })
// → TeamDynamixClientError: 'confirmation required'

// This works:
await client.tickets.deleteTicket({ appId: 1, ticketId: 5, confirm: true })
```

## `client.tickets`

### `createTicket`

```ts
createTicket(input: {
  appId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a new ticket. The body should include fields like `Title`, `Description`, `StatusID`, `PriorityID`, `TypeID`.

```ts
await client.tickets.createTicket({
  appId: 1,
  body: {
    Title: 'New ticket',
    StatusID: 1,
    PriorityID: 2,
  },
})
```

### `updateTicket`

```ts
updateTicket(input: {
  appId: string | number
  ticketId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates an existing ticket. Only include the fields you want to change.

```ts
await client.tickets.updateTicket({
  appId: 1,
  ticketId: 456,
  body: { StatusID: 3, PriorityID: 1 },
})
```

### `deleteTicket`

```ts
deleteTicket(input: {
  appId: string | number
  ticketId: string | number
  confirm: true
}): Promise<unknown>
```

Acknowledges a ticket cancellation. Requires `confirm: true`.

### `addTicketComment`

```ts
addTicketComment(input: {
  appId: string | number
  ticketId: string | number
  body: { Comment: string }
}): Promise<unknown>
```

Adds a feed item (comment) to a ticket.

```ts
await client.tickets.addTicketComment({
  appId: 1,
  ticketId: 456,
  body: { Comment: 'Issue resolved.' },
})
```

### `performTicketWorkflowAction`

```ts
performTicketWorkflowAction(input: {
  appId: string | number
  ticketId: string | number
  actionId: string | number
  body?: Record<string, unknown>
}): Promise<unknown>
```

Executes a workflow action on a ticket. The `actionId` comes from `appIdTicketsIdWorkflowActions()` read method.

## `client.ticketRelationships`

### `addTicketAsset`

```ts
addTicketAsset(input: {
  appId: string | number
  ticketId: string | number
  assetId: string | number
}): Promise<unknown>
```

Links an existing asset to a ticket.

### `removeTicketAsset`

```ts
removeTicketAsset(input: {
  appId: string | number
  ticketId: string | number
  assetId: string | number
  confirm: true
}): Promise<unknown>
```

Removes an asset from a ticket. Requires `confirm: true`.

### `addTicketContact`

```ts
addTicketContact(input: {
  appId: string | number
  ticketId: string | number
  body: { UID?: string }
}): Promise<unknown>
```

Adds a contact person to a ticket.

### `createTicketTask`

```ts
createTicketTask(input: {
  appId: string | number
  ticketId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a task on a ticket.

### `updateTicketTask`

```ts
updateTicketTask(input: {
  appId: string | number
  ticketId: string | number
  taskId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates a ticket task.

### `deleteTicketTask`

```ts
deleteTicketTask(input: {
  appId: string | number
  ticketId: string | number
  taskId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes a ticket task. Requires `confirm: true`.

### `addTicketTaskComment`

```ts
addTicketTaskComment(input: {
  appId: string | number
  ticketId: string | number
  taskId: string | number
  body: { Comment: string }
}): Promise<unknown>
```

Adds a comment to a ticket task.

## `client.people`

### `addUserToGroup`

```ts
addUserToGroup(input: {
  groupId: string | number
  uid: string | number
}): Promise<unknown>
```

Adds a single user to a group.

### `removeUserFromGroup`

```ts
removeUserFromGroup(input: {
  groupId: string | number
  uid: string | number
  confirm: true
}): Promise<unknown>
```

Removes a user from a group. Requires `confirm: true`.

## `client.knowledgeBase`

### `createArticle`

```ts
createArticle(input: {
  appId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a knowledge base article.

### `updateArticle`

```ts
updateArticle(input: {
  appId: string | number
  articleId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates a knowledge base article.

### `deleteArticle`

```ts
deleteArticle(input: {
  appId: string | number
  articleId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes a knowledge base article. Requires `confirm: true`.

## `client.assets`

### `createAsset`

```ts
createAsset(input: {
  appId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a new asset.

### `updateAsset`

```ts
updateAsset(input: {
  appId: string | number
  assetId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates an existing asset.

### `deleteAsset`

```ts
deleteAsset(input: {
  appId: string | number
  assetId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes an asset. Requires `confirm: true`.

### `addAssetComment`

```ts
addAssetComment(input: {
  appId: string | number
  assetId: string | number
  body: { Comment: string }
}): Promise<unknown>
```

Adds a feed comment to an asset.

## `client.cmdb`

### `createConfigurationItem`

```ts
createConfigurationItem(input: {
  appId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a configuration item in the CMDB.

### `updateConfigurationItem`

```ts
updateConfigurationItem(input: {
  appId: string | number
  ciId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates a configuration item.

### `deleteConfigurationItem`

```ts
deleteConfigurationItem(input: {
  appId: string | number
  ciId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes a configuration item. Requires `confirm: true`.

## `client.services`

### `createServiceOffering`

```ts
createServiceOffering(input: {
  appId: string | number
  serviceId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates an offering within a service catalog item.

## `client.projects`

### `createProject`

```ts
createProject(input: {
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a new project.

### `updateProject`

```ts
updateProject(input: {
  projectId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates a project.

### `deleteProject`

```ts
deleteProject(input: {
  projectId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes a project. Requires `confirm: true`.

### `addProjectComment`

```ts
addProjectComment(input: {
  projectId: string | number
  body: { Comment: string }
}): Promise<unknown>
```

Adds a comment to a project's feed.

## `client.time`

### `createTimeEntry`

```ts
createTimeEntry(input: {
  body: Record<string, unknown>
}): Promise<unknown>
```

Creates a time entry.

### `updateTimeEntry`

```ts
updateTimeEntry(input: {
  entryId: string | number
  body: Record<string, unknown>
}): Promise<unknown>
```

Updates a time entry.

### `deleteTimeEntry`

```ts
deleteTimeEntry(input: {
  entryId: string | number
  confirm: true
}): Promise<unknown>
```

Deletes a time entry. Requires `confirm: true`.
