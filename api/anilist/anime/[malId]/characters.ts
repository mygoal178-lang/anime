import { anilistApi } from '../../../../server/anilistCache.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const rawId = req.query?.malId ?? req.params?.malId;
    const malId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
    if (!malId || Number.isNaN(malId)) return res.status(400).json({ error: 'Valid MAL ID required.' });
    const chars = await anilistApi.getAnimeCharacters(malId);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json(chars || []);
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || 'Failed to fetch characters.' });
  }
}
