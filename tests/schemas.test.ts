import { describe, expect, it } from 'vitest';
import {
  appIdSchema,
  confirmTrueSchema,
  paginationSchema,
  searchTextSchema,
  tenantSchema,
  tokenSchema,
} from '../src/client/schemas/index.js';

describe('client Zod schema boundaries', () => {
  it('accepts valid tenant and token values after trimming', () => {
    expect(tenantSchema.parse('  acme  ')).toBe('acme');
    expect(tokenSchema.parse('  secret-token  ')).toBe('secret-token');
  });

  it('rejects blank tenant and token values', () => {
    expect(() => tenantSchema.parse('   ')).toThrow('too_small');
    expect(() => tokenSchema.parse('')).toThrow('too_small');
  });

  it('accepts appId as non-empty string or non-negative integer', () => {
    expect(appIdSchema.parse('10')).toBe('10');
    expect(appIdSchema.parse(10)).toBe(10);
  });

  it('rejects invalid appId values', () => {
    expect(() => appIdSchema.parse('   ')).toThrow('too_small');
    expect(() => appIdSchema.parse(-1)).toThrow('>=0');
    expect(() => appIdSchema.parse(1.5)).toThrow('invalid_union');
  });

  it('enforces confirm=true literally', () => {
    expect(confirmTrueSchema.parse(true)).toBe(true);
    expect(() => confirmTrueSchema.parse(false)).toThrow('invalid_value');
  });

  it('validates pagination constraints', () => {
    expect(paginationSchema.parse({ page: 1, pageSize: 100 })).toEqual({ page: 1, pageSize: 100 });
    expect(() => paginationSchema.parse({ page: 0 })).toThrow('page');
    expect(() => paginationSchema.parse({ pageSize: 501 })).toThrow('pageSize');
  });

  it('validates search text boundaries', () => {
    expect(searchTextSchema.parse('  laptop  ')).toBe('laptop');
    expect(() => searchTextSchema.parse('')).toThrow('too_small');
    expect(() => searchTextSchema.parse('a'.repeat(501))).toThrow('too_big');
  });
});
