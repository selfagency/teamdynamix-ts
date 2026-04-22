import { describe, expect, it } from 'vitest';
import { calculateBackoffDelay, isRetryable, parseRetryAfter, waitForRetry } from '../src/client/retry.js';
import type { RetryPolicy } from '../src/client/types.js';

const policy: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitterRatio: 0,
  retryOnStatuses: new Set([429, 502, 503, 504]),
  retryOnNetworkError: true,
  retryUnsafeMethods: false,
};

describe('isRetryable', () => {
  it('retries GET on 429', () => {
    expect(isRetryable('GET', 429, policy, false)).toBe(true);
  });

  it('retries GET on 502, 503, 504', () => {
    for (const status of [502, 503, 504]) {
      expect(isRetryable('GET', status, policy, false)).toBe(true);
    }
  });

  it('does not retry GET on 200', () => {
    expect(isRetryable('GET', 200, policy, false)).toBe(false);
  });

  it('does not retry GET on 400', () => {
    expect(isRetryable('GET', 400, policy, false)).toBe(false);
  });

  it('does not retry GET on 401', () => {
    expect(isRetryable('GET', 401, policy, false)).toBe(false);
  });

  it('does not retry POST on 429 by default', () => {
    expect(isRetryable('POST', 429, policy, false)).toBe(false);
  });

  it('retries POST on 429 when retryUnsafeMethods is true', () => {
    const unsafe = { ...policy, retryUnsafeMethods: true };
    expect(isRetryable('POST', 429, unsafe, false)).toBe(true);
  });

  it('retries GET on network error', () => {
    expect(isRetryable('GET', undefined, policy, true)).toBe(true);
  });

  it('does not retry POST on network error by default', () => {
    expect(isRetryable('POST', undefined, policy, true)).toBe(false);
  });

  it('retries HEAD, OPTIONS, TRACE as safe methods', () => {
    for (const method of ['HEAD', 'OPTIONS', 'TRACE']) {
      expect(isRetryable(method, 429, policy, false)).toBe(true);
    }
  });

  it('is case-insensitive for method', () => {
    expect(isRetryable('get', 429, policy, false)).toBe(true);
  });
});

describe('parseRetryAfter', () => {
  it('parses a numeric delay in seconds to milliseconds', () => {
    expect(parseRetryAfter('2')).toBe(2000);
  });

  it('parses zero seconds to 0', () => {
    expect(parseRetryAfter('0')).toBe(0);
  });

  it('parses a future HTTP date', () => {
    const inTwoSeconds = new Date(Date.now() + 2000).toUTCString();
    const result = parseRetryAfter(inTwoSeconds);
    expect(result).toBeDefined();
    expect(result!).toBeGreaterThanOrEqual(0);
    expect(result!).toBeLessThanOrEqual(2500);
  });

  it('returns undefined for an invalid value', () => {
    expect(parseRetryAfter('notadate')).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(parseRetryAfter(null)).toBeUndefined();
  });

  it('clamps negative numeric values to 0', () => {
    expect(parseRetryAfter('-5')).toBe(0);
  });
});

describe('calculateBackoffDelay', () => {
  const zeroJitterPolicy = { ...policy, jitterRatio: 0 };

  it('returns initialDelayMs on first attempt', () => {
    expect(calculateBackoffDelay(1, zeroJitterPolicy)).toBe(100);
  });

  it('doubles each attempt with multiplier 2', () => {
    expect(calculateBackoffDelay(2, zeroJitterPolicy)).toBe(200);
    expect(calculateBackoffDelay(3, zeroJitterPolicy)).toBe(400);
  });

  it('caps at maxDelayMs', () => {
    const capped = { ...zeroJitterPolicy, maxDelayMs: 150 };
    expect(calculateBackoffDelay(2, capped)).toBe(150);
  });

  it('adds jitter within bounds', () => {
    const withJitter = { ...policy, jitterRatio: 0.5 };
    const delay = calculateBackoffDelay(1, withJitter);
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(150);
  });
});

describe('waitForRetry', () => {
  it('resolves immediately for zero delay', async () => {
    const start = Date.now();
    await waitForRetry(0);
    expect(Date.now() - start).toBeLessThan(50);
  });

  it('resolves immediately for negative delay', async () => {
    const start = Date.now();
    await waitForRetry(-10);
    expect(Date.now() - start).toBeLessThan(50);
  });
});
