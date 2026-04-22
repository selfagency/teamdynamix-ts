export type RuntimeValidationMode = 'fail-closed' | 'fail-open';

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRatio: number;
  retryOnStatuses: ReadonlySet<number>;
  retryOnNetworkError: boolean;
  retryUnsafeMethods: boolean;
}

export interface TeamDynamixClientConfig {
  tenant: string;
  tokenProvider: () => string | Promise<string>;
  environment?: 'production' | 'sandbox';
  baseUrl?: string;
  timeoutMs?: number;
  runtimeValidationMode?: RuntimeValidationMode;
  specPath?: string;
  unauthenticatedPaths?: string[];
  retryPolicy?: Partial<RetryPolicy>;
  onRetry?: (context: { schemaPath: string; method: string; attempt: number; delayMs: number; reason: string }) => void;
}

export interface NormalizedClientConfig {
  tenant: string;
  environment: 'production' | 'sandbox';
  baseUrl: string;
  timeoutMs: number;
  runtimeValidationMode: RuntimeValidationMode;
  specPath: string;
  unauthenticatedPaths: ReadonlySet<string>;
  retryPolicy: RetryPolicy;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 250,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  retryOnStatuses: new Set([429, 502, 503, 504]),
  retryOnNetworkError: true,
  retryUnsafeMethods: false,
};

export const DEFAULT_TIMEOUT_MS = 30000;
