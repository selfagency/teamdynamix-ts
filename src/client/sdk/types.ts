export type SdkDomainName =
  | 'discovery'
  | 'tickets'
  | 'ticketRelationships'
  | 'people'
  | 'knowledgeBase'
  | 'assets'
  | 'cmdb'
  | 'services'
  | 'projects'
  | 'time'
  | 'referenceData';

export type SdkHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface SdkRouteDefinition {
  domain: SdkDomainName;
  methodName: string;
  operationId: string;
  path: string;
  httpMethod: SdkHttpMethod;
  tags: string[];
  mutating: boolean;
  destructive: boolean;
}

export interface SdkRequestOptions {
  params?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}

export type SdkReadMethod = (...args: unknown[]) => Promise<unknown>;
export type SdkReadDomain = Record<string, SdkReadMethod>;

export interface TeamDynamixSdkReadDomains {
  readonly discovery: SdkReadDomain;
  readonly tickets: SdkReadDomain;
  readonly ticketRelationships: SdkReadDomain;
  readonly people: SdkReadDomain;
  readonly knowledgeBase: SdkReadDomain;
  readonly assets: SdkReadDomain;
  readonly cmdb: SdkReadDomain;
  readonly services: SdkReadDomain;
  readonly projects: SdkReadDomain;
  readonly time: SdkReadDomain;
  readonly referenceData: SdkReadDomain;
}

export interface TicketMutations {
  createTicket(input: { appId: string | number; body: unknown; params?: Record<string, unknown> }): Promise<unknown>;
  updateTicket(input: { appId: string | number; ticketId: string | number; body: unknown }): Promise<unknown>;
  addTicketComment(input: { appId: string | number; ticketId: string | number; body: unknown }): Promise<unknown>;
  getTicketFeed(input: { appId: string | number; ticketId: string | number }): Promise<unknown>;
  getTicketsFeed(input: { appId: string | number }): Promise<unknown>;
  setTicketCustomAttributes(input: {
    appId: string | number;
    ticketId: string | number;
    attributes: Array<{ ID: string | number; Value: unknown }>;
  }): Promise<unknown>;
  getTicketCustomAttributes(input: { appId: string | number; ticketId: string | number }): Promise<unknown>;
}

export interface TicketRelationshipMutations {
  createTicketTask(input: { appId: string | number; ticketId: string | number; body: unknown }): Promise<unknown>;
  addTicketAsset(input: {
    appId: string | number;
    ticketId: string | number;
    assetId: string | number;
  }): Promise<unknown>;
  removeTicketAsset(input: {
    appId: string | number;
    ticketId: string | number;
    assetId: string | number;
    confirm: true;
  }): Promise<unknown>;
  addTicketContact(input: { appId: string | number; ticketId: string | number; contactUid: string }): Promise<unknown>;
  removeTicketContact(input: {
    appId: string | number;
    ticketId: string | number;
    contactUid: string;
    confirm: true;
  }): Promise<unknown>;
}

export interface PeopleMutations {
  getPersonByUid(input: { uid: string }): Promise<unknown>;
  getGroupMembers(input: { groupId: string | number }): Promise<unknown>;
  createGroup(input: { body: unknown }): Promise<unknown>;
  updateGroup(input: { groupId: string | number; body: unknown }): Promise<unknown>;
  searchGroups(input: { body: Record<string, unknown> }): Promise<unknown>;
  addGroupMember(input: { uid: string; groupId: string | number; removeOtherGroups?: boolean }): Promise<unknown>;
  removeGroupMember(input: { uid: string; groupId: string | number; confirm: true }): Promise<unknown>;
  assignGroupApplications(input: { groupId: string | number }): Promise<unknown>;
  bulkManageGroups(input: { groupIds: Array<string | number> }): Promise<unknown>;
}

export interface KnowledgeBaseMutations {
  createArticle(input: { appId: string | number; body: unknown }): Promise<unknown>;
  updateArticle(input: { appId: string | number; articleId: string | number; body: unknown }): Promise<unknown>;
}

export interface ProjectMutations {
  createIssue(input: { body: unknown }): Promise<unknown>;
  createRisk(input: { body: unknown }): Promise<unknown>;
  searchIssues(input: { projectId: string | number; body?: Record<string, unknown> }): Promise<unknown>;
  updateIssue(input: {
    projectId: string | number;
    issueId: string | number;
    comments: string;
    body?: Record<string, unknown>;
  }): Promise<unknown>;
}

export interface ServiceMutations {
  createService(input: { appId: string | number; body: unknown }): Promise<unknown>;
  updateService(input: { appId: string | number; serviceId: string | number; body: unknown }): Promise<unknown>;
  deleteService(input: { appId: string | number; serviceId: string | number; confirm: true }): Promise<unknown>;
  createServiceCategory(input: { appId: string | number; body: unknown }): Promise<unknown>;
  updateServiceCategory(input: {
    appId: string | number;
    categoryId: string | number;
    body: unknown;
  }): Promise<unknown>;
  deleteServiceCategory(input: {
    appId: string | number;
    categoryId: string | number;
    confirm: true;
  }): Promise<unknown>;
}

export interface AssetMutations {
  createAsset(input: { appId: string | number; body: unknown }): Promise<unknown>;
  updateAsset(input: { appId: string | number; assetId: string | number; body: unknown }): Promise<unknown>;
  deleteAsset(input: { appId: string | number; assetId: string | number; confirm: true }): Promise<unknown>;
  setAssetCustomAttributes(input: {
    appId: string | number;
    assetId: string | number;
    attributes: Array<{ ID: string | number; Value: unknown }>;
  }): Promise<unknown>;
  getAssetCustomAttributes(input: { appId: string | number; assetId: string | number }): Promise<unknown>;
}

export interface CmdbMutations {
  createConfigurationItem(input: { appId: string | number; body: unknown }): Promise<unknown>;
  updateConfigurationItem(input: {
    appId: string | number;
    configurationItemId: string | number;
    body: unknown;
  }): Promise<unknown>;
  deleteConfigurationItem(input: {
    appId: string | number;
    configurationItemId: string | number;
    confirm: true;
  }): Promise<unknown>;
}

export interface TimeMutations {
  createTimeEntry(input: { body: unknown }): Promise<unknown>;
  updateTimeEntry(input: { timeEntryId: string | number; body: unknown }): Promise<unknown>;
  deleteTimeEntry(input: { timeEntryId: string | number; confirm: true }): Promise<unknown>;
}

export interface ReportPage<T = unknown> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  totalCount?: number;
}

export interface BulkResult<TInput = unknown, TResult = unknown> {
  dryRun: boolean;
  succeeded: Array<{ input: TInput; result: TResult }>;
  failed: Array<{ input: TInput; error: unknown }>;
}

export interface SdkHelpers {
  findAccountByName(name: string): Promise<Record<string, unknown> | undefined>;
  findUserByEmail(email: string): Promise<Record<string, unknown> | undefined>;
  resolveTicketLookupContext(input: {
    appId: string | number;
  }): Promise<{ statuses: unknown; priorities: unknown; types: unknown }>;
}

export interface CustomAttributesRegistry {
  getTicketCustomAttributes(input: { appId: string | number }): Promise<unknown>;
  getAssetCustomAttributes(input: { appId: string | number }): Promise<unknown>;
}

export interface TeamDynamixSdk {
  readonly discovery: TeamDynamixSdkReadDomains['discovery'];
  readonly tickets: TeamDynamixSdkReadDomains['tickets'] & TicketMutations;
  readonly ticketRelationships: TeamDynamixSdkReadDomains['ticketRelationships'] & TicketRelationshipMutations;
  readonly people: TeamDynamixSdkReadDomains['people'] & PeopleMutations;
  readonly knowledgeBase: TeamDynamixSdkReadDomains['knowledgeBase'] & KnowledgeBaseMutations;
  readonly assets: TeamDynamixSdkReadDomains['assets'] & AssetMutations;
  readonly cmdb: TeamDynamixSdkReadDomains['cmdb'] & CmdbMutations;
  readonly services: TeamDynamixSdkReadDomains['services'] & ServiceMutations;
  readonly projects: TeamDynamixSdkReadDomains['projects'] & ProjectMutations;
  readonly time: TeamDynamixSdkReadDomains['time'] & TimeMutations;
  readonly referenceData: TeamDynamixSdkReadDomains['referenceData'];
  readonly helpers: SdkHelpers;
  readonly registry: CustomAttributesRegistry;
}
