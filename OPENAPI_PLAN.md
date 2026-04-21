# OpenAPI Conversion Plan

## Overview

Convert TeamDynamix API documentation (markdown in `sources/TDWebApi/`)
into a complete OpenAPI 3.1 specification through a 7-phase process.

### Folder Structure

The documentation is organized as:

- `Home/index.md` - Documentation index
- `Home/section/` - Feature groupings (Tickets, Accounts, etc.)
- `Home/member/` - Endpoint definitions with HTTP methods
- `Home/type/` - Type/schema definitions

## Phase 1: Parser Infrastructure ✅ COMPLETE

Build TypeScript parser classes to extract data from markdown.

- `MarkdownParser` - Parse content into sections
- `EndpointExtractor` - Extract HTTP endpoints
- `TypeExtractor` - Extract type definitions
- `CrossReferenceResolver` - Link endpoints to types

**Status**: Complete - All parser code compiles with zero type errors

## Phase 2: Schema Generation ⏳ NEXT

Extract all type definitions and convert to OpenAPI schemas.

- Process all `.md` files in `Home/member/` and `Home/type/`
- Parse properties with correct type mappings
- Handle enum types and variants
- Consolidate type variants
- Generate `$defs` for all types

**Estimated**: 3-4 hours

## Phase 3: Endpoint & Operation Generation ⏳ PLANNED

Extract endpoints and generate OpenAPI operations.

- Process section files for endpoint grouping
- Extract HTTP method and path patterns
- Parse parameters (path, query, body)
- Parse response schemas
- Generate operationId for each endpoint

**Estimated**: 2-3 hours

## Phase 4: Metadata & Global Definitions ⏳ PLANNED

Add global metadata and reusable components.

- Extract metadata from `Home/About*.md` files
- Build OpenAPI info object
- Define security schemes (Bearer auth)
- Define common parameters and responses

**Estimated**: 1-2 hours

## Phase 5: Enrichment & Examples ⏳ PLANNED

Add documentation and examples.

- Generate realistic request/response examples
- Add descriptions for endpoints and parameters
- Add server information
- Document rate limiting and constraints

**Estimated**: 2-3 hours

## Phase 6: Validation & Output ⏳ PLANNED

Validate and generate output files.

- Validate spec against OpenAPI 3.1 schema
- Resolve all `$ref` pointers
- Generate `openapi.json` and `openapi.yaml`
- Generate human-readable documentation

**Estimated**: 1-2 hours

## Phase 7: Integration & Maintenance ⏳ PLANNED

Integrate into repository and set up maintenance.

- Place `openapi.json` in project root
- Set up automated validation in CI/CD
- Generate TypeScript SDK
- Document versioning strategy

**Estimated**: 1-2 hours

## Timeline

**Total**: 12-19 hours

## Success Criteria

- OpenAPI 3.1 spec validates completely
- All ~26 type definitions included
- All documented endpoints extracted
- All parameters correctly mapped
- Zero broken references
- TypeScript client generation works
- Complete documentation coverage
