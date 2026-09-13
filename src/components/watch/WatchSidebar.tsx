import React, { useState, useEffect } from 'react';
import { Star, Flame, Sparkles, Film, ChevronRight } from 'lucide-react';
import { animePath, watchPath } from '../../lib/seo';
import { api } from '../../services/api';
import { AniListAnime } from '../../types';

interface WatchSidebarProps {
  currentMalId: number;
  navigate: (route: string) => void;
}

export function WatchSidebar({ currentMalId, navigate }: WatchSidebarProps) {
  const [recommended, setRecommended] = useState<AniListAnime[]>([]);
  const [trending, setTrending] = useState<AniListAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSidebarData() {
      setIsLoading(true);
      try {
        const [topRes, seasonalRes] = await Promise.all([
          api.getTopRatedAnime(1),
          api.getSeasonalAniListAnime(1),
        ]);

        if (isMounted) {
          const filteredTop = (topRes || []).filter((a) => a.mal_id !== currentMalId);
          const filteredSeasonal = (seasonalRes || []).filter((a) => a.mal_id !== currentMalId);

          setRecommended(filteredTop.slice(0, 8));
          setTrending(filteredSeasonal.slice(0, 6));
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSidebarData();

    return () => {
      isMounted = false;
    };
  }, [currentMalId]);

  return (
    <div id="watch-sidebar" className="space-y-6">
      {/* Recommended Anime Section */}
      <div className="rounded-xl border border-white/10 bg-[#0d0d15] p-3.5 sm:p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white tracking-tight uppercase">Recommended</h3>
          </div>
          <button
            onClick={() => navigate('/search?sort=popularity')}
            className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="h-16 w-12 rounded-lg bg-white/5 shrink-0" />
                <div className="flex-1 space-y-1.5 py-1">
                  <div className="h-3 w-3/4 rounded bg-white/5" />
                  <div className="h-2.5 w-1/2 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {recommended.map((anime) => {
              const cover =
                anime.images?.jpg?.large_image_url ||
                anime.images?.jpg?.image_url ||
                'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop';
              const title = anime.title_english || anime.title;
              const score = anime.score || (anime.averageScore ? Number((anime.averageScore / 10).toFixed(1)) : null);
              const type = anime.type || anime.format || 'TV';
              const year = anime.year || (anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null);

              return (
                <div
                  key={anime.mal_id}
                  id={`recommended-card-${anime.mal_id}`}
                  onClick={() => navigate(animePath(anime.mal_id, anime))}
                  className="group flex items-center gap-3 rounded-lg border border-white/5 bg-[#12121c] p-2 cursor-pointer transition-all hover:border-purple-500/50 hover:bg-[#1a1a2b]"
                >
                  {/* Thumbnail Poster */}
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-black">
                    <img
                      src={cover}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-purple-300 line-clamp-2 leading-snug transition-colors">
                      {title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {score && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{score}</span>
                        </span>
                      )}
                      <span>·</span>
                      <span>{type}</span>
                      {year && (
                        <>
                          <span>·</span>
                          <span>{year}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trending Anime Section */}
      {trending.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#0d0d15] p-3.5 sm:p-4 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3.5">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-500" />
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">Trending Now</h3>
            </div>
            <button
              onClick={() => navigate('/search?sort=newest')}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-0.5"
            >
              <span>View All</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-2.5">
            {trending.map((anime) => {
              const cover =
                anime.images?.jpg?.large_image_url ||
                anime.images?.jpg?.image_url ||
                'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=300&auto=format&fit=crop';
              const title = anime.title_english || anime.title;
              const score = anime.score || (anime.averageScore ? Number((anime.averageScore / 10).toFixed(1)) : null);
              const type = anime.type || anime.format || 'TV';

              return (
                <div
                  key={anime.mal_id}
                  id={`trending-card-${anime.mal_id}`}
                  onClick={() => navigate(animePath(anime.mal_id, anime))}
                  className="group flex items-center gap-3 rounded-lg border border-white/5 bg-[#12121c] p-2 cursor-pointer transition-all hover:border-rose-500/50 hover:bg-[#1a1a2b]"
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-black">
                    <img
                      src={cover}
                      alt={title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <h4 className="text-xs font-bold text-slate-200 group-hover:text-rose-300 line-clamp-2 leading-snug transition-colors">
                      {title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      {score && (
                        <span className="flex items-center gap-0.5 font-bold text-amber-400">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{score}</span>
                        </span>
                      )}
                      <span>·</span>
                      <span>{type}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
