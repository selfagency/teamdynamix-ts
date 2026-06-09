# SDK Domains (Read Methods)

Every domain exposes **auto-generated read methods** — one per `GET` endpoint in the OpenAPI spec. Method names follow `{resource}{Qualifier}` pattern (e.g. `appIdTicketsId` = `GET /api/{appId}/tickets/{id}`).

## Parameter convention

Read methods accept a single options object with `params.path` and `params.query`:

```ts
client.{domain}.{methodName}({
  params?: {
    path?: { [paramName]: string | number }
    query?: Record<string, string | undefined>
  }
})
```

All methods return `Promise<unknown>`. The response type corresponds to the OpenAPI schema for that endpoint. Use `projectFields()` to narrow the response to known fields.

## Application IDs

Methods marked **needs appId** require `appId` as a path parameter. This is the numeric Application ID from TeamDynamix (visible in the URL bar when viewing an app in the web UI).

---

## `client.discovery`

| Method | HTTP | Path | Description |
|---|---|---|---|
| `applications()` | GET | `/api/applications` | List all applications |
| `authGetuser()` | GET | `/api/auth/getuser` | Get current auth user info |
| `authLoginsso()` | GET | `/api/auth/loginsso` | SSO login status |

```ts
const apps = await client.discovery.applications()
```

## `client.tickets`

| Method | needs appId | HTTP | Path |
|---|---|---|---|
| `appIdTicketsBlackoutwindows()` | Yes | GET | `/{appId}/tickets/blackoutwindows` |
| `appIdTicketsBlackoutwindowsId()` | Yes | GET | `/{appId}/tickets/blackoutwindows/{id}` |
| `appIdTicketsImpacts()` | Yes | GET | `/{appId}/tickets/impacts` |
| `appIdTicketsPriorities()` | Yes | GET | `/{appId}/tickets/priorities` |
| `appIdTicketsSearches()` | Yes | GET | `/{appId}/tickets/searches` |
| `appIdTicketsSources()` | Yes | GET | `/{appId}/tickets/sources` |
| `appIdTicketsTypes()` | Yes | GET | `/{appId}/tickets/types` |
| `appIdTicketsTypesId()` | Yes | GET | `/{appId}/tickets/types/{id}` |
| `appIdTicketsUrgencies()` | Yes | GET | `/{appId}/tickets/urgencies` |
| `appIdTicketsId()` | Yes | GET | `/{appId}/tickets/{id}` |
| `appIdTicketsIdConfigurationItems()` | Yes | GET | `/{appId}/tickets/{id}/configurationItems` |
| `appIdTicketsFeed()` | Yes | GET | `/{appId}/tickets/feed` |
| `appIdTicketsForms()` | Yes | GET | `/{appId}/tickets/forms` |
| `appIdTicketsResources()` | Yes | GET | `/{appId}/tickets/resources` |
| `appIdTicketsResponseTemplates()` | Yes | GET | `/{appId}/tickets/responseTemplates` |
| `appIdTicketsIdWorkflow()` | Yes | GET | `/{appId}/tickets/{id}/workflow` |
| `appIdTicketsIdWorkflowActions()` | Yes | GET | `/{appId}/tickets/{id}/workflow/actions` |

```ts
// Get a specific ticket
const ticket = await client.tickets.appIdTicketsId({
  params: { path: { appId: 1, id: 456 } },
})

// Search saved reports
const searches = await client.tickets.appIdTicketsSearches({
  params: { path: { appId: 1 } },
})

// Ticket feed (paginated)
const feed = await client.tickets.appIdTicketsFeed({
  params: {
    path: { appId: 1 },
    query: { Page: '1', PageSize: '50' },
  },
})
```

## `client.ticketRelationships`

| Method | needs appId | HTTP | Path |
|---|---|---|---|
| `appIdTicketsTicketIdTasks()` | Yes | GET | `/{appId}/tickets/{ticketId}/tasks` |
| `appIdTicketsTicketIdTasksId()` | Yes | GET | `/{appId}/tickets/{ticketId}/tasks/{id}` |
| `appIdTicketsTicketIdTasksIdFeed()` | Yes | GET | `/{appId}/tickets/{ticketId}/tasks/{id}/feed` |
| `appIdTicketsIdAssets()` | Yes | GET | `/{appId}/tickets/{id}/assets` |
| `appIdTicketsIdContacts()` | Yes | GET | `/{appId}/tickets/{id}/contacts` |

## `client.people`

| Method | HTTP | Path |
|---|---|---|
| `groupsId()` | GET | `/api/groups/{id}` |
| `groupsIdApplications()` | GET | `/api/groups/{id}/applications` |
| `groupsIdMembers()` | GET | `/api/groups/{id}/members` |
| `peopleUid()` | GET | `/api/people/{uid}` |
| `peopleUidFunctionalroles()` | GET | `/api/people/{uid}/functionalroles` |
| `peopleUidGroups()` | GET | `/api/people/{uid}/groups` |
| `peopleGetuidUsername()` | GET | `/api/people/getuid/{username}` |
| `peopleLookup()` | GET | `/api/people/lookup` |
| `peopleUserlist()` | GET | `/api/people/userlist` |

```ts
// Look up a person by UID
const person = await client.people.peopleUid({
  params: { path: { uid: 'abc123' } },
})

// Get UID from username
const { UID } = await client.people.peopleGetuidUsername({
  params: { path: { username: 'jdoe' } },
})

// List group members
const members = await client.people.groupsIdMembers({
  params: { path: { id: 7 } },
})
```

## `client.knowledgeBase`

| Method | needs appId | HTTP | Path |
|---|---|---|---|
| `appIdKnowledgebaseId()` | Yes | GET | `/{appId}/knowledgebase/{id}` |
| `appIdKnowledgebaseIdAssetscis()` | Yes | GET | `/{appId}/knowledgebase/{id}/assetscis` |
| `appIdKnowledgebaseIdRelated()` | Yes | GET | `/{appId}/knowledgebase/{id}/related` |
| `appIdKnowledgebaseCategories()` | Yes | GET | `/{appId}/knowledgebase/categories` |
| `appIdKnowledgebaseCategoriesId()` | Yes | GET | `/{appId}/knowledgebase/categories/{id}` |

## `client.assets` (app-scoped)

| Method | HTTP | Path |
|---|---|---|
| `appIdAssetsId()` | GET | `/{appId}/assets/{id}` |
| `appIdAssetsIdArticles()` | GET | `/{appId}/assets/{id}/articles` |
| `appIdAssetsIdAssociatedcontracts()` | GET | `/{appId}/assets/{id}/associatedcontracts` |
| `appIdAssetsIdFeed()` | GET | `/{appId}/assets/{id}/feed` |
| `appIdAssetsIdUsers()` | GET | `/{appId}/assets/{id}/users` |
| `appIdAssetsFeed()` | GET | `/{appId}/assets/feed` |
| `appIdAssetsForms()` | GET | `/{appId}/assets/forms` |
| `appIdAssetsSearches()` | GET | `/{appId}/assets/searches` |
| `appIdAssetsStatuses()` | GET | `/{appId}/assets/statuses` |
| `appIdAssetsStatusesId()` | GET | `/{appId}/assets/statuses/{id}` |
| `appIdAssetsModels()` | GET | `/{appId}/assets/models` |
| `appIdAssetsModelsId()` | GET | `/{appId}/assets/models/{id}` |
| `appIdAssetsModelsTypes()` | GET | `/{appId}/assets/models/types` |
| `appIdAssetsModelsTypesId()` | GET | `/{appId}/assets/models/types/{id}` |
| `appIdAssetsContractsId()` | GET | `/{appId}/assets/contracts/{id}` |
| `appIdAssetsContractsIdAssociatedassets()` | GET | `/{appId}/assets/contracts/{id}/associatedassets` |

## `client.cmdb`

| Method | needs appId | HTTP | Path |
|---|---|---|---|
| `appIdCmdbId()` | Yes | GET | `/{appId}/cmdb/{id}` |
| `appIdCmdbIdArticles()` | Yes | GET | `/{appId}/cmdb/{id}/articles` |
| `appIdCmdbIdFeed()` | Yes | GET | `/{appId}/cmdb/{id}/feed` |
| `appIdCmdbIdRelationships()` | Yes | GET | `/{appId}/cmdb/{id}/relationships` |
| `appIdCmdbIdTickets()` | Yes | GET | `/{appId}/cmdb/{id}/tickets` |
| `appIdCmdbSearches()` | Yes | GET | `/{appId}/cmdb/searches` |
| `appIdCmdbTypes()` | Yes | GET | `/{appId}/cmdb/types` |
| `appIdCmdbTypesId()` | Yes | GET | `/{appId}/cmdb/types/{id}` |
| `appIdCmdbForms()` | Yes | GET | `/{appId}/cmdb/forms` |
| `appIdCmdbRelationshiptypes()` | Yes | GET | `/{appId}/cmdb/relationshiptypes` |
| `appIdCmdbRelationshiptypesId()` | Yes | GET | `/{appId}/cmdb/relationshiptypes/{id}` |
| `appIdCmdbMaintenanceschedules()` | Yes | GET | `/{appId}/cmdb/maintenanceschedules` |
| `appIdCmdbMaintenancewindows()` | Yes | GET | `/{appId}/cmdb/maintenancewindows` |
| `appIdCmdbMaintenancewindowsId()` | Yes | GET | `/{appId}/cmdb/maintenancewindows/{id}` |
| `appIdAssetsVendors()` | Yes | GET | `/{appId}/assets/vendors` |
| `appIdAssetsVendorsId()` | Yes | GET | `/{appId}/assets/vendors/{id}` |

## `client.services`

| Method | needs appId | HTTP | Path |
|---|---|---|---|
| `appIdServices()` | Yes | GET | `/{appId}/services` |
| `appIdServicesId()` | Yes | GET | `/{appId}/services/{id}` |
| `appIdServicesIdPermissions()` | Yes | GET | `/{appId}/services/{id}/permissions` |
| `appIdServicesIdRelatedarticles()` | Yes | GET | `/{appId}/services/{id}/relatedarticles` |
| `appIdServicesServiceIdOfferingsId()` | Yes | GET | `/{appId}/services/{serviceId}/offerings/{id}` |
| `appIdServicesServiceIdOfferingsIdRelatedarticles()` | Yes | GET | `/{appId}/services/{serviceId}/offerings/{id}/relatedarticles` |
| `appIdServicesCategories()` | Yes | GET | `/{appId}/services/categories` |
| `appIdServicesCategoriesId()` | Yes | GET | `/{appId}/services/categories/{id}` |
| `appIdServicesCategoriesIdPermissions()` | Yes | GET | `/{appId}/services/categories/{id}/permissions` |
| `appIdServicesIcons()` | Yes | GET | `/{appId}/services/icons` |

## `client.projects`

| Method | HTTP | Path |
|---|---|---|
| `projectsId()` | GET | `/api/projects/{id}` |
| `projectsIdFeed()` | GET | `/api/projects/{id}/feed` |
| `projectsIdResources()` | GET | `/api/projects/{id}/resources` |
| `projectsFeed()` | GET | `/api/projects/feed` |
| `projectsList()` | GET | `/api/projects/list` |
| `projectsTypes()` | GET | `/api/projects/types` |
| `projectsTypesId()` | GET | `/api/projects/types/{id}` |
| `projecttemplates()` | GET | `/api/projecttemplates` |
| `projecttemplatesIdPlans()` | GET | `/api/projecttemplates/{id}/plans` |
| `projectsProjectIDPlansPlanID()` | GET | `/api/projects/{projectID}/plans/{planID}` |
| `projectsProjectIdPlansPlanIdCheckedOutTo()` | GET | `/api/projects/{projectId}/plans/{planId}/checkedOutTo` |
| `projectsProjectIdPlansPlanIdFeed()` | GET | `/api/projects/{projectId}/plans/{planId}/feed` |
| `projectsProjectIdPlansPlanIdTasks()` | GET | `/api/projects/{projectId}/plans/{planId}/tasks` |
| `projectsProjectIdPlansPlanIdTasksTaskId()` | GET | `/api/projects/{projectId}/plans/{planId}/tasks/{taskId}` |
| `projectsProjectIdPlansPlanIdTasksTaskIdFeed()` | GET | `/api/projects/{projectId}/plans/{planId}/tasks/{taskId}/feed` |
| `projectsProjectIdBoardsBoardIdLists()` | GET | `/api/projects/{projectId}/boards/{boardId}/lists` |
| `projectsProjectIdIssuesIssueId()` | GET | `/api/projects/{projectId}/issues/{issueId}` |
| `projectsProjectIdIssuesIssueIdFeed()` | GET | `/api/projects/{projectId}/issues/{issueId}/feed` |
| `projectsProjectIdIssuesCategories()` | GET | `/api/projects/{projectId}/issues/categories` |
| `projectsProjectIdIssuesCategoriesIssueCategoryId()` | GET | `/api/projects/{projectId}/issues/categories/{issueCategoryId}` |
| `projectsIssuesPriorities()` | GET | `/api/projects/issues/priorities` |
| `projectsIssuesStatuses()` | GET | `/api/projects/issues/statuses` |
| `projectsProjectIdRisksRiskId()` | GET | `/api/projects/{projectId}/risks/{riskId}` |
| `projectsProjectIdRisksRiskIdFeed()` | GET | `/api/projects/{projectId}/risks/{riskId}/feed` |
| `projectsProjectIdRisksCategories()` | GET | `/api/projects/{projectId}/risks/categories` |
| `projectsProjectIdRisksCategoriesRiskCategoryId()` | GET | `/api/projects/{projectId}/risks/categories/{riskCategoryId}` |
| `projectsRisksStatuses()` | GET | `/api/projects/risks/statuses` |
| `projectsProjectIdLinksLinkId()` | GET | `/api/projects/{projectId}/links/{linkId}` |
| `projectsProjectIdLinksLinkIdFeed()` | GET | `/api/projects/{projectId}/links/{linkId}/feed` |
| `projectsProjectIdLinksCategories()` | GET | `/api/projects/{projectId}/links/categories` |
| `projectsProjectIDFilesId()` | GET | `/api/projects/{projectID}/files/{id}` |
| `projectsProjectIDFilesIdContent()` | GET | `/api/projects/{projectID}/files/{id}/content` |
| `projectsProjectIDFolders()` | GET | `/api/projects/{projectID}/folders` |
| `projectsProjectIDFoldersIdFiles()` | GET | `/api/projects/{projectID}/folders/{id}/files` |

## `client.time`

| Method | HTTP | Path |
|---|---|---|
| `timeId()` | GET | `/api/time/{id}` |
| `timeLocked()` | GET | `/api/time/locked` |
| `timeReportReportDate()` | GET | `/api/time/report/{reportDate}` |
| `timeReportReportDateUid()` | GET | `/api/time/report/{reportDate}/{uid}` |
| `timeTypes()` | GET | `/api/time/types` |
| `timeTypesId()` | GET | `/api/time/types/{id}` |
| `timeTypesIdLimitsUid()` | GET | `/api/time/types/{id}/limits/{uid}` |
| `timeTypesComponentAppAppIDTicketTicketID()` | GET | `/api/time/types/component/app/{appID}/ticket/{ticketID}` |
| `timeTypesComponentAppAppIDTicketTicketIDTaskTaskID()` | GET | `/api/time/types/component/app/{appID}/ticket/{ticketID}/task/{taskID}` |
| `timeTypesComponentProjectProjectID()` | GET | `/api/time/types/component/project/{projectID}` |
| `timeTypesComponentProjectProjectIDIssueIssueID()` | GET | `/api/time/types/component/project/{projectID}/issue/{issueID}` |
| `timeTypesComponentProjectProjectIDPlanPlanIDTaskTaskID()` | GET | `/api/time/types/component/project/{projectID}/plan/{planID}/task/{taskID}` |
| `timeTypesComponentRequestRequestID()` | GET | `/api/time/types/component/request/{requestID}` |
| `timeTypesComponentTimeoffProjectID()` | GET | `/api/time/types/component/timeoff/{projectID}` |
| `timeTypesComponentWorkspaceWorkspaceID()` | GET | `/api/time/types/component/workspace/{workspaceID}` |
| `daysoff()` | GET | `/api/daysoff` |

```ts
// Time entry
const entry = await client.time.timeId({
  params: { path: { id: 789 } },
})

// Time report for a date
const report = await client.time.timeReportReportDate({
  params: { path: { reportDate: '2025-01-01' } },
})
```

## `client.referenceData` (global, no appId needed)

| Method | HTTP | Path |
|---|---|---|
| `accounts()` | GET | `/api/accounts` |
| `accountsId()` | GET | `/api/accounts/{id}` |
| `attachmentsId()` | GET | `/api/attachments/{id}` |
| `attachmentsIdContent()` | GET | `/api/attachments/{id}/content` |
| `attachmentsIdContentBase64()` | GET | `/api/attachments/{id}/contentBase64` |
| `attributesIdChoices()` | GET | `/api/attributes/{id}/choices` |
| `attributesCustom()` | GET | `/api/attributes/custom` |
| `feedId()` | GET | `/api/feed/{id}` |
| `industries()` | GET | `/api/industries` |
| `integrationsIntegrationIdExclusions()` | GET | `/api/integrations/{integrationId}/exclusions` |
| `locations()` | GET | `/api/locations` |
| `locationsId()` | GET | `/api/locations/{id}` |
| `locationsIdRoomsRoomId()` | GET | `/api/locations/{id}/rooms/{roomId}` |
| `appIdTicketsStatuses()` | GET | `/{appId}/tickets/statuses` *(needs appId)* |
| `appIdTicketsStatusesId()` | GET | `/{appId}/tickets/statuses/{id}` *(needs appId)* |
| `appIdAssetsSearches()` | GET | `/{appId}/assets/searches` *(needs appId)* |
| `reports()` | GET | `/api/reports` |
| `reportsId()` | GET | `/api/reports/{id}` |
| `securityrolesId()` | GET | `/api/securityroles/{id}` |
| `securityrolesPermissions()` | GET | `/api/securityroles/permissions` |
| `typecategories()` | GET | `/api/typecategories` |
| `typecategoriesId()` | GET | `/api/typecategories/{id}` |

```ts
// Active accounts
const accounts = await client.referenceData.accounts()

// Locations
const locations = await client.referenceData.locations()

// Ticket statuses (scoped to app)
const statuses = await client.referenceData.appIdTicketsStatuses({
  params: { path: { appId: 1 } },
})

// Custom attribute definitions
const definitions = await client.referenceData.attributesCustom()
```
