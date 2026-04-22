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
import { createTeamDynamixClient } from 'teamdynamix-ts';

const { client } = await createTeamDynamixClient({
  tenant: 'api',
  tokenProvider: async () => process.env.TEAMDYNAMIX_TOKEN ?? '',
  environment: 'production',
  runtimeValidationMode: 'fail-closed',
});
```

## Make a request

```ts
const accounts = await client.referenceData.accounts();
```

## Learn more

- [API overview](/api/)
- [Full OpenAPI Spec View](/api/spec)
