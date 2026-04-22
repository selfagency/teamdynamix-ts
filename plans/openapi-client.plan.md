## Plan: Secure TeamDynamix TS Client via openapi-ts.dev

Build a Node-first, secure, generated TypeScript client from the existing OpenAPI 3.1 spec (`/Users/daniel/Developer/teamdynamix-ts/src/openapi.yaml`) using `openapi-typescript` + `openapi-fetch`, with runtime validation for all endpoints, auth and resiliency middleware, contract tests, and CI drift checks. The implementation will reuse the existing 6-phase spec pipeline and add a deterministic client-generation phase and validation gates.

**Steps**

1. Phase 0 — Baseline and constraints (blocks all later steps)
   1.1 Confirm source-of-truth spec path and generated artifact policy: use `output/openapi.json` (post-phase enrichment) as type/client generation input and keep `src/openapi.yaml` as canonical checked-in spec source.
   1.2 Confirm packaging constraints from current repo: ESM (`"type": "module"`), Node-first runtime, strict TS (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
   1.3 Record current known schema quality caveat: many endpoint responses are minimally shaped (`object` with sparse properties), which limits runtime validation precision unless parser improvements are introduced.

2. Phase 1 — Tooling integration for deterministic generation (depends on 1)
   2.1 Add generation dependencies and scripts for `openapi-typescript` (v7) and `openapi-fetch` usage in source, plus optional Redocly config support for linted generation.
   2.2 Add deterministic scripts:
   - `generate:types` (input `output/openapi.json` → `src/generated/schema.d.ts`)
   - `generate:types:check` (`openapi-typescript --check` for drift detection)
   - `generate:client` (assemble runtime client modules consuming generated `paths/components`)
   - `generate:all` (pipeline + types + client surface)
     2.3 Wire parse pipeline sequencing so generation runs only after phase 6 succeeds (or via explicit composed script).
     2.4 Decide generated-file policy (committed vs generated in CI) and encode it in scripts/CI.

3. Phase 2 — Generation config and schema quality gates (depends on 2)
   3.1 Create Redocly config for generation-time linting and future multi-spec support; include recommended rules from openapi-ts advanced guidance:
   - `operation-operationId-unique: error`
   - `operation-parameters-unique: error`
   - `path-not-include-query: error`
   - enforce OpenAPI `3.1`
     3.2 Configure `openapi-typescript` flags suited to this spec:
   - enable `--path-params-as-types`
   - enable `--generate-path-params` (to harden flaky path parameter declarations)
   - evaluate `--read-write-markers` and enable if schema has meaningful `readOnly/writeOnly`
   - keep `--default-non-nullable` default behavior explicit for predictability
     3.3 Add pre-generation guard in pipeline report: fail or warn on schema anti-patterns that reduce TS fidelity (empty object schemas, missing response content schemas, inconsistent params).

4. Phase 3 — Client module architecture (depends on 2, parallel with 4 test scaffolding prep)
   4.1 Create a layered client surface:
   - `core/config` (tenant, environment, token provider, retry policy, timeout, headers)
   - `core/client` (typed `openapi-fetch` client over generated `paths`)
   - `core/errors` (normalized error taxonomy)
   - `middleware/*` (auth, rate-limit/retry, telemetry, safe error mapping)
   - `index` exports (single entrypoint)
     4.2 Implement strict base URL construction from tenant + environment:
   - production `https://{tenant}.teamdynamix.com`
   - sandbox `https://{tenant}-sandbox.teamdynamix.com`
     4.3 Ensure request APIs remain OpenAPI-native path literals (no runtime path construction that degrades inference).

5. Phase 4 — Security hardening design (depends on 4.1, can run parallel with 6)
   5.1 Auth middleware:
   - inject `Authorization: Bearer <token>` on protected routes
   - support token provider callback + refresh hook
   - support conditional auth exclusion list for login/public routes
     5.2 Threat-focused controls (explicitly documented in code and README):
   - Threat: token leakage → redact auth headers in logs/errors
   - Threat: credential persistence misuse → avoid long-lived in-memory token for server multi-tenant mode; prefer provider callback
   - Threat: accidental insecure transport → enforce `https` base URL validation
   - Threat: request replay/amplification under retry → idempotency-aware retry policy and bounded attempts
   - Threat: deserialization trust on bad payloads → runtime validation + typed error fallback
     5.3 Middleware error semantics aligned to openapi-fetch:
   - distinguish transport errors (`onError`) vs HTTP error responses (`onResponse`)
   - map 4xx/5xx to normalized error types preserving status and operation context.

6. Phase 5 — Runtime validation strategy (depends on 4; parallel with 7 CI work)
   6.1 Implement runtime validation for all endpoints at the client boundary using generated-schema-backed validators (or generated validator modules) so every response/request path is validated before exposure.
   6.2 Define strict behavior for validation mismatch:
   - return typed validation error containing operation, expected schema key, and parse diagnostics
   - never silently coerce unknown payloads
     6.3 Add configuration switch for fail-open vs fail-closed (default fail-closed for secure mode).
     6.4 Capture known limitation: where OpenAPI schemas are underspecified, validators can only enforce available constraints; include remediation backlog items for parser/schema enrichment.

7. Phase 6 — Resilience and rate-limit behavior (depends on 4, 5)
   7.1 Implement retry middleware for retryable classes only:
   - HTTP 429, 502, 503, 504 + network failures
   - exponential backoff + jitter + max attempt cap
   - honor `Retry-After` when present
     7.2 Add method-aware retry safety:
   - default retry safe/idempotent methods
   - opt-in retry for non-idempotent operations only with explicit config
     7.3 Expose rate-limit telemetry hooks for callers.

8. Phase 7 — Test strategy (depends on 4/5/6; some scaffolding parallel with 3)
   8.1 Unit tests (Vitest) for:
   - base URL/tenant resolution
   - auth middleware behavior and exclusion paths
   - retry/backoff decisions and Retry-After honoring
   - error normalization from transport and HTTP cases
   - runtime validation pass/fail matrix
     8.2 Integration-style client tests (MSW) using generated `paths` types:
   - happy-path typed responses
   - representative 400/401/403/404/409/422/429/5xx cases
   - malformed payload to validate fail-closed behavior
     8.3 Add typed mock helpers so test payloads remain schema-aligned and drift-resistant.

9. Phase 8 — CI and drift enforcement (depends on 2, 7)
   9.1 Extend CI workflow to run in order:
   - install
   - `parse:all`
   - `generate:types`
   - `generate:types:check`
   - typecheck
   - lint/format check
   - tests
     9.2 Add failure messaging that distinguishes spec drift vs runtime/test failures.
     9.3 Optionally publish generated artifacts on tagged releases if package distribution is part of scope.

10. Phase 9 — Documentation and developer UX (depends on 3/5/8)
    10.1 Update repository docs with:
    - generation lifecycle and source-of-truth files
    - secure client initialization examples (tenant/env/token provider)
    - retry/validation configuration table
    - guidance for adding/maintaining endpoints when parser output changes
      10.2 Add troubleshooting guide (common generation failures, Redocly lint failures, spec mismatch diagnostics).

11. Phase 10 — Optional schema-quality uplift backlog (explicitly non-blocking for v1, parallel post-v1)
    11.1 Improve parser/schema extraction to reduce `object` placeholders and enrich request/response schemas.
    11.2 Add structured extraction for parameter metadata completeness.
    11.3 Re-run generation to tighten types and validators as schema quality improves.

**Relevant files**

- `/Users/daniel/Developer/teamdynamix-ts/package.json` — add generation/check scripts and dependencies.
- `/Users/daniel/Developer/teamdynamix-ts/tsconfig.json` — verify compiler options remain compatible with generated declarations and strict mode.
- `/Users/daniel/Developer/teamdynamix-ts/scripts/parser/parse-all.ts` — add or coordinate post-parse generation orchestration.
- `/Users/daniel/Developer/teamdynamix-ts/scripts/parser/parse-phase4.ts` — existing security schemes/servers metadata source used by generated client assumptions.
- `/Users/daniel/Developer/teamdynamix-ts/src/openapi.yaml` — source spec; maintain semantic correctness for generation fidelity.
- `/Users/daniel/Developer/teamdynamix-ts/output/openapi.json` — generation input artifact after enrichment/validation.
- `/Users/daniel/Developer/teamdynamix-ts/src/index.ts` — export stable public client API.
- `/Users/daniel/Developer/teamdynamix-ts/.github/workflows/quality.yml` — integrate generation + drift + tests in CI.
- `/Users/daniel/Developer/teamdynamix-ts/README.md` (or docs files) — update usage/generation/security guidance.
- `/Users/daniel/Developer/teamdynamix-ts/redocly.yaml` (new) — lint and multi-schema generation policy.
- `/Users/daniel/Developer/teamdynamix-ts/src/generated/*` (new) — generated OpenAPI TS declarations and related artifacts.
- `/Users/daniel/Developer/teamdynamix-ts/src/client/*` (new) — secure runtime wrapper and middleware.
- `/Users/daniel/Developer/teamdynamix-ts/tests/*` (new) — unit + MSW integration tests.

**Verification**

1. Schema and generation integrity:
   - Run parse pipeline end-to-end and confirm `output/openapi.json` regenerates cleanly.
   - Run type generation and ensure no generation errors.
   - Run drift check in a clean workspace and verify it passes when files are up-to-date.
2. Type safety and compile guarantees:
   - Run TypeScript typecheck across source + generated modules with strict options.
   - Validate path literal inference and request/response typing in sample client calls.
3. Security behavior checks:
   - Verify Authorization header injection only where expected.
   - Verify logs/errors redact secrets.
   - Verify non-HTTPS base URL is rejected.
4. Runtime validation checks:
   - Assert valid payloads pass and invalid payloads fail with structured validation errors.
   - Confirm fail-closed default and configurable behavior.
5. Resilience checks:
   - Simulate 429/5xx and network failures with MSW; assert bounded retries, backoff, Retry-After handling.
   - Verify non-idempotent methods are not retried unless explicitly enabled.
6. CI enforcement:
   - Confirm workflow fails on generation drift or schema lint/type/test failures with actionable logs.

**Decisions**

- Chosen runtime target: Node-first.
- Validation level: runtime validation for all endpoints.
- Included v1 deliverables: typed fetch wrapper, bearer auth middleware with refresh hook, rate-limit/retry middleware, Vitest+MSW tests, CI drift check.
- Scope includes secure client generation and repo integration; scope excludes full parser refactor for schema completeness (tracked as optional uplift).
- openapi-to-typescript skill note about 3.0-only is superseded by `openapi-typescript` v7 docs and existing OpenAPI 3.1 support in project and tooling.

**Further Considerations**

1. Validator implementation path:
   - Option A: generated validator artifacts from OpenAPI schemas (preferred for full-endpoint runtime validation consistency).
   - Option B: hand-written validators around critical domains first (faster initial delivery, weaker coverage).
2. Generated artifact commit policy:
   - Option A: commit generated files for consumer convenience and deterministic releases.
   - Option B: generate in CI/publish pipeline only to reduce VCS churn.
3. Retry policy strictness:
   - Option A: safe-method retries only by default (recommended).
   - Option B: broader retries with per-endpoint allowlist if operationally required.
