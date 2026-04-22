import type { TeamDynamixFetchClient } from '../client.js';
import { TeamDynamixClientError } from '../errors.js';
import type { SdkRequestOptions, SdkRouteDefinition } from './types.js';

const toRequestOptions = (options: SdkRequestOptions | undefined): Record<string, unknown> => {
  if (!options) {
    return {};
  }

  const requestOptions: Record<string, unknown> = {};
  if (options.params !== undefined) {
    requestOptions.params = options.params;
  }
  if (options.body !== undefined) {
    requestOptions.body = options.body;
  }
  if (options.headers !== undefined) {
    requestOptions.headers = options.headers;
  }
  return requestOptions;
};

export const executeSdkRoute = async (
  client: TeamDynamixFetchClient,
  route: SdkRouteDefinition,
  options?: SdkRequestOptions,
): Promise<unknown> => {
  const requestOptions = toRequestOptions(options);

  let result: { data?: unknown; error?: unknown; response: Response };
  switch (route.httpMethod) {
    case 'GET':
      result = await client.GET(route.path as never, requestOptions as never);
      break;
    case 'POST':
      result = await client.POST(route.path as never, requestOptions as never);
      break;
    case 'PUT':
      result = await client.PUT(route.path as never, requestOptions as never);
      break;
    case 'PATCH':
      result = await client.PATCH(route.path as never, requestOptions as never);
      break;
    case 'DELETE':
      result = await client.DELETE(route.path as never, requestOptions as never);
      break;
    default: {
      const neverRoute: never = route.httpMethod;
      throw new TeamDynamixClientError(`Unsupported SDK HTTP method: ${String(neverRoute)}`, {
        code: 'CONFIG_ERROR',
        details: route,
      });
    }
  }

  if (result.error !== undefined) {
    throw new TeamDynamixClientError('TeamDynamix API returned an HTTP error response.', {
      code: 'HTTP_ERROR',
      status: result.response.status,
      schemaPath: route.path,
      method: route.httpMethod,
      details: {
        domain: route.domain,
        methodName: route.methodName,
        operationId: route.operationId,
        error: result.error,
      },
    });
  }

  return result.data;
};
