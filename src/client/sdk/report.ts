import type { TeamDynamixFetchClient } from '../client.js';
import { executeSdkRoute } from './request.js';
import type { ReportPage } from './types.js';

const reportRoute = {
  domain: 'tickets' as const,
  methodName: 'runReport',
  operationId: 'postAppIdTicketsSearchesSearchIdResults',
  path: '/api/{appId}/tickets/searches/{searchId}/results',
  httpMethod: 'POST' as const,
  tags: ['TicketReports'],
  mutating: true,
  destructive: false,
};

export const runTicketReport = async (
  client: TeamDynamixFetchClient,
  input: {
    appId: string | number;
    searchId: string | number;
    page?: number;
    pageSize?: number;
    filter?: (item: unknown) => boolean;
  },
): Promise<ReportPage> => {
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 50;
  const data = await executeSdkRoute(client, reportRoute, {
    params: {
      path: { appId: input.appId, searchId: input.searchId },
      query: { Page: String(page), PageSize: String(pageSize) },
    },
  });
  const items = Array.isArray(data) ? data : [];
  const filtered = input.filter ? items.filter(input.filter) : items;
  return {
    items: filtered,
    page,
    pageSize,
    hasMore: items.length === pageSize,
  };
};
