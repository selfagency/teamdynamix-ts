#!/usr/bin/env node

/**
 * Script to add custom attributes support to build-sdk.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildSdkPath = path.join(__dirname, '../src/client/sdk/build-sdk.ts');
let content = fs.readFileSync(buildSdkPath, 'utf-8');

// Add custom attribute methods to createTicketMutations
content = content.replace(
  /const createTicketMutations = \(client: TeamDynamixFetchClient\): TicketMutations =\> \(\{/,
  `const createTicketMutations = (client: TeamDynamixFetchClient): TicketMutations => ({
  ...createTicketCustomAttributes(client),`
);

// Add custom attribute methods to createAssetMutations
content = content.replace(
  /const createAssetMutations = \(client: TeamDynamixFetchClient\): AssetMutations =\> \(\{/,
  `const createAssetMutations = (client: TeamDynamixFetchClient): AssetMutations => ({
  ...createAssetCustomAttributes(client),`
);

// Add registry to SDK return
content = content.replace(
  /helpers: createHelpers\(client\)\n  \};/,
  `helpers: createHelpers(client),
    registry: createCustomAttributesRegistry(client)
  };`
);

fs.writeFileSync(buildSdkPath, content, 'utf-8');
console.log('✓ Updated build-sdk.ts with custom attributes support');
