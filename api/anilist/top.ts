import { anilistApi } from '../../server/anilistCache.js';
import { getLocalTopAnime } from '../../server/catalogFallback.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const filter = String(req.query?.filter || 'bypopularity');
  const page = Math.max(1, Number(req.query?.page || 1));

  try {
    const results = await anilistApi.getTopAnime(filter, page);
    res.setHeader('X-AniVault-Data-Source', 'anilist');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json(results || { results: [] });
  } catch (error: any) {
    try {
      const fallback = await getLocalTopAnime(page);
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      return res.status(200).json(fallback.results || []);
    } catch (fallbackError: any) {
      return res.status(503).json({ error: fallbackError?.message || error?.message || 'Failed to fetch top anime.' });
    }
  }
}
