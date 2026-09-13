import { anilistApi } from '../../server/anilistCache.js';
import { getLocalGenres } from '../../server/catalogFallback.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const genres = await anilistApi.getGenres();
    res.setHeader('X-AniVault-Data-Source', 'anilist');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(genres || []);
  } catch (error: any) {
    try {
      const genres = await getLocalGenres();
      res.setHeader('X-AniVault-Data-Source', 'database-fallback');
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
      return res.status(200).json(genres);
    } catch (fallbackError: any) {
      return res.status(503).json({ error: fallbackError?.message || error?.message || 'Failed to fetch genres.' });
    }
  }
}
