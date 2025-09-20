import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  throw new Error(`Invalid Supabase URL: ${supabaseUrl}`);
}

// Create Supabase client with custom options for better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    fetch: (url, options = {}) => {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    }
  }
});

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, operation: string) {
  console.error(`Supabase error in ${operation}:`, error);
  
  // Check if it's a connectivity issue
  if (error?.message?.includes('fetch failed') || error?.message?.includes('network')) {
    throw new Error(`Database connectivity issue: ${operation}`);
  }
  
  throw new Error(`Database operation failed: ${operation}`);
}

// Helper function to test Supabase connectivity
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('Banner').select('id').limit(1);
    return !error;
  } catch (error) {
    console.warn('Supabase connectivity test failed:', error);
    return false;
  }
}
