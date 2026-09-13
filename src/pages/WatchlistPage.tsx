import React, { useEffect, useState } from 'react';
import { Heart, Play, Trash2, Bookmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnimeCard } from '../components/AnimeCard';
import { api } from '../services/api';
import { SiteAnime } from '../types';

interface WatchlistPageProps {
  navigate: (route: string) => void;
}

export function WatchlistPage({ navigate }: WatchlistPageProps) {
  const { user, favorites } = useAuth();
  const [favoriteAnimeList, setFavoriteAnimeList] = useState<SiteAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWatchlistAnime() {
      if (!user || favorites.length === 0) {
        setFavoriteAnimeList([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const items = await Promise.all(
          favorites.map(async (malId) => {
            try {
              const res = await api.getAnimeDetails(malId);
              return {
                mal_id: malId,
                anilist: res.anilist,
                jikan: res.jikan,
                local: res.local,
                episodes: res.episodes,
                latest_episode_number: res.episodes.length > 0
                  ? res.episodes[res.episodes.length - 1].episode_number
                  : null,
              };
            } catch {
              // A watchlist item can exist before an admin uploads it to the
              // local catalog. Fall back to the metadata endpoint so the
              // Watchlist never incorrectly says "Anime not found".
              try {
                const metadata = await api.getAnimeMetadata(malId);
                if (!metadata) return null;
                return {
                  mal_id: malId,
                  anilist: metadata,
                  jikan: metadata,
                  local: null,
                  episodes: [],
                  latest_episode_number: null,
                };
              } catch {
                return null;
              }
            }
          })
        );
        setFavoriteAnimeList(items.filter(Boolean) as SiteAnime[]);
      } catch (err) {
        console.error('Failed to load watchlist:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWatchlistAnime();
  }, [user, favorites]);

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Bookmark className="mx-auto h-12 w-12 text-slate-600 mb-3" />
        <h2 className="text-xl font-black italic uppercase tracking-tight text-white">Sign in to view your Watchlist</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6 font-medium">
          Save your favorite anime series to easily access them across devices.
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl flex items-center gap-2 border-l-4 border-rose-600 pl-3">
          <Heart className="h-6 w-6 text-rose-500 fill-rose-500" /> My Saved Watchlist
        </h1>
        <p className="text-xs text-slate-400 font-medium pl-4 mt-1">
          {favorites.length} {favorites.length === 1 ? 'anime' : 'animes'} saved to your account
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-[#0a0a10]" />
          ))}
        </div>
      ) : favoriteAnimeList.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-[#0a0a10] p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-white uppercase">Your Watchlist is empty.</h3>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Explore anime and click the heart icon on any series to save it here.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="rounded-full bg-rose-600 hover:bg-rose-700 px-6 py-3 text-xs font-black text-white shadow-lg transition-all"
          >
            EXPLORE CATALOG
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {favoriteAnimeList.map((anime) => (
            <AnimeCard key={anime.mal_id} anime={anime} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
