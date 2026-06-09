---
---

# Quick Start

## Install

Use your package manager to install the package.

```bash
pnpm add teamdynamix-ts
```

## Create a client

```ts
import { createTeamDynamixClient, loginWithPassword } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: loginWithPassword({
    tenant: 'api',
    username: process.env.TD_USERNAME!,
    password: process.env.TD_PASSWORD!,
  }),
  environment: 'production',
  runtimeValidationMode: 'fail-closed',
});
```

Or authenticate with an admin service account:

```ts
import { loginWithServiceAccount } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: loginWithServiceAccount({
    tenant: 'api',
    beid: process.env.TD_BEID!,
    webServicesKey: process.env.TD_WSKEY!,
  }),
});
```

## Make a request

```ts
const accounts = await client.referenceData.accounts();
```

## Curated helpers

```ts
const projected = projectFields(accounts, ['ID', 'Name']);
const preview = previewEntity(accounts[0] ?? {}, { bodyField: 'Description' });
```

## Learn more

- [API overview](/api/)
- [Full OpenAPI Spec View](/api/spec)
