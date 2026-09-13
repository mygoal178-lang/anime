import React from 'react';
import { Star, Play, Heart, Info, MessageSquare, Mic, Tv, Film } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AniListAnime, SiteAnime } from '../types';
import { animePath, watchPath } from '../lib/seo';

interface UpdatedAnimeCardProps {
  key?: any;
  anime: AniListAnime | SiteAnime | any;
  navigate: (route: string) => void;
  viewMode?: 'grid' | 'list';
}

export function UpdatedAnimeCard({ anime, navigate, viewMode = 'grid' }: UpdatedAnimeCardProps) {
  const { toggleFavorite, isFavorite } = useAuth();
  
  const anilist = anime.anilist || anime.jikan || anime;
  const local = anime.local;
  const malId = anime.mal_id || anilist?.mal_id || null;

  const title = local?.custom_title || anilist?.title_english || anilist?.title || 'Anime Title';
  const coverUrl =
    local?.custom_cover_url ||
    anilist?.images?.jpg?.large_image_url ||
    anilist?.images?.jpg?.image_url ||
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';

  const score = anilist?.score || (anilist?.averageScore ? (anilist.averageScore / 10).toFixed(1) : null);
  const year = anilist?.year || (anilist?.aired?.from ? new Date(anilist.aired.from).getFullYear() : null);
  const format = anilist?.type || anilist?.format || 'TV';
  
  // Calculate episode badges based on actual data
  const totalEpisodes = anilist?.episodes || anime?.episodes?.length || null;
  const nextEp = anilist?.nextAiringEpisode?.episode ? anilist.nextAiringEpisode.episode - 1 : null;
  const latestEpNum = anime?.latest_episode_number || nextEp || totalEpisodes || (anilist?.status === 'Currently Airing' ? '?' : 12);
  const dubEpNum = typeof latestEpNum === 'number' ? Math.max(1, latestEpNum - (anilist?.status === 'Currently Airing' ? 2 : 0)) : null;

  const inWatchlist = malId ? isFavorite(malId) : false;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (malId) toggleFavorite(malId);
  };

  const handleWatchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof latestEpNum === 'number') {
      navigate(watchPath(malId, latestEpNum, title));
    } else {
      if (malId) navigate(animePath(malId, title));
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        id={`updated-anime-row-${malId}`}
        onClick={() => navigate(animePath(malId, title))}
        className="group relative flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 rounded-2xl border border-white/5 bg-[#0a0a10] hover:border-rose-500/40 hover:bg-white/[0.03] transition-all cursor-pointer shadow-md"
      >
        {/* List Thumbnail */}
        <div className="relative h-20 w-16 sm:h-24 sm:w-20 shrink-0 rounded-xl overflow-hidden bg-[#08080c]">
          <img
            src={coverUrl}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
            }}
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
        </div>

        {/* List Info */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded bg-[#5b38d6]/30 border border-[#7a54f7]/40 px-1.5 py-0.5 text-[10px] font-black text-[#b69eff]">
              <MessageSquare className="h-2.5 w-2.5" />
              <span>CC {latestEpNum}</span>
            </span>
            {dubEpNum && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-black text-amber-300">
                <Mic className="h-2.5 w-2.5" />
                <span>{dubEpNum}</span>
              </span>
            )}
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 uppercase">
              {format}
            </span>
          </div>

          <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1">
            {title}
          </h3>

          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-semibold text-rose-400">
            <span>Episode {latestEpNum}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-medium">Recently Updated</span>
          </div>

          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
            {score && (
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="h-3 w-3 fill-amber-400" />
                {score}
              </span>
            )}
            {year && <span>{year}</span>}
            <span className="truncate max-w-[150px] text-slate-500">
              {anilist?.genres?.slice(0, 2)?.map((g: any) => g.name).join(', ') || anilist?.status}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleFavoriteClick}
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95 ${
              inWatchlist
                ? 'border-rose-500 bg-rose-600 text-white'
                : 'border-white/10 bg-white/5 text-slate-300 hover:border-rose-500 hover:text-white'
            }`}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Heart className={`h-4 w-4 ${inWatchlist ? 'fill-white' : ''}`} />
          </button>
          <button
            onClick={handleWatchClick}
            className="flex h-9 px-3 items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
          >
            <Play className="h-3 w-3 fill-white" />
            <span className="hidden sm:inline">Watch</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`updated-anime-card-${malId}`}
      onClick={() => navigate(animePath(malId, title))}
      className="group relative flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a10] shadow-lg transition-all duration-300 hover:-translate-y-1.5 hover:border-rose-600/50 hover:shadow-2xl hover:shadow-rose-950/30"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#08080c]">
        <img
          src={coverUrl}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
          }}
        />

        {/* Top Badges (Score & Watchlist) */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-2 z-20 pointer-events-none">
          {score ? (
            <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/75 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md shadow">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              <span>{score}</span>
            </div>
          ) : <div />}

          <button
            onClick={handleFavoriteClick}
            className={`pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all active:scale-95 ${
              inWatchlist
                ? 'border-rose-500 bg-rose-600 text-white'
                : 'border-white/20 bg-black/75 text-slate-200 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:scale-110 hover:border-rose-500 hover:text-white'
            }`}
            title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
          >
            <Heart className={`h-3.5 w-3.5 ${inWatchlist ? 'fill-white text-white' : 'text-slate-200'}`} />
          </button>
        </div>

        {/* Visual Reference Bottom Badge Row Over Poster: [CC ep] [MIC ep] [TYPE] */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 z-20 pointer-events-none">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Closed Caption / Subtitle Badge */}
            <div className="flex items-center gap-1 rounded-md bg-[#4c2bb8]/90 border border-[#6b46e5]/40 px-1.5 py-0.5 text-[10px] font-black text-[#d3c4ff] backdrop-blur-md shadow-sm">
              <MessageSquare className="h-2.5 w-2.5" />
              <span>{latestEpNum}</span>
            </div>

            {/* Dubbed Audio Badge (if available) */}
            {dubEpNum && (
              <div className="flex items-center gap-1 rounded-md bg-amber-500/80 border border-amber-400/40 px-1.5 py-0.5 text-[10px] font-black text-amber-950 backdrop-blur-md shadow-sm">
                <Mic className="h-2.5 w-2.5" />
                <span>{dubEpNum}</span>
              </div>
            )}
          </div>

          {/* Media Format Type Badge (TV, ONA, Movie, etc.) */}
          <div className="rounded-md bg-black/80 border border-white/10 px-1.5 py-0.5 text-[9px] font-black text-slate-300 uppercase backdrop-blur-md shadow-sm">
            {format}
          </div>
        </div>

        {/* Hover / Touch Action Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-[#08080c]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 z-30 pointer-events-none sm:pointer-events-auto">
          <div className="space-y-1.5 transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
            <button
              onClick={handleWatchClick}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/30 transition-all uppercase active:scale-95"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Watch Now</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (malId) navigate(animePath(malId, title));
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md hover:bg-white/20 transition-all uppercase"
            >
              <Info className="h-3 w-3" />
              <span>Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Card Information Footer */}
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-rose-400 mb-0.5">
          <span className="truncate">Episode {latestEpNum}</span>
          <span className="text-[10px] text-slate-400 font-medium shrink-0">Updated</span>
        </div>
        <h3
          title={title}
          className="line-clamp-2 text-xs sm:text-[13px] font-bold text-slate-100 group-hover:text-rose-400 transition-colors leading-snug tracking-tight"
        >
          {title}
        </h3>

        <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 font-medium">
          <span className="text-slate-400">{year || '2026'}</span>
          <span className="truncate max-w-[90px] text-slate-500">
            {anilist?.genres?.[0]?.name || 'Anime'}
          </span>
        </div>
      </div>
    </div>
  );
}
