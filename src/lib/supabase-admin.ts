import { createClient } from '@supabase/supabase-js';

const READ_RETRY_DELAYS_MS = [250, 750];
const TRANSIENT_RESPONSE_STATUSES = new Set([502, 503, 504]);

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  return (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
}

function wait(delayMs: number) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function getFetchErrorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: String(error) };
  }

  const cause = error.cause;
  const causeDetails = cause && typeof cause === 'object'
    ? cause as { code?: unknown; message?: unknown }
    : undefined;

  return {
    message: error.message,
    causeCode: typeof causeDetails?.code === 'string' ? causeDetails.code : undefined,
    causeMessage: typeof causeDetails?.message === 'string' ? causeDetails.message : undefined,
  };
}

async function fetchWithReadRetry(input: RequestInfo | URL, init?: RequestInit) {
  const isReadRequest = ['GET', 'HEAD'].includes(getRequestMethod(input, init));
  const attempts = isReadRequest ? READ_RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(input, init);

      if (
        !isReadRequest ||
        !TRANSIENT_RESPONSE_STATUSES.has(response.status) ||
        attempt === attempts - 1
      ) {
        return response;
      }
    } catch (error) {
      if (!isReadRequest || attempt === attempts - 1) {
        console.error('[Supabase] Read request failed', {
          attempts: attempt + 1,
          ...getFetchErrorDetails(error),
        });
        throw error;
      }

      console.warn('[Supabase] Transient read failure, retrying', {
        attempt: attempt + 1,
        maxAttempts: attempts,
        ...getFetchErrorDetails(error),
      });
    }

    await wait(READ_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error('Supabase read request failed after retrying');
}

// Server-side Supabase client with service role key for admin operations
export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for admin client');
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin client');
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (error) {
    throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      fetch: fetchWithReadRetry,
    },
  });
}

// Export a singleton instance for convenience
export const adminSupabase = createAdminSupabaseClient();
