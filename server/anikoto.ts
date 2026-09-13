/**
 * Anikoto API client — public endpoints for anime details + episode embed links.
 * Base: https://www.anikotoapi.site
 * Rate limit: ~60 req / 120s per IP. Prefer server-side use only.
 */

const ANIKOTO_BASE = 'https://www.anikotoapi.site';

export interface AnikotoEpisode {
  id: number;
  title: string;
  jp_title?: string;
  number: number;
  episode_embed_id?: string;
  embed_url?: {
    sub?: string;
    dub?: string;
  };
  updated_at?: string;
}

export interface AnikotoAnime {
  id: number;
  title: string;
  alternative?: string;
  titles?: string;
  native?: string;
  slug?: string;
  rating?: string;
  poster?: string;
  is_dub?: number;
  is_sub?: number;
  description?: string;
  aired?: string;
  season?: string;
  year?: number | string;
  duration?: string;
  status?: string;
  score?: string;
  mal_id?: string | number;
  episodes?: string | number;
  ani_id?: string | number;
  source?: string;
  background_image?: string;
  updated_at?: string;
  terms_by_type?: {
    genre?: string[];
    producers?: string[];
    studios?: string[];
    type?: string[];
  };
}

export interface AnikotoSeriesResponse {
  ok: boolean;
  error?: string;
  code?: string;
  anikoto_domains?: string[];
  data?: {
    anime: AnikotoAnime;
    episodes: AnikotoEpisode[];
  };
}

export interface AnikotoRecentResponse {
  ok: boolean;
  error?: string;
  anikoto_domains?: string[];
  data?: AnikotoAnime[];
  pagination?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}

async function anikotoFetch<T>(path: string, timeoutMs = 20000): Promise<T> {
  const url = path.startsWith('http') ? path : `${ANIKOTO_BASE}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AniVault/1.0 (server; anikoto-import)',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Anikoto HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRecentAnime(page = 1, perPage = 20): Promise<AnikotoRecentResponse> {
  const p = Math.max(1, Number(page) || 1);
  const pp = Math.min(50, Math.max(1, Number(perPage) || 20));
  return anikotoFetch<AnikotoRecentResponse>(`/recent-anime?page=${p}&per_page=${pp}`);
}

export async function fetchSeries(anikotoId: number | string): Promise<AnikotoSeriesResponse> {
  const id = Number(anikotoId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Invalid Anikoto series ID');
  }
  return anikotoFetch<AnikotoSeriesResponse>(`/series/${id}`);
}

/** Map Anikoto anime payload → fields suitable for Supabase `anime` table */
export function mapAnikotoAnimeToLocal(anime: AnikotoAnime) {
  const malId = Number(anime.mal_id) || 0;
  const genres = anime.terms_by_type?.genre || [];
  const type = (anime.terms_by_type?.type && anime.terms_by_type.type[0]) || 'TV';
  const year = anime.year ? Number(anime.year) : new Date().getFullYear();
  return {
    external_id: malId > 0 ? malId : Number(anime.id), // prefer real MAL id
    anikoto_id: Number(anime.id),
    title: (anime.title || anime.alternative || `Anime #${anime.id}`).trim(),
    alternative_titles: anime.titles || anime.alternative || null,
    japanese_title: anime.native || null,
    description: anime.description || null,
    cover_url: anime.poster || null,
    banner_url: anime.background_image || anime.poster || null,
    genres,
    type,
    year: Number.isFinite(year) ? year : new Date().getFullYear(),
    rating: anime.score || anime.rating || null,
    status: anime.status || 'Finished Airing',
  };
}

/** Pick embed URLs for an episode (sub / dub) */
export function extractEmbeds(ep: AnikotoEpisode): {
  sub: Array<{ server: string; embedUrl: string }>;
  dub: Array<{ server: string; embedUrl: string }>;
} {
  const sub: Array<{ server: string; embedUrl: string }> = [];
  const dub: Array<{ server: string; embedUrl: string }> = [];
  const subUrl = ep.embed_url?.sub?.trim();
  const dubUrl = ep.embed_url?.dub?.trim();
  if (subUrl && /^https?:\/\//i.test(subUrl)) {
    sub.push({ server: 'Anikoto Sub', embedUrl: subUrl });
  }
  if (dubUrl && /^https?:\/\//i.test(dubUrl)) {
    dub.push({ server: 'Anikoto Dub', embedUrl: dubUrl });
  }
  return { sub, dub };
}
