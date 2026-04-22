import { setTimeout as sleep } from 'node:timers/promises';
import type { RetryPolicy } from './types.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE']);

export const isRetryable = (
  method: string,
  status: number | undefined,
  policy: RetryPolicy,
  hasNetworkError: boolean,
): boolean => {
  const upperMethod = method.toUpperCase();
  const methodAllowed = policy.retryUnsafeMethods || SAFE_METHODS.has(upperMethod);
  if (!methodAllowed) return false;
  if (hasNetworkError) return policy.retryOnNetworkError;
  if (status === undefined) return false;
  return policy.retryOnStatuses.has(status);
};

export const parseRetryAfter = (headerValue: string | null): number | undefined => {
  if (!headerValue) return undefined;
  const asSeconds = Number(headerValue);
  if (!Number.isNaN(asSeconds)) {
    return Math.max(0, asSeconds * 1000);
  }

  const dateMs = Date.parse(headerValue);
  if (Number.isNaN(dateMs)) return undefined;
  return Math.max(0, dateMs - Date.now());
};

export const calculateBackoffDelay = (attempt: number, policy: RetryPolicy): number => {
  const exponential = policy.initialDelayMs * policy.backoffMultiplier ** Math.max(0, attempt - 1);
  const capped = Math.min(exponential, policy.maxDelayMs);
  const jitter = capped * policy.jitterRatio * Math.random();
  return Math.round(capped + jitter);
};

export const waitForRetry = async (delayMs: number): Promise<void> => {
  if (delayMs <= 0) return;
  await sleep(delayMs);
};
