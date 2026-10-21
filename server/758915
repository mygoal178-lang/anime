/**
 * Admin AI Assistant routes — missing episode detection + chat helper.
 * Registered from server/app.ts via registerAdminAIRoutes(app).
 */
import type { Express } from 'express';
import { requireAdmin, type AuthenticatedRequest } from './auth.js';
import { supabaseAdmin } from './supabase.js';

/** Find gaps in a sorted list of positive episode numbers (1-based). */
function findEpisodeGaps(numbers: number[]): number[] {
  const set = new Set(numbers.filter((n) => Number.isFinite(n) && n > 0));
  if (set.size === 0) return [];
  const max = Math.max(...set);
  const scanMax = Math.min(max, 5000);
  const gaps: number[] = [];
  for (let i = 1; i <= scanMax; i++) {
    if (!set.has(i)) gaps.push(i);
  }
  return gaps;
}

export function registerAdminAIRoutes(app: Express) {
  app.get('/api/admin/missing-episodes', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = supabaseAdmin || req.supabase;
      if (!supabaseAdmin && !db) {
        return res.status(503).json({ error: 'Database client is not configured.' });
      }
  
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  
      const { data: animeList, error: animeErr } = await db
        .from('anime')
        .select('id, external_id, title, cover_url, status, type, year, anikoto_id')
        .order('updated_at', { ascending: false })
        .limit(500);
  
      if (animeErr) throw animeErr;
  
      const { data: allEpisodes, error: epErr } = await db
        .from('episodes')
        .select('id, anime_id, anime_mal_id, episode_number');
  
      if (epErr) throw epErr;
  
      const episodeIds = (allEpisodes || []).map((e: any) => e.id);
      let serverCounts = new Map<string, number>();
      if (episodeIds.length > 0) {
        // Batch in chunks of 200 to avoid URL limits
        for (let i = 0; i < episodeIds.length; i += 200) {
          const chunk = episodeIds.slice(i, i + 200);
          const { data: servers } = await db
            .from('episode_servers')
            .select('episode_id')
            .in('episode_id', chunk);
          for (const s of servers || []) {
            serverCounts.set(s.episode_id, (serverCounts.get(s.episode_id) || 0) + 1);
          }
        }
      }
  
      // Group episodes by mal id
      const byMal = new Map<number, Array<{ id: string; episode_number: number }>>();
      for (const ep of allEpisodes || []) {
        const mal = Number(ep.anime_mal_id);
        if (!Number.isFinite(mal) || mal <= 0) continue;
        if (!byMal.has(mal)) byMal.set(mal, []);
        byMal.get(mal)!.push({ id: ep.id, episode_number: Number(ep.episode_number) || 0 });
      }
  
      type MissingReport = {
        anime_id: string;
        mal_id: number;
        title: string;
        cover_url: string | null;
        status: string | null;
        type: string | null;
        year: number | null;
        anikoto_id: number | null;
        present_count: number;
        max_episode: number;
        missing_numbers: number[];
        missing_count: number;
        zero_server_episodes: number[];
        issue: 'no_episodes' | 'gaps' | 'no_servers' | 'ok';
      };
  
      const reports: MissingReport[] = [];
  
      for (const anime of animeList || []) {
        const mal = Number(anime.external_id);
        if (!Number.isFinite(mal) || mal <= 0) continue;
  
        const eps = byMal.get(mal) || [];
        const numbers = eps.map((e) => e.episode_number).filter((n) => n > 0);
        const gaps = findEpisodeGaps(numbers);
        const zeroServerEps: number[] = [];
        for (const e of eps) {
          if ((serverCounts.get(e.id) || 0) === 0 && e.episode_number > 0) {
            zeroServerEps.push(e.episode_number);
          }
        }
        zeroServerEps.sort((a, b) => a - b);
  
        let issue: MissingReport['issue'] = 'ok';
        if (eps.length === 0) issue = 'no_episodes';
        else if (gaps.length > 0) issue = 'gaps';
        else if (zeroServerEps.length > 0) issue = 'no_servers';
  
        if (issue === 'ok') continue;
  
        reports.push({
          anime_id: anime.id,
          mal_id: mal,
          title: anime.title || `Anime #${mal}`,
          cover_url: anime.cover_url || null,
          status: anime.status || null,
          type: anime.type || null,
          year: anime.year ?? null,
          anikoto_id: anime.anikoto_id != null ? Number(anime.anikoto_id) : null,
          present_count: numbers.length,
          max_episode: numbers.length ? Math.max(...numbers) : 0,
          missing_numbers: gaps.slice(0, 50),
          missing_count: gaps.length,
          zero_server_episodes: zeroServerEps.slice(0, 30),
          issue,
        });
      }
  
      // Sort: no_episodes first, then most missing, then no_servers
      const weight = { no_episodes: 0, gaps: 1, no_servers: 2, ok: 3 } as const;
      reports.sort((a, b) => {
        const wa = weight[a.issue];
        const wb = weight[b.issue];
        if (wa !== wb) return wa - wb;
        return b.missing_count - a.missing_count || b.zero_server_episodes.length - a.zero_server_episodes.length;
      });
  
      const summary = {
        total_anime_scanned: (animeList || []).length,
        anime_with_issues: reports.length,
        no_episodes: reports.filter((r) => r.issue === 'no_episodes').length,
        with_gaps: reports.filter((r) => r.issue === 'gaps').length,
        with_no_servers: reports.filter((r) => r.issue === 'no_servers').length,
        total_missing_slots: reports.reduce((s, r) => s + r.missing_count, 0),
      };
  
      res.json({
        summary,
        issues: reports.slice(0, limit),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to analyze missing episodes.' });
    }
  });
  
  app.post('/api/admin/ai-assistant', requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const db = supabaseAdmin || req.supabase;
      const message = String(req.body?.message || '').trim();
      if (!message) {
        return res.status(400).json({ error: 'Message is required.' });
      }
  
      const lower = message.toLowerCase();
  
      // Intent detection
      const wantsMissing =
        /missing|gap|incomplete|where.*(episode|ep)|which.*(episode|ep).*miss|no episode|empty catalog|broken series/i.test(
          message
        );
      const wantsStats = /stat|overview|how many|dashboard|summary|site status|health/i.test(message);
      const wantsHelp = /^(help|hi|hello|what can you|commands)\b/i.test(message) || lower === '?';
  
      // Optional: anime title mention after "for" / "about"
      const titleMatch = message.match(/(?:for|about|of|in)\s+["']?([^"'?.!]{2,60})["']?\s*$/i);
      const titleQuery = titleMatch?.[1]?.trim() || null;
  
      type Action = {
        type: 'open_episodes' | 'open_anikoto' | 'open_stats' | 'open_cms';
        label: string;
        mal_id?: number;
        anime_title?: string;
      };
  
      const actions: Action[] = [];
      let reply = '';
      let data: any = null;
  
      if (wantsHelp) {
        reply =
          'I am your AniVault Admin Assistant. I can:\n\n' +
          '• **Find missing episodes** — gaps in episode numbers, series with zero episodes, or episodes without stream servers\n' +
          '• **Site overview** — anime / episode / user counts and health\n' +
          '• **Series check** — ask e.g. "missing episodes for One Piece"\n\n' +
          'Quick tips: use **Episode Manager** to fill gaps, or **Import from Anikoto** for bulk embeds.\n\n' +
          'Try: "Where are episodes missing?" or "Site stats"';
        actions.push({ type: 'open_stats', label: 'Open Overview' });
        actions.push({ type: 'open_cms', label: 'Open Anime CMS' });
      } else if (wantsMissing || titleQuery) {
        // Reuse missing-episodes logic inline (lightweight)
        const { data: animeList } = await db
          .from('anime')
          .select('id, external_id, title, cover_url, status, anikoto_id')
          .order('updated_at', { ascending: false })
          .limit(500);
  
        const { data: allEpisodes } = await db
          .from('episodes')
          .select('id, anime_mal_id, episode_number');
  
        const byMal = new Map<number, number[]>();
        for (const ep of allEpisodes || []) {
          const mal = Number(ep.anime_mal_id);
          if (!Number.isFinite(mal) || mal <= 0) continue;
          if (!byMal.has(mal)) byMal.set(mal, []);
          byMal.get(mal)!.push(Number(ep.episode_number) || 0);
        }
  
        let filtered = animeList || [];
        if (titleQuery) {
          const q = titleQuery.toLowerCase();
          filtered = filtered.filter((a: any) => (a.title || '').toLowerCase().includes(q));
        }
  
        const issues: any[] = [];
        for (const anime of filtered) {
          const mal = Number(anime.external_id);
          const nums = (byMal.get(mal) || []).filter((n) => n > 0);
          const gaps = findEpisodeGaps(nums);
          if (nums.length === 0 || gaps.length > 0) {
            issues.push({
              mal_id: mal,
              title: anime.title,
              present_count: nums.length,
              max_episode: nums.length ? Math.max(...nums) : 0,
              missing_numbers: gaps.slice(0, 40),
              missing_count: gaps.length,
              issue: nums.length === 0 ? 'no_episodes' : 'gaps',
              anikoto_id: anime.anikoto_id ?? null,
            });
          }
        }
  
        issues.sort((a, b) => {
          if (a.issue !== b.issue) return a.issue === 'no_episodes' ? -1 : 1;
          return b.missing_count - a.missing_count;
        });
  
        data = { issues: issues.slice(0, 25), matched_title: titleQuery };
  
        if (issues.length === 0) {
          reply = titleQuery
            ? `No missing episode gaps found for series matching "${titleQuery}". Looks complete in the database.`
            : 'Great news — no missing episode gaps detected in the scanned catalog. All series with episodes appear sequential.';
        } else {
          const top = issues.slice(0, 8);
          const lines = top.map((r: any) => {
            if (r.issue === 'no_episodes') {
              return `• **${r.title}** (MAL ${r.mal_id}) — **0 episodes** uploaded`;
            }
            const sample = r.missing_numbers.slice(0, 8).join(', ');
            const more = r.missing_count > 8 ? ` … +${r.missing_count - 8} more` : '';
            return `• **${r.title}** (MAL ${r.mal_id}) — missing **${r.missing_count}** ep(s): ${sample}${more} (have ${r.present_count}, max #${r.max_episode})`;
          });
          reply =
            (titleQuery ? `Missing episodes for "${titleQuery}":\n\n` : `Found **${issues.length}** series with issues:\n\n`) +
            lines.join('\n') +
            '\n\nOpen **Episode Manager** for a series, or use **Import from Anikoto** to fill embeds.';
          if (top[0]) {
            actions.push({
              type: 'open_episodes',
              label: `Manage: ${top[0].title}`,
              mal_id: top[0].mal_id,
              anime_title: top[0].title,
            });
          }
          actions.push({ type: 'open_anikoto', label: 'Import from Anikoto' });
        }
      } else if (wantsStats) {
        const [animeRes, episodesRes, usersRes] = await Promise.all([
          db.from('anime').select('*', { count: 'exact', head: true }),
          db.from('episodes').select('*', { count: 'exact', head: true }),
          db.from('users').select('*', { count: 'exact', head: true }),
        ]);
        const totalAnime = animeRes.count ?? 0;
        const totalEpisodes = episodesRes.count ?? 0;
        const totalUsers = usersRes.count ?? 0;
        data = { totalAnime, totalEpisodes, totalUsers };
        reply =
          `**Site overview**\n\n` +
          `• Anime in catalog: **${totalAnime}**\n` +
          `• Episodes stored: **${totalEpisodes}**\n` +
          `• Users: **${totalUsers}**\n\n` +
          `Ask me "Where are episodes missing?" to scan for gaps.`;
        actions.push({ type: 'open_stats', label: 'Open Overview tab' });
      } else {
        reply =
          'I can help you find **missing episodes** and give a **site overview**.\n\n' +
          'Try one of these:\n' +
          '• "Where are episodes missing?"\n' +
          '• "Missing episodes for Naruto"\n' +
          '• "Site stats"\n' +
          '• "Help"';
        actions.push({ type: 'open_stats', label: 'Site overview' });
      }
  
      res.json({
        reply,
        actions,
        data,
        intent: wantsHelp ? 'help' : wantsMissing || titleQuery ? 'missing' : wantsStats ? 'stats' : 'fallback',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'AI assistant failed.' });
    }
  });
  
  
}
