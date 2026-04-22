import { describe, expect, it, vi } from 'vitest';
import { TeamDynamixClientError } from '../src/client/errors.js';
import { executeSdkRoute } from '../src/client/sdk/request.js';
import type { SdkRouteDefinition } from '../src/client/sdk/types.js';

describe('executeSdkRoute', () => {
  it('passes headers through to underlying client method options', async () => {
    const GET = vi.fn(async (_path: string, options: unknown) => ({
      data: { ok: true, options },
      response: new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    }));

    const fakeClient = { GET } as unknown;

    const route: SdkRouteDefinition = {
      domain: 'referenceData',
      methodName: 'accounts',
      operationId: 'getAccounts',
      path: '/api/accounts',
      httpMethod: 'GET',
      tags: ['Accounts'],
      mutating: false,
      destructive: false,
    };

    const result = await executeSdkRoute(fakeClient as never, route, {
      headers: { 'x-test-header': 'yes' },
      params: { query: { sample: 1 } },
    });

    expect(GET).toHaveBeenCalledWith('/api/accounts', {
      headers: { 'x-test-header': 'yes' },
      params: { query: { sample: 1 } },
    });
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
      }),
    );
  });

  it('throws CONFIG_ERROR on unsupported HTTP methods', async () => {
    const route = {
      domain: 'referenceData',
      methodName: 'unsupported',
      operationId: 'unsupportedOp',
      path: '/api/accounts',
      httpMethod: 'TRACE',
      tags: ['Accounts'],
      mutating: false,
      destructive: false,
    } as unknown as SdkRouteDefinition;

    const err = await executeSdkRoute({} as never, route).catch(e => e as TeamDynamixClientError);
    expect(err).toBeInstanceOf(TeamDynamixClientError);
    expect(err.code).toBe('CONFIG_ERROR');
    expect(err.message).toContain('Unsupported SDK HTTP method');
  });
});
