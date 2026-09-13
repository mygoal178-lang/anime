import { supabase } from '../lib/supabase.js';
import { createClient } from '@supabase/supabase-js';
import {
  AniListAnime,
  JikanAnime,
  LocalEpisodeRecord,
  SiteStats,
  UserProfile,
  SearchFilters,
  SiteAnime,
  CommentRecord,
} from '../types.js';

// Base JSON fetcher with Supabase Auth token injection
async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errJson = await res.json();
      if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Admin CMS & Statistics API
  async getAdminStats(): Promise<SiteStats> {
    const data = await fetchJson<any>('/api/admin/stats');

    return {
      totalAnime: data.total_anime ?? data.totalAnime ?? 0,
      totalEpisodes: data.total_episodes ?? data.totalEpisodes ?? 0,
      totalUsers: data.total_users ?? data.totalUsers ?? 0,
      totalViews: data.total_views ?? data.totalViews ?? 0,
      total_anime: data.total_anime ?? data.totalAnime ?? 0,
      total_episodes: data.total_episodes ?? data.totalEpisodes ?? 0,
      total_users: data.total_users ?? data.totalUsers ?? 0,
      total_views: data.total_views ?? data.totalViews ?? 0,
      total_comments: data.total_comments ?? 0,
      recently_added: data.recently_added ?? 0,
      most_viewed_episode: data.most_viewed_episode ?? null,
      top_viewed_episodes: data.top_viewed_episodes ?? [],
      most_searched_anime: data.most_searched_anime ?? null,
      top_searched_anime: data.top_searched_anime ?? [],
    };
  },

  async getAdminUsers(): Promise<UserProfile[]> {
    return fetchJson<UserProfile[]>('/api/admin/users');
  },

  async searchAdminAnime(query = ''): Promise<any[]> {
    const q = query.trim();
    return fetchJson<any[]>(`/api/admin/anime/search${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  },

  async getAdminAnimeWithEpisodes(identifier: string | number): Promise<{ anime: any; episodes: any[] }> {
    return fetchJson<{ anime: any; episodes: any[] }>(`/api/admin/anime/${identifier}/episodes`);
  },

  async saveAdminAnime(animeData: {
    id?: string;
    mal_id?: number | string | null;
    external_id?: number | string | null;
    title?: string;
    custom_title?: string;
    english_title?: string;
    japanese_title?: string;
    alternative_titles?: string;
    description?: string;
    custom_description?: string;
    cover_url?: string;
    custom_cover_url?: string;
    banner_url?: string;
    custom_banner_url?: string;
    featured?: boolean;
    genres?: string[];
    type?: string;
    year?: number | null;
    rating?: string | null;
    status?: string;
  }): Promise<{ success: boolean; anime: any }> {
    return fetchJson<{ success: boolean; anime: any }>('/api/admin/anime', {
      method: 'POST',
      body: JSON.stringify(animeData),
    });
  },

  async deleteAdminAnime(malIdOrId: number | string): Promise<{ success: boolean; message?: string }> {
    return fetchJson<{ success: boolean; message?: string }>(`/api/admin/anime/${malIdOrId}`, {
      method: 'DELETE',
    });
  },

  /** Anikoto: browse recent series (for admin import picker) */
  async getAnikotoRecent(page = 1, perPage = 20): Promise<{
    ok: boolean;
    data: Array<{
      id: number;
      title: string;
      alternative?: string;
      poster?: string;
      mal_id?: number | null;
      year?: number | string;
      status?: string;
      is_sub?: number;
      is_dub?: number;
      episodes?: string | number;
      score?: string;
    }>;
    pagination?: any;
  }> {
    return fetchJson(`/api/admin/anikoto/recent?page=${page}&per_page=${perPage}`);
  },

  /** Anikoto: preview series details without importing */
  async getAnikotoSeries(anikotoId: number | string): Promise<{
    ok: boolean;
    anime: any;
    total_episodes: number;
    episode_sample?: any[];
  }> {
    return fetchJson(`/api/admin/anikoto/series/${anikotoId}`);
  },

  /**
   * Anikoto: import anime details + episode embed links into Supabase.
   * maxEpisodes = how many episodes to import (from startEpisode). Omit for all.
   */
  async importFromAnikoto(payload: {
    anikotoId: number;
    maxEpisodes?: number | null;
    startEpisode?: number;
    animeOnly?: boolean;
  }): Promise<{
    success: boolean;
    anime: any;
    imported_episodes: number;
    skipped_episodes: number;
    total_available: number;
    message?: string;
    errors?: string[];
    mal_id?: number;
    anikoto_id?: number;
  }> {
    return fetchJson('/api/admin/anikoto/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async saveAdminEpisode(epData: {
    id?: string;
    anime_mal_id: number;
    episode_number: number;
    title: string;
    sub?: Array<{ server: string; embedUrl: string }>;
    dub?: Array<{ server: string; embedUrl: string }>;
    video_url?: string;
    server_urls?: string[];
    thumbnail_url?: string | null;
    subtitle_url?: string | null;
  }): Promise<{ success: boolean; episode: LocalEpisodeRecord }> {
    return fetchJson<{ success: boolean; episode: LocalEpisodeRecord }>('/api/admin/episodes', {
      method: 'POST',
      body: JSON.stringify(epData),
    });
  },

  async updateAdminEpisode(id: string, epData: {
    episode_number?: number;
    title?: string;
    thumbnail_url?: string | null;
    subtitle_url?: string | null;
  }): Promise<{ success: boolean; episode: any }> {
    return fetchJson<{ success: boolean; episode: any }>(`/api/admin/episodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(epData),
    });
  },

  async addAdminServer(episodeId: string, serverData: {
    language: 'sub' | 'dub';
    server_name: string;
    embed_url: string;
  }): Promise<{ success: boolean; server: any }> {
    return fetchJson<{ success: boolean; server: any }>(`/api/admin/episodes/${episodeId}/servers`, {
      method: 'POST',
      body: JSON.stringify(serverData),
    });
  },

  async updateAdminServer(serverId: string, serverData: {
    server_name?: string;
    embed_url?: string;
    language?: 'sub' | 'dub';
  }): Promise<{ success: boolean; server: any }> {
    return fetchJson<{ success: boolean; server: any }>(`/api/admin/servers/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify(serverData),
    });
  },

  async deleteAdminServer(serverId: string): Promise<{ success: boolean; message?: string }> {
    return fetchJson<{ success: boolean; message?: string }>(`/api/admin/servers/${serverId}`, {
      method: 'DELETE',
    });
  },

  async deleteAdminEpisode(id: string): Promise<{ success: boolean; message?: string }> {
    return fetchJson<{ success: boolean; message?: string }>(`/api/admin/episodes/${id}`, {
      method: 'DELETE',
    });
  },

  async changeAdminPassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const oldValue = String(oldPassword || '');
    const newValue = String(newPassword || '');
    if (!oldValue) throw new Error('Enter your current password.');
    if (newValue.length < 6) throw new Error('New password must be at least 6 characters.');
    if (oldValue === newValue) throw new Error('New password must be different from the current password.');

    // Verify the old password with a short-lived client so a failed check never
    // replaces the user's existing browser session.
    const email = (await supabase.auth.getUser()).data.user?.email;
    if (!email) throw new Error('Your authenticated account could not be verified. Please sign in again.');

    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) throw new Error('Supabase frontend environment variables are missing.');

    const verifier = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: verifyError } = await verifier.auth.signInWithPassword({
      email,
      password: oldValue,
    });
    if (verifyError) throw new Error('Current password is incorrect.');

    const { error } = await supabase.auth.updateUser({ password: newValue });
    if (error) throw new Error(error.message || 'Failed to update password via Supabase Auth.');
    return { success: true, message: 'Password updated successfully in Supabase Auth.' };
  },

  // Public Anime Catalog & Episode API (Pure Supabase data)
  async getSiteAnimeList(): Promise<SiteAnime[]> {
    return fetchJson<SiteAnime[]>('/api/anime');
  },

  async getUpdatedAnimeCatalog(filters: SearchFilters = {}): Promise<{
    results: any[];
    pageInfo: {
      currentPage: number;
      lastPage?: number;
      hasNextPage: boolean;
      total?: number;
      perPage?: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (filters.query) queryParams.set('q', filters.query);
    if (filters.page) queryParams.set('page', String(filters.page));
    if (filters.perPage) queryParams.set('perPage', String(filters.perPage));
    if (filters.genre) queryParams.set('genres', filters.genre);
    if (filters.country) queryParams.set('country', filters.country);
    if (filters.season) queryParams.set('season', filters.season);
    if (filters.year || filters.seasonYear) queryParams.set('year', String(filters.year || filters.seasonYear));
    if (filters.status) queryParams.set('status', filters.status);
    if (filters.type || filters.format) queryParams.set('type', String(filters.type || filters.format));
    if (filters.rating || filters.minScore) queryParams.set('rating', String(filters.rating || filters.minScore));
    if (filters.sort) queryParams.set('sort', filters.sort);

    return fetchJson(`/api/anime/updated?${queryParams.toString()}`);
  },

  async getRecentlyAddedEpisodes(): Promise<
    Array<{ episode: LocalEpisodeRecord; localAnime: any; anilist: AniListAnime; jikan?: AniListAnime }>
  > {
    return fetchJson('/api/anime/recently-added');
  },

  async getAnimeDetails(malId: number): Promise<{
    mal_id: number;
    local: any;
    anilist: AniListAnime;
    jikan?: AniListAnime;
    episodes: LocalEpisodeRecord[];
  }> {
    return fetchJson(`/api/anime/${encodeURIComponent(String(malId))}`);
  },

  async getEpisodeDetails(
    malId: number,
    epNum: number
  ): Promise<{
    episode: LocalEpisodeRecord;
    allEpisodes: LocalEpisodeRecord[];
    localAnime: any;
    anilist: AniListAnime;
    jikan?: AniListAnime;
    hasPrev: boolean;
    hasNext: boolean;
  }> {
    return fetchJson(`/api/episodes/${malId}/${epNum}`);
  },

  // AniList / Jikan Metadata & Catalog API
  async getAnimeMetadata(malId: number): Promise<any> {
    return fetchJson(`/api/anilist/anime/${malId}`);
  },

  async getAnimeCharacters(malId: number): Promise<any[]> {
    return fetchJson(`/api/anilist/anime/${malId}/characters`);
  },

  async getTopAnime(filter = 'bypopularity', page = 1): Promise<{ results: AniListAnime[] }> {
    const res = await fetchJson<any>(`/api/anilist/top?filter=${filter}&page=${page}`);
    return { results: Array.isArray(res) ? res : (res?.results || []) };
  },

  async getTopJikanAnime(filter = 'bypopularity', page = 1): Promise<JikanAnime[]> {
    const res = await fetchJson<any>(`/api/anilist/top?filter=${filter}&page=${page}`);
    return Array.isArray(res) ? res : res.results || [];
  },

  async getTopRatedAnime(page = 1): Promise<AniListAnime[]> {
    const res = await fetchJson<any>(`/api/anilist/top?filter=bypopularity&page=${page}`);
    return Array.isArray(res) ? res : res.results || [];
  },

  async getSeasonalAnime(page = 1): Promise<{ results: AniListAnime[] }> {
    const res = await fetchJson<any>(`/api/anilist/season-now?page=${page}`);
    return { results: Array.isArray(res) ? res : (res?.results || []) };
  },

  async getSeasonalJikanAnime(page = 1): Promise<JikanAnime[]> {
    const res = await fetchJson<any>(`/api/anilist/season-now?page=${page}`);
    return Array.isArray(res) ? res : res.results || [];
  },

  async getSeasonalAniListAnime(page = 1): Promise<AniListAnime[]> {
    const res = await fetchJson<any>(`/api/anilist/season-now?page=${page}`);
    return Array.isArray(res) ? res : res.results || [];
  },

  async getGenres(): Promise<Array<{ id?: number; name: string; count?: number }>> {
    return fetchJson('/api/anilist/genres');
  },

  async searchJikan(filters: SearchFilters = {}): Promise<{
    results: any[];
    pageInfo?: {
      currentPage: number;
      lastPage?: number;
      hasNextPage: boolean;
      total?: number;
      perPage?: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (filters.query) queryParams.set('q', filters.query);
    if (filters.page) queryParams.set('page', String(filters.page));
    if (filters.perPage) queryParams.set('perPage', String(filters.perPage));
    if (filters.genre) queryParams.set('genre', filters.genre);
    if (filters.country) queryParams.set('country', filters.country);
    if (filters.season) queryParams.set('season', filters.season);
    if (filters.year || filters.seasonYear) queryParams.set('year', String(filters.year || filters.seasonYear));
    if (filters.status) queryParams.set('status', filters.status);
    if (filters.type || filters.format) queryParams.set('type', String(filters.type || filters.format));
    if (filters.rating || filters.minScore) queryParams.set('rating', String(filters.rating || filters.minScore));
    if (filters.sort) queryParams.set('sort', filters.sort);

    return fetchJson(`/api/anilist/search?${queryParams.toString()}`);
  },

  async searchAniList(filters: SearchFilters = {}): Promise<{
    results: any[];
    pageInfo?: {
      currentPage: number;
      lastPage?: number;
      hasNextPage: boolean;
      total?: number;
      perPage?: number;
    };
  }> {
    return this.searchJikan(filters);
  },

  // Supabase Comments Helpers
  async getComments(animeMalId: number, epNumber?: number | null): Promise<CommentRecord[]> {
    let query = supabase
      .from('comments')
      .select('*')
      .eq('anime_mal_id', animeMalId)
      .order('created_at', { ascending: false });

    if (epNumber !== null && epNumber !== undefined) {
      query = query.eq('episode_number', epNumber);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CommentRecord[];
  },

  async postComment(
    animeMalId: number,
    commentText: string,
    epNumber?: number | null,
    userName?: string,
    userAvatar?: string | null
  ): Promise<CommentRecord> {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        anime_mal_id: Number(animeMalId),
        episode_number: epNumber ?? null,
        user_id: userId,
        user_name: userName || 'AniVault Fan',
        user_avatar: userAvatar || null,
        comment: commentText.trim(),
        likes: 0,
        liked_by: [],
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as CommentRecord;
  },

  async likeComment(commentId: string): Promise<{ success: boolean; likes?: number; liked?: boolean }> {
    const { data, error } = await supabase.rpc('toggle_comment_like', {
      p_comment_id: commentId,
    });
    if (error) {
      throw new Error(error.message || 'Failed to toggle comment like.');
    }
    return data || { success: true };
  },

  async deleteComment(commentId: string): Promise<{ success: boolean }> {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
    return { success: true };
  },
};
