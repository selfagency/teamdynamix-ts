import { z } from 'zod';
import { SDK_READ_ROUTE_MANIFEST } from '../../generated/sdk-read-manifest.js';
import type { TeamDynamixFetchClient } from '../client.js';
import { appIdSchema, confirmTrueSchema, searchTextSchema } from '../schemas/index.js';
import { executeSdkRoute } from './request.js';
import type {
  AssetMutations,
  CmdbMutations,
  KnowledgeBaseMutations,
  ProjectMutations,
  ServiceMutations,
  SdkHelpers,
  SdkReadDomain,
  TeamDynamixSdk,
  TeamDynamixSdkReadDomains,
  TimeMutations,
  TicketMutations,
  TicketRelationshipMutations,
} from './types.js';

const nonEmptyIdSchema = z.union([z.string().trim().min(1), z.number().int().nonnegative()]);
const contactUidSchema = z.string().trim().min(1);

const createReadDomains = (client: TeamDynamixFetchClient): TeamDynamixSdkReadDomains => {
  const domains: TeamDynamixSdkReadDomains = {
    discovery: {},
    tickets: {},
    ticketRelationships: {},
    people: {},
    knowledgeBase: {},
    assets: {},
    cmdb: {},
    services: {},
    projects: {},
    time: {},
    referenceData: {},
  };

  for (const route of SDK_READ_ROUTE_MANIFEST) {
    const domain = domains[route.domain] as SdkReadDomain;
    domain[route.methodName] = async options =>
      executeSdkRoute(client, route, options as Record<string, unknown> | undefined);
  }

  return domains;
};

const createTicketMutations = (client: TeamDynamixFetchClient): TicketMutations => ({
  async createTicket(input) {
    const parsed = z
      .object({ appId: appIdSchema, body: z.unknown(), params: z.record(z.string(), z.unknown()).optional() })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'createTicket',
        operationId: 'postAppIdTickets',
        path: '/api/{appId}/tickets',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      {
        params: { path: { appId: parsed.appId }, ...(parsed.params ? { query: parsed.params } : {}) },
        body: parsed.body,
      },
    );
  },
  async updateTicket(input) {
    const parsed = z.object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'updateTicket',
        operationId: 'postAppIdTicketsId',
        path: '/api/{appId}/tickets/{id}',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId } }, body: parsed.body },
    );
  },
  async addTicketComment(input) {
    const parsed = z.object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'tickets',
        methodName: 'addTicketComment',
        operationId: 'postAppIdTicketsIdFeed',
        path: '/api/{appId}/tickets/{id}/feed',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId } }, body: parsed.body },
    );
  },
});

const createTicketRelationshipMutations = (client: TeamDynamixFetchClient): TicketRelationshipMutations => ({
  async createTicketTask(input) {
    const parsed = z.object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'ticketRelationships',
        methodName: 'createTicketTask',
        operationId: 'postAppIdTicketsTicketIdTasks',
        path: '/api/{appId}/tickets/{ticketId}/tasks',
        httpMethod: 'POST',
        tags: ['TicketTasks'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, ticketId: parsed.ticketId } }, body: parsed.body },
    );
  },
  async addTicketAsset(input) {
    const parsed = z.object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, assetId: nonEmptyIdSchema }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'ticketRelationships',
        methodName: 'addTicketAsset',
        operationId: 'postAppIdTicketsIdAssetsAssetId',
        path: '/api/{appId}/tickets/{id}/assets/{assetId}',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId, assetId: parsed.assetId } } },
    );
  },
  async removeTicketAsset(input) {
    const parsed = z
      .object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, assetId: nonEmptyIdSchema, confirm: confirmTrueSchema })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'ticketRelationships',
        methodName: 'removeTicketAsset',
        operationId: 'deleteAppIdTicketsIdAssetsAssetId',
        path: '/api/{appId}/tickets/{id}/assets/{assetId}',
        httpMethod: 'DELETE',
        tags: ['Tickets'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId, assetId: parsed.assetId } } },
    );
  },
  async addTicketContact(input) {
    const parsed = z
      .object({ appId: appIdSchema, ticketId: nonEmptyIdSchema, contactUid: contactUidSchema })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'ticketRelationships',
        methodName: 'addTicketContact',
        operationId: 'postAppIdTicketsIdContactsContactUid',
        path: '/api/{appId}/tickets/{id}/contacts/{contactUid}',
        httpMethod: 'POST',
        tags: ['Tickets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId, contactUid: parsed.contactUid } } },
    );
  },
  async removeTicketContact(input) {
    const parsed = z
      .object({
        appId: appIdSchema,
        ticketId: nonEmptyIdSchema,
        contactUid: contactUidSchema,
        confirm: confirmTrueSchema,
      })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'ticketRelationships',
        methodName: 'removeTicketContact',
        operationId: 'deleteAppIdTicketsIdContactsContactUid',
        path: '/api/{appId}/tickets/{id}/contacts/{contactUid}',
        httpMethod: 'DELETE',
        tags: ['Tickets'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.ticketId, contactUid: parsed.contactUid } } },
    );
  },
});

const createKnowledgeBaseMutations = (client: TeamDynamixFetchClient): KnowledgeBaseMutations => ({
  async createArticle(input) {
    const parsed = z.object({ appId: appIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'knowledgeBase',
        methodName: 'createArticle',
        operationId: 'postAppIdKnowledgebase',
        path: '/api/{appId}/knowledgebase',
        httpMethod: 'POST',
        tags: ['KnowledgeBase'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } }, body: parsed.body },
    );
  },
  async updateArticle(input) {
    const parsed = z.object({ appId: appIdSchema, articleId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'knowledgeBase',
        methodName: 'updateArticle',
        operationId: 'putAppIdKnowledgebaseId',
        path: '/api/{appId}/knowledgebase/{id}',
        httpMethod: 'PUT',
        tags: ['KnowledgeBase'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.articleId } }, body: parsed.body },
    );
  },
});

const createProjectMutations = (client: TeamDynamixFetchClient): ProjectMutations => ({
  async createIssue(input) {
    const parsed = z.object({ body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'projects',
        methodName: 'createIssue',
        operationId: 'postProjectsIssues',
        path: '/api/projects/issues',
        httpMethod: 'POST',
        tags: ['Issues'],
        mutating: true,
        destructive: false,
      },
      { body: parsed.body },
    );
  },
  async createRisk(input) {
    const parsed = z.object({ body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'projects',
        methodName: 'createRisk',
        operationId: 'postProjectsRisks',
        path: '/api/projects/risks',
        httpMethod: 'POST',
        tags: ['Risks'],
        mutating: true,
        destructive: false,
      },
      { body: parsed.body },
    );
  },
});

const createServiceMutations = (client: TeamDynamixFetchClient): ServiceMutations => ({
  async createService(input) {
    const parsed = z.object({ appId: appIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'createService',
        operationId: 'postAppIdServices',
        path: '/api/{appId}/services',
        httpMethod: 'POST',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } }, body: parsed.body },
    );
  },
  async updateService(input) {
    const parsed = z.object({ appId: appIdSchema, serviceId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'updateService',
        operationId: 'putAppIdServicesId',
        path: '/api/{appId}/services/{id}',
        httpMethod: 'PUT',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.serviceId } }, body: parsed.body },
    );
  },
  async deleteService(input) {
    const parsed = z
      .object({ appId: appIdSchema, serviceId: nonEmptyIdSchema, confirm: confirmTrueSchema })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'deleteService',
        operationId: 'deleteAppIdServicesId',
        path: '/api/{appId}/services/{id}',
        httpMethod: 'DELETE',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.serviceId } } },
    );
  },
  async createServiceCategory(input) {
    const parsed = z.object({ appId: appIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'createServiceCategory',
        operationId: 'postAppIdServicesCategories',
        path: '/api/{appId}/services/categories',
        httpMethod: 'POST',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } }, body: parsed.body },
    );
  },
  async updateServiceCategory(input) {
    const parsed = z.object({ appId: appIdSchema, categoryId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'updateServiceCategory',
        operationId: 'putAppIdServicesCategoriesId',
        path: '/api/{appId}/services/categories/{id}',
        httpMethod: 'PUT',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.categoryId } }, body: parsed.body },
    );
  },
  async deleteServiceCategory(input) {
    const parsed = z
      .object({ appId: appIdSchema, categoryId: nonEmptyIdSchema, confirm: confirmTrueSchema })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'services',
        methodName: 'deleteServiceCategory',
        operationId: 'deleteAppIdServicesCategoriesId',
        path: '/api/{appId}/services/categories/{id}',
        httpMethod: 'DELETE',
        tags: ['ServiceCatalog'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.categoryId } } },
    );
  },
});

const createAssetMutations = (client: TeamDynamixFetchClient): AssetMutations => ({
  async createAsset(input) {
    const parsed = z.object({ appId: appIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'createAsset',
        operationId: 'postAppIdAssets',
        path: '/api/{appId}/assets',
        httpMethod: 'POST',
        tags: ['Assets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } }, body: parsed.body },
    );
  },
  async updateAsset(input) {
    const parsed = z.object({ appId: appIdSchema, assetId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'updateAsset',
        operationId: 'patchAppIdAssetsId',
        path: '/api/{appId}/assets/{id}',
        httpMethod: 'PATCH',
        tags: ['Assets'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.assetId } }, body: parsed.body },
    );
  },
  async deleteAsset(input) {
    const parsed = z.object({ appId: appIdSchema, assetId: nonEmptyIdSchema, confirm: confirmTrueSchema }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'assets',
        methodName: 'deleteAsset',
        operationId: 'deleteAppIdAssetsId',
        path: '/api/{appId}/assets/{id}',
        httpMethod: 'DELETE',
        tags: ['Assets'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.assetId } } },
    );
  },
});

const createCmdbMutations = (client: TeamDynamixFetchClient): CmdbMutations => ({
  async createConfigurationItem(input) {
    const parsed = z.object({ appId: appIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'cmdb',
        methodName: 'createConfigurationItem',
        operationId: 'postAppIdCmdb',
        path: '/api/{appId}/cmdb',
        httpMethod: 'POST',
        tags: ['ConfigurationItems'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId } }, body: parsed.body },
    );
  },
  async updateConfigurationItem(input) {
    const parsed = z
      .object({ appId: appIdSchema, configurationItemId: nonEmptyIdSchema, body: z.unknown() })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'cmdb',
        methodName: 'updateConfigurationItem',
        operationId: 'patchAppIdCmdbId',
        path: '/api/{appId}/cmdb/{id}',
        httpMethod: 'PATCH',
        tags: ['ConfigurationItems'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { appId: parsed.appId, id: parsed.configurationItemId } }, body: parsed.body },
    );
  },
  async deleteConfigurationItem(input) {
    const parsed = z
      .object({ appId: appIdSchema, configurationItemId: nonEmptyIdSchema, confirm: confirmTrueSchema })
      .parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'cmdb',
        methodName: 'deleteConfigurationItem',
        operationId: 'deleteAppIdCmdbId',
        path: '/api/{appId}/cmdb/{id}',
        httpMethod: 'DELETE',
        tags: ['ConfigurationItems'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { appId: parsed.appId, id: parsed.configurationItemId } } },
    );
  },
});

const createTimeMutations = (client: TeamDynamixFetchClient): TimeMutations => ({
  async createTimeEntry(input) {
    const parsed = z.object({ body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'time',
        methodName: 'createTimeEntry',
        operationId: 'postTime',
        path: '/api/time',
        httpMethod: 'POST',
        tags: ['Time'],
        mutating: true,
        destructive: false,
      },
      { body: parsed.body },
    );
  },
  async updateTimeEntry(input) {
    const parsed = z.object({ timeEntryId: nonEmptyIdSchema, body: z.unknown() }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'time',
        methodName: 'updateTimeEntry',
        operationId: 'putTimeId',
        path: '/api/time/{id}',
        httpMethod: 'PUT',
        tags: ['Time'],
        mutating: true,
        destructive: false,
      },
      { params: { path: { id: parsed.timeEntryId } }, body: parsed.body },
    );
  },
  async deleteTimeEntry(input) {
    const parsed = z.object({ timeEntryId: nonEmptyIdSchema, confirm: confirmTrueSchema }).parse(input);
    return executeSdkRoute(
      client,
      {
        domain: 'time',
        methodName: 'deleteTimeEntry',
        operationId: 'deleteTimeId',
        path: '/api/time/{id}',
        httpMethod: 'DELETE',
        tags: ['Time'],
        mutating: true,
        destructive: true,
      },
      { params: { path: { id: parsed.timeEntryId } } },
    );
  },
});

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;

const createHelpers = (client: TeamDynamixFetchClient): SdkHelpers => ({
  async findAccountByName(name) {
    const parsedName = searchTextSchema.parse(name).toLowerCase();
    const response = await executeSdkRoute(
      client,
      {
        domain: 'referenceData',
        methodName: 'findAccountByName',
        operationId: 'getAccounts',
        path: '/api/accounts',
        httpMethod: 'GET',
        tags: ['Accounts'],
        mutating: false,
        destructive: false,
      },
      undefined,
    );

    if (!Array.isArray(response)) {
      return undefined;
    }

    return response
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => item !== undefined)
      .find(item => {
        const value = [item.Name, item.name, item.AccountName, item.accountName].find(v => typeof v === 'string');
        return typeof value === 'string' && value.toLowerCase() === parsedName;
      });
  },
  async findUserByEmail(email) {
    const parsedEmail = searchTextSchema.parse(email).toLowerCase();
    const response = await executeSdkRoute(
      client,
      {
        domain: 'people',
        methodName: 'findUserByEmail',
        operationId: 'postPeopleSearch',
        path: '/api/people/search',
        httpMethod: 'POST',
        tags: ['People'],
        mutating: false,
        destructive: false,
      },
      { body: { SearchText: parsedEmail } },
    );

    if (!Array.isArray(response)) {
      return undefined;
    }

    return response
      .map(asRecord)
      .filter((item): item is Record<string, unknown> => item !== undefined)
      .find(item => {
        const value = [item.PrimaryEmail, item.Email, item.email].find(v => typeof v === 'string');
        return typeof value === 'string' && value.toLowerCase() === parsedEmail;
      });
  },
  async resolveTicketLookupContext(input) {
    const parsed = z.object({ appId: appIdSchema }).parse(input);

    const [statuses, priorities, types] = await Promise.all([
      executeSdkRoute(
        client,
        {
          domain: 'discovery',
          methodName: 'listTicketStatuses',
          operationId: 'getAppIdTicketsStatuses',
          path: '/api/{appId}/tickets/statuses',
          httpMethod: 'GET',
          tags: ['TicketStatuses'],
          mutating: false,
          destructive: false,
        },
        { params: { path: { appId: parsed.appId } } },
      ),
      executeSdkRoute(
        client,
        {
          domain: 'tickets',
          methodName: 'listTicketPriorities',
          operationId: 'getAppIdTicketsPriorities',
          path: '/api/{appId}/tickets/priorities',
          httpMethod: 'GET',
          tags: ['TicketPriorities'],
          mutating: false,
          destructive: false,
        },
        { params: { path: { appId: parsed.appId } } },
      ),
      executeSdkRoute(
        client,
        {
          domain: 'tickets',
          methodName: 'listTicketTypes',
          operationId: 'getAppIdTicketsTypes',
          path: '/api/{appId}/tickets/types',
          httpMethod: 'GET',
          tags: ['TicketTypes'],
          mutating: false,
          destructive: false,
        },
        { params: { path: { appId: parsed.appId } } },
      ),
    ]);

    return { statuses, priorities, types };
  },
});

export const createTeamDynamixSdk = (client: TeamDynamixFetchClient): TeamDynamixSdk => {
  const readDomains = createReadDomains(client);
  const ticketDomain: TeamDynamixSdk['tickets'] = {
    ...readDomains.tickets,
    ...createTicketMutations(client),
  };
  const ticketRelationshipDomain: TeamDynamixSdk['ticketRelationships'] = {
    ...readDomains.ticketRelationships,
    ...createTicketRelationshipMutations(client),
  };
  const knowledgeBaseDomain: TeamDynamixSdk['knowledgeBase'] = {
    ...readDomains.knowledgeBase,
    ...createKnowledgeBaseMutations(client),
  };
  const assetDomain: TeamDynamixSdk['assets'] = {
    ...readDomains.assets,
    ...createAssetMutations(client),
  };
  const cmdbDomain: TeamDynamixSdk['cmdb'] = {
    ...readDomains.cmdb,
    ...createCmdbMutations(client),
  };
  const serviceDomain: TeamDynamixSdk['services'] = {
    ...readDomains.services,
    ...createServiceMutations(client),
  };
  const projectDomain: TeamDynamixSdk['projects'] = {
    ...readDomains.projects,
    ...createProjectMutations(client),
  };
  const timeDomain: TeamDynamixSdk['time'] = {
    ...readDomains.time,
    ...createTimeMutations(client),
  };

  return {
    ...readDomains,
    tickets: ticketDomain,
    ticketRelationships: ticketRelationshipDomain,
    knowledgeBase: knowledgeBaseDomain,
    assets: assetDomain,
    cmdb: cmdbDomain,
    services: serviceDomain,
    projects: projectDomain,
    time: timeDomain,
    helpers: createHelpers(client),
  };
};
