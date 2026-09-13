import React, { useEffect, useState } from 'react';
import { Sparkles, Film } from 'lucide-react';
import { api } from '../services/api';

interface GenresPageProps {
  navigate: (route: string) => void;
}

export function GenresPage({ navigate }: GenresPageProps) {
  const [genres, setGenres] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadGenres() {
      try {
        const data = await api.getGenres();
        setGenres(data || []);
      } catch (err) {
        console.error('Failed to load genres:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGenres();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl flex items-center gap-2 border-l-4 border-rose-600 pl-3">
          <Sparkles className="h-6 w-6 text-rose-500" /> Anime Genres & Categories
        </h1>
        <p className="text-xs text-slate-400 font-medium pl-4 mt-1">
          Select a category to discover anime series matching your preference
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 animate-pulse">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-[#0a0a10]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {genres.map((g) => (
            <button
              key={g.mal_id}
              onClick={() => navigate(`/search?genre=${encodeURIComponent(g.name)}`)}
              className="group flex flex-col justify-between rounded-2xl border border-white/5 bg-[#0a0a10] p-4 text-left shadow-lg hover:border-rose-600/50 hover:bg-rose-600/10 hover:-translate-y-1 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-white group-hover:text-rose-400">
                  {g.name}
                </span>
                <Film className="h-4 w-4 text-slate-600 group-hover:text-rose-500" />
              </div>
              <span className="text-[10px] font-semibold text-slate-400 mt-3">
                {g.count ? `${g.count.toLocaleString()} Titles` : 'Browse Catalog'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
