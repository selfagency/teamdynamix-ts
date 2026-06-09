---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: teamdynamix-ts
  text: TypeScript client for the TeamDynamix Web API
  actions:
    - theme: brand
      text: Quick Start
      link: /guide/quick-start
    - theme: alt
      text: SDK Reference
      link: /guide/sdk-domains
    - theme: alt
      text: GitHub
      link: https://github.com/selfagency/teamdynamix-ts

features:
  - title: Type-safe SDK
    details: Zod-validated request/response schemas with runtime validation. Every API call checks inputs at the boundary.
  - title: Auto-generated reads
    details: All GET endpoints are auto-generated from the OpenAPI spec — 150+ read methods across 10 domains.
  - title: Curated mutations
    details: Intentionally designed write operations (create ticket, update asset, add comment, etc.) with safety gates on destructive actions.
  - title: Auth helpers
    details: Built-in username/password and service account login. Handles JWT refresh transparently.
  - title: Retry & resilience
    details: Configurable exponential backoff with jitter. Retries on 429/502/503/504 and network errors.
  - title: Runtime validation
    details: Optional AJV-based validation against the OpenAPI spec. Fail-closed or fail-open modes.
---
