import { createClient } from '@supabase/supabase-js';

export default async function handler(_req: any, res: any) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || (!serviceKey && !publishableKey)) {
    return res.status(503).json({
      status: 'degraded',
      database: 'supabase',
      databaseConnected: false,
      error: 'Missing Supabase environment variables.'
    });
  }

  try {
    // Prefer the server-only service-role key so this diagnostic checks table
    // existence independently of anon/authenticated RLS policies.
    const key = serviceKey || publishableKey!;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const tables = ['anime', 'episodes', 'episode_servers', 'users', 'watchlist', 'watch_history', 'comments'];
    const checks: Record<string, any> = {};

    for (const table of tables) {
      const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
      checks[table] = error
        ? { ok: false, error: error.message }
        : { ok: true, count: count ?? 0 };
    }

    const allOk = Object.values(checks).every((v: any) => v.ok);
    return res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      database: 'supabase',
      databaseConnected: allOk,
      serviceRoleConfigured: Boolean(serviceKey),
      checks
    });
  } catch (error: any) {
    return res.status(503).json({
      status: 'degraded',
      database: 'supabase',
      databaseConnected: false,
      error: error?.message || 'Supabase connection failed.'
    });
  }
}
