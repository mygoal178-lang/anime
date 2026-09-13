import { anilistApi } from '../../../../server/anilistCache.js';
import { getLocalAnimeByMalId } from '../../../../server/catalogFallback.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const rawId = req.query?.malId ?? req.params?.malId;
  const malId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  if (!malId || Number.isNaN(malId)) return res.status(400).json({ error: 'Valid MAL ID required.' });

  try {
    const data = await anilistApi.getAnimeByMalId(malId);
    if (data) {
      res.setHeader('X-AniVault-Data-Source', 'anilist');
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      return res.status(200).json(data);
    }
  } catch {}

  try {
    const local = await getLocalAnimeByMalId(malId);
    if (local?.anilist) {
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      return res.status(200).json(local.anilist);
    }
    return res.status(404).json({ error: 'Anime metadata not found in AniList or local database.' });
  } catch (error: any) {
    return res.status(503).json({ error: error?.message || 'AniList and local metadata are unavailable.' });
  }
}
