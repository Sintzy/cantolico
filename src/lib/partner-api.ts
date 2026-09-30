import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const DEFAULT_RATE_LIMIT = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const rateLimitBuckets = new Map<string, RateLimitBucket>();

export type PartnerApiErrorCode =
  | 'api_not_configured'
  | 'api_misconfigured'
  | 'authentication_required'
  | 'invalid_api_key'
  | 'insufficient_scope'
  | 'rate_limit_exceeded';

export type PartnerApiAuthResult =
  | { ok: true; key: string; name: string; scopes: string[]; limit: number; remaining: number; resetAt: number }
  | { ok: false; code: PartnerApiErrorCode; status: 401 | 403 | 429 | 503; retryAfter?: number };

export type PartnerApiScope =
  | 'songs:read'
  | 'songs:write'
  | 'songs:delete'
  | 'admin:*';

type PartnerApiKey = {
  key: string;
  name: string;
  scopes: string[];
};

type DatabasePartnerApiKey = {
  id: string;
  name: string;
  secretHash: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  expiresAt: string | null;
};

export function hashPartnerApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generatePartnerApiKey(): { key: string; prefix: string; hash: string } {
  const key = `ctk_${randomBytes(32).toString('base64url')}`;
  return { key, prefix: key.slice(0, 12), hash: hashPartnerApiKey(key) };
}

type PartnerApiEnvironment = Partial<NodeJS.ProcessEnv>;

function configuredKeys(environment: PartnerApiEnvironment = process.env): PartnerApiKey[] | null {
  const configured = environment.CANTOLICO_API_KEYS?.trim();
  if (configured?.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(configured);
      if (!Array.isArray(parsed)) return null;

      const keys = parsed.map((item): PartnerApiKey | null => {
        if (!item || typeof item !== 'object') return null;
        const candidate = item as { name?: unknown; key?: unknown; scopes?: unknown };
        if (typeof candidate.name !== 'string' || typeof candidate.key !== 'string' || !Array.isArray(candidate.scopes)) {
          return null;
        }

        const scopes = candidate.scopes.filter((scope): scope is string => typeof scope === 'string' && scope.length > 0);
        return candidate.key.trim() && scopes.length > 0
          ? { name: candidate.name.trim() || 'partner', key: candidate.key.trim(), scopes }
          : null;
      });

      return keys.every((key): key is PartnerApiKey => key !== null) ? keys : null;
    } catch {
      return null;
    }
  }

  // The old comma-separated setting remains valid and grants read-only access.
  // It keeps an already-configured Hermes working while allowing scoped JSON keys.
  return [configured, environment.CANTOLICO_API_KEY]
    .filter((value): value is string => Boolean(value))
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean)
    .map((key, index) => ({ key, name: `read-only-${index + 1}`, scopes: ['songs:read'] }));
}

function equalSecrets(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length
    && timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function readPartnerApiKey(headers: Headers): string | null {
  const bearer = headers.get('authorization');
  if (bearer?.startsWith('Bearer ')) {
    const key = bearer.slice('Bearer '.length).trim();
    return key || null;
  }

  return headers.get('x-api-key')?.trim() || null;
}

export function getPartnerRateLimit(environment: PartnerApiEnvironment = process.env): number {
  const configured = Number.parseInt(environment.CANTOLICO_API_RATE_LIMIT || '', 10);
  if (!Number.isFinite(configured)) return DEFAULT_RATE_LIMIT;
  return Math.min(Math.max(configured, 1), 10_000);
}

function consumeRateLimit(key: string, limit: number, now = Date.now()) {
  const existing = rateLimitBuckets.get(key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
    : existing;

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    remaining: Math.max(limit - bucket.count, 0),
    resetAt: bucket.resetAt,
  };
}

export function authenticatePartnerApi(
  headers: Headers,
  environment: PartnerApiEnvironment = process.env,
  now = Date.now(),
  requiredScope: PartnerApiScope = 'songs:read',
): PartnerApiAuthResult {
  const keys = configuredKeys(environment);
  if (keys === null) {
    return { ok: false, code: 'api_misconfigured', status: 503 };
  }
  if (keys.length === 0) {
    return { ok: false, code: 'api_not_configured', status: 503 };
  }

  const receivedKey = readPartnerApiKey(headers);
  if (!receivedKey) {
    return { ok: false, code: 'authentication_required', status: 401 };
  }

  const matchedKey = keys.find(expected => equalSecrets(receivedKey, expected.key));
  if (!matchedKey) {
    return { ok: false, code: 'invalid_api_key', status: 401 };
  }

  const hasScope = matchedKey.scopes.includes('admin:*')
    || matchedKey.scopes.includes(requiredScope)
    || (requiredScope.startsWith('songs:') && matchedKey.scopes.includes('songs:*'));
  if (!hasScope) {
    return { ok: false, code: 'insufficient_scope', status: 403 };
  }

  const limit = getPartnerRateLimit(environment);
  const rateLimit = consumeRateLimit(receivedKey, limit, now);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: 'rate_limit_exceeded',
      status: 429,
      retryAfter: Math.max(1, Math.ceil((rateLimit.resetAt - now) / 1000)),
    };
  }

  return { ok: true, key: receivedKey, name: matchedKey.name, scopes: matchedKey.scopes, limit, ...rateLimit };
}

async function authenticateDatabasePartnerApi(
  receivedKey: string,
  requiredScope: PartnerApiScope,
  now: number,
): Promise<PartnerApiAuthResult | null> {
  // Keep the pure authentication helpers usable in tests and scripts that do
  // not have Supabase configured. The database client validates its runtime
  // environment during module initialization.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  const { adminSupabase } = await import('@/lib/supabase-admin');
  const { data, error } = await adminSupabase
    .from('PartnerApiKey')
    .select('id,name,secretHash,scopes,rateLimit,isActive,expiresAt')
    .eq('secretHash', hashPartnerApiKey(receivedKey))
    .maybeSingle();

  // An empty result is normal: it may be an old environment-managed key.
  if (error) {
    // Keep existing environment credentials working until the migration is applied.
    if (error.code !== '42P01') console.error('[PARTNER_API_KEY_LOOKUP]', error);
    return null;
  }
  if (!data) return null;

  const apiKey = data as DatabasePartnerApiKey;
  if (!apiKey.isActive) return { ok: false, code: 'invalid_api_key', status: 401 };
  if (apiKey.expiresAt && new Date(apiKey.expiresAt).getTime() <= now) {
    return { ok: false, code: 'invalid_api_key', status: 401 };
  }

  const hasScope = apiKey.scopes.includes('admin:*')
    || apiKey.scopes.includes(requiredScope)
    || (requiredScope.startsWith('songs:') && apiKey.scopes.includes('songs:*'));
  if (!hasScope) return { ok: false, code: 'insufficient_scope', status: 403 };

  const limit = Math.min(Math.max(apiKey.rateLimit, 1), 10_000);
  const rateLimit = consumeRateLimit(receivedKey, limit, now);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      code: 'rate_limit_exceeded',
      status: 429,
      retryAfter: Math.max(1, Math.ceil((rateLimit.resetAt - now) / 1000)),
    };
  }

  // This deliberately does not delay the API response. Failure to record usage
  // must never make a valid partner request fail.
  void adminSupabase
    .from('PartnerApiKey')
    .update({ lastUsedAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString() })
    .eq('id', apiKey.id)
    .then(({ error: updateError }) => {
      if (updateError) console.error('[PARTNER_API_KEY_USAGE]', updateError);
    });

  return { ok: true, key: receivedKey, name: apiKey.name, scopes: apiKey.scopes, limit, ...rateLimit };
}

export function partnerApiError(
  code: PartnerApiErrorCode | 'invalid_request' | 'not_found' | 'internal_error',
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status, headers: partnerApiHeaders() },
  );
}

export function partnerApiData<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(
    { data },
    {
      ...init,
      headers: {
        ...partnerApiHeaders(),
        ...(init?.headers || {}),
      },
    },
  );
}

export function partnerApiHeaders(auth?: Extract<PartnerApiAuthResult, { ok: true }>): HeadersInit {
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'Vary': 'Authorization, X-API-Key',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
  };

  if (auth) {
    headers['X-RateLimit-Limit'] = String(auth.limit);
    headers['X-RateLimit-Remaining'] = String(auth.remaining);
    headers['X-RateLimit-Reset'] = String(Math.ceil(auth.resetAt / 1000));
  }

  return headers;
}

export async function withPartnerApiAuth(
  request: Request,
  requiredScope: PartnerApiScope = 'songs:read',
): Promise<{ auth: Extract<PartnerApiAuthResult, { ok: true }>; error?: never } | { auth?: never; error: NextResponse }> {
  const now = Date.now();
  const receivedKey = readPartnerApiKey(request.headers);
  const databaseResult = receivedKey
    ? await authenticateDatabasePartnerApi(receivedKey, requiredScope, now)
    : null;
  const result = databaseResult || authenticatePartnerApi(request.headers, process.env, now, requiredScope);
  if (result.ok) return { auth: result };

  const response = partnerApiError(
    result.code,
    result.code === 'api_not_configured' || result.code === 'api_misconfigured'
      ? 'A API de parceiros ainda não está configurada.'
      : result.code === 'rate_limit_exceeded'
        ? 'Limite de pedidos excedido. Tenta novamente mais tarde.'
        : result.code === 'insufficient_scope'
          ? 'Esta chave não tem permissão para executar esta operação.'
        : 'É necessária uma chave de API válida.',
    result.status,
  );

  if (result.retryAfter) response.headers.set('Retry-After', String(result.retryAfter));
  return { error: response };
}

export function parsePositiveInteger(value: string | null, fallback: number, maximum: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;

  const parsed = Number.parseInt(value, 10);
  return parsed >= 1 && parsed <= maximum ? parsed : null;
}

export function resetPartnerApiRateLimitsForTests() {
  rateLimitBuckets.clear();
}
