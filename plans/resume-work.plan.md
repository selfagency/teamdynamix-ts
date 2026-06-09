# Plan: Resume TeamDynamix-TS Development

This plan addresses the current state of the project and prioritizes the most critical work to get the project functional and implement the planned features.

## Current State Assessment

### What's Working

- Core client infrastructure exists with authentication and validation
- Basic SDK structure with domain-based organization is in place
- Some helper functions are implemented (findAccountByName, findUserByEmail, resolveTicketLookupContext)
- Test infrastructure is set up with MSW for mocking
- OpenAPI spec exists at `src/spec/openapi.yaml`

### What's Broken

- Historical blocker: the original OpenAPI pipeline expected `sources/TDWebApi` and was replaced
- The current generation pipeline is working and deterministic

### What's Missing

- Asset attachments and other remaining feature gaps from TDXLib
- Optional caching and configuration-file support
- Wider helper surface for non-group bulk workflows

## Immediate Priority: Fix the OpenAPI Pipeline

### Step 1: OpenAPI Pipeline

The pipeline is already fixed and should be treated as completed infrastructure.

1. Keep `generate:all` deterministic
2. Preserve `docs:sync-openapi` compatibility
3. Treat the existing canonical spec as the source of truth

### Step 2: Implement Critical SDK Features

The core helper surface is now implemented. Remaining work is smaller and mostly additive:

1. **Remaining gaps**
   - Asset attachments
   - Optional caching
   - Configuration-file support

2. **Keep existing helpers stable**
   - Issue search normalization
   - Project issue update comment requirements
   - Projection/report/bulk helpers

### Step 3: Add Value-Add Features

Most of the originally planned helper work is now in the codebase. Optional follow-ons:

1. **Future search helpers**
   - Additional lookup convenience wrappers

2. **Future bulk operations**
   - Additional admin workflows beyond group membership and group management

## Implementation Plan

### Phase 1: OpenAPI Generation

✅ Completed. The pipeline is deterministic and currently passing end-to-end.

### Phase 2: API-Quirk Guardrails

✅ Completed. Issue search normalization and issue update comment enforcement are implemented and tested.

### Phase 3: Response-Shaping Helpers

✅ Completed. `projectFields` and `previewEntity` are implemented and exported.

### Phase 4: Report Execution Helper

✅ Completed. `runTicketReport` is available and covered by tests.

### Phase 5: Enhanced Search and Lookup

✅ Completed for the current planned surface. Additional lookup wrappers can still be added later.

### Phase 6: Basic Bulk Operations

✅ Completed for group-management workflows. Additional bulk helpers remain a future extension.

## Verification

For each phase:

1. Run static checks: `pnpm run typecheck`, `pnpm run lint`, `pnpm run format:check`
2. Run tests: `pnpm run test`
3. Generate documentation: `pnpm run docs:build`
4. Validate generated types: `pnpm run generate:types:check`

## Success Metrics

1. All generation scripts work without errors
2. Test coverage remains above 80%
3. Documentation builds successfully
4. New helper functions are well-tested and documented
5. The SDK provides clear value over the raw OpenAPI client

## Next Steps After Completion

Once these phases are complete, we can:

1. Revisit the OpenAPI modularization plan with a more stable codebase
2. Consider additional features from the original plans
3. Improve performance and reduce bundle size
4. Add more advanced workflow helpers based on user feedback
