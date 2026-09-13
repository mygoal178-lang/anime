import express from 'express';
import cookieParser from 'cookie-parser';
import { anilistApi } from './anilistCache.js';
import { authenticateUser, requireAdmin, AuthenticatedRequest } from './auth.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';
import { rateLimit } from './rateLimit.js';
import { searchLocalAnime, getLocalGenres, getLocalTopAnime, getLocalSeasonAnime } from './catalogFallback.js';
import {
  fetchRecentAnime,
  fetchSeries,
  mapAnikotoAnimeToLocal,
  extractEmbeds,
} from './anikoto.js';

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic security headers (also applied in server.ts for long-running Node)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

/**
 * Vercel path normalization
 * When the Express app is invoked via api/index.ts or api/[...path].ts,
 * req.url sometimes arrives without the `/api` prefix (e.g. `/anime/updated`
 * instead of `/api/anime/updated`). Re-prefix so existing route tables match.
 */
app.use((req, _res, next) => {
  const raw = req.url || '/';
  const qIndex = raw.indexOf('?');
  const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex) : '';

  if (!pathOnly.startsWith('/api')) {
    const needsPrefix =
      pathOnly === '/' ||
      pathOnly === '' ||
      pathOnly.startsWith('/anime') ||
      pathOnly.startsWith('/episodes') ||
      pathOnly.startsWith('/admin') ||
      pathOnly.startsWith('/health') ||
      pathOnly.startsWith('/db') ||
      pathOnly.startsWith('/anilist') ||
      pathOnly.startsWith('/jikan');

    if (needsPrefix) {
      const normalizedPath = pathOnly === '/' || pathOnly === '' ? '/api/health' : `/api${pathOnly}`;
      req.url = normalizedPath + query;
    }
  }
  next();
});

// Global soft rate limit (per IP + path). Dedicated AniList Vercel functions
// have their own handlers; this protects Express-mounted routes.
app.use('/api/', rateLimit(120, 60_000));

app.use(authenticateUser);

// In-memory search frequency tracker.
// NOTE: On Vercel serverless this map resets on cold starts. Top-searched
// stats are best-effort only and must not be treated as durable analytics.
const searchFrequencyMap = new Map<number, { mal_id: number; title: string; cover_url: string; search_count: number }>();

// -------------------------------------------------------------
// 1. HEALTH CHECK ROUTE
// -------------------------------------------------------------
app.get('/api/health', async (req: AuthenticatedRequest, res) => {
  const startedAt = Date.now();
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        platform: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
        database: 'supabase',
        databaseConnected: false,
        databaseError: 'Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables.',
        latencyMs: Date.now() - startedAt,
      });
    }
    // Actually test the configured Supabase connection instead of reporting
    // a hard-coded "supabase" status.
    const dbForHealth = supabaseAdmin || req.supabase;
    const { error } = await dbForHealth
      .from('anime')
      .select('id', { count: 'exact', head: true });

    if (error) {
      return res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        platform: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
        database: 'supabase',
        databaseConnected: false,
        databaseError: error.message,
        latencyMs: Date.now() - startedAt,
      });
    }

    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      platform: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      database: 'supabase',
      databaseConnected: true,
      latencyMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      platform: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      database: 'supabase',
      databaseConnected: false,
      databaseError: err?.message || 'Supabase connection failed.',
      latencyMs: Date.now() - startedAt,
    });
  }
});

// Detailed DB diagnostic endpoint. It never exposes keys or secrets.
app.get('/api/db/health', async (req: AuthenticatedRequest, res) => {
  const checks: Record<string, any> = {};
  try {
    const tables = ['anime', 'episodes', 'episode_servers', 'users', 'watchlist', 'watch_history', 'comments'];
    const dbForHealth = supabaseAdmin || req.supabase;
    for (const table of tables) {
      const { count, error } = await dbForHealth
        .from(table)
        .select('*', { count: 'exact', head: true });
      checks[table] = error
        ? { ok: false, error: error.message }
        : { ok: true, count: count ?? 0 };
    }

    const allOk = Object.values(checks).every((value: any) => value.ok);
    return res.status(allOk ? 200 : 503).json({
      status: allOk ? 'ok' : 'degraded',
      database: 'supabase',
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(503).json({
      status: 'degraded',
      database: 'supabase',
      error: err?.message || 'Database diagnostic failed.',
      timestamp: new Date().toISOString(),
    });
  }
});

// Admin diagnostics: verifies the authenticated admin profile and whether
// the server-only service-role client is configured. No secrets are returned.
app.get('/api/admin/diagnostics', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const { data: profile, error: profileError } = await db
      .from('users')
      .select('id, email, name, role')
      .eq('id', req.user!.id)
      .maybeSingle();

    const { error: animeError } = await db.from('anime').select('id', { count: 'exact', head: true });
    const { error: episodeError } = await db.from('episodes').select('id', { count: 'exact', head: true });

    return res.json({
      authenticated: true,
      userId: req.user!.id,
      role: req.user!.role,
      serviceRoleConfigured: Boolean(supabaseAdmin),
      profileReadable: !profileError && Boolean(profile),
      animeTableWritableClientReady: !animeError,
      episodesTableReadable: !episodeError,
      profileError: profileError?.message || null,
      animeError: animeError?.message || null,
      episodeError: episodeError?.message || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Admin diagnostics failed.' });
  }
});

// -------------------------------------------------------------
// 2. ADMIN STATS & USERS (STRICT DATABASE ROLE VERIFICATION)
// -------------------------------------------------------------
app.get('/api/admin/stats', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Server admin database client is not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel.' });
    }

    // 1. Fetch count stats from database
    const [animeRes, episodesRes, usersRes, commentsRes] = await Promise.all([
      db.from('anime').select('*', { count: 'exact', head: true }),
      db.from('episodes').select('views', { count: 'exact' }),
      db.from('users').select('*', { count: 'exact', head: true }),
      db.from('comments').select('*', { count: 'exact', head: true }),
    ]);

    const totalAnime = animeRes.count ?? 0;
    const totalEpisodes = episodesRes.count ?? 0;
    const totalUsers = usersRes.count ?? 0;
    const totalComments = commentsRes.count ?? 0;

    // Calculate total views across all episodes
    let totalViews = 0;
    if (episodesRes.data && Array.isArray(episodesRes.data)) {
      totalViews = episodesRes.data.reduce((acc, ep) => acc + (Number(ep.views) || 0), 0);
    }

    // 2. Fetch top 5 viewed episodes
    const { data: topEpisodesData } = await db
      .from('episodes')
      .select('id, anime_mal_id, episode_number, title, thumbnail_url, views')
      .order('views', { ascending: false })
      .limit(5);

    const topViewedEpisodes = await Promise.all(
      (topEpisodesData || []).map(async (ep) => {
        const { data: animeData } = await db
          .from('anime')
          .select('title, cover_url')
          .eq('external_id', ep.anime_mal_id)
          .maybeSingle();

        return {
          id: ep.id,
          anime_mal_id: ep.anime_mal_id,
          episode_number: ep.episode_number,
          title: ep.title,
          thumbnail_url: ep.thumbnail_url,
          views: ep.views || 0,
          anime_title: animeData?.title || `Anime #${ep.anime_mal_id}`,
          cover_url: animeData?.cover_url || null,
        };
      })
    );

    // 3. Top searched anime
    const topSearchedAnime = Array.from(searchFrequencyMap.values())
      .sort((a, b) => b.search_count - a.search_count)
      .slice(0, 5);

    res.json({
      total_anime: totalAnime,
      total_episodes: totalEpisodes,
      total_users: totalUsers,
      total_views: totalViews,
      total_comments: totalComments,
      recently_added: totalEpisodes,
      most_viewed_episode: topViewedEpisodes[0] || null,
      top_viewed_episodes: topViewedEpisodes,
      most_searched_anime: topSearchedAnime[0] || null,
      top_searched_anime: topSearchedAnime,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch admin stats from Supabase.' });
  }
});

// Admin Users List (Admin only)
app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Server admin database client is not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel.' });
    }
    const { data: users, error } = await db
      .from('users')
      .select('id, email, name, avatar, role, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(users || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch user list.' });
  }
});

// -------------------------------------------------------------
// 3. ADMIN ANIME & EPISODE CRUD (RESTRICTED TO VERIFIED ADMINS)
// -------------------------------------------------------------

// Create or Update Anime Record
app.post('/api/admin/anime', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const {
      mal_id,
      external_id,
      title,
      custom_title,
      english_title,
      japanese_title,
      alternative_titles,
      description,
      custom_description,
      cover_url,
      custom_cover_url,
      banner_url,
      custom_banner_url,
      featured,
      genres,
      type,
      year,
      rating,
      status,
    } = req.body;

    const rawExtId = external_id ?? mal_id;
    let finalExternalId = Number(rawExtId);
    if (!Number.isInteger(finalExternalId) || finalExternalId <= 0) {
      return res.status(400).json({ error: 'A valid MAL ID is required. Use the anime\'s MAL ID from AniList/Jikan.' });
    }

    // Coerce accidental AniList native IDs to MAL IDs when possible.
    // Example: Demon Slayer AniList id 101922 → MAL 38000.
    try {
      const byMal = await anilistApi.getAnimeByMalId(finalExternalId);
      if (!byMal) {
        const byAny = await anilistApi.getAnimeById(finalExternalId);
        const resolvedMal = Number(byAny?.mal_id || byAny?.idMal || 0);
        if (resolvedMal > 0 && resolvedMal !== finalExternalId) {
          finalExternalId = resolvedMal;
        }
      }
    } catch {
      // keep provided id if AniList is unavailable
    }
    const finalTitle = (custom_title || title || english_title || japanese_title || `Anime #${finalExternalId}`).trim();
    const finalCover = custom_cover_url || cover_url || null;
    const finalBanner = custom_banner_url || banner_url || finalCover;
    const finalDesc = (custom_description || description || '').trim() || null;

    let genreArray: string[] = [];
    if (Array.isArray(genres)) {
      genreArray = genres.map((g: any) => (typeof g === 'string' ? g : g.name || ''));
    } else if (typeof genres === 'string') {
      genreArray = genres.split(',').map((g) => g.trim()).filter(Boolean);
    }

    const payload: Record<string, any> = {
      external_id: finalExternalId,
      title: finalTitle,
      cover_url: finalCover,
      banner_url: finalBanner,
      description: finalDesc,
      genres: genreArray,
      type: type || 'TV',
      year: year ? Number(year) : new Date().getFullYear(),
      rating: rating ? String(rating) : '8.5',
      status: status || 'Finished Airing',
      featured: Boolean(featured),
      updated_at: new Date().toISOString(),
    };

    const { data: savedAnime, error } = await db
      .from('anime')
      .upsert(payload, { onConflict: 'external_id' })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      anime: savedAnime,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save anime to Supabase.' });
  }
});

// Delete Anime and all its episodes
app.delete('/api/admin/anime/:identifier', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const identifier = req.params.identifier;
    const isNumeric = !isNaN(Number(identifier));

    let deleteQuery = db.from('anime').delete();
    if (isNumeric) {
      deleteQuery = deleteQuery.eq('external_id', Number(identifier));
    } else {
      deleteQuery = deleteQuery.eq('id', identifier);
    }

    const { error } = await deleteQuery;
    if (error) throw error;

    res.json({ success: true, message: 'Anime deleted successfully from Supabase.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete anime.' });
  }
});

// Save Episode (Atomic creation/update with SUB and DUB streaming servers)
app.post('/api/admin/episodes', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const {
      anime_mal_id,
      episode_number,
      title,
      sub,
      dub,
      thumbnail_url,
      subtitle_url,
    } = req.body;

    const parsedMalId = Number(anime_mal_id);
    const parsedEpNum = Number(episode_number);

    if (!parsedMalId || isNaN(parsedMalId) || parsedMalId <= 0) {
      return res.status(400).json({ error: 'Valid Anime MAL ID is required.' });
    }
    if (!parsedEpNum || isNaN(parsedEpNum) || parsedEpNum <= 0) {
      return res.status(400).json({ error: 'Valid Episode Number is required.' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Episode title is required.' });
    }

    const isValidHttpUrl = (str: string) => {
      try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // Validate SUB servers
    const cleanSub: Array<{ server_name: string; embed_url: string; language: 'sub' }> = [];
    if (Array.isArray(sub)) {
      for (const item of sub) {
        const sName = typeof item?.server === 'string' ? item.server.trim() : (item?.server_name || '').trim();
        const sUrl = typeof item?.embedUrl === 'string' ? item.embedUrl.trim() : (item?.embed_url || '').trim();
        if (sName || sUrl) {
          if (!sName) return res.status(400).json({ error: 'Please enter a name for each SUB server.' });
          if (!sUrl || !isValidHttpUrl(sUrl)) {
            return res.status(400).json({
              error: `Please enter a valid embed URL (http:// or https://) for SUB server "${sName}".`,
            });
          }
          cleanSub.push({ server_name: sName, embed_url: sUrl, language: 'sub' });
        }
      }
    }

    // Validate DUB servers
    const cleanDub: Array<{ server_name: string; embed_url: string; language: 'dub' }> = [];
    if (Array.isArray(dub)) {
      for (const item of dub) {
        const sName = typeof item?.server === 'string' ? item.server.trim() : (item?.server_name || '').trim();
        const sUrl = typeof item?.embedUrl === 'string' ? item.embedUrl.trim() : (item?.embed_url || '').trim();
        if (sName || sUrl) {
          if (!sName) return res.status(400).json({ error: 'Please enter a name for each DUB server.' });
          if (!sUrl || !isValidHttpUrl(sUrl)) {
            return res.status(400).json({
              error: `Please enter a valid embed URL (http:// or https://) for DUB server "${sName}".`,
            });
          }
          cleanDub.push({ server_name: sName, embed_url: sUrl, language: 'dub' });
        }
      }
    }

    if (cleanSub.length === 0 && cleanDub.length === 0) {
      return res.status(400).json({
        error: 'Please provide at least one SUB or DUB server with a valid embed URL.',
      });
    }

    // 1. Ensure Anime record exists in public.anime to guarantee valid foreign key
    let { data: animeRecord } = await db
      .from('anime')
      .select('id')
      .eq('external_id', parsedMalId)
      .maybeSingle();

    if (!animeRecord) {
      let metaTitle = `Anime #${parsedMalId}`;
      let metaCover: string | null = null;
      let metaDesc: string | null = null;
      let metaGenres: string[] = [];
      let metaType = 'TV';
      let metaYear = 2024;
      let metaStatus = 'Finished Airing';

      try {
        const meta: any = await anilistApi.getAnimeByMalId(parsedMalId);
        if (meta) {
          metaTitle = meta.title_english || meta.title || metaTitle;
          metaCover = meta.images?.jpg?.large_image_url || meta.images?.jpg?.image_url || null;
          metaDesc = meta.description || meta.synopsis || null;
          if (meta.genres) metaGenres = meta.genres.map((g: any) => (typeof g === 'string' ? g : g.name));
          if (meta.type || meta.format) metaType = meta.type || meta.format;
          if (meta.year || meta.aired?.from) metaYear = meta.year || new Date(meta.aired.from).getFullYear();
          if (meta.status) metaStatus = meta.status;
        }
      } catch {}

      const { data: createdAnime, error: animeCreateErr } = await db
        .from('anime')
        .insert({
          external_id: parsedMalId,
          title: metaTitle,
          cover_url: metaCover,
          description: metaDesc,
          genres: metaGenres,
          type: metaType,
          year: metaYear,
          status: metaStatus,
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (animeCreateErr || !createdAnime) {
        throw new Error('Failed to ensure anime record in Supabase: ' + (animeCreateErr?.message || ''));
      }
      animeRecord = createdAnime;
    }

    // 2. Upsert Episode record in public.episodes
    const { data: episodeRecord, error: epErr } = await db
      .from('episodes')
      .upsert(
        {
          anime_id: animeRecord.id,
          anime_mal_id: parsedMalId,
          episode_number: parsedEpNum,
          title: String(title).trim(),
          thumbnail_url: thumbnail_url ? String(thumbnail_url).trim() : null,
          subtitle_url: subtitle_url ? String(subtitle_url).trim() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'anime_mal_id,episode_number' }
      )
      .select()
      .single();

    if (epErr || !episodeRecord) {
      throw new Error('Failed to save episode record in Supabase: ' + (epErr?.message || ''));
    }

    // 3. Replace episode_servers for this episode atomically
    await db.from('episode_servers').delete().eq('episode_id', episodeRecord.id);

    const serversToInsert = [...cleanSub, ...cleanDub].map((s) => ({
      episode_id: episodeRecord.id,
      language: s.language,
      server_name: s.server_name,
      embed_url: s.embed_url,
    }));

    const { error: serversErr } = await db.from('episode_servers').insert(serversToInsert);
    if (serversErr) {
      throw new Error('Failed to save episode servers in Supabase: ' + serversErr.message);
    }

    res.json({
      success: true,
      episode: {
        ...episodeRecord,
        sub: cleanSub.map((s) => ({ server: s.server_name, embedUrl: s.embed_url })),
        dub: cleanDub.map((s) => ({ server: s.server_name, embedUrl: s.embed_url })),
        video_url: cleanSub[0]?.embed_url || cleanDub[0]?.embed_url || '',
        server_urls: serversToInsert.map((s) => s.embed_url),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save episode to Supabase.' });
  }
});

// Search Anime from Supabase anime table (Admin only)
app.get('/api/admin/anime/search', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const q = String(req.query.q || '').trim();
    if (!q) {
      const { data, error } = await db
        .from('anime')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return res.json(data || []);
    }

    const isNumeric = !isNaN(Number(q));
    let query = db.from('anime').select('*');
    if (isNumeric) {
      query = query.or(`title.ilike.%${q}%,external_id.eq.${Number(q)}`);
    } else {
      query = query.ilike('title', `%${q}%`);
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(40);
    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to search anime.' });
  }
});

// Get single anime with its episodes and server counts (Admin only)
app.get('/api/admin/anime/:identifier/episodes', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const identifier = req.params.identifier;
    const isNumeric = !isNaN(Number(identifier));

    let animeRecord: any = null;
    if (isNumeric) {
      const { data } = await db.from('anime').select('*').eq('external_id', Number(identifier)).maybeSingle();
      animeRecord = data;
    } else {
      const { data } = await db.from('anime').select('*').eq('id', identifier).maybeSingle();
      animeRecord = data;
    }

    if (!animeRecord) {
      return res.status(404).json({ error: 'Anime not found in database.' });
    }

    const extId = Number(animeRecord.external_id);

    // Fetch all episodes for this anime
    const { data: rawEpisodes, error: epError } = await db
      .from('episodes')
      .select('*')
      .or(`anime_id.eq.${animeRecord.id},anime_mal_id.eq.${extId}`)
      .order('episode_number', { ascending: true });

    if (epError) throw epError;

    const episodes = rawEpisodes || [];
    const episodeIds = episodes.map((e: any) => e.id);

    // Fetch all servers for these episodes
    let allServers: any[] = [];
    if (episodeIds.length > 0) {
      const { data: serverRows, error: srvError } = await db
        .from('episode_servers')
        .select('*')
        .in('episode_id', episodeIds)
        .order('created_at', { ascending: true });
      if (!srvError && serverRows) {
        allServers = serverRows;
      }
    }

    const serverMap = new Map<string, { sub: any[]; dub: any[] }>();
    for (const s of allServers) {
      if (!serverMap.has(s.episode_id)) {
        serverMap.set(s.episode_id, { sub: [], dub: [] });
      }
      const lang = String(s.language || 'sub').toLowerCase();
      if (lang === 'dub') {
        serverMap.get(s.episode_id)!.dub.push({
          id: s.id,
          episode_id: s.episode_id,
          server_name: s.server_name,
          server: s.server_name,
          embed_url: s.embed_url,
          embedUrl: s.embed_url,
          language: 'dub',
          created_at: s.created_at,
        });
      } else {
        serverMap.get(s.episode_id)!.sub.push({
          id: s.id,
          episode_id: s.episode_id,
          server_name: s.server_name,
          server: s.server_name,
          embed_url: s.embed_url,
          embedUrl: s.embed_url,
          language: 'sub',
          created_at: s.created_at,
        });
      }
    }

    const enrichedEpisodes = episodes.map((ep: any) => {
      const sData = serverMap.get(ep.id) || { sub: [], dub: [] };
      return {
        ...ep,
        sub: sData.sub,
        dub: sData.dub,
        sub_count: sData.sub.length,
        dub_count: sData.dub.length,
      };
    });

    res.json({
      anime: animeRecord,
      episodes: enrichedEpisodes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch episodes for anime.' });
  }
});

// Update Episode Metadata (Title, Number, Thumbnail)
app.put('/api/admin/episodes/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const episodeId = req.params.id;
    const { episode_number, title, thumbnail_url, subtitle_url } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (episode_number !== undefined) {
      const num = Number(episode_number);
      if (isNaN(num) || num <= 0) {
        return res.status(400).json({ error: 'Valid Episode Number is required.' });
      }
      updates.episode_number = num;
    }

    if (title !== undefined) {
      const trimmed = String(title).trim();
      if (!trimmed) return res.status(400).json({ error: 'Episode title cannot be empty.' });
      updates.title = trimmed;
    }

    if (thumbnail_url !== undefined) {
      updates.thumbnail_url = thumbnail_url ? String(thumbnail_url).trim() : null;
    }

    if (subtitle_url !== undefined) {
      updates.subtitle_url = subtitle_url ? String(subtitle_url).trim() : null;
    }

    const { data: updatedEp, error: epErr } = await db
      .from('episodes')
      .update(updates)
      .eq('id', episodeId)
      .select('*')
      .single();

    if (epErr) throw epErr;

    res.json({ success: true, episode: updatedEp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update episode.' });
  }
});

// Add individual server to an episode
app.post('/api/admin/episodes/:episodeId/servers', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const episodeId = req.params.episodeId;
    const { language, server_name, embed_url } = req.body;

    const lang = String(language || 'sub').toLowerCase() === 'dub' ? 'dub' : 'sub';
    const sName = String(server_name || '').trim();
    const sUrl = String(embed_url || '').trim();

    if (!sName) {
      return res.status(400).json({ error: 'Server name is required.' });
    }
    if (!sUrl || (!sUrl.startsWith('http://') && !sUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'A valid http:// or https:// embed URL is required.' });
    }

    // Verify episode exists
    const { data: epRecord, error: epErr } = await db
      .from('episodes')
      .select('id, anime_id, anime_mal_id')
      .eq('id', episodeId)
      .maybeSingle();

    if (epErr || !epRecord) {
      return res.status(404).json({ error: 'Episode not found.' });
    }

    const { data: newServer, error: srvErr } = await db
      .from('episode_servers')
      .insert({
        episode_id: episodeId,
        language: lang,
        server_name: sName,
        embed_url: sUrl,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (srvErr) throw srvErr;

    // Touch episode updated_at
    const { error: touchError } = await db.from('episodes').update({ updated_at: new Date().toISOString() }).eq('id', episodeId);
    if (touchError) throw touchError;

    res.json({
      success: true,
      server: {
        id: newServer.id,
        episode_id: newServer.episode_id,
        server_name: newServer.server_name,
        server: newServer.server_name,
        embed_url: newServer.embed_url,
        embedUrl: newServer.embed_url,
        language: newServer.language,
        created_at: newServer.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add server.' });
  }
});

// Update individual server
app.put('/api/admin/servers/:serverId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const serverId = req.params.serverId;
    const { server_name, embed_url, language } = req.body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (server_name !== undefined) {
      const trimmed = String(server_name).trim();
      if (!trimmed) return res.status(400).json({ error: 'Server name cannot be empty.' });
      updates.server_name = trimmed;
    }

    if (embed_url !== undefined) {
      const trimmedUrl = String(embed_url).trim();
      if (!trimmedUrl || (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://'))) {
        return res.status(400).json({ error: 'A valid http:// or https:// embed URL is required.' });
      }
      updates.embed_url = trimmedUrl;
    }

    if (language !== undefined) {
      updates.language = String(language).toLowerCase() === 'dub' ? 'dub' : 'sub';
    }

    const { data: updatedServer, error: updErr } = await db
      .from('episode_servers')
      .update(updates)
      .eq('id', serverId)
      .select('*')
      .single();

    if (updErr) throw updErr;

    if (updatedServer?.episode_id) {
      const { error: touchError } = await db.from('episodes').update({ updated_at: new Date().toISOString() }).eq('id', updatedServer.episode_id);
      if (touchError) throw touchError;
    }

    res.json({
      success: true,
      server: {
        id: updatedServer.id,
        episode_id: updatedServer.episode_id,
        server_name: updatedServer.server_name,
        server: updatedServer.server_name,
        embed_url: updatedServer.embed_url,
        embedUrl: updatedServer.embed_url,
        language: updatedServer.language,
        created_at: updatedServer.created_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update server.' });
  }
});

// Delete individual server
app.delete('/api/admin/servers/:serverId', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const serverId = req.params.serverId;

    const { data: serverRecord } = await db
      .from('episode_servers')
      .select('episode_id')
      .eq('id', serverId)
      .maybeSingle();

    const { error } = await db.from('episode_servers').delete().eq('id', serverId);
    if (error) throw error;

    if (serverRecord?.episode_id) {
      const { error: touchError } = await db.from('episodes').update({ updated_at: new Date().toISOString() }).eq('id', serverRecord.episode_id);
      if (touchError) throw touchError;
    }

    res.json({ success: true, message: 'Server deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete server.' });
  }
});

// Delete Episode (Cascade deletes servers in Supabase)
app.delete('/api/admin/episodes/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const episodeId = req.params.id;
    const { error } = await db.from('episodes').delete().eq('id', episodeId);
    if (error) throw error;

    res.json({ success: true, message: 'Episode deleted successfully from Supabase.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete episode.' });
  }
});

// -------------------------------------------------------------
// 4. ANILIST GRAPHQL PROXY ROUTES (CACHED METADATA)
// -------------------------------------------------------------

app.get(['/api/anilist/anime/:malId', '/api/jikan/anime/:malId'], async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const malId = Number(req.params.malId);
    if (!malId || isNaN(malId)) {
      return res.status(400).json({ error: 'Valid MAL ID required.' });
    }

    let anilistData: any = null;
    if (malId < 900000000) {
      try {
        anilistData = await anilistApi.getAnimeByMalId(malId);
      } catch {}
    }

    if (!anilistData) {
      const { data: local } = await db.from('anime').select('*').eq('external_id', malId).maybeSingle();
      if (local) {
        const cover = local.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
        const banner = local.banner_url || cover;
        const genreObjs = Array.isArray(local.genres)
          ? local.genres.map((g: any) => (typeof g === 'string' ? { name: g } : g))
          : [{ name: 'Action' }];

        anilistData = {
          mal_id: malId,
          id: malId,
          title: local.title || `Anime #${malId}`,
          title_english: local.title,
          title_romaji: local.title,
          synopsis: local.description || 'No description available.',
          description: local.description || 'No description available.',
          images: {
            jpg: {
              image_url: cover,
              large_image_url: cover,
              small_image_url: cover,
            },
          },
          banner_url: banner,
          bannerImage: banner,
          genres: genreObjs,
          score: Number(local.rating) || 8.5,
          averageScore: Math.round((Number(local.rating) || 8.5) * 10),
          year: local.year || 2026,
          seasonYear: local.year || 2026,
          type: local.type || 'TV',
          format: local.type || 'TV',
          status: local.status || 'Finished Airing',
          studios: [],
        };
      }
    }

    if (!anilistData) {
      return res.status(404).json({ error: 'Anime metadata not found.' });
    }

    res.json(anilistData);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch anime metadata.' });
  }
});

app.get(['/api/anilist/anime/:malId/characters', '/api/jikan/anime/:malId/characters'], async (req, res) => {
  try {
    const malId = Number(req.params.malId);
    const chars = await anilistApi.getAnimeCharacters(malId);
    res.json(chars || []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch characters.' });
  }
});

app.get(['/api/anilist/search', '/api/jikan/search'], async (req, res) => {
  try {
    const {
      q,
      query,
      page,
      perPage,
      genres,
      genre,
      country,
      season,
      year,
      seasonYear,
      status,
      type,
      format,
      rating,
      order_by,
      sort,
    } = req.query;
    const filters: Record<string, any> = {};

    if (page) filters.page = Number(page);
    if (perPage) filters.perPage = Number(perPage);
    const rawGenre = genre || genres;
    if (rawGenre) filters.genre = String(rawGenre);
    if (country) filters.country = String(country);
    if (season) filters.season = String(season);
    if (year || seasonYear) filters.year = String(year || seasonYear);
    if (status) filters.status = String(status);
    if (type || format) filters.type = String(type || format);
    if (rating) filters.rating = String(rating);
    if (order_by) filters.order_by = String(order_by);
    if (sort) filters.sort = String(sort);

    const searchQueryStr = String(q || query || '');
    try {
      const results = await anilistApi.searchAnime(searchQueryStr, filters);
      res.setHeader('X-AniVault-Data-Source', 'anilist');
      return res.json(results || []);
    } catch (anilistError: any) {
      const fallback = await searchLocalAnime(searchQueryStr, filters);
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      return res.json(fallback);
    }
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'AniList and database search are unavailable.' });
  }
});

app.get(['/api/anilist/top', '/api/jikan/top'], async (req, res) => {
  try {
    const filter = String(req.query.filter || 'bypopularity');
    const page = Number(req.query.page || 1);
    try {
      const results = await anilistApi.getTopAnime(filter, page);
      res.setHeader('X-AniVault-Data-Source', 'anilist');
      return res.json(results || []);
    } catch {
      const fallback = await getLocalTopAnime(page);
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      return res.json(fallback.results || []);
    }
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'AniList and database top anime are unavailable.' });
  }
});

app.get(['/api/anilist/season-now', '/api/jikan/season-now'], async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    try {
      const results = await anilistApi.getCurrentSeasonAnime(page);
      res.setHeader('X-AniVault-Data-Source', 'anilist');
      return res.json(results || []);
    } catch {
      const fallback = await getLocalSeasonAnime(page);
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      return res.json(fallback.results || []);
    }
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'AniList and database seasonal data are unavailable.' });
  }
});

app.get(['/api/anilist/genres', '/api/jikan/genres'], async (req, res) => {
  try {
    try {
      const genres = await anilistApi.getGenres();
      res.setHeader('X-AniVault-Data-Source', 'anilist');
      return res.json(genres || []);
    } catch {
      const genres = await getLocalGenres();
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      return res.json(genres);
    }
  } catch (err: any) {
    res.status(503).json({ error: err.message || 'AniList and database genres are unavailable.' });
  }
});

// -------------------------------------------------------------
// 5. PUBLIC SITE ANIME & EPISODES (SUPABASE DATA)
// -------------------------------------------------------------

// Get recently updated anime grouped by real uploaded episodes in Supabase
app.get('/api/anime/updated', async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const {
      q,
      query,
      page = 1,
      perPage = 24,
      genre,
      genres,
      country,
      season,
      year,
      seasonYear,
      status,
      type,
      format,
      rating,
      sort = 'recently_updated',
    } = req.query;

    // 1. Fetch real uploaded episodes from Supabase
    // Only inspect the most recently changed episodes. This prevents a large catalog
    // from loading every episode into a Vercel function just to build the first page.
    // 2000 recent records is deliberately generous for the site's current catalog.
    const { data: episodesData, error: epErr } = await db
      .from('episodes')
      .select('id, anime_id, anime_mal_id, episode_number, title, thumbnail_url, subtitle_url, views, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (epErr) throw epErr;

    const allEpisodes = episodesData || [];

    // 2. Group episodes by anime_mal_id
    const animeEpisodeMap = new Map<number, any[]>();
    for (const ep of allEpisodes) {
      if (!ep.anime_mal_id || ep.episode_number == null) continue;
      const malId = Number(ep.anime_mal_id);
      if (!animeEpisodeMap.has(malId)) {
        animeEpisodeMap.set(malId, []);
      }
      animeEpisodeMap.get(malId)!.push(ep);
    }

    if (animeEpisodeMap.size === 0) {
      return res.json({
        results: [],
        pageInfo: {
          currentPage: Number(page) || 1,
          lastPage: 1,
          hasNextPage: false,
          total: 0,
          perPage: Number(perPage) || 24,
        },
      });
    }

    // 3. Fetch curated anime records from Supabase for these MAL IDs
    const malIds = Array.from(animeEpisodeMap.keys());
    const { data: animeList } = await db
      .from('anime')
      .select('*')
      .in('external_id', malIds);

    const animeRecordMap = new Map<number, any>();
    (animeList || []).forEach((a) => animeRecordMap.set(Number(a.external_id), a));

    // 4. Build anime entries
    const animeEntries: Array<{
      mal_id: number;
      latest_episode: any;
      latest_episode_number: number;
      latest_updated_at: string;
      episodes: any[];
      localAnime: any;
    }> = [];

    for (const [malId, epList] of animeEpisodeMap.entries()) {
      const sortedByTime = [...epList].sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });

      const latestEp = sortedByTime[0];
      const maxEpNum = Math.max(...epList.map((e) => Number(e.episode_number) || 0));

      animeEntries.push({
        mal_id: malId,
        latest_episode: latestEp,
        latest_episode_number: Number(latestEp.episode_number) || maxEpNum,
        latest_updated_at: latestEp.updated_at || latestEp.created_at || new Date().toISOString(),
        episodes: epList,
        localAnime: animeRecordMap.get(malId) || null,
      });
    }

    // 5. Fetch metadata from AniList cache
    const populatedAnime = await Promise.all(
      animeEntries.map(async (entry) => {
        const local = entry.localAnime;
        // Local Supabase catalog is the source of truth for uploaded anime.
        // Only call AniList when local metadata is missing, which keeps the
        // Recently Updated page fast and avoids Vercel timeouts/rate limits.
        let anilist: any = null;
        if (!local?.title || !local?.cover_url) {
          try {
            anilist = await anilistApi.getAnimeByMalId(entry.mal_id);
          } catch {
            anilist = null;
          }
        }

        const title = local?.title || anilist?.title_english || anilist?.title || `Anime #${entry.mal_id}`;
        const cover =
          local?.cover_url ||
          anilist?.images?.jpg?.large_image_url ||
          anilist?.images?.jpg?.image_url ||
          'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
        const score = anilist?.score || (anilist?.averageScore ? Number((anilist.averageScore / 10).toFixed(1)) : 8.5);
        const animeYear = anilist?.year || (anilist?.aired?.from ? new Date(anilist.aired.from).getFullYear() : 2024);
        const animeType = anilist?.type || anilist?.format || 'TV';
        const animeStatus = anilist?.status || 'Finished Airing';
        const animeGenres = anilist?.genres || [{ name: 'Action' }];
        const animeCountry = anilist?.countryOfOrigin || 'JP';
        const animeSeason = anilist?.season || 'FALL';

        return {
          mal_id: entry.mal_id,
          id: entry.mal_id,
          title,
          title_english: anilist?.title_english || title,
          title_romaji: anilist?.title_romaji || title,
          synopsis: local?.description || anilist?.synopsis || 'No synopsis available.',
          images: {
            jpg: {
              image_url: cover,
              large_image_url: cover,
              small_image_url: cover,
            },
          },
          score,
          year: animeYear,
          type: animeType,
          format: animeType,
          status: animeStatus,
          genres: animeGenres,
          countryOfOrigin: animeCountry,
          season: animeSeason,
          latest_episode_number: entry.latest_episode_number,
          latest_episode: entry.latest_episode,
          latest_updated_at: entry.latest_updated_at,
          episodes: entry.episodes,
          local,
          anilist: anilist || {
            mal_id: entry.mal_id,
            id: entry.mal_id,
            title,
            images: { jpg: { image_url: cover, large_image_url: cover } },
            score,
            year: animeYear,
            type: animeType,
            genres: animeGenres,
            status: animeStatus,
          },
          jikan: anilist,
        };
      })
    );

    // 6. Apply search and filters
    const searchQuery = String(q || query || '').toLowerCase().trim();
    const genreFilter = String(genre || genres || '').trim();
    const countryFilter = String(country || '').trim();
    const seasonFilter = String(season || '').trim();
    const yearFilter = String(year || seasonYear || '').trim();
    const typeFilter = String(type || format || '').trim();
    const statusFilter = String(status || '').trim();
    const ratingFilter = String(rating || '').trim();

    if (searchQuery) {
      for (const item of populatedAnime) {
        const matchTitle = (item.title || '').toLowerCase().includes(searchQuery);
        const matchEnglish = (item.title_english || '').toLowerCase().includes(searchQuery);
        if (matchTitle || matchEnglish) {
          const current = searchFrequencyMap.get(item.mal_id) || {
            mal_id: item.mal_id,
            title: item.title,
            cover_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
            search_count: 0,
          };
          current.search_count += 1;
          searchFrequencyMap.set(item.mal_id, current);
        }
      }
    }

    let filtered = populatedAnime.filter((item) => {
      if (searchQuery) {
        const matchTitle = (item.title || '').toLowerCase().includes(searchQuery);
        const matchEnglish = (item.title_english || '').toLowerCase().includes(searchQuery);
        const matchRomaji = (item.title_romaji || '').toLowerCase().includes(searchQuery);
        const matchSyn = (item.synopsis || '').toLowerCase().includes(searchQuery);
        const matchId = String(item.mal_id) === searchQuery;
        if (!matchTitle && !matchEnglish && !matchRomaji && !matchSyn && !matchId) {
          return false;
        }
      }

      if (genreFilter && genreFilter.toLowerCase() !== 'all') {
        const hasGenre = item.genres.some(
          (g: any) =>
            (typeof g === 'string' ? g : g.name || '').toLowerCase() === genreFilter.toLowerCase()
        );
        if (!hasGenre) return false;
      }

      if (countryFilter && countryFilter.toLowerCase() !== 'all') {
        if ((item.countryOfOrigin || 'JP').toUpperCase() !== countryFilter.toUpperCase()) {
          return false;
        }
      }

      if (seasonFilter && seasonFilter.toLowerCase() !== 'all') {
        if ((item.season || '').toUpperCase() !== seasonFilter.toUpperCase()) {
          return false;
        }
      }

      if (yearFilter && yearFilter.toLowerCase() !== 'all') {
        if (String(item.year) !== yearFilter) return false;
      }

      if (typeFilter && typeFilter.toLowerCase() !== 'all') {
        if (
          (item.type || '').toUpperCase() !== typeFilter.toUpperCase() &&
          (item.format || '').toUpperCase() !== typeFilter.toUpperCase()
        ) {
          return false;
        }
      }

      if (statusFilter && statusFilter.toLowerCase() !== 'all') {
        const s = (item.status || '').toLowerCase();
        if (statusFilter === 'airing' && !s.includes('airing')) return false;
        if (statusFilter === 'complete' && !s.includes('finished') && !s.includes('complete')) return false;
        if (statusFilter === 'upcoming' && !s.includes('upcoming') && !s.includes('not yet')) return false;
      }

      if (ratingFilter && ratingFilter.toLowerCase() !== 'all') {
        const minScore = Number(ratingFilter);
        if (!isNaN(minScore) && (item.score || 0) < minScore) return false;
      }

      return true;
    });

    // 7. Sort
    filtered.sort((a, b) => {
      if (sort === 'score') {
        return (b.score || 0) - (a.score || 0);
      } else if (sort === 'newest') {
        return (b.year || 0) - (a.year || 0);
      } else if (sort === 'popularity') {
        return (b.score || 0) - (a.score || 0);
      } else {
        const timeA = new Date(a.latest_updated_at || 0).getTime();
        const timeB = new Date(b.latest_updated_at || 0).getTime();
        return timeB - timeA;
      }
    });

    // 8. Paginate
    const pageNum = Math.max(1, Number(page) || 1);
    const limit = Math.max(1, Number(perPage) || 24);
    const total = filtered.length;
    const startIndex = (pageNum - 1) * limit;
    const paginatedResults = filtered.slice(startIndex, startIndex + limit);
    const lastPage = Math.max(1, Math.ceil(total / limit));

    res.json({
      results: paginatedResults,
      pageInfo: {
        currentPage: pageNum,
        lastPage,
        hasNextPage: pageNum < lastPage,
        total,
        perPage: limit,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch updated anime from Supabase.' });
  }
});

// Get curated anime list from Supabase
app.get('/api/anime', async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const { data: animeList, error: animeErr } = await db
      .from('anime')
      .select('*')
      .order('updated_at', { ascending: false });

    if (animeErr) throw animeErr;

    const fullList = await Promise.all(
      (animeList || []).map(async (local) => {
        const malId = Number(local.external_id);
        // The local catalog already contains the fields needed by the admin
        // UI. Avoid an AniList request for every database row.
        let anilist = {
          mal_id: malId,
          id: malId,
          title: local.title || `Anime #${malId}`,
          title_english: local.title || `Anime #${malId}`,
          synopsis: local.description || 'No synopsis available.',
          images: { jpg: { image_url: local.cover_url || '', large_image_url: local.cover_url || '' } },
          genres: local.genres || [],
          score: Number(local.rating) || 8.5,
          year: local.year || 2024,
          type: local.type || 'TV',
          episodes: null,
          status: local.status || 'Finished Airing',
          banner_url: local.banner_url || local.cover_url || '',
        };

        const { data: episodes } = await db
          .from('episodes')
          .select('*')
          .eq('anime_mal_id', malId)
          .order('episode_number', { ascending: true });

        const epList = episodes || [];
        const latestEp = epList.length > 0 ? epList[epList.length - 1].episode_number : null;

        return {
          mal_id: malId,
          local,
          anilist,
          jikan: anilist,
          episodes: epList,
          latest_episode_number: latestEp,
        };
      })
    );

    res.json(fullList);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load site anime.' });
  }
});

// Recently added episodes from Supabase
app.get('/api/anime/recently-added', async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const { data: recentEps, error } = await db
      .from('episodes')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;

    const items = await Promise.all(
      (recentEps || []).map(async (ep) => {
        const malId = Number(ep.anime_mal_id);
        const { data: localAnime } = await db
          .from('anime')
          .select('*')
          .eq('external_id', malId)
          .maybeSingle();

        let anilist = {
          mal_id: malId,
          id: malId,
          title: localAnime?.title || `Anime #${malId}`,
          title_english: localAnime?.title || `Anime #${malId}`,
          images: {
            jpg: {
              image_url: localAnime?.cover_url || '',
              large_image_url: localAnime?.cover_url || '',
            },
          },
          genres: localAnime?.genres || [],
          score: Number(localAnime?.rating) || 8.5,
          year: localAnime?.year || 2024,
          type: localAnime?.type || 'TV',
          status: localAnime?.status || 'Finished Airing',
        };

        // Only fetch AniList metadata if the local record is incomplete.
        if (!localAnime?.title || !localAnime?.cover_url) {
          try {
            const remote = await anilistApi.getAnimeByMalId(malId);
            if (remote) anilist = remote;
          } catch {}
        }

        return {
          episode: ep,
          localAnime,
          anilist,
          jikan: anilist,
        };
      })
    );

    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch recent episodes.' });
  }
});

// Get single anime details by malId from Supabase + AniList
app.get('/api/anime/:malId', async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const requestedId = Number(req.params.malId);
    if (!requestedId || Number.isNaN(requestedId)) {
      return res.status(400).json({ error: 'Valid anime ID required.' });
    }

    // This public route is intentionally MAL-ID-only. Every card/watchlist link
    // in the app generates /anime/:malId, so never guess between an AniList native
    // ID and a MAL ID here. This removes numeric-ID collisions that can produce
    // the wrong anime or an 'Anime not found' result.
    let remote: any = null;
    try {
      remote = await anilistApi.getAnimeByMalId(requestedId);
    } catch {}

    const canonicalMalId = Number(remote?.idMal || remote?.mal_id || 0) || requestedId;

    // Always query the local catalog/episodes using the canonical MAL ID.
    const [animeRes, episodesRes] = await Promise.all([
      db.from('anime').select('*').eq('external_id', canonicalMalId).maybeSingle(),
      db.from('episodes').select('*').eq('anime_mal_id', canonicalMalId).order('episode_number', { ascending: true }),
    ]);

    if (animeRes.error) throw animeRes.error;
    if (episodesRes.error) throw episodesRes.error;

    const local = animeRes.data || null;
    const episodes = episodesRes.data || [];

    let anilist = remote;
    if (!anilist && local) {
      const cover =
        local.custom_cover_url ||
        local.cover_url ||
        '';
      const title =
        local.custom_title ||
        local.title ||
        `Anime #${canonicalMalId}`;
      anilist = {
        mal_id: canonicalMalId,
        id: canonicalMalId,
        idMal: canonicalMalId,
        title,
        title_english: title,
        title_japanese: local.japanese_title || local.title || '',
        synopsis: local.custom_description || local.description || '',
        description: local.custom_description || local.description || '',
        images: { jpg: { image_url: cover, large_image_url: cover } },
        coverImage: cover
          ? { large: cover, extraLarge: cover, medium: cover }
          : undefined,
        banner_url: local.custom_banner_url || local.banner_url || cover || '',
        genres: local.genres || [],
        score: Number(local.rating) || 0,
        year: local.year || null,
        type: local.type || 'TV',
        status: local.status || 'Finished Airing',
        rating: local.rating || null,
      };
    }

    if (!anilist && !local) {
      return res.status(404).json({
        error: `Anime not found for ID ${requestedId}. The ID must be a valid MAL ID or AniList ID.`,
      });
    }

    res.json({
      mal_id: canonicalMalId,
      requested_id: requestedId,
      local,
      anilist,
      jikan: anilist,
      episodes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch anime details.' });
  }
});

// Get specific episode details for watch page (Strictly from Supabase)
app.get('/api/episodes/:malId/:epNum', async (req: AuthenticatedRequest, res) => {
  try {
    const db = supabaseAdmin || req.supabase;
    const malId = Number(req.params.malId);
    const epNum = Number(req.params.epNum);

    if (!malId || isNaN(malId) || !epNum || isNaN(epNum)) {
      return res.status(400).json({ error: 'Valid MAL ID and Episode Number required.' });
    }

    // 1. Fetch target episode from Supabase
    const { data: episode, error: epErr } = await db
      .from('episodes')
      .select('*')
      .eq('anime_mal_id', malId)
      .eq('episode_number', epNum)
      .maybeSingle();

    if (epErr || !episode) {
      return res.status(404).json({ error: 'Episode not found.' });
    }

    // Atomic increment view counter via RPC if available, otherwise direct update
    try {
      db.rpc('increment_episode_views', { p_episode_id: episode.id }).then(({ error }) => {
        if (error) {
          // Fallback to update if RPC not present in DB
          db.from('episodes')
            .update({ views: (Number(episode.views) || 0) + 1 })
            .eq('id', episode.id)
            .then(() => {});
        }
      });
    } catch {
      db.from('episodes')
        .update({ views: (Number(episode.views) || 0) + 1 })
        .eq('id', episode.id)
        .then(() => {});
    }

    // 2. Fetch all real uploaded episodes for this anime from Supabase
    const { data: allEpisodes } = await db
      .from('episodes')
      .select('*')
      .eq('anime_mal_id', malId)
      .order('episode_number', { ascending: true });

    // 3. Fetch servers strictly configured in public.episode_servers
    const { data: servers } = await db
      .from('episode_servers')
      .select('*')
      .eq('episode_id', episode.id);

    const serverList = servers || [];
    const subServers = serverList
      .filter((s) => s.language === 'sub')
      .map((s) => ({ server: s.server_name, embedUrl: s.embed_url }));
    const dubServers = serverList
      .filter((s) => s.language === 'dub')
      .map((s) => ({ server: s.server_name, embedUrl: s.embed_url }));

    const allUrls = [...subServers, ...dubServers].map((s) => s.embedUrl);
    const primaryVideoUrl = allUrls[0] || '';

    const enrichedEpisode = {
      ...episode,
      sub: subServers,
      dub: dubServers,
      video_url: primaryVideoUrl,
      server_urls: allUrls,
    };

    // 4. Fetch metadata
const { data: localAnime } = await db
  .from('anime')
  .select('*')
  .eq('external_id', malId)
  .maybeSingle();

let anilist: any = null;
try {
  anilist = await anilistApi.getAnimeByMalId(malId);
} catch {
  anilist = null;
}

// getAnimeByMalId returns null (does not throw) on failure — always fill fallback
if (!anilist) {
  const cover =
    localAnime?.custom_cover_url ||
    localAnime?.cover_url ||
    null;
  const title =
    localAnime?.custom_title ||
    localAnime?.title ||
    `Anime #${malId}`;
  anilist = {
    mal_id: malId,
    id: malId,
    idMal: malId,
    title,
    title_english: title,
    title_japanese: localAnime?.japanese_title || null,
    description: localAnime?.custom_description || localAnime?.description || null,
    synopsis: localAnime?.custom_description || localAnime?.description || null,
    coverImage: cover
      ? { large: cover, extraLarge: cover, medium: cover }
      : undefined,
    images: cover
      ? { jpg: { large_image_url: cover, image_url: cover } }
      : undefined,
    genres: Array.isArray(localAnime?.genres) ? localAnime.genres : [],
    type: localAnime?.type || 'TV',
    year: localAnime?.year || null,
    status: localAnime?.status || null,
    rating: localAnime?.rating || null,
  };
}

    const epList = allEpisodes || [];
    const prevEp = epList.find((e) => Number(e.episode_number) === epNum - 1);
    const nextEp = epList.find((e) => Number(e.episode_number) === epNum + 1);

    res.json({
      episode: enrichedEpisode,
      allEpisodes: epList,
      localAnime,
      anilist,
      jikan: anilist,
      hasPrev: !!prevEp,
      hasNext: !!nextEp,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load episode.' });
  }
});

// ─── Anikoto API (admin import: anime details + episode embed links) ─────────

/** Browse recent Anikoto catalog (for picking series ID in admin UI) */
app.get('/api/admin/anikoto/recent', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const perPage = Math.min(30, Number(req.query.per_page) || 20);
    const data = await fetchRecentAnime(page, perPage);
    if (!data.ok) {
      return res.status(502).json({ error: data.error || 'Anikoto recent-anime failed' });
    }
    res.json({
      ok: true,
      data: (data.data || []).map((a) => ({
        id: a.id,
        title: a.title,
        alternative: a.alternative,
        poster: a.poster,
        mal_id: a.mal_id ? Number(a.mal_id) : null,
        year: a.year,
        status: a.status,
        is_sub: a.is_sub,
        is_dub: a.is_dub,
        episodes: a.episodes,
        score: a.score,
      })),
      pagination: data.pagination || { page, per_page: perPage },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Anikoto recent list.' });
  }
});

/** Preview a single Anikoto series (details + episode count) without saving */
app.get('/api/admin/anikoto/series/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Valid Anikoto series ID is required.' });
    }
    const data = await fetchSeries(id);
    if (!data.ok || !data.data?.anime) {
      return res.status(404).json({ error: data.error || 'Series not found on Anikoto.' });
    }
    const anime = data.data.anime;
    const episodes = Array.isArray(data.data.episodes) ? data.data.episodes : [];
    const mapped = mapAnikotoAnimeToLocal(anime);
    res.json({
      ok: true,
      anime: {
        ...mapped,
        anikoto_id: anime.id,
        total_episodes_available: episodes.length,
        is_sub: anime.is_sub,
        is_dub: anime.is_dub,
      },
      episode_sample: episodes.slice(0, 3).map((ep) => ({
        number: ep.number,
        title: ep.title,
        has_sub: !!ep.embed_url?.sub,
        has_dub: !!ep.embed_url?.dub,
      })),
      total_episodes: episodes.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Anikoto series.' });
  }
});

/**
 * Import anime + episodes from Anikoto into Supabase.
 * Body: { anikotoId: number, maxEpisodes?: number, startEpisode?: number, animeOnly?: boolean }
 * - maxEpisodes: how many episodes to import (from startEpisode). Default = all available.
 * - startEpisode: first episode number to include (default 1).
 * - animeOnly: if true, only upsert anime metadata (no episodes).
 */
app.post('/api/admin/anikoto/import', requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const db = req.supabase;
    const anikotoId = Number(req.body?.anikotoId ?? req.body?.anikoto_id);
    const maxEpisodes = req.body?.maxEpisodes != null ? Number(req.body.maxEpisodes) : null;
    const startEpisode = Math.max(1, Number(req.body?.startEpisode) || 1);
    const animeOnly = Boolean(req.body?.animeOnly);

    if (!Number.isInteger(anikotoId) || anikotoId <= 0) {
      return res.status(400).json({ error: 'Valid anikotoId is required.' });
    }

    const series = await fetchSeries(anikotoId);
    if (!series.ok || !series.data?.anime) {
      return res.status(404).json({ error: series.error || 'Series not found on Anikoto.' });
    }

    const mapped = mapAnikotoAnimeToLocal(series.data.anime);
    const malId = Number(mapped.external_id);
    if (!malId || malId <= 0) {
      return res.status(400).json({
        error:
          'This Anikoto series has no MAL ID. Import is blocked because AniVault keys anime by MAL/external_id.',
      });
    }

    // Upsert anime
    const animePayload = {
      external_id: malId,
      title: mapped.title,
      cover_url: mapped.cover_url,
      banner_url: mapped.banner_url,
      description: mapped.description,
      genres: mapped.genres,
      type: mapped.type,
      year: mapped.year,
      rating: mapped.rating ? String(mapped.rating) : null,
      status: mapped.status,
      updated_at: new Date().toISOString(),
    };

    const { data: existingList, error: findErr } = await db
      .from('anime')
      .select('id, external_id, title')
      .eq('external_id', malId)
      .limit(1);

    if (findErr) throw new Error('DB lookup failed: ' + findErr.message);

    let animeRecord: { id: string; external_id: number; title?: string };
    if (existingList && existingList.length > 0) {
      const { data: updated, error: updErr } = await db
        .from('anime')
        .update(animePayload)
        .eq('id', existingList[0].id)
        .select('id, external_id, title')
        .single();
      if (updErr || !updated) throw new Error('Failed to update anime: ' + (updErr?.message || ''));
      animeRecord = updated;
    } else {
      const { data: created, error: insErr } = await db
        .from('anime')
        .insert({ ...animePayload, featured: false })
        .select('id, external_id, title')
        .single();
      if (insErr || !created) throw new Error('Failed to create anime: ' + (insErr?.message || ''));
      animeRecord = created;
    }

    if (animeOnly) {
      return res.json({
        success: true,
        anime: animeRecord,
        imported_episodes: 0,
        skipped_episodes: 0,
        total_available: (series.data.episodes || []).length,
        message: 'Anime details imported (episodes skipped).',
      });
    }

    const allEps = Array.isArray(series.data.episodes) ? series.data.episodes : [];
    // Sort by episode number
    allEps.sort((a, b) => Number(a.number) - Number(b.number));

    let selected = allEps.filter((ep) => Number(ep.number) >= startEpisode);
    if (maxEpisodes != null && Number.isFinite(maxEpisodes) && maxEpisodes > 0) {
      selected = selected.slice(0, Math.floor(maxEpisodes));
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const ep of selected) {
      const epNum = Number(ep.number);
      if (!epNum || epNum <= 0) {
        skipped++;
        continue;
      }
      const { sub, dub } = extractEmbeds(ep);
      if (sub.length === 0 && dub.length === 0) {
        skipped++;
        continue;
      }

      try {
        const title = (ep.title || ep.jp_title || `Episode ${epNum}`).trim();

        const { data: episodeRecord, error: epErr } = await db
          .from('episodes')
          .upsert(
            {
              anime_id: animeRecord.id,
              anime_mal_id: malId,
              episode_number: epNum,
              title,
              thumbnail_url: null,
              subtitle_url: null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'anime_mal_id,episode_number' }
          )
          .select()
          .single();

        if (epErr || !episodeRecord) {
          errors.push(`Ep ${epNum}: ${epErr?.message || 'upsert failed'}`);
          skipped++;
          continue;
        }

        await db.from('episode_servers').delete().eq('episode_id', episodeRecord.id);

        const serversToInsert = [
          ...sub.map((s) => ({
            episode_id: episodeRecord.id,
            language: 'sub' as const,
            server_name: s.server,
            embed_url: s.embedUrl,
          })),
          ...dub.map((s) => ({
            episode_id: episodeRecord.id,
            language: 'dub' as const,
            server_name: s.server,
            embed_url: s.embedUrl,
          })),
        ];

        if (serversToInsert.length > 0) {
          const { error: srvErr } = await db.from('episode_servers').insert(serversToInsert);
          if (srvErr) {
            errors.push(`Ep ${epNum} servers: ${srvErr.message}`);
            skipped++;
            continue;
          }
        }

        imported++;
      } catch (e: any) {
        errors.push(`Ep ${epNum}: ${e.message || 'unknown'}`);
        skipped++;
      }
    }

    res.json({
      success: true,
      anime: animeRecord,
      anikoto_id: anikotoId,
      mal_id: malId,
      imported_episodes: imported,
      skipped_episodes: skipped,
      total_available: allEps.length,
      requested_max: maxEpisodes,
      start_episode: startEpisode,
      errors: errors.slice(0, 10),
      message: `Imported ${imported} episode(s) with embed links for "${animeRecord.title || mapped.title}".`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Anikoto import failed.' });
  }
});

export { app };
export default app;
