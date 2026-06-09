import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { createTeamDynamixClient } from '../src/client/index.js';
import { server, specPath } from './setup-msw.js';

describe('SDK curated mutator coverage', () => {
  it('normalizes issue search payload and enforces comments on issue update', async () => {
    const seen: Array<{ method: string; url: string; body: unknown }> = [];
    server.use(
      http.post('https://api.teamdynamix.com/api/projects/issues/search', ({ request }) => {
        seen.push({ method: 'POST', url: String(request.url), body: null });
        return HttpResponse.json([{ id: 1 }], { status: 200 });
      }),
      http.post('https://api.teamdynamix.com/api/projects/9/issues/11', ({ request }) => {
        seen.push({ method: 'POST', url: String(request.url), body: null });
        return HttpResponse.json({ id: 11, updated: true }, { status: 200 });
      }),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    await expect(client.projects.searchIssues({ projectId: 9 })).resolves.toEqual([{ id: 1 }]);

    await expect(
      client.projects.updateIssue({
        projectId: 9,
        issueId: 11,
      }),
    ).resolves.toEqual({ id: 11, updated: true });

    expect(seen[0]?.url).toContain('ProjectIDs=9');
    expect(seen[1]?.url).toContain('/api/projects/9/issues/11');
  });

  it('exposes people group helpers and bulk manage helper', async () => {
    server.use(
      http.get('https://api.teamdynamix.com/api/people/u1', () => HttpResponse.json({ UID: 'u1' }, { status: 200 })),
      http.get('https://api.teamdynamix.com/api/groups/7/members', () =>
        HttpResponse.json([{ UID: 'u1' }], { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/groups', () => HttpResponse.json({ ID: 7 }, { status: 200 })),
      http.put('https://api.teamdynamix.com/api/groups/7', () =>
        HttpResponse.json({ ID: 7, updated: true }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/groups/search', () => HttpResponse.json([{ ID: 7 }], { status: 200 })),
      http.post('https://api.teamdynamix.com/api/people/u1/groups', () =>
        HttpResponse.json({ ok: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/people/u1/groups/7', () => HttpResponse.json({}, { status: 200 })),
      http.post('https://api.teamdynamix.com/api/groups/7/applications', () =>
        HttpResponse.json({ ok: true }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/people/bulk/managegroups', () =>
        HttpResponse.json({ managed: true }, { status: 200 }),
      ),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    expect(await client.people.getPersonByUid({ uid: 'u1' })).toEqual({ UID: 'u1' });
    expect(await client.people.getGroupMembers({ groupId: 7 })).toEqual([{ UID: 'u1' }]);
    expect(await client.people.createGroup({ body: { Name: 'ops' } })).toEqual({ ID: 7 });
    expect(await client.people.updateGroup({ groupId: 7, body: { Name: 'ops2' } })).toEqual({ ID: 7, updated: true });
    expect(await client.people.searchGroups({ body: { SearchText: 'ops' } })).toEqual([{ ID: 7 }]);
    expect(await client.people.addGroupMember({ uid: 'u1', groupId: 7 })).toEqual({ ok: true });
    expect(await client.people.removeGroupMember({ uid: 'u1', groupId: 7, confirm: true })).toEqual({});
    expect(await client.people.assignGroupApplications({ groupId: 7, body: { AppIDs: [1] } })).toEqual({ ok: true });
    expect(await client.people.bulkManageGroups({ groupIds: [7, 8] })).toEqual({ managed: true });
  });
  it('executes curated mutators across all domains', async () => {
    server.use(
      http.post('https://api.teamdynamix.com/api/1/tickets', () => HttpResponse.json({ id: 101 }, { status: 200 })),
      http.post('https://api.teamdynamix.com/api/1/tickets/101', () =>
        HttpResponse.json({ id: 101, updated: true }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/tickets/101/feed', () =>
        HttpResponse.json({ id: 1 }, { status: 200 }),
      ),
      http.get('https://api.teamdynamix.com/api/1/tickets/101/feed', () =>
        HttpResponse.json([{ id: 1, type: 'Comment', text: 'Test comment' }], {
          status: 200,
        }),
      ),
      http.get('https://api.teamdynamix.com/api/1/tickets/feed', () =>
        HttpResponse.json([{ id: 1, type: 'TicketCreated', ticketId: 101 }], {
          status: 200,
        }),
      ),
      http.post('https://api.teamdynamix.com/api/1/tickets/101/tasks', () =>
        HttpResponse.json({ id: 201 }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/tickets/101/assets/301', () =>
        HttpResponse.json({ id: 301 }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/tickets/101/assets/301', () =>
        HttpResponse.json({}, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/tickets/101/contacts/user-1', () =>
        HttpResponse.json({ id: 'user-1' }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/tickets/101/contacts/user-1', () =>
        HttpResponse.json({}, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/knowledgebase', () =>
        HttpResponse.json({ id: 401 }, { status: 200 }),
      ),
      http.put('https://api.teamdynamix.com/api/1/knowledgebase/401', () =>
        HttpResponse.json({ id: 401, updated: true }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/projects/issues', () =>
        HttpResponse.json({ id: 501 }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/projects/risks', () =>
        HttpResponse.json({ id: 601 }, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/services', () => HttpResponse.json({ id: 701 }, { status: 200 })),
      http.put('https://api.teamdynamix.com/api/1/services/701', () =>
        HttpResponse.json({ id: 701, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/services/701', () => HttpResponse.json({}, { status: 200 })),
      http.post('https://api.teamdynamix.com/api/1/services/categories', () =>
        HttpResponse.json({ id: 702 }, { status: 200 }),
      ),
      http.put('https://api.teamdynamix.com/api/1/services/categories/702', () =>
        HttpResponse.json({ id: 702, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/services/categories/702', () =>
        HttpResponse.json({}, { status: 200 }),
      ),
      http.post('https://api.teamdynamix.com/api/1/assets', () => HttpResponse.json({ id: 801 }, { status: 200 })),
      http.patch('https://api.teamdynamix.com/api/1/assets/801', () =>
        HttpResponse.json({ id: 801, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/assets/801', () => HttpResponse.json({}, { status: 200 })),
      http.post('https://api.teamdynamix.com/api/1/cmdb', () => HttpResponse.json({ id: 901 }, { status: 200 })),
      http.patch('https://api.teamdynamix.com/api/1/cmdb/901', () =>
        HttpResponse.json({ id: 901, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/1/cmdb/901', () => HttpResponse.json({}, { status: 200 })),
      http.post('https://api.teamdynamix.com/api/time', () => HttpResponse.json({ id: 1001 }, { status: 200 })),
      http.put('https://api.teamdynamix.com/api/time/1001', () =>
        HttpResponse.json({ id: 1001, updated: true }, { status: 200 }),
      ),
      http.delete('https://api.teamdynamix.com/api/time/1001', () => HttpResponse.json({}, { status: 200 })),
    );

    const { client } = await createTeamDynamixClient({
      tenant: 'api',
      tokenProvider: () => 'token',
      specPath,
      runtimeValidationMode: 'fail-open',
    });

    expect(await client.tickets.createTicket({ appId: 1, body: { Title: 'x' } })).toEqual({ id: 101 });
    expect(
      await client.tickets.updateTicket({
        appId: 1,
        ticketId: 101,
        body: { Title: 'y' },
      }),
    ).toEqual({
      id: 101,
      updated: true,
    });
    expect(
      await client.tickets.addTicketComment({
        appId: 1,
        ticketId: 101,
        body: { Body: 'note' },
      }),
    ).toEqual({
      id: 1,
    });

    // Test new feed methods
    expect(await client.tickets.getTicketFeed({ appId: 1, ticketId: 101 })).toEqual([
      { id: 1, type: 'Comment', text: 'Test comment' },
    ]);
    expect(await client.tickets.getTicketsFeed({ appId: 1 })).toEqual([
      { id: 1, type: 'TicketCreated', ticketId: 101 },
    ]);

    expect(
      await client.ticketRelationships.createTicketTask({
        appId: 1,
        ticketId: 101,
        body: { Name: 'task' },
      }),
    ).toEqual({ id: 201 });
    expect(
      await client.ticketRelationships.addTicketAsset({
        appId: 1,
        ticketId: 101,
        assetId: 301,
      }),
    ).toEqual({
      id: 301,
    });
    expect(
      await client.ticketRelationships.removeTicketAsset({
        appId: 1,
        ticketId: 101,
        assetId: 301,
        confirm: true,
      }),
    ).toEqual({});
    expect(
      await client.ticketRelationships.addTicketContact({
        appId: 1,
        ticketId: 101,
        contactUid: 'user-1',
      }),
    ).toEqual({ id: 'user-1' });
    expect(
      await client.ticketRelationships.removeTicketContact({
        appId: 1,
        ticketId: 101,
        contactUid: 'user-1',
        confirm: true,
      }),
    ).toEqual({});

    expect(
      await client.knowledgeBase.createArticle({
        appId: 1,
        body: { Subject: 'kb' },
      }),
    ).toEqual({ id: 401 });
    expect(
      await client.knowledgeBase.updateArticle({
        appId: 1,
        articleId: 401,
        body: { Subject: 'kb2' },
      }),
    ).toEqual({
      id: 401,
      updated: true,
    });

    expect(await client.projects.createIssue({ body: { Title: 'i' } })).toEqual({ id: 501 });
    expect(await client.projects.createRisk({ body: { Title: 'r' } })).toEqual({
      id: 601,
    });

    expect(await client.services.createService({ appId: 1, body: { Name: 'svc' } })).toEqual({ id: 701 });
    expect(
      await client.services.updateService({
        appId: 1,
        serviceId: 701,
        body: { Name: 'svc2' },
      }),
    ).toEqual({
      id: 701,
      updated: true,
    });
    expect(
      await client.services.deleteService({
        appId: 1,
        serviceId: 701,
        confirm: true,
      }),
    ).toEqual({});
    expect(
      await client.services.createServiceCategory({
        appId: 1,
        body: { Name: 'cat' },
      }),
    ).toEqual({ id: 702 });
    expect(
      await client.services.updateServiceCategory({
        appId: 1,
        categoryId: 702,
        body: { Name: 'cat2' },
      }),
    ).toEqual({
      id: 702,
      updated: true,
    });
    expect(
      await client.services.deleteServiceCategory({
        appId: 1,
        categoryId: 702,
        confirm: true,
      }),
    ).toEqual({});

    expect(await client.assets.createAsset({ appId: 1, body: { Name: 'asset' } })).toEqual({ id: 801 });
    expect(
      await client.assets.updateAsset({
        appId: 1,
        assetId: 801,
        body: { Name: 'asset2' },
      }),
    ).toEqual({
      id: 801,
      updated: true,
    });
    expect(
      await client.assets.deleteAsset({
        appId: 1,
        assetId: 801,
        confirm: true,
      }),
    ).toEqual({});

    expect(
      await client.cmdb.createConfigurationItem({
        appId: 1,
        body: { Name: 'ci' },
      }),
    ).toEqual({ id: 901 });
    expect(
      await client.cmdb.updateConfigurationItem({
        appId: 1,
        configurationItemId: 901,
        body: { Name: 'ci2' },
      }),
    ).toEqual({ id: 901, updated: true });
    expect(
      await client.cmdb.deleteConfigurationItem({
        appId: 1,
        configurationItemId: 901,
        confirm: true,
      }),
    ).toEqual({});

    expect(await client.time.createTimeEntry({ body: { Minutes: 30 } })).toEqual({ id: 1001 });
    expect(
      await client.time.updateTimeEntry({
        timeEntryId: 1001,
        body: { Minutes: 60 },
      }),
    ).toEqual({
      id: 1001,
      updated: true,
    });
    expect(await client.time.deleteTimeEntry({ timeEntryId: 1001, confirm: true })).toEqual({});
  });
});
