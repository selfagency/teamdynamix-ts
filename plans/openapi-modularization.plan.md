# Plan: Modularize OpenAPI generation safely

Split OpenAPI generation into configurable, domain-aware units to reduce TypeScript compiler pressure while preserving backward compatibility. Keep a canonical single-spec output for existing consumers, then incrementally introduce multi-spec outputs and per-domain type generation.

## Steps

1. Phase 1 — Stabilize current pipeline (blocking)
   1. Wire `prepare-types-input.ts` into the normal generation flow so `output/openapi-types.json` is always produced deterministically after phase 6.
   2. Preserve current script contracts (`generate:all`, `generate:types`, docs sync) while removing hidden/manual steps.
   3. Add regression checks to compare canonical outputs before/after this change.

2. Phase 2 — Introduce config abstraction (depends on 1)
   1. Create a typed pipeline config (spec name, sourceDir, outputDir, domain/tag mapping, generation options).
   2. Refactor `scripts/parser/generate-client.ts` internals to read config rather than hard-coded paths/mappings.
   3. Keep defaults matching current behavior so no immediate downstream breakage.

3. Phase 3 — Add multi-spec orchestrator (depends on 2)
   1. Add `specs.json`/config listing spec roots and output folders.
   2. Add orchestrator script to run phase pipeline for each configured spec.
   3. Isolate artifacts under `output/{specName}/...` to avoid collisions.
   4. Continue producing canonical `output/openapi-types.json` from the designated primary spec for compatibility.

4. Phase 4 — Reduce compiler load with per-domain type outputs (depends on 3)
   1. Generate TypeScript types per domain/spec (`src/generated/{domain}/schema.d.ts`) instead of only a monolithic file.
   2. Update SDK modules to import domain-local generated types where possible.
   3. Retain top-level aggregate type output temporarily for migration safety.

5. Phase 5 — Docs and build integration (parallel with 4 after 3)
   1. Update docs sync to support multiple specs (`docs/public/specs/{specName}/openapi.json`) while preserving default docs behavior.
   2. Update VitePress API nav to optionally expose domain/spec switchers.
   3. Ensure docs builds are deterministic and avoid reintroducing memory-heavy paths in local development.

6. Phase 6 — CI hardening and migration cleanup (depends on 4 and 5)
   1. Add CI checks for multi-spec generation and type generation integrity.
   2. Add validation that all `$ref` pointers resolve in every produced spec.
   3. Remove deprecated single-path internals once domain-based generation is stable.

## Parallelization and dependencies

- Blocking critical path: Phase 1 → 2 → 3 → 4 → 6.
- Phase 5 can run in parallel with Phase 4 after Phase 3 exists.
- CI hardening (Phase 6) should only finalize after both Phase 4 and 5 pass.

## Relevant files

- `package.json` — add/adjust scripts for parse-all, multispec orchestration, and type generation variants.
- `scripts/parser/parse-all.ts` — wire deterministic prepare-types step and canonical output flow.
- `scripts/parser/prepare-types-input.ts` — keep as sanitization contract; ensure invocation and output path strategy are explicit.
- `scripts/parser/generate-client.ts` — refactor hard-coded path/domain assumptions behind config.
- `scripts/parser/` (new orchestrator/config files) — add spec config types and multi-spec runner.
- `src/generated/` — introduce per-domain type output layout.
- `scripts/sync-docs-openapi.mjs` — evolve from single-spec sync to multi-spec-capable sync.
- `docs/.vitepress/config.ts` — optional multi-spec docs navigation support.
- `.github/workflows/ci.yml` — enforce multi-spec generation and type checks.

## Verification

1. Baseline: run current `generate:all`, `generate:types`, and docs build; snapshot artifacts.
2. After Phase 1: verify canonical outputs are unchanged except expected sanitization normalization.
3. After Phase 3: verify each configured spec produces isolated valid artifacts and canonical fallback is intact.
4. After Phase 4: measure TypeScript build/typecheck memory and duration against baseline.
5. After Phase 5: verify docs build and API navigation work for canonical and optional multi-spec routes.
6. After Phase 6: ensure CI gates catch unresolved refs, missing outputs, and domain mapping drift.

## Decisions

- In scope: modular spec generation architecture and per-domain type generation to reduce compiler load.
- Included compatibility: maintain canonical `output/openapi-types.json` during migration.
- Deferred (explicitly out of immediate scope): replacing SDK public API surface in one step; that should remain incremental.

## Further considerations

1. Domain boundaries: tag-based grouping is easiest initially; path-prefix fallback should exist for ambiguous tags.
2. Rollout model: feature-flagged multi-spec scripts reduce risk while preserving the current stable path.
3. Success metric: treat memory reduction and typecheck duration as acceptance gates, not just functional output parity.
