import { createClient, type Session, type User } from '@supabase/supabase-js';

export type { Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseBrowserConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (!isSupabaseBrowserConfigured) {
  console.error(
    '[AniVault] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Auth and user features will be unavailable until env vars are set at build time on Vercel.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.local',
  supabasePublishableKey || 'placeholder-publishable-key',
  {
    auth: {
      persistSession: isSupabaseBrowserConfigured,
      autoRefreshToken: isSupabaseBrowserConfigured,
      detectSessionInUrl: isSupabaseBrowserConfigured,
    },
  }
);
