export type ClientErrorCode =
  | 'AUTH_ERROR'
  | 'CONFIG_ERROR'
  | 'REQUEST_VALIDATION_ERROR'
  | 'RESPONSE_VALIDATION_ERROR'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR';

export class TeamDynamixClientError extends Error {
  readonly code: ClientErrorCode;
  readonly status: number | undefined;
  readonly schemaPath: string | undefined;
  readonly method: string | undefined;
  readonly details: unknown;

  constructor(
    message: string,
    options: {
      code: ClientErrorCode;
      status?: number;
      schemaPath?: string;
      method?: string;
      details?: unknown;
      cause?: unknown;
    },
  ) {
    super(message);
    this.name = 'TeamDynamixClientError';
    this.code = options.code;
    this.status = options.status;
    this.schemaPath = options.schemaPath;
    this.method = options.method;
    this.details = options.details;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const redactAuthorization = (input: string): string =>
  input.replace(/authorization\s*:\s*bearer\s+[^\s]+/gi, 'Authorization: Bearer [REDACTED]');
