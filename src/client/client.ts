import { setMaxListeners } from 'node:events';
import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from '../generated/schema.js';
import { TeamDynamixClientError } from './errors.js';
import { calculateBackoffDelay, isRetryable, parseRetryAfter, waitForRetry } from './retry.js';
import { tenantSchema, tokenSchema } from './schemas/index.js';
import { createTeamDynamixSdk } from './sdk/index.js';
import { defaultSpecPath, loadDereferencedSpec } from './spec.js';
import type { NormalizedClientConfig, TeamDynamixClientConfig } from './types.js';
import { DEFAULT_RETRY_POLICY, DEFAULT_TIMEOUT_MS } from './types.js';
import { OpenApiRuntimeValidator } from './validation.js';

const toBaseUrl = (tenant: string, environment: 'production' | 'sandbox'): string =>
  environment === 'sandbox' ? `https://${tenant}-sandbox.teamdynamix.com` : `https://${tenant}.teamdynamix.com`;

const ensureHttps = (url: string): string => {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') {
    throw new TeamDynamixClientError('Only HTTPS base URLs are permitted for TeamDynamix client.', {
      code: 'CONFIG_ERROR',
      details: { url },
    });
  }
  return parsed.toString().replace(/\/$/, '');
};

const normalizeConfig = (config: TeamDynamixClientConfig): NormalizedClientConfig => {
  const environment = config.environment ?? 'production';
  const derivedBaseUrl = config.baseUrl ?? toBaseUrl(config.tenant, environment);
  const baseUrl = ensureHttps(derivedBaseUrl);

  return {
    tenant: config.tenant,
    environment,
    baseUrl,
    timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    runtimeValidationMode: config.runtimeValidationMode ?? 'fail-closed',
    specPath: config.specPath ?? defaultSpecPath(),
    unauthenticatedPaths: new Set(
      config.unauthenticatedPaths ?? ['/api/auth', '/api/auth/login', '/api/auth/loginadmin'],
    ),
    retryPolicy: {
      ...DEFAULT_RETRY_POLICY,
      ...config.retryPolicy,
      retryOnStatuses: config.retryPolicy?.retryOnStatuses ?? DEFAULT_RETRY_POLICY.retryOnStatuses,
    },
  };
};

const withTimeout = (request: Request, timeoutMs: number): Request => {
  if (request.signal.aborted) {
    return new Request(request, { signal: request.signal });
  }

  const controller = new AbortController();
  // Allow many listeners when retries clone the request and inherit this signal.
  setMaxListeners(100, controller.signal);
  const timeoutHandle = setTimeout(() => controller.abort('Request timed out'), timeoutMs);
  const signal = request.signal;
  signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutHandle);
      controller.abort(signal.reason);
    },
    { once: true },
  );

  return new Request(request, { signal: controller.signal });
};

export type TeamDynamixFetchClient = ReturnType<typeof createClient<paths>>;

export const createTeamDynamixClient = async (
  config: TeamDynamixClientConfig,
): Promise<{
  client: TeamDynamixFetchClient & ReturnType<typeof createTeamDynamixSdk>;
  raw: TeamDynamixFetchClient;
  config: NormalizedClientConfig;
}> => {
  const tenantParse = tenantSchema.safeParse(config.tenant);
  if (!tenantParse.success) {
    throw new TeamDynamixClientError('Tenant is required.', { code: 'CONFIG_ERROR' });
  }

  const normalized = normalizeConfig(config);
  const spec = await loadDereferencedSpec(normalized.specPath);
  const validator = new OpenApiRuntimeValidator(spec);

  const authMiddleware: Middleware = {
    async onRequest({ schemaPath, request }) {
      if (!normalized.unauthenticatedPaths.has(schemaPath)) {
        const providedToken = await config.tokenProvider();
        const tokenParse = tokenSchema.safeParse(providedToken);
        if (!tokenParse.success) {
          throw new TeamDynamixClientError('Token provider returned an empty token.', {
            code: 'AUTH_ERROR',
            schemaPath,
            method: request.method,
            details: tokenParse.error.issues,
          });
        }
        const token = tokenParse.data;
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return withTimeout(request, normalized.timeoutMs);
    },
  };

  const validationMiddleware: Middleware = {
    async onRequest({ params, schemaPath, request }) {
      if (params && 'body' in params && params.body !== undefined) {
        const validationResult = validator.validateRequest(schemaPath, request.method, params.body);
        if (!validationResult.valid && normalized.runtimeValidationMode === 'fail-closed') {
          throw new TeamDynamixClientError('Request body failed OpenAPI runtime validation.', {
            code: 'REQUEST_VALIDATION_ERROR',
            schemaPath,
            method: request.method,
            details: validationResult.errors,
          });
        }
      }
      return request;
    },
    async onResponse({ schemaPath, request, response }) {
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json') || response.status === 204) {
        return response;
      }

      const payload = await response
        .clone()
        .json()
        .catch(() => undefined);
      const validationResult = validator.validateResponse(schemaPath, request.method, response.status, payload);

      if (!validationResult.valid && normalized.runtimeValidationMode === 'fail-closed') {
        throw new TeamDynamixClientError('Response body failed OpenAPI runtime validation.', {
          code: 'RESPONSE_VALIDATION_ERROR',
          schemaPath,
          method: request.method,
          status: response.status,
          details: validationResult.errors,
        });
      }

      return response;
    },
  };

  const retryMiddleware: Middleware = {
    async onResponse({ schemaPath, request, response, options }) {
      const fetchImpl = options.fetch ?? fetch;

      if (!isRetryable(request.method, response.status, normalized.retryPolicy, false)) {
        return response;
      }

      const retryRequest = request.clone();
      let lastResponse = response;
      for (let attempt = 1; attempt <= normalized.retryPolicy.maxRetries; attempt += 1) {
        const retryAfter = parseRetryAfter(lastResponse.headers.get('retry-after'));
        const delayMs = retryAfter ?? calculateBackoffDelay(attempt, normalized.retryPolicy);

        config.onRetry?.({
          schemaPath,
          method: request.method,
          attempt,
          delayMs,
          reason: `${lastResponse.status}`,
        });

        await waitForRetry(delayMs);

        const retriedResponse = await fetchImpl(retryRequest.clone());
        if (!isRetryable(request.method, retriedResponse.status, normalized.retryPolicy, false)) {
          return retriedResponse;
        }

        lastResponse = retriedResponse;
      }

      return lastResponse;
    },
    async onError({ error, request, schemaPath }) {
      if (!isRetryable(request.method, undefined, normalized.retryPolicy, true)) {
        return error as Error;
      }

      const retryRequest = request.clone();
      for (let attempt = 1; attempt <= normalized.retryPolicy.maxRetries; attempt += 1) {
        const delayMs = calculateBackoffDelay(attempt, normalized.retryPolicy);
        config.onRetry?.({
          schemaPath,
          method: request.method,
          attempt,
          delayMs,
          reason: 'network-error',
        });

        await waitForRetry(delayMs);

        try {
          const response = await fetch(retryRequest.clone());
          return response;
        } catch {
          // Continue retry loop
        }
      }

      return new TeamDynamixClientError('Network request failed after retries.', {
        code: 'NETWORK_ERROR',
        schemaPath,
        method: request.method,
        cause: error,
      });
    },
  };

  const client = createClient<paths>({ baseUrl: normalized.baseUrl });
  client.use(authMiddleware);
  client.use(validationMiddleware);
  client.use(retryMiddleware);

  const rawClient = client;
  const sdk = createTeamDynamixSdk(client);
  const sdkClient = Object.assign(Object.create(client) as TeamDynamixFetchClient, sdk);

  return { client: sdkClient, raw: rawClient, config: normalized };
};
