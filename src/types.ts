// AniVault TypeScript Type Definitions

export interface AniListCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AniListNextAiringEpisode {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface AniListStudio {
  name: string;
}

export interface AniListGenre {
  name: string;
}

export interface AniListAnime {
  id: number;
  mal_id?: number;
  idMal?: number;
  title: AniListTitle | string;
  title_english?: string;
  title_japanese?: string;
  description?: string;
  synopsis?: string;
  coverImage?: AniListCoverImage;
  images?: {
    jpg?: {
      image_url?: string;
      small_image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      image_url?: string;
      small_image_url?: string;
      large_image_url?: string;
    };
  };
  bannerImage?: string;
  banner_url?: string;
  cover_url?: string;
  format?: string;
  type?: string;
  status?: string;
  episodes?: number;
  duration?: number;
  averageScore?: number;
  score?: number;
  popularity?: number;
  season?: string;
  seasonYear?: number;
  year?: number;
  rating?: string;
  countryOfOrigin?: string;
  aired?: {
    string?: string;
    from?: string;
    to?: string;
  };
  producers?: Array<{ name: string }>;
  genres: string[] | AniListGenre[];
  studios?: {
    nodes?: AniListStudio[];
  } | AniListStudio[];
  nextAiringEpisode?: AniListNextAiringEpisode;
  trailer?: {
    id?: string;
    site?: string;
    thumbnail?: string;
    embed_url?: string;
  };
  characters?: any[];
  relations?: any[];
  recommendations?: any[];
}

// Backward compatibility alias during migration
export type JikanAnime = AniListAnime;

// Local Database Types
export interface EpisodeServer {
  server: string;
  embedUrl: string;
}

export interface LocalAnimeRecord {
  id: string;
  external_id: number;
  mal_id?: number;
  title: string;
  custom_title?: string | null;
  english_title?: string | null;
  japanese_title?: string | null;
  alternative_titles?: string | null;
  description?: string | null;
  custom_description?: string | null;
  cover_url?: string | null;
  custom_cover_url?: string | null;
  banner_url?: string | null;
  custom_banner_url?: string | null;
  genres?: string[];
  type?: string;
  year?: number | null;
  rating?: string | null;
  status?: string;
  featured: boolean;
  search_count?: number;
  created_at: string;
  updated_at: string;
}

export interface AnimeFormData {
  id?: string;
  external_id?: number | string | null;
  title: string;
  english_title?: string;
  japanese_title?: string;
  alternative_titles?: string;
  description?: string;
  cover_url: string;
  banner_url?: string;
  type: string;
  year?: number | string | null;
  rating?: string;
  status: string;
  genres: string[];
  featured: boolean;
}

export interface LocalEpisodeRecord {
  id: string;
  anime_mal_id: number;
  episode_number: number;
  title: string;
  video_url: string;
  server_urls?: string[];
  sub?: EpisodeServer[];
  dub?: EpisodeServer[];
  thumbnail_url?: string | null;
  subtitle_url?: string | null;
  views?: number;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'admin' | 'user';
  created_at: string;
  updated_at?: string;
}

export interface WatchHistoryRecord {
  id: string;
  user_id: string;
  anime_mal_id: number;
  episode_number: number;
  progress_seconds: number;
  duration_seconds: number;
  completed: boolean;
  updated_at: string;
}

export interface FavoriteRecord {
  id: string;
  user_id: string;
  anime_mal_id: number;
  created_at: string;
}

// Personalization & Social Models
export interface CommentRecord {
  id: string;
  anime_mal_id: number;
  episode_number?: number | null;
  user_id?: string;
  user_name: string;
  user_avatar?: string;
  comment: string;
  likes: number;
  liked_by?: string[];
  created_at: string;
}

export interface SiteStats {
  totalAnime: number;
  totalEpisodes: number;
  totalUsers: number;
  totalViews: number;
  total_anime?: number;
  total_episodes?: number;
  total_users?: number;
  total_views?: number;
  total_comments?: number;
  recently_added?: number;
  most_viewed_episode?: {
    id?: string;
    anime_mal_id: number;
    episode_number: number;
    episode_title: string;
    anime_title: string;
    thumbnail_url?: string | null;
    views: number;
  } | null;
  top_viewed_episodes?: Array<{
    id?: string;
    anime_mal_id: number;
    episode_number: number;
    episode_title: string;
    anime_title: string;
    thumbnail_url?: string | null;
    views: number;
  }>;
  most_searched_anime?: {
    mal_id: number;
    title: string;
    cover_url?: string;
    search_count: number;
  } | null;
  top_searched_anime?: Array<{
    mal_id: number;
    title: string;
    cover_url?: string;
    search_count: number;
  }>;
}

export interface SearchFilters {
  query?: string;
  genre?: string;
  type?: string;
  status?: string;
  season?: string;
  seasonYear?: string | number;
  year?: string | number;
  format?: string;
  rating?: string;
  minScore?: number | string;
  country?: string;
  perPage?: number;
  order_by?: string;
  sort?: string;
  page?: number;
}

export interface SiteAnime {
  mal_id: number;
  anilist?: AniListAnime;
  jikan?: AniListAnime;
  local?: LocalAnimeRecord | null;
  episodes: LocalEpisodeRecord[];
  latest_episode_number?: number | null;
}
