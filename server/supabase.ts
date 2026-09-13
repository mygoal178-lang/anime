import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

/** True when the minimum publishable Supabase credentials are present. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isSupabaseConfigured) {
  // Do not throw at module load — that would crash every Vercel serverless
  // function on import. Routes that need DB access already return 503 when
  // queries fail or when isSupabaseConfigured is false.
  console.error(
    '[AniVault] Missing SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY. API database routes will be degraded until env vars are set.'
  );
}

// Use a clearly invalid placeholder when env is missing so createClient still
// returns a typed client; real requests fail safely and health checks report degraded.
const effectiveUrl = supabaseUrl || 'https://placeholder.supabase.local';
const effectiveKey = supabasePublishableKey || 'placeholder-publishable-key';

export const supabase: SupabaseClient = createClient(effectiveUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const supabaseAdmin: SupabaseClient | null =
  supabaseServiceRoleKey && isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export function createAuthenticatedSupabaseClient(token?: string): SupabaseClient {
  if (!token || !isSupabaseConfigured) return supabase;

  return createClient(effectiveUrl, effectiveKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
