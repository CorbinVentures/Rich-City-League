import { createSign, createPrivateKey } from 'node:crypto';

type LeagueAppsConfig = {
  siteId: string;
  clientId: string;
  privateKey: string;
  authBaseUrl: string;
  apiBaseUrl: string;
};

type TokenResponse = { access_token?: string };

export type LeagueAppsResource = 'members-2' | 'registrations-2';

function getConfig(): LeagueAppsConfig | null {
  const siteId = process.env.LEAGUEAPPS_SITE_ID?.trim();
  const clientId = process.env.LEAGUEAPPS_CLIENT_ID?.trim();
  const privateKey = process.env.LEAGUEAPPS_PRIVATE_KEY?.trim();
  if (!siteId || !clientId || !privateKey) return null;

  return {
    siteId,
    clientId,
    privateKey: privateKey
      .replace(/^\uFEFF/, '')
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n')
      .trim(),
    authBaseUrl: (process.env.LEAGUEAPPS_AUTH_BASE_URL || 'https://auth.leagueapps.io').replace(/\/$/, ''),
    apiBaseUrl: (process.env.LEAGUEAPPS_API_BASE_URL || 'https://admin.leagueapps.io').replace(/\/$/, ''),
  };
}

export function getLeagueAppsConfigStatus() {
  const config = getConfig();
  let privateKeyValid = false;

  if (config?.privateKey) {
    try {
      createPrivateKey({ key: config.privateKey, format: 'pem' });
      privateKeyValid = true;
    } catch {
      privateKeyValid = false;
    }
  }

  return {
    configured: Boolean(config) && privateKeyValid,
    siteId: config?.siteId ?? null,
    clientIdPresent: Boolean(config?.clientId),
    privateKeyPresent: Boolean(config?.privateKey),
    privateKeyValid,
  };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString('base64url');
}

function createClientAssertion(config: LeagueAppsConfig) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({
    aud: `${config.authBaseUrl}/v2/auth/token`,
    iss: config.clientId,
    sub: config.clientId,
    iat: now,
    exp: now + 300,
  }));
  const unsigned = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  let privateKey;
  try {
    privateKey = createPrivateKey({ key: config.privateKey, format: 'pem' });
  } catch {
    throw new Error(
      'LeagueApps private key could not be decoded. Vercel must contain the PEM private key converted from the LeagueApps .p12 file, including its BEGIN/END PRIVATE KEY lines.'
    );
  }
  const signature = signer.sign(privateKey).toString('base64url');
  return `${unsigned}.${signature}`;
}

async function getAccessToken(config: LeagueAppsConfig) {
  const assertion = createClientAssertion(config);
  const response = await fetch(`${config.authBaseUrl}/v2/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LeagueApps authentication failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const data = await response.json() as TokenResponse;
  if (!data.access_token) throw new Error('LeagueApps authentication returned no access token.');
  return data.access_token;
}

export async function fetchLeagueAppsBatch(
  resource: LeagueAppsResource,
  cursor: { lastUpdated: number; lastId: number } = { lastUpdated: 0, lastId: 0 },
) {
  const config = getConfig();
  if (!config) throw new Error('LeagueApps integration is not configured.');

  const token = await getAccessToken(config);
  const url = new URL(`${config.apiBaseUrl}/v2/sites/${config.siteId}/export/${resource}`);
  url.searchParams.set('last-updated', String(cursor.lastUpdated));
  url.searchParams.set('last-id', String(cursor.lastId));

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LeagueApps ${resource} request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const records = await response.json() as Array<Record<string, unknown>>;
  return records;
}


type LeagueAppsPublicRecord = Record<string, unknown>;

function getPublicConfig() {
  const siteId = process.env.LEAGUEAPPS_SITE_ID?.trim();
  const apiKey = (process.env.LEAGUEAPPS_CLIENT_ID || process.env.LEAGUEAPPS_PUBLIC_API_KEY)?.trim();
  const apiBaseUrl = (process.env.LEAGUEAPPS_PUBLIC_API_BASE_URL || 'https://api.leagueapps.com').replace(/\/$/, '');
  if (!siteId || !apiKey) throw new Error('LeagueApps Public API integration is not configured.');
  return { siteId, apiKey, apiBaseUrl };
}

async function fetchLeagueAppsPublic(path: string) {
  const config = getPublicConfig();
  const url = new URL(`${config.apiBaseUrl}/v1/sites/${config.siteId}/${path.replace(/^\//, '')}`);
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-api-key': config.apiKey,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LeagueApps Public API request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.json() as Promise<unknown>;
}

function publicRows(payload: unknown, keys: string[]): LeagueAppsPublicRecord[] {
  if (Array.isArray(payload)) return payload.filter((row): row is LeagueAppsPublicRecord => Boolean(row && typeof row === 'object'));
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value.filter((row): row is LeagueAppsPublicRecord => Boolean(row && typeof row === 'object'));
  }
  return [];
}

export async function fetchLeagueAppsProgramSchedule(programId: number) {
  const payload = await fetchLeagueAppsPublic(`programs/${programId}/schedule`);
  return publicRows(payload, ['games', 'schedule', 'events', 'items']);
}

export async function fetchLeagueAppsProgramTeams(programId: number) {
  const payload = await fetchLeagueAppsPublic(`programs/${programId}/teams`);
  return publicRows(payload, ['teams', 'items']);
}

export async function fetchLeagueAppsLocations() {
  const payload = await fetchLeagueAppsPublic('locations');
  return publicRows(payload, ['locations', 'items']);
}

export function getLeagueAppsPublicConfigStatus() {
  return {
    configured: Boolean(process.env.LEAGUEAPPS_SITE_ID?.trim() && (process.env.LEAGUEAPPS_CLIENT_ID?.trim() || process.env.LEAGUEAPPS_PUBLIC_API_KEY?.trim())),
    siteId: process.env.LEAGUEAPPS_SITE_ID?.trim() ?? null,
    publicApiKeyPresent: Boolean(process.env.LEAGUEAPPS_PUBLIC_API_KEY?.trim()),
    usingPrivateClientId: Boolean(process.env.LEAGUEAPPS_CLIENT_ID?.trim()),
  };
}
