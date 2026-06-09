# API Reference

The full TeamDynamix Web API specification is available as an interactive OpenAPI document below.

## Operations

This spec is auto-generated from the official TeamDynamix Web API [Swagger document](https://api.teamdynamix.com/help). It covers all endpoints the SDK wraps — including the many GET endpoints not curated as SDK domain methods.

## SDK coverage map

The SDK doesn't expose every single API endpoint as a method. Instead:

- **All GET endpoints are auto-generated** as typed read methods on the appropriate domain — see [SDK Domains](/guide/sdk-domains) for the complete list.
- **Curated mutations** cover the most useful create/update/delete operations — see [SDK Mutations](/guide/sdk-mutations).
- **Everything else** is accessible via the [raw client](/guide/advanced) (`client._client`) for one-off custom calls.

## Interactive Spec

<script setup>
import { useData } from 'vitepress'
const { isDark } = useData()
</script>

<iframe
  :src="`https://teamdynamix-ts.self.agency/api/openapi.html${isDark ? '?theme=dark' : ''}`"
  style="width: 100%; height: 100vh; border: none;"
  title="OpenAPI Specification"
/>
