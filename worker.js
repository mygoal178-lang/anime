/**
 * AniVault Watch API — Single-file Cloudflare Worker
 * Paste this entire file into Cloudflare Dashboard → Workers → Edit code
 *
 * Routes:
 *   GET /api/health
 *   GET /api/episodes/:malId/:epNum
 *   GET /api/anime/:malId/episodes
 *   GET /proxy?url=<encoded_embed_url>
 *
 * Secrets (Settings → Variables):
 *   SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY  (or SUPABASE_ANON_KEY)
 *   SUPABASE_SERVICE_ROLE_KEY (recommended)
 */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '*';
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const allow =
    allowed.includes('*') || allowed.includes(origin) ? origin || '*' : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status, env, request, extra) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request, env),
      ...(extra || {}),
    },
  });
}

function err(msg, status, env, request) {
  return json({ error: msg }, status || 500, env, request);
}

function supabaseKey(env) {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '';
}

async function supabaseRest(env, path, query) {
  const base = (env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = supabaseKey(env);
  if (!base || !key) throw new Error('Missing SUPABASE_URL or keys');

  const url = query ? `${base}/rest/v1/${path}?${query}` : `${base}/rest/v1/${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      Prefer: 'return=representation',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function proxifyEmbed(workerOrigin, embedUrl) {
  if (!embedUrl || !/^https?:\/\//i.test(embedUrl)) return embedUrl || null;
  return `${workerOrigin}/proxy?url=${encodeURIComponent(embedUrl)}`;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const origin = url.origin;

    try {
      // Health
      if (path === '/api/health' || path === '/health') {
        let ok = false;
        try {
          await supabaseRest(env, 'episodes', 'select=id&limit=1');
          ok = true;
        } catch (_) {
          ok = false;
        }
        return json(
          {
            status: ok ? 'ok' : 'degraded',
            service: 'anivault-watch-api',
            runtime: 'cloudflare-workers',
            supabase: ok,
          },
          200,
          env,
          request
        );
      }

      // GET /api/episodes/:malId/:epNum
      const epMatch = path.match(/^\/api\/episodes\/(\d+)\/(\d+)$/);
      if (epMatch && request.method === 'GET') {
        const malId = epMatch[1];
        const epNum = epMatch[2];
        const useProxy = url.searchParams.get('proxy') !== '0';

        const episodes = await supabaseRest(
          env,
          'episodes',
          `anime_mal_id=eq.${malId}&episode_number=eq.${epNum}&select=*`
        );
        const episode = Array.isArray(episodes) ? episodes[0] : null;
        if (!episode) return err('Episode not found', 404, env, request);

        const servers = await supabaseRest(
          env,
          'episode_servers',
          `episode_id=eq.${episode.id}&select=*`
        );

        const mapped = (servers || []).map((s) => {
          const raw = s.embed_url;
          return {
            ...s,
            embed_url: useProxy ? proxifyEmbed(origin, raw) : raw,
            original_embed_url: raw,
          };
        });

        const serverUrls = mapped.map((s) => s.embed_url).filter(Boolean);

        return json(
          {
            ...episode,
            servers: mapped,
            serverUrls,
            proxied: useProxy,
          },
          200,
          env,
          request,
          { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' }
        );
      }

      // GET /api/anime/:malId/episodes
      const listMatch = path.match(/^\/api\/anime\/(\d+)\/episodes$/);
      if (listMatch && request.method === 'GET') {
        const malId = listMatch[1];
        const episodes = await supabaseRest(
          env,
          'episodes',
          `anime_mal_id=eq.${malId}&select=id,anime_mal_id,episode_number,title,thumbnail_url,updated_at&order=episode_number.asc`
        );
        return json(
          { mal_id: Number(malId), episodes: episodes || [] },
          200,
          env,
          request,
          { 'Cache-Control': 'public, s-maxage=120' }
        );
      }

      // GET /proxy?url=...
      if (path === '/proxy' && request.method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target || !/^https?:\/\//i.test(target)) {
          return err('Missing or invalid url parameter', 400, env, request);
        }
        let parsed;
        try {
          parsed = new URL(target);
        } catch {
          return err('Invalid URL', 400, env, request);
        }
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return err('Only http/https allowed', 400, env, request);
        }

        const safe = target.replace(/"/g, '&quot;');
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="robots" content="noindex,nofollow"/>
<title>Player</title>
<style>
html,body{margin:0;padding:0;width:100%;height:100%;background:#000;overflow:hidden}
iframe{border:0;width:100%;height:100%;position:absolute;inset:0}
</style>
</head>
<body>
<iframe src="${safe}" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen" allowfullscreen referrerpolicy="no-referrer"></iframe>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
            'Referrer-Policy': 'no-referrer',
            ...corsHeaders(request, env),
          },
        });
      }

      if (path === '/proxy/raw' && request.method === 'GET') {
        const target = url.searchParams.get('url');
        if (!target || !/^https?:\/\//i.test(target)) {
          return err('Missing or invalid url', 400, env, request);
        }
        return Response.redirect(target, 302);
      }

      return err(
        'Not found. Use /api/health or /api/episodes/:malId/:epNum or /proxy?url=...',
        404,
        env,
        request
      );
    } catch (e) {
      return err(e && e.message ? e.message : 'Internal error', 500, env, request);
    }
  },
};
