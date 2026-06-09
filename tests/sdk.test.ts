import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createTeamDynamixClient } from '../src/client/index.js';
import { server, specPath } from './setup-msw.js';

describe('SDK domain surface', () => {
  it('exposes generated read domain methods and keeps raw escape hatch', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json([{ id: 1, Name: 'IT' }], { status: 200 }),
      ),
    );

    const { client, raw } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const domainResult = await client.referenceData.accounts();
    expect(domainResult).toEqual([{ id: 1, Name: 'IT' }]);

    const rawResult = await raw.GET('/api/accounts');
    expect(rawResult.data).toEqual([{ id: 1, Name: 'IT' }]);
    expect((raw as Record<string, unknown>).referenceData).toBeUndefined();
    expect((raw as Record<string, unknown>).helpers).toBeUndefined();
  });

  it('requires explicit confirm=true on destructive ticket relationship methods', async () => {
    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    await expect(
      client.ticketRelationships.removeTicketAsset({
        appId: 1,
        ticketId: 2,
        assetId: 3,
        // @ts-expect-error runtime schema verification
        confirm: false,
      }),
    ).rejects.toThrow('destructive operation without confirm');
  });

  it('supports helper lookup workflow for account and ticket context', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/accounts', () =>
        HttpResponse.json(
          [
            { id: 1, Name: 'Finance' },
            { id: 2, Name: 'IT' },
          ],
          { status: 200 },
        ),
      ),
      http.get('https://api.teamdynamix.com/api/10/tickets/statuses', () =>
        HttpResponse.json([{ id: 1, Name: 'Open' }], { status: 200 }),
      ),
      http.get('https://api.teamdynamix.com/api/10/tickets/priorities', () =>
        HttpResponse.json([{ id: 1, Name: 'P1' }], { status: 200 }),
      ),
      http.get('https://api.teamdynamix.com/api/10/tickets/types', () =>
        HttpResponse.json([{ id: 1, Name: 'Incident' }], { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const account = await client.helpers.findAccountByName('it');
    expect(account).toEqual({ id: 2, Name: 'IT' });

    const ticketContext = await client.helpers.resolveTicketLookupContext({ appId: 10 });
    expect(ticketContext.statuses).toEqual([{ id: 1, Name: 'Open' }]);
    expect(ticketContext.priorities).toEqual([{ id: 1, Name: 'P1' }]);
    expect(ticketContext.types).toEqual([{ id: 1, Name: 'Incident' }]);
  });

  it('supports curated mutators for services, assets, cmdb, and time', async () => {
    server.use(
      http.post('https://api.teamdynamix.com/api/10/services', () => HttpResponse.json({ id: 1001 }, { status: 200 })),
      http.patch('https://api.teamdynamix.com/api/20/assets/30', () =>
        HttpResponse.json({ id: 30, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/99/cmdb/77', () => HttpResponse.json({}, { status: 200 })),
      http.put('https://api.teamdynamix.com/api/time/501', () =>
        HttpResponse.json({ id: 501, updated: true }, { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    const createdService = await client.services.createService({ appId: 10, body: { Name: 'Desk' } });
    expect(createdService).toEqual({ id: 1001 });

    const updatedAsset = await client.assets.updateAsset({ appId: 20, assetId: 30, body: { Name: 'Laptop' } });
    expect(updatedAsset).toEqual({ id: 30, updated: true });

    const deletedCi = await client.cmdb.deleteConfigurationItem({ appId: 99, configurationItemId: 77, confirm: true });
    expect(deletedCi).toEqual({});

    const updatedTime = await client.time.updateTimeEntry({ timeEntryId: 501, body: { Minutes: 60 } });
    expect(updatedTime).toEqual({ id: 501, updated: true });
  });

  it('enforces confirm semantics on destructive mutators across added domains', async () => {
    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    await expect(
      client.services.deleteService({
        appId: 1,
        serviceId: 2,
        // @ts-expect-error runtime schema verification
        confirm: false,
      }),
    ).rejects.toThrow('destructive operation without confirm');

    await expect(
      client.assets.deleteAsset({
        appId: 1,
        assetId: 2,
        // @ts-expect-error runtime schema verification
        confirm: false,
      }),
    ).rejects.toThrow('destructive operation without confirm');

    await expect(
      client.cmdb.deleteConfigurationItem({
        appId: 1,
        configurationItemId: 2,
        // @ts-expect-error runtime schema verification
        confirm: false,
      }),
    ).rejects.toThrow('destructive operation without confirm');

    await expect(
      client.time.deleteTimeEntry({
        timeEntryId: 2,
        // @ts-expect-error runtime schema verification
        confirm: false,
      }),
    ).rejects.toThrow('destructive operation without confirm');
  });
});
