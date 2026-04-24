# Plan: External TDX Functionality Import Roadmap

Adopt high-value functionality patterns from seven external TeamDynamix projects into `teamdynamix-ts` through clean-room reimplementation (no code copy), focused on: (1) advanced ticket/project workflow helpers, (2) bulk people/group/role administration helpers, (3) report execution ergonomics and large-response handling, and (4) API-quirk guardrails. Defer UI/browser-automation and Python analytics pipelines to optional follow-on packages.

## Steps

1. Phase 1 — Baseline and gap confirmation (_blocks all later steps_)
   1.1 Create a feature inventory matrix in docs that maps current `teamdynamix-ts` capabilities against externally observed functionality.
   1.2 Confirm which external features are already implicitly covered by generated read routes but missing curated helper/mutator APIs.
   1.3 Define acceptance criteria for import candidates: reusable in a Node/TypeScript SDK, API-stable, tenant-agnostic, testable with MSW, and aligned with current ESM + Zod + generated-route architecture.

2. Phase 2 — Implement Tier-1 import candidates (core SDK value) (_depends on 1; some items parallel_)
   2.1 Ticket/project API-quirk guardrails (_parallel with 2.2 and 2.3_)
   - Add explicit helper/wrapper behavior for known TeamDynamix quirks validated from external repos/docs:
     - Issue search should normalize `projectId` input to `ProjectIDs: [id]` payload shape for project issue search endpoints.
     - Project issue updates should enforce/prompt required `Comments` presence for update flows where API requires audit-comment semantics.
   - Add input schema validators and error messages that explain the quirk and corrective action.
   - Sources:
     - [tdx-projects-mcp CLAUDE.md](https://github.com/tdx-benheard/tdx-projects-mcp/blob/master/CLAUDE.md)
     - [TeamDynamix.Api.Issues.IssueSearch](https://solutions.teamdynamix.com/TDWebApi/Home/type/TeamDynamix.Api.Issues.IssueSearch)
     - [TeamDynamix.Api.Issues.Issue](https://solutions.teamdynamix.com/TDWebApi/Home/type/TeamDynamix.Api.Issues.Issue)

     2.2 Response-shaping and large payload ergonomics (_parallel with 2.1 and 2.3_)

   - Add opt-in “lightweight projection” helper functions for search/list/feed patterns that return minimal field projections for token/cost-sensitive consumers.
   - Add optional body-preview shaping helper for feed-like entities (metadata + truncated preview) without changing raw endpoint behavior.
   - Preserve full-fidelity GET behavior by default; only helpers apply shaping.
   - Sources:
     - [tdx-tickets-mcp TOOLS.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/TOOLS.md)
     - [tdx-tickets-mcp repository](https://github.com/tdx-benheard/tdx-tickets-mcp)
     - [tdx-projects-mcp README.md](https://github.com/tdx-benheard/tdx-projects-mcp/blob/master/README.md)
     - [tdx-projects-mcp CLAUDE.md](https://github.com/tdx-benheard/tdx-projects-mcp/blob/master/CLAUDE.md)

     2.3 Report execution workflow helper (_parallel with 2.1 and 2.2_)

   - Add a high-level report runner helper that supports:
     - first-page safe defaults,
     - client-side filtering convenience,
     - page/offset abstraction,
     - pagination metadata return contract,
     - iterative retrieval utility for multi-page consumption.
   - Keep helper generic so it can operate across apps where report shape differs.
   - Sources:
     - [tdx-tickets-mcp TOOLS.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/TOOLS.md)
     - [TDXReporter repository](https://github.com/habigerallan/TDXReporter)
     - [TDXReporter run_report.js](https://github.com/habigerallan/TDXReporter/blob/main/js/run_report.js)

3. Phase 3 — Implement Tier-2 administrative workflows (high operational impact) (_depends on 2_)
   3.1 Bulk group membership operations inspired by CSV/admin scripts
   - Add helper methods for bulk user-group operations via existing People endpoints:
     - add users to groups,
     - optional replace/remove-other-group semantics when API supports it,
     - batched processing with deterministic result summary.
   - Provide dry-run mode (validation only, no mutation) and idempotency guidance.
   - Sources:
     - [teamdynamix bulk-group-membership](https://github.com/carriehwillis/teamdynamix/tree/master/bulk-group-membership)
     - [bulk-populate-group.py](https://github.com/carriehwillis/teamdynamix/blob/master/bulk-group-membership/bulk-populate-group.py)

     3.2 Bulk group create/edit convenience workflows

   - Add helper methods that accept typed arrays (not file parsing in core SDK) for:
     - create groups in bulk,
     - edit groups in bulk,
     - per-row success/failure aggregation.
   - Keep CSV ingestion out of core client; if needed, publish CLI utility separately.
   - Sources:
     - [teamdynamix bulk-group-create](https://github.com/carriehwillis/teamdynamix/tree/master/bulk-group-create)
     - [bulk-group-create.py](https://github.com/carriehwillis/teamdynamix/blob/master/bulk-group-create/bulk-group-create.py)
     - [bulk-group-create README0.md](https://github.com/carriehwillis/teamdynamix/blob/master/bulk-group-create/README0.md)
     - [teamdynamix bulk-group-edit](https://github.com/carriehwillis/teamdynamix/tree/master/bulk-group-edit)
     - [bulk-group-edit.py](https://github.com/carriehwillis/teamdynamix/blob/master/bulk-group-edit/bulk-group-edit.py)

     3.3 Security-role and application-access assignment workflow

   - Add admin helper(s) for role/app reassignment workflows analogous to security-role scripts:
     - resolve user by identifier,
     - assign global role,
     - assign org application roles,
     - update application access sets.
   - Require explicit confirmation options for broad-impact operations.
   - Source:
     - [TDX_SecRoles.ps1](https://github.com/aziegler90/TDX-Scripts/blob/main/TDX_SecRoles.ps1)

4. Phase 4 — Optional Tier-3 imports (separate package/feature flags) (_depends on 3, can be deferred_)
   4.1 AI ticket drafting helper abstraction
   - Add optional prompt-contract helper (provider-agnostic) that transforms free-text intake into structured ticket draft payload.
   - Keep LLM provider integration outside core SDK package boundary.
   - Source:
     - [AI-Ticket-Helper app.py](https://github.com/tylerdavis234-ops/AI-Ticket-Helper/blob/main/app.py)

     4.2 Analytics/reporting pipeline companion package

   - Propose `@teamdynamix-ts/analytics` companion package for DuckDB/notebook/report workflows inspired by `dynamix-manager`.
   - Do not merge Python/notebook runtime into core SDK.
   - Source:
     - [dynamix-manager repository](https://github.com/cu-micahcooper/dynamix-manager)

     4.3 Browser UI automation exclusions

   - Explicitly document that extension/DOM-injection report automation patterns are excluded from core SDK due to fragility/security/model mismatch.
   - Sources:
     - [TDXReporter repository](https://github.com/habigerallan/TDXReporter)
     - [TDXReporter content_script.js](https://github.com/habigerallan/TDXReporter/blob/main/js/content_script.js)

5. Phase 5 — Type surface, docs, and tests hardening (_depends on 2/3; docs parallel with tests_)
   5.1 Extend SDK type contracts for all new helper inputs/outputs with strict Zod parsing at boundaries.
   5.2 Add or extend tests:
   - helper behavior tests for pagination/projection/quirk normalization,
   - mutation tests for bulk workflows with partial-failure aggregation,
   - regression tests for destructive-confirm semantics.
     5.3 Update README and docs sections:
   - “Imported capabilities roadmap,”
   - examples for bulk operations and report helpers,
   - caveats for API quirks and response-shaping tradeoffs.

6. Phase 6 — Rollout strategy and compatibility (_depends on 5_)
   6.1 Release in staged manner:
   - Stage A: additive helpers only (no breaking changes),
   - Stage B: optional stricter validations behind explicit options,
   - Stage C: promote recommended helper workflows in docs.
     6.2 Add deprecation/compat notes if any existing helper names conflict.
     6.3 Publish migration notes for consumers who want lightweight vs full-detail responses.

## Relevant files

- `src/client/sdk/types.ts` — extend SDK helper/mutation type contracts.
- `src/client/schemas/common.ts` and `src/client/schemas/index.ts` — shared input schemas for new helper contracts.
- `src/client/sdk/request.ts` — request execution behavior (if pagination/filter convenience needs shared request primitives).
- `tests/sdk-mutations.test.ts` — add bulk/admin mutator coverage.
- `tests/sdk.test.ts` — add helper workflow tests.
- `tests/sdk-edge.test.ts` — add regression tests for confirmation and fail-open/fail-closed interactions.
- `tests/fixtures/openapi-test-spec.json` — fixture additions if new helper wrappers rely on covered routes.
- `README.md` — document imported functionality and usage.
- `docs/guide/index.md` and `docs/developer/index.md` — implementation and operational guidance.
- `docs/guide/quick-start.md` — practical snippets for new helpers.

## Verification

1. Run static checks: `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`, `pnpm run lint:md`.
2. Run targeted SDK tests and then full suite: `pnpm run test` and `pnpm run test:coverage`.
3. Validate generated consistency if route metadata touched: `pnpm run generate:all` followed by `pnpm run generate:types:check`.
4. Manually verify docs rendering paths: `pnpm run docs:dev` and `pnpm run docs:build`.
5. Perform behavior smoke tests in MSW-backed tests for:
   - issue search payload normalization,
   - required-comments enforcement for issue updates,
   - report helper pagination metadata,
   - bulk group operation partial-failure aggregation.

## Decisions

- Included now:
  - MCP-derived workflow patterns (search→get, lightweight responses, feed/read ergonomics),
  - projects/issues quirk handling (`ProjectIDs` normalization and update-comment safeguards),
  - bulk people/group/role administration workflows as typed SDK helpers,
  - report execution and pagination convenience.
- Excluded now:
  - Browser extension DOM automation from `TDXReporter` (not API-SDK aligned),
  - Direct Streamlit/LLM UI from `AI-Ticket-Helper` (optional companion),
  - Python notebook analytics runtime from `dynamix-manager` in core package.
- Implementation policy:
  - clean-room reimplementation of ideas only, no copying external code,
  - preserve existing API behavior; introduce additive helpers and explicit opt-in shaping.

## Further Considerations

1. Bulk ingest interface strategy:
   - Option A (recommended): SDK accepts typed arrays; optional separate CLI converts CSV→typed payload.
   - Option B: Add CSV parsing in SDK (not recommended; adds I/O concerns to core library).
2. Response shaping defaults:
   - Option A (recommended): default full responses; lightweight projections only through explicit helper methods.
   - Option B: global default projection mode (higher risk of surprising existing consumers).
3. Role-management blast-radius controls:
   - Option A (recommended): require explicit `confirm` and provide per-user dry-run preview.
   - Option B: allow immediate bulk apply without preview (faster but riskier).

## External source references

### Primary repositories reviewed

- [carriehwillis/teamdynamix](https://github.com/carriehwillis/teamdynamix)
- [tdx-benheard/tdx-projects-mcp](https://github.com/tdx-benheard/tdx-projects-mcp)
- [cu-micahcooper/dynamix-manager](https://github.com/cu-micahcooper/dynamix-manager)
- [aziegler90/TDX-Scripts (TDX_SecRoles.ps1)](https://github.com/aziegler90/TDX-Scripts/blob/main/TDX_SecRoles.ps1)
- [tdx-benheard/tdx-tickets-mcp](https://github.com/tdx-benheard/tdx-tickets-mcp)
- [tylerdavis234-ops/AI-Ticket-Helper](https://github.com/tylerdavis234-ops/AI-Ticket-Helper)
- [habigerallan/TDXReporter](https://github.com/habigerallan/TDXReporter)

### Key supporting docs/files

- [tdx-tickets-mcp TOOLS.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/TOOLS.md)
- [tdx-tickets-mcp ADVANCED.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/ADVANCED.md)
- [tdx-tickets-mcp MCP-SETUP.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/MCP-SETUP.md)
- [tdx-tickets-mcp CLAUDE.md](https://github.com/tdx-benheard/tdx-tickets-mcp/blob/main/CLAUDE.md)
- [tdx-projects-mcp README.md](https://github.com/tdx-benheard/tdx-projects-mcp/blob/master/README.md)
- [tdx-projects-mcp CLAUDE.md](https://github.com/tdx-benheard/tdx-projects-mcp/blob/master/CLAUDE.md)
- [TeamDynamix.Api.Issues.IssueSearch](https://solutions.teamdynamix.com/TDWebApi/Home/type/TeamDynamix.Api.Issues.IssueSearch)
- [TeamDynamix.Api.Issues.Issue](https://solutions.teamdynamix.com/TDWebApi/Home/type/TeamDynamix.Api.Issues.Issue)
