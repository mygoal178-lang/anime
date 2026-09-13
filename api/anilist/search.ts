import { anilistApi } from '../../server/anilistCache.js';
import { searchLocalAnime } from '../../server/catalogFallback.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const q = String(req.query?.q || req.query?.query || '');
  const filters: Record<string, any> = {};
  for (const key of ['page','perPage','genre','genres','country','season','year','seasonYear','status','type','format','rating','order_by','sort']) {
    const value = req.query?.[key];
    if (value !== undefined && value !== '') filters[key] = Array.isArray(value) ? value[0] : value;
  }
  if (filters.genres && !filters.genre) filters.genre = filters.genres;

  try {
    const results = await anilistApi.searchAnime(q, filters);
    res.setHeader('X-AniVault-Data-Source', 'anilist');
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
    return res.status(200).json(results || { results: [], pageInfo: { currentPage: Number(filters.page) || 1, hasNextPage: false } });
  } catch (error: any) {
    try {
      const fallback = await searchLocalAnime(q, filters);
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
      return res.status(200).json(fallback);
    } catch (fallbackError: any) {
      return res.status(503).json({
        error: 'AniList is unavailable and the local database fallback also failed.',
        details: fallbackError?.message || error?.message || 'Unknown error',
      });
    }
  }
}
