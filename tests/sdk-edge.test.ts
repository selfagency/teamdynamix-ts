import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
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

describe('SDK edge and error scenarios', () => {
  it('returns undefined when helper receives non-array account payload', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () => HttpResponse.json({ nope: true }, { status: 200 })),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const account = await client.helpers.findAccountByName('IT');
    expect(account).toBeUndefined();
  });

  it('returns undefined when helper user search has no email match', async () => {
    server.use(
      http.post('https://api.teamdynamix.com/api/people/search', () =>
        HttpResponse.json([{ UID: 'u1' }], { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const user = await client.helpers.findUserByEmail('person@example.com');
    expect(user).toBeUndefined();
  });

  it('throws TeamDynamixClientError with domain context on SDK route HTTP errors', async () => {
    server.use(
      http.delete('https://api.teamdynamix.com/api/1/services/2', () =>
        HttpResponse.json({ message: 'forbidden' }, { status: 403 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const err = await client.services
      .deleteService({ appId: 1, serviceId: 2, confirm: true })
      .catch((e: unknown) => e as TeamDynamixClientError);

    expect(err).toBeInstanceOf(TeamDynamixClientError);
    expect(err.code).toBe('HTTP_ERROR');
    expect(err.status).toBe(403);
    expect(err.schemaPath).toBe('/api/{appId}/services/{id}');
    expect(err.method).toBe('DELETE');
    expect(err.details).toEqual(
      expect.objectContaining({
        domain: 'services',
        methodName: 'deleteService',
        operationId: 'deleteAppIdServicesId',
      }),
    );
  });

  it('throws on invalid mutator input shapes before issuing a request', async () => {
    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    await expect(
      client.time.createTimeEntry({
        // @ts-expect-error runtime schema validation coverage
        body: undefined,
      }),
    ).rejects.toThrow();

    await expect(
      client.cmdb.updateConfigurationItem({
        appId: 1,
        // @ts-expect-error runtime schema validation coverage
        configurationItemId: -1,
        body: {},
      }),
    ).rejects.toThrow();
  });
});
