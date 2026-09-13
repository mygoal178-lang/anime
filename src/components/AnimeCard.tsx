import React from 'react';
import { Star, Play, Heart, Info, Tv } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SiteAnime, AniListAnime } from '../types';
import { animePath, watchPath } from '../lib/seo';

interface AnimeCardProps {
  key?: any;
  anime: SiteAnime | { mal_id: number; anilist?: AniListAnime; jikan?: AniListAnime; local?: any; episodes?: any[]; latest_episode_number?: number };
  navigate: (route: string) => void;
}

export function AnimeCard({ anime, navigate }: AnimeCardProps) {
  const { toggleFavorite, isFavorite } = useAuth();
  const anilist = anime.anilist || anime.jikan;
  const local = anime.local;
  const malId = anime.mal_id || anilist?.mal_id || null;

  const title = local?.custom_title || anilist?.title_english || anilist?.title || 'Anime Title';
  const coverUrl =
    local?.custom_cover_url ||
    anilist?.images?.jpg?.large_image_url ||
    anilist?.images?.jpg?.image_url ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';

  const score = anilist?.score || 8.0;
  const year = anilist?.year || (anilist?.aired?.from ? new Date(anilist.aired.from).getFullYear() : null);
  const totalEp = anime.episodes?.length || 0;
  const latestEp = anime.latest_episode_number;

  const inWatchlist = malId ? isFavorite(malId) : false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (malId) toggleFavorite(malId);
  };

  return (
    <div
      onClick={() => malId && navigate(animePath(malId, title))}
      className="group relative flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a10] shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-rose-600/50 hover:shadow-2xl hover:shadow-rose-950/30"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#08080c]">
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 z-20">
          {score && (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span>{score.toFixed(1)}</span>
            </div>
          )}

          {latestEp ? (
            <div className="flex items-center gap-1 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
              <Tv className="h-3 w-3" />
              <span>EP {latestEp}</span>
            </div>
          ) : (
            <div className="rounded-full bg-black/70 border border-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300 backdrop-blur-md">
              {anilist?.type || 'TV'}
            </div>
          )}
        </div>

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className={`absolute bottom-2 right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 ${
            inWatchlist
              ? 'border-rose-500 bg-rose-600 text-white'
              : 'border-white/20 bg-black/70 text-slate-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 hover:border-rose-500'
          }`}
          title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Heart className={`h-4 w-4 ${inWatchlist ? 'fill-white text-white' : 'text-slate-200'}`} />
        </button>

        {/* Hover Overlay with Action Buttons */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-10">
          <div className="space-y-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!malId) return;
                if (latestEp) {
                  navigate(watchPath(malId, latestEp, title));
                } else {
                  navigate(animePath(malId, title));
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-3 py-2 text-xs font-black text-white shadow-lg hover:bg-rose-700 transition-colors uppercase"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{latestEp ? `Watch Ep ${latestEp}` : 'Watch'}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (malId) navigate(animePath(malId, title));
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20 transition-colors uppercase"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-1 text-xs font-bold text-slate-100 group-hover:text-rose-500 transition-colors uppercase tracking-tight">
          {title}
        </h3>

        <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-medium">
          <span>{year || '2024'}</span>
          <span className="truncate max-w-[100px] text-slate-400">
            {typeof anilist?.genres?.[0] === 'string'
              ? anilist.genres[0]
              : (anilist?.genres?.[0] as any)?.name || 'Anime'}
          </span>
        </div>
      </div>
    </div>
  );
}
