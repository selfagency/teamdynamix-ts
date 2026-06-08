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
- OpenAPI generation pipeline is failing (expects source files in `sources/TDWebApi` which don't exist)
- No output directory is being generated
- Generate scripts can't run without the pipeline output

### What's Missing
- API-quirk guardrails for TeamDynamix-specific behaviors
- Response-shaping helpers for large payloads
- Report execution helpers
- Bulk operations
- Advanced workflow helpers

## Immediate Priority: Fix the OpenAPI Pipeline

### Step 1: Use Existing OpenAPI Spec Directly (Quick Fix)
Since we already have a valid OpenAPI spec at `src/spec/openapi.yaml`, let's bypass the broken markdown parsing pipeline and use it directly.

1. Create a simple script to copy the existing spec to the expected output location
2. Modify the generate-client script to work with the existing spec
3. Test the generation pipeline

### Step 2: Implement Critical SDK Features
Focus on the most valuable features from the additional functionality plan:

1. **API-Quirk Guardrails** (Tier-1)
   - Issue search payload normalization (`projectId` → `ProjectIDs: [id]`)
   - Project issue update comment requirements
   - Input validation and clear error messages

2. **Response-Shaping Helpers** (Tier-1)
   - Lightweight projection helpers for search/list endpoints
   - Optional body-preview shaping for feed-like entities
   - Preserve full-fidelity behavior by default

3. **Report Execution Helper** (Tier-1)
   - Pagination abstraction
   - Page/offset handling
   - Metadata return contract

### Step 3: Add Value-Add Features
Implement the most useful helper functions:

1. **Enhanced Search Helpers**
   - Add more lookup functions based on common patterns
   - Improve existing helpers with better error handling

2. **Basic Bulk Operations** (Simplified)
   - Focus on the most common use cases
   - Add dry-run mode and result aggregation

## Implementation Plan

### Phase 1: Fix OpenAPI Generation (1-2 days)
1. Create a simple script to copy existing spec to output location
2. Update generate-client to work with existing spec
3. Test generation pipeline and ensure it produces the expected outputs
4. Update documentation generation to work with the new flow

### Phase 2: Implement API-Quirk Guardrails (2-3 days)
1. Add helper functions for common TeamDynamix API quirks
2. Implement input validation with clear error messages
3. Add tests for quirk handling
4. Update documentation with examples

### Phase 3: Response-Shaping Helpers (2-3 days)
1. Implement lightweight projection helpers
2. Add optional response shaping utilities
3. Ensure backward compatibility
4. Add tests and documentation

### Phase 4: Report Execution Helper (2 days)
1. Implement report execution workflow helper
2. Add pagination abstraction
3. Create result aggregation utilities
4. Add tests and examples

### Phase 5: Enhanced Search and Lookup (1-2 days)
1. Add more lookup functions based on common patterns
2. Improve error handling in existing helpers
3. Add caching where appropriate
4. Update tests and documentation

### Phase 6: Basic Bulk Operations (3-4 days)
1. Implement simplified bulk operations for most common use cases
2. Add dry-run mode and result aggregation
3. Add proper error handling and partial failure support
4. Add comprehensive tests

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