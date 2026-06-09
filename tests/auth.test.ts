import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { loginWithPassword, loginWithServiceAccount, createTokenProviderFromJWT } from '../src/client/auth.js';
import { server } from './setup-msw.js';

const tenant = 'testtenant';
const baseUrl = `https://${tenant}.teamdynamix.com`;
const fqdnTenant = 'td.myuniversity.edu';
const fqdnBaseUrl = `https://${fqdnTenant}`;

const passwordLoginUrl = `${baseUrl}/api/auth/login`;
const adminLoginUrl = `${baseUrl}/api/auth/loginadmin`;

describe('loginWithPassword', () => {
  it('returns a token provider function', () => {
    const provider = loginWithPassword({ tenant, username: 'u', password: 'p' });
    expect(provider).toBeInstanceOf(Function);
  });

  it('sends POST /api/auth/login with username/password and returns the JWT', async () => {
    server.use(
      http.post(passwordLoginUrl, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ username: 'alice', password: 'secret' });
        return new HttpResponse('jwt-token-123', { status: 200 });
      }),
    );

    const provider = loginWithPassword({ tenant, username: 'alice', password: 'secret' });
    await expect(provider()).resolves.toBe('jwt-token-123');
  });

  it('throws TeamDynamixClientError on non-OK response', async () => {
    server.use(http.post(passwordLoginUrl, () => new HttpResponse('Unauthorized', { status: 401 })));

    const provider = loginWithPassword({ tenant, username: 'bad', password: 'wrong' });
    await expect(provider()).rejects.toMatchObject({
      name: 'TeamDynamixClientError',
      code: 'AUTH_ERROR',
      status: 401,
    });
  });

  it('accepts a full FQDN as tenant', async () => {
    const fqdnLoginUrl = `${fqdnBaseUrl}/api/auth/login`;
    let calledUrl = '';

    server.use(
      http.post(fqdnLoginUrl, async ({ request }) => {
        calledUrl = request.url;
        return new HttpResponse('fqdn-jwt', { status: 200 });
      }),
    );

    const provider = loginWithPassword({ tenant: fqdnTenant, username: 'u', password: 'p' });
    await expect(provider()).resolves.toBe('fqdn-jwt');
    expect(calledUrl).toBe(fqdnLoginUrl);
  });

  it('uses sandbox URL when environment is sandbox', async () => {
    const sandboxLoginUrl = `https://${tenant}-sandbox.teamdynamix.com/api/auth/login`;
    let calledUrl = '';

    server.use(
      http.post(sandboxLoginUrl, async ({ request }) => {
        calledUrl = request.url;
        return new HttpResponse('sandbox-jwt', { status: 200 });
      }),
    );

    const provider = loginWithPassword({ tenant, username: 'u', password: 'p', environment: 'sandbox' });
    await provider();
    expect(calledUrl).toContain(`${tenant}-sandbox.teamdynamix.com`);
  });
});

describe('loginWithServiceAccount', () => {
  it('accepts a full FQDN as tenant', async () => {
    const fqdnAdminUrl = `${fqdnBaseUrl}/api/auth/loginadmin`;
    let calledUrl = '';

    server.use(
      http.post(fqdnAdminUrl, async ({ request }) => {
        calledUrl = request.url;
        return new HttpResponse('fqdn-admin-jwt', { status: 200 });
      }),
    );

    const provider = loginWithServiceAccount({ tenant: fqdnTenant, beid: 'b', webServicesKey: 'k' });
    await expect(provider()).resolves.toBe('fqdn-admin-jwt');
    expect(calledUrl).toBe(fqdnAdminUrl);
  });

  it('returns a token provider function', () => {
    const provider = loginWithServiceAccount({ tenant, beid: 'b', webServicesKey: 'k' });
    expect(provider).toBeInstanceOf(Function);
  });

  it('sends POST /api/auth/loginadmin with BEID/WebServicesKey and returns the JWT', async () => {
    server.use(
      http.post(adminLoginUrl, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ BEID: 'beid-42', WebServicesKey: 'wsk-ey' });
        return new HttpResponse('admin-jwt', { status: 200 });
      }),
    );

    const provider = loginWithServiceAccount({ tenant, beid: 'beid-42', webServicesKey: 'wsk-ey' });
    await expect(provider()).resolves.toBe('admin-jwt');
  });

  it('throws TeamDynamixClientError on non-OK response', async () => {
    server.use(http.post(adminLoginUrl, () => new HttpResponse('Forbidden', { status: 403 })));

    const provider = loginWithServiceAccount({ tenant, beid: 'bad', webServicesKey: 'bad' });
    await expect(provider()).rejects.toMatchObject({
      name: 'TeamDynamixClientError',
      code: 'AUTH_ERROR',
      status: 403,
    });
  });
});

describe('createTokenProviderFromJWT', () => {
  it('returns a function', () => {
    const provider = createTokenProviderFromJWT('some-jwt');
    expect(provider).toBeInstanceOf(Function);
  });

  it('returns a synchronous function that yields the JWT', () => {
    const provider = createTokenProviderFromJWT('test-token');
    expect(provider()).toBe('test-token');
  });

  it('does not trim surrounding whitespace from the token', () => {
    const provider = createTokenProviderFromJWT('  padded-token  ');
    expect(provider()).toBe('  padded-token  ');
  });
});
