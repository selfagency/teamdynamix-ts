import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTeamDynamixClient, TeamDynamixClientError } from '../src/client/index.js';

const server = setupServer();

beforeAll(() => {
  server.listen({
    onUnhandledRequest: req => {
      throw new Error(`Unhandled request: ${req.method} ${req.url}`);
    },
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

const specPath = `${process.cwd()}/tests/fixtures/openapi-test-spec.json`;

describe('createTeamDynamixClient — auth middleware', () => {
  it('injects bearer token on authenticated requests', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', ({ request }) => {
        const auth = request.headers.get('authorization');
        if (auth !== 'Bearer test-token') {
          return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
        }
        return HttpResponse.json([{ id: 123 }], { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'test-token',
      runtimeValidationMode: 'fail-closed',
      specPath,
    });

    const result = await client.GET('/api/accounts');
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([{ id: 123 }]);
  });

  it('throws AUTH_ERROR when token provider returns an empty string', async () => {
    server.use(http.get('https://api.teamdynamix.com/api/accounts', () => HttpResponse.json([])));

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => '',
      specPath,
    });

    const err = await client.GET('/api/accounts').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TeamDynamixClientError);
    expect((err as TeamDynamixClientError).code).toBe('AUTH_ERROR');
  });

  it('throws AUTH_ERROR with validation details when token provider returns whitespace', async () => {
    server.use(http.get('https://api.teamdynamix.com/api/accounts', () => HttpResponse.json([])));

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => '   ',
      specPath,
    });

    const err = await client.GET('/api/accounts').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TeamDynamixClientError);
    expect((err as TeamDynamixClientError).code).toBe('AUTH_ERROR');
    expect((err as TeamDynamixClientError).details).toBeDefined();
  });

  it('skips auth header for paths in unauthenticatedPaths', async () => {
    let capturedAuth: string | null = null;
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json([{ id: 1 }], { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'should-not-appear',
      unauthenticatedPaths: ['/api/accounts'],
      runtimeValidationMode: 'fail-open',
      specPath,
    });

    await client.GET('/api/accounts');
    expect(capturedAuth).toBeNull();
  });

  it('supports async token providers', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', ({ request }) => {
        const auth = request.headers.get('authorization');
        return HttpResponse.json([{ id: auth === 'Bearer async-token' ? 1 : 0 }], { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: async () => Promise.resolve('async-token'),
      runtimeValidationMode: 'fail-open',
      specPath,
    });

    const result = await client.GET('/api/accounts');
    expect(result.data).toEqual([{ id: 1 }]);
  });
});

describe('createTeamDynamixClient — runtime validation', () => {
  it('fails closed on invalid response shape (wrong id type)', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json([{ id: 'not-an-integer' }], { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-closed',
      specPath,
    });

    const err = await client.GET('/api/accounts').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TeamDynamixClientError);
    expect((err as TeamDynamixClientError).code).toBe('RESPONSE_VALIDATION_ERROR');
  });

  it('passes through on invalid response shape when fail-open', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json([{ id: 'not-an-integer' }], { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
    });

    const result = await client.GET('/api/accounts');
    expect(result.error).toBeUndefined();
  });

  it('passes through non-JSON responses without validation error', async () => {
    server.use(http.get('https://api.teamdynamix.com/api/accounts', () => new HttpResponse(null, { status: 204 })));

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-closed',
      specPath,
    });

    const result = await client.GET('/api/accounts');
    expect(result.response.status).toBe(204);
  });
});

describe('createTeamDynamixClient — HTTP error status passthrough', () => {
  for (const status of [400, 401, 403, 404, 409, 422] as const) {
    it(`returns ${status} response as error without retrying`, async () => {
      const onRetry = vi.fn();
      server.use(
        http.get('https://api.teamdynamix.com/api/accounts', () =>
          HttpResponse.json({ message: `error ${status}` }, { status }),
        ),
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        runtimeValidationMode: 'fail-open',
        specPath,
        onRetry,
      });

      const result = await client.GET('/api/accounts');
      expect(result.response.status).toBe(status);
      expect(onRetry).not.toHaveBeenCalled();
    });
  }

  it('returns 500 response without retrying (not in retryable list)', async () => {
    const onRetry = vi.fn();
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json({ message: 'server error' }, { status: 500 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
      onRetry,
    });

    const result = await client.GET('/api/accounts');
    expect(result.response.status).toBe(500);
    expect(onRetry).not.toHaveBeenCalled();
  });
});

describe('createTeamDynamixClient — retry middleware', () => {
  it('retries on 429 with Retry-After and eventually succeeds', async () => {
    const onRetry = vi.fn();
    let callCount = 0;

    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({ message: 'rate limited' }, { status: 429, headers: { 'retry-after': '0' } });
        }
        return HttpResponse.json([{ id: 10 }], { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      onRetry,
      retryPolicy: { initialDelayMs: 1, maxDelayMs: 5 },
    });

    const result = await client.GET('/api/accounts');
    expect(result.data).toEqual([{ id: 10 }]);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1, schemaPath: '/api/accounts', method: 'GET' }),
    );
  });

  it('retries on 502, 503, 504', async () => {
    for (const status of [502, 503, 504]) {
      let callCount = 0;
      server.use(
        http.get('https://api.teamdynamix.com/api/accounts', () => {
          callCount += 1;
          return callCount === 1 ? HttpResponse.json({}, { status }) : HttpResponse.json([{ id: 1 }], { status: 200 });
        }),
      );

      const { client } = await createTeamDynamixClient({
        tenant: 'api',
        tokenProvider: () => 'token',
        runtimeValidationMode: 'fail-open',
        specPath,
        retryPolicy: { initialDelayMs: 1, maxDelayMs: 5 },
      });

      const result = await client.GET('/api/accounts');
      expect(result.response.status).toBe(200);
      server.resetHandlers();
    }
  });

  it('exhausts retries and returns last bad response', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json({ message: 'still bad' }, { status: 503 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
      retryPolicy: { maxRetries: 2, initialDelayMs: 1, maxDelayMs: 5 },
    });

    const result = await client.GET('/api/accounts');
    expect(result.response.status).toBe(503);
  });

  it('does not retry POST requests by default', async () => {
    const onRetry = vi.fn();
    // openapi-test-spec has no POST /api/accounts, so we rely on onRetry not firing.
    // Use fail-open to avoid throwing on the 429 response itself.
    server.use(
      http.post('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json({ message: 'rate limited' }, { status: 429 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
      onRetry,
      retryPolicy: { initialDelayMs: 1, maxDelayMs: 5 },
    });

    // @ts-expect-error — POST not in test spec paths
    const result = await client.POST('/api/accounts', { body: {} });
    expect(result.response.status).toBe(429);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('retries bodyless POST requests when retryUnsafeMethods is enabled', async () => {
    const onRetry = vi.fn();
    let callCount = 0;
    server.use(
      http.post('https://api.teamdynamix.com/api/accounts', () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({ message: 'rate limited' }, { status: 429, headers: { 'retry-after': '0' } });
        }
        return HttpResponse.json({ ok: true }, { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
      onRetry,
      retryPolicy: { initialDelayMs: 1, maxDelayMs: 5, retryUnsafeMethods: true },
    });

    // @ts-expect-error — POST not in fixture spec; runtime behavior under test
    const result = await client.POST('/api/accounts');
    expect(result.response.status).toBe(200);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retries network errors and succeeds when a subsequent attempt returns 200', async () => {
    const onRetry = vi.fn();
    let callCount = 0;
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.error();
        }
        return HttpResponse.json([{ id: 222 }], { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      runtimeValidationMode: 'fail-open',
      specPath,
      onRetry,
      retryPolicy: { initialDelayMs: 1, maxDelayMs: 5 },
    });

    const result = await client.GET('/api/accounts');
    expect(result.data).toEqual([{ id: 222 }]);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'network-error',
        method: 'GET',
      }),
    );
  });
});
