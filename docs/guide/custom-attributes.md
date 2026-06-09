# Custom Attributes

TeamDynamix entities (tickets, assets, configuration items) often have custom attributes defined per application. The SDK provides helpers to read and write these.

## Attribute definition registry

Access attribute definitions (metadata about custom fields) via the registry:

```ts
const registry = client.customAttributes

// Get ticket custom attribute definitions
const ticketAttrs = await registry.getTicketCustomAttributes({ appId: 1 })
// → [{ ID: 123, Name: 'Department', DataType: 1, ... }, ...]

// Get asset custom attribute definitions
const assetAttrs = await registry.getAssetCustomAttributes({ appId: 1 })
```

## Reading attribute values

### From tickets

```ts
const ticketAttrs = await client.customAttributes.getTicketCustomAttributes({
  appId: 1,
  ticketId: 456,
})
// → [{ ID: 123, Name: 'Department', Value: 'Engineering' }, ...]
```

### From assets

```ts
const assetAttrs = await client.customAttributes.getAssetCustomAttributes({
  appId: 1,
  assetId: 789,
})
```

## Writing attribute values

### To tickets

```ts
await client.customAttributes.setTicketCustomAttributes({
  appId: 1,
  ticketId: 456,
  attributes: [
    { ID: 123, Value: 'Engineering' },
    { ID: 456, Value: true },
  ],
})
```

### To assets

```ts
await client.customAttributes.setAssetCustomAttributes({
  appId: 1,
  assetId: 789,
  attributes: [
    { ID: 123, Value: 'Floor 3' },
  ],
})
```

## Helper functions for attribute values

### `buildCustomAttributeValue`

```ts
function buildCustomAttributeValue(
  attributeNameOrId: string | number,
  value: unknown,
): { ID: string | number; Value: unknown }
```

Validates and builds a custom attribute value object for API submission:

```ts
import { buildCustomAttributeValue } from 'teamdynamix-ts'

const attr = buildCustomAttributeValue(123, 'Engineering')
// → { ID: 123, Value: 'Engineering' }
```

### `buildCustomAttributeFromObject`

```ts
function buildCustomAttributeFromObject(
  attribute: { ID?: string | number; Name?: string } & Record<string, unknown>,
  value: unknown,
): { ID: string | number; Value: unknown }
```

Same as `buildCustomAttributeValue` but extracts the identifier from a full attribute object:

```ts
import { buildCustomAttributeFromObject } from 'teamdynamix-ts'

const attr = buildCustomAttributeFromObject({ ID: 123, Name: 'Department' }, 'Engineering')
// → { ID: 123, Value: 'Engineering' }

// Falls back to Name if ID is missing:
const attr2 = buildCustomAttributeFromObject({ Name: 'Department' }, 'HR')
// → { ID: 'Department', Value: 'HR' }
```

### `getCustomAttributeValue`

```ts
function getCustomAttributeValue(
  object: Record<string, unknown>,
  attributeNameOrId: string | number,
): unknown
```

Extracts a single attribute value from a TeamDynamix entity response by searching its `Attributes` array:

```ts
import { getCustomAttributeValue, projectFields } from 'teamdynamix-ts'

const ticket = await client.tickets.appIdTicketsId({
  params: { path: { appId: 1, id: 456 } },
})

const dept = getCustomAttributeValue(ticket, 'Department')
// → 'Engineering' (or undefined if the attribute isn't set)
```

## Understanding attribute data types

Attribute `DataType` values from the TeamDynamix API:

| DataType | Description | TypeScript mapping |
|---|---|---|
| 1 | Text | `string` |
| 2 | Number | `number` |
| 3 | Yes/No | `boolean` |
| 4 | Date/Time | `string` (ISO) |
| 5 | Single Choice | `string` (selected option) |
| 6 | Multiple Choice | `string[]` |
| 7 | File | `string` (URL) |

Use the registry to get the definitions and check `DataType` before submitting values:

```ts
const defs = await registry.getTicketCustomAttributes({ appId: 1 })
const deptDef = defs.find(a => a.Name === 'Department')
if (deptDef?.DataType === 2) {
  // numeric field — pass a number
  await setAttributes({ attributes: [{ ID: deptDef.ID, Value: 42 }] })
}
```
