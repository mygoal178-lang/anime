import React from 'react';
import { Star, Flame, ChevronRight, TrendingUp } from 'lucide-react';
import { animePath, watchPath } from '../lib/seo';
import { AniListAnime } from '../types';

interface TopRatedSidebarProps {
  animeList: AniListAnime[];
  isLoading?: boolean;
  navigate: (route: string) => void;
  title?: string;
  subtitle?: string;
}

export function TopRatedSidebar({
  animeList,
  isLoading = false,
  navigate,
  title = 'Top rated anime',
  subtitle = 'Based on global community rating',
}: TopRatedSidebarProps) {
  return (
    <aside
      id="top-rated-sidebar"
      className="w-full rounded-2xl border border-white/5 bg-[#0a0a10] p-4 sm:p-5 shadow-xl"
    >
      {/* Sidebar Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-1.5">
              <span>{title}</span>
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <button
          onClick={() => navigate('/search?sort=score')}
          className="flex items-center gap-0.5 text-[11px] font-bold text-rose-500 hover:text-rose-400 transition-colors"
        >
          <span>View all</span>
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.02] animate-pulse">
              <div className="h-16 w-12 rounded-lg bg-white/10 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-white/10 rounded w-3/4" />
                <div className="h-2.5 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : animeList.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          No top-rated anime available at the moment.
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2.5">
          {animeList.slice(0, 8).map((anime, index) => {
            const malId = anime.mal_id || null;
            const title = anime.title_english || anime.title || 'Anime Title';
            const coverUrl =
              anime.images?.jpg?.large_image_url ||
              anime.images?.jpg?.image_url ||
              'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
            const score = anime.score || (anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.8');
            const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 2026);
            const format = anime.type || anime.format || 'TV';

            return (
              <div
                key={malId || index}
                id={`top-rated-item-${malId}`}
                onClick={() => malId && navigate(animePath(malId, title))}
                className="group relative flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.03] transition-all cursor-pointer"
              >
                {/* Ranking Index */}
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[11px] font-black text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  {index + 1}
                </div>

                {/* Small Thumbnail Poster */}
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-[#08080c] shadow-sm">
                  <img
                    src={coverUrl}
                    alt={title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
                    }}
                  />
                </div>

                {/* Anime Details */}
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-200 group-hover:text-rose-400 transition-colors line-clamp-2 leading-snug">
                    {title}
                  </h4>

                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{score}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="uppercase text-[10px] font-semibold text-slate-400">{format}</span>
                    {year && (
                      <>
                        <span className="text-slate-600">•</span>
                        <span className="text-[10px] text-slate-500">{year}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
