import React, { useEffect, useState } from 'react';
import { History, Play, Clock, CheckCircle } from 'lucide-react';
import { animePath, watchPath } from '../lib/seo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SiteAnime } from '../types';

interface HistoryPageProps {
  navigate: (route: string) => void;
}

export function HistoryPage({ navigate }: HistoryPageProps) {
  const { user, watchHistory } = useAuth();
  const [enrichedHistory, setEnrichedHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistoryDetails() {
      if (!user || watchHistory.length === 0) {
        setEnrichedHistory([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const siteList = await api.getSiteAnimeList().catch(() => []);
        const items = watchHistory.map((item) => {
          const site = siteList.find((s) => s.mal_id === item.anime_mal_id);
          return {
            ...item,
            siteAnime: site,
          };
        });
        setEnrichedHistory(items);
      } catch (err) {
        console.error('Failed to load history details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistoryDetails();
  }, [user, watchHistory]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <History className="mx-auto h-12 w-12 text-slate-600 mb-3" />
        <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Sign in to view your Watch History</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 font-medium">
          Track your episode progress automatically across all your devices.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="rounded-full bg-rose-600 hover:bg-rose-700 px-6 py-3 text-xs font-black text-white shadow-lg transition-all"
        >
          SIGN IN NOW
        </button>
      </div>
    );
  }

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl flex items-center gap-2 border-l-4 border-rose-600 pl-3">
          <History className="h-6 w-6 text-rose-500" /> Watch History
        </h1>
        <p className="text-xs text-slate-400 font-medium pl-4 mt-1">
          Continue watching from where you left off
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 w-full rounded-2xl bg-[#0a0a10]" />
          ))}
        </div>
      ) : enrichedHistory.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0a0a10] p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white uppercase">No watch history recorded yet.</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Start streaming any episode and your playback progress will automatically save here.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="rounded-full bg-rose-600 hover:bg-rose-700 px-6 py-3 text-xs font-black text-white shadow-lg transition-all"
          >
            START WATCHING
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrichedHistory.map((item) => {
            const anime = item.siteAnime;
            const title =
              anime?.local?.custom_title ||
              anime?.jikan?.title_english ||
              anime?.jikan?.title ||
              `Anime #${item.anime_mal_id}`;
            const cover =
              anime?.local?.custom_cover_url ||
              anime?.jikan?.images?.jpg?.image_url;

            const progressPct =
              item.duration_seconds > 0
                ? Math.min(100, Math.floor((item.progress_seconds / item.duration_seconds) * 100))
                : 0;

            return (
              <div
                key={item.id}
                onClick={() => navigate(watchPath(item.anime_mal_id, item.episode_number))}
                className="group relative flex cursor-pointer gap-4 rounded-3xl border border-white/5 bg-[#0a0a10] p-4 shadow-lg hover:border-rose-600/50 transition-all"
              >
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-black">
                  <img src={cover} alt={title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-rose-600/40 transition-colors">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">
                        Episode {item.episode_number}
                      </span>
                      {item.completed && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                          <CheckCircle className="h-3 w-3" /> Watched
                        </span>
                      )}
                    </div>
                    <h3 className="truncate text-xs font-bold text-white group-hover:text-rose-400 mt-0.5 uppercase tracking-tight">
                      {title}
                    </h3>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                      <span>Progress</span>
                      <span>
                        {formatTime(item.progress_seconds)} / {formatTime(item.duration_seconds)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
