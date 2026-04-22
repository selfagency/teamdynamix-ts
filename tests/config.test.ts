import { describe, expect, it } from 'vitest';
import { createTeamDynamixClient, TeamDynamixClientError } from '../src/client/index.js';

const specPath = `${process.cwd()}/tests/fixtures/openapi-test-spec.json`;

describe('createTeamDynamixClient configuration', () => {
  it('rejects an empty tenant', async () => {
    await expect(
      createTeamDynamixClient({
        tenant: '',
        tokenProvider: () => 'token',
        specPath,
      }),
    ).rejects.toThrow(TeamDynamixClientError);
  });

  it('rejects a whitespace-only tenant', async () => {
    await expect(
      createTeamDynamixClient({
        tenant: '   ',
        tokenProvider: () => 'token',
        specPath,
      }),
    ).rejects.toThrow(TeamDynamixClientError);
  });

  it('rejects a non-HTTPS base URL', async () => {
    await expect(
      createTeamDynamixClient({
        tenant: 'api',
        baseUrl: 'http://api.teamdynamix.com',
        tokenProvider: () => 'token',
        specPath,
      }),
    ).rejects.toThrow(TeamDynamixClientError);
  });

  it('builds production base URL from tenant', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      tokenProvider: () => 'token',
      environment: 'production',
      specPath,
    });
    expect(config.baseUrl).toBe('https://acme.teamdynamix.com');
  });

  it('builds sandbox base URL from tenant', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      tokenProvider: () => 'token',
      environment: 'sandbox',
      specPath,
    });
    expect(config.baseUrl).toBe('https://acme-sandbox.teamdynamix.com');
  });

  it('defaults to production environment', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      tokenProvider: () => 'token',
      specPath,
    });
    expect(config.environment).toBe('production');
  });

  it('accepts an explicit custom HTTPS base URL', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      baseUrl: 'https://custom.teamdynamix.com',
      tokenProvider: () => 'token',
      specPath,
    });
    expect(config.baseUrl).toBe('https://custom.teamdynamix.com');
  });

  it('strips trailing slash from base URL', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      baseUrl: 'https://custom.teamdynamix.com/',
      tokenProvider: () => 'token',
      specPath,
    });
    expect(config.baseUrl).not.toMatch(/\/$/);
  });

  it('uses fail-closed validation mode by default', async () => {
    const { config } = await createTeamDynamixClient({
      tenant: 'acme',
      tokenProvider: () => 'token',
      specPath,
    });
    expect(config.runtimeValidationMode).toBe('fail-closed');
  });
});

describe('TeamDynamixClientError', () => {
  it('exposes code, status, schemaPath, method on the error instance', () => {
    const err = new TeamDynamixClientError('test error', {
      code: 'HTTP_ERROR',
      status: 404,
      schemaPath: '/api/accounts',
      method: 'GET',
    });
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(404);
    expect(err.schemaPath).toBe('/api/accounts');
    expect(err.method).toBe('GET');
    expect(err.name).toBe('TeamDynamixClientError');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores undefined for omitted optional fields', () => {
    const err = new TeamDynamixClientError('minimal', { code: 'NETWORK_ERROR' });
    expect(err.status).toBeUndefined();
    expect(err.schemaPath).toBeUndefined();
    expect(err.method).toBeUndefined();
    expect(err.details).toBeUndefined();
  });

  it('attaches cause when provided', () => {
    const cause = new Error('root');
    const err = new TeamDynamixClientError('wrapped', { code: 'NETWORK_ERROR', cause });
    expect((err as Error & { cause?: unknown }).cause).toBe(cause);
  });
});
