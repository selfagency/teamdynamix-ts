import type { TeamDynamixFetchClient } from '../client.js';
import { executeSdkRoute } from './request.js';
import type { BulkResult } from './types.js';

const toResult = <TInput>(input: TInput, result: unknown) => ({ input, result });
const toError = <TInput>(input: TInput, error: unknown) => ({ input, error });

export const bulkAddUsersToGroup = async (
  client: TeamDynamixFetchClient,
  input: { groupId: string | number; uids: string[]; dryRun?: boolean },
): Promise<BulkResult<string, unknown>> => {
  const succeeded: Array<{ input: string; result: unknown }> = [];
  const failed: Array<{ input: string; error: unknown }> = [];
  for (const uid of input.uids) {
    if (input.dryRun) {
      succeeded.push(toResult(uid, { dryRun: true }));
      continue;
    }
    try {
      const result = await executeSdkRoute(
        client,
        {
          domain: 'people',
          methodName: 'addGroupMember',
          operationId: 'postGroupsIdMembers',
          path: '/api/groups/{id}/members',
          httpMethod: 'POST',
          tags: ['Group'],
          mutating: true,
          destructive: false,
        },
        { params: { path: { id: input.groupId } }, body: { UID: uid } },
      );
      succeeded.push(toResult(uid, result));
    } catch (error) {
      failed.push(toError(uid, error));
    }
  }
  return { dryRun: Boolean(input.dryRun), succeeded, failed };
};
