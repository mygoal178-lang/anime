import { supabase, supabaseAdmin } from './supabase.js';

const db = () => supabaseAdmin || supabase;

function cleanText(value: any): string {
  return String(value ?? '').replace(/<[^>]*>/g, '').trim();
}

function parseGenres(value: any): string[] {
  if (Array.isArray(value)) {
    return value.map((g) => (typeof g === 'string' ? g : g?.name)).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parseGenres(parsed);
    } catch {}
    return value.split(',').map((g) => g.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeLocalAnime(row: any) {
  if (!row) return null;
  const malId = Number(row.external_id);
  const genres = parseGenres(row.genres);
  const cover = row.cover_url || '';
  return {
    mal_id: malId,
    id: malId,
    idMal: malId,
    anilist_id: null,
    url: null,
    title: row.title || `Anime #${malId}`,
    title_english: row.title || null,
    title_japanese: null,
    synopsis: cleanText(row.description),
    type: row.type || 'TV',
    status: row.status || 'Finished Airing',
    episodes: null,
    duration: null,
    score: row.rating != null && row.rating !== '' ? Number(row.rating) || null : null,
    popularity: null,
    rank: null,
    year: row.year || null,
    season: null,
    countryOfOrigin: 'JP',
    updatedAt: row.updated_at || null,
    nextAiringEpisode: null,
    images: { jpg: { image_url: cover, large_image_url: cover } },
    banner_url: row.banner_url || cover,
    genres: genres.map((name, index) => ({ mal_id: index + 1, name, type: 'genre', url: '' })),
    studios: [],
    trailer: null,
    local: row,
  };
}

export async function searchLocalAnime(q: string, filters: Record<string, any> = {}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(filters.perPage) || 20));
  let query = db().from('anime').select('*', { count: 'exact' });

  const text = String(q || '').trim();
  if (text) query = query.ilike('title', `%${text}%`);

  const genre = String(filters.genre || filters.genres || '').trim();
  if (genre && genre.toLowerCase() !== 'all') query = query.contains('genres', JSON.stringify([genre]));

  const year = Number(filters.year || filters.seasonYear);
  if (Number.isInteger(year) && year > 1950 && year < 2100) query = query.eq('year', year);

  const status = String(filters.status || '').toLowerCase();
  if (status && status !== 'all') {
    const statusMap: Record<string, string> = {
      airing: 'Currently Airing',
      releasing: 'Currently Airing',
      complete: 'Finished Airing',
      finished: 'Finished Airing',
      upcoming: 'Not Yet Aired',
    };
    query = query.ilike('status', `%${statusMap[status] || filters.status}%`);
  }

  const type = String(filters.type || filters.format || '').trim();
  if (type && type.toLowerCase() !== 'all') query = query.ilike('type', type);

  const rating = Number(String(filters.rating || '').replace(/[^0-9.]/g, ''));
  if (Number.isFinite(rating) && rating > 0) {
    const min = rating <= 10 ? rating : rating / 10;
    query = query.gte('rating', String(min));
  }

  const sort = String(filters.sort || filters.order_by || '').toLowerCase();
  if (['score', 'rating', 'top_rated', 'highest_rated', 'popularity', 'most_popular', 'popular'].includes(sort)) {
    query = query.order('rating', { ascending: false, nullsFirst: false });
  } else if (['newest', 'start_date', 'latest', 'recently_added', 'updated', 'recent', 'updated_at'].includes(sort)) {
    query = query.order('updated_at', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('updated_at', { ascending: false, nullsFirst: false });
  }

  const from = (page - 1) * perPage;
  const { data, count, error } = await query.range(from, from + perPage - 1);
  if (error) throw error;

  const results = (data || []).map(normalizeLocalAnime).filter(Boolean);
  const total = Number(count || 0);
  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return {
    results,
    pageInfo: {
      total,
      currentPage: page,
      lastPage,
      hasNextPage: page < lastPage,
      perPage,
    },
    source: 'database-fallback',
  };
}

export async function getLocalGenres() {
  const { data, error } = await db().from('anime').select('genres');
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data || []) {
    for (const genre of parseGenres(row.genres)) {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    }
  }

  const fallback = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
    'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
    'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];

  const names = counts.size ? [...counts.keys()].sort((a, b) => a.localeCompare(b)) : fallback;
  return names.map((name, index) => ({
    mal_id: index + 1,
    name,
    count: counts.get(name) || 0,
  }));
}

export async function getLocalTopAnime(page = 1, perPage = 20) {
  return searchLocalAnime('', { page, perPage, sort: 'rating' });
}

export async function getLocalSeasonAnime(page = 1, perPage = 20) {
  const year = new Date().getFullYear();
  return searchLocalAnime('', { page, perPage, year, sort: 'newest' });
}

export async function getLocalAnimeByMalId(malId: number) {
  const id = Number(malId);
  if (!Number.isInteger(id) || id <= 0) return null;

  const { data: anime, error } = await db().from('anime').select('*').eq('external_id', id).maybeSingle();
  if (error) throw error;
  if (!anime) return null;

  const { data: episodes, error: epError } = await db()
    .from('episodes')
    .select('*')
    .eq('anime_mal_id', id)
    .order('episode_number', { ascending: true });
  if (epError) throw epError;

  return {
    mal_id: id,
    local: anime,
    anilist: normalizeLocalAnime(anime),
    jikan: normalizeLocalAnime(anime),
    episodes: episodes || [],
  };
}
