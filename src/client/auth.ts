import { TeamDynamixClientError } from './errors.js';

interface AuthBaseConfig {
  tenant: string;
  environment?: 'production' | 'sandbox';
}

interface PasswordAuthConfig extends AuthBaseConfig {
  username: string;
  password: string;
}

interface ServiceAccountAuthConfig extends AuthBaseConfig {
  beid: string;
  webServicesKey: string;
}

const toBaseUrl = (tenant: string, environment: 'production' | 'sandbox'): string => {
  // If tenant is already a full domain (e.g. "td.myuniversity.edu"), use it directly.
  if (tenant.includes('.')) {
    return `https://${tenant}`;
  }
  return environment === 'sandbox' ? `https://${tenant}-sandbox.teamdynamix.com` : `https://${tenant}.teamdynamix.com`;
};

/**
 * Creates a token provider that authenticates with a TeamDynamix username and password.
 *
 * Each invocation sends `POST /api/auth/login` to obtain a fresh JWT.
 * Pass the returned function as `tokenProvider` to `createTeamDynamixClient`.
 *
 * @example
 * ```ts
 * const { client } = await createTeamDynamixClient({
 *   tenant: 'mytenant',
 *   tokenProvider: loginWithPassword({
 *     tenant: 'mytenant',
 *     username: process.env.TD_USERNAME!,
 *     password: process.env.TD_PASSWORD!,
 *   }),
 * });
 * ```
 *
 * For custom FQDNs pass the full hostname as `tenant` (the `environment` option is ignored):
 * ```ts
 * loginWithPassword({
 *   tenant: 'td.myuniversity.edu',
 *   username: '...',
 *   password: '...',
 * })
 * ```
 */
export const loginWithPassword = (config: PasswordAuthConfig): (() => Promise<string>) => {
  const { username, password, tenant, environment } = config;
  const baseUrl = toBaseUrl(tenant, environment ?? 'production');

  return async (): Promise<string> => {
    const resp = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => undefined);
      throw new TeamDynamixClientError('Password authentication failed.', {
        code: 'AUTH_ERROR',
        status: resp.status,
        details: { responseBody: body },
      });
    }

    return resp.text();
  };
};

/**
 * Creates a token provider that authenticates with a TeamDynamix admin service account.
 *
 * Service accounts are managed in TDAdmin → Organization Settings
 * (requires "Add BE Administrators" permission). Use `BEID` and `WebServicesKey`
 * obtained from that page.
 *
 * Each invocation sends `POST /api/auth/loginadmin` to obtain a fresh JWT.
 * Pass the returned function as `tokenProvider` to `createTeamDynamixClient`.
 *
 * @example
 * ```ts
 * const { client } = await createTeamDynamixClient({
 *   tenant: 'mytenant',
 *   tokenProvider: loginWithServiceAccount({
 *     tenant: 'mytenant',
 *     beid: process.env.TD_BEID!,
 *     webServicesKey: process.env.TD_WSKEY!,
 *   }),
 * });
 * ```
 *
 * For custom FQDNs pass the full hostname as `tenant` (the `environment` option is ignored):
 * ```ts
 * loginWithServiceAccount({
 *   tenant: 'td.myuniversity.edu',
 *   beid: '...',
 *   webServicesKey: '...',
 * })
 * ```
 */
export const loginWithServiceAccount = (config: ServiceAccountAuthConfig): (() => Promise<string>) => {
  const { beid, webServicesKey, tenant, environment } = config;
  const baseUrl = toBaseUrl(tenant, environment ?? 'production');

  return async (): Promise<string> => {
    const resp = await fetch(`${baseUrl}/api/auth/loginadmin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ BEID: beid, WebServicesKey: webServicesKey }),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => undefined);
      throw new TeamDynamixClientError('Service account authentication failed.', {
        code: 'AUTH_ERROR',
        status: resp.status,
        details: { responseBody: body },
      });
    }

    return resp.text();
  };
};
