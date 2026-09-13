import React, { useEffect, useState, useMemo } from 'react';
import { Play, Sparkles, Flame, TrendingUp, Clock, Compass, Search } from 'lucide-react';
import { animePath, watchPath } from '../lib/seo';
import { HeroCarousel } from '../components/HeroCarousel';
import { AnimeCarousel } from '../components/AnimeCarousel';
import { AnimeCard } from '../components/AnimeCard';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SiteAnime, JikanAnime } from '../types';

interface HomePageProps {
  navigate: (route: string) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  const { watchHistory } = useAuth();

  const [siteAnime, setSiteAnime] = useState<SiteAnime[]>([]);
  const [topAnime, setTopAnime] = useState<JikanAnime[]>([]);
  const [seasonalAnime, setSeasonalAnime] = useState<JikanAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [homeSearchQuery, setHomeSearchQuery] = useState('');

  const handleHomeSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (homeSearchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(homeSearchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  useEffect(() => {
    async function loadHomeData() {
      setIsLoading(true);
      try {
        const [siteData, topData, seasonData] = await Promise.all([
          api.getSiteAnimeList().catch(() => []),
          api.getTopJikanAnime('bypopularity').catch(() => []),
          api.getSeasonalJikanAnime().catch(() => []),
        ]);

        setSiteAnime(siteData);
        setTopAnime(topData);
        setSeasonalAnime(seasonData);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  // Prepare Hero Carousel slides from existing fetched anime data
  const heroSlides = useMemo(() => {
    const featuredSiteAnime = siteAnime.filter((a) => a.local?.featured);
    const regularSiteAnime = siteAnime.filter((a) => !a.local?.featured);
    const topAnimeMapped: SiteAnime[] = topAnime.map((j) => ({ mal_id: j.mal_id, jikan: j }));

    const slides: SiteAnime[] = [];
    const seenMalIds = new Set<number>();

    for (const item of [...featuredSiteAnime, ...regularSiteAnime, ...topAnimeMapped]) {
      if (item && item.mal_id && !seenMalIds.has(item.mal_id)) {
        seenMalIds.add(item.mal_id);
        slides.push(item);
        if (slides.length >= 6) break;
      }
    }
    return slides;
  }, [siteAnime, topAnime]);

  const popularGenreList = [
    { name: 'Action', id: 1, icon: '⚔️', color: 'from-amber-500/20 to-rose-600/20' },
    { name: 'Adventure', id: 2, icon: '🗺️', color: 'from-emerald-500/20 to-teal-600/20' },
    { name: 'Fantasy', id: 10, icon: '🔮', color: 'from-purple-500/20 to-indigo-600/20' },
    { name: 'Sci-Fi', id: 24, icon: '🚀', color: 'from-cyan-500/20 to-blue-600/20' },
    { name: 'Romance', id: 22, icon: '💖', color: 'from-pink-500/20 to-rose-600/20' },
    { name: 'Shounen', id: 27, icon: '⚡', color: 'from-yellow-500/20 to-amber-600/20' },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-96 w-full rounded-3xl bg-slate-900" />
        <div className="h-64 w-full rounded-2xl bg-slate-900/60" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Hero Carousel Section */}
      {heroSlides.length > 0 && <HeroCarousel items={heroSlides} navigate={navigate} />}

      {/* Home Page Search Section */}
      <section className="rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-r from-[#0d0d18] via-[#08080c] to-[#120a14] p-4 sm:p-6 shadow-2xl w-full">
        <form onSubmit={handleHomeSearchSubmit} className="max-w-3xl mx-auto space-y-3 text-center">
          <h2 className="text-lg sm:text-2xl font-black italic tracking-tight text-white uppercase flex items-center justify-center gap-2">
            <Search className="h-5 w-5 text-rose-500" /> Search Anime Catalog
          </h2>
          <p className="text-xs text-slate-400 font-medium">
            Search thousands of anime series, movies, and specials in HD
          </p>

          <div className="relative flex items-center mt-2">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search anime title, character, or keyword (e.g., Solo Leveling, Naruto, Demon Slayer)..."
              value={homeSearchQuery}
              onChange={(e) => setHomeSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/15 bg-white/5 py-3 pl-10 pr-24 sm:pr-32 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:bg-white/10 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-1 flex items-center gap-1 rounded-full bg-rose-600 px-3.5 sm:px-5 py-2 text-[11px] sm:text-xs font-black text-white hover:bg-rose-500 transition-all shadow-md"
            >
              <Search className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>SEARCH</span>
            </button>
          </div>

          {/* Popular Trending Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trending Searches:</span>
            {['Solo Leveling', 'Naruto', 'Demon Slayer', 'One Piece', 'Jujutsu Kaisen', 'Attack on Titan'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => navigate(`/search?q=${encodeURIComponent(tag)}`)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300 hover:border-rose-500 hover:bg-rose-600/20 hover:text-white transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Continue Watching Section */}
      {watchHistory.length > 0 && (
        <section className="rounded-3xl border border-white/5 bg-[#0a0a10] p-6 backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-rose-500" />
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white border-l-4 border-rose-600 pl-3">
                Continue Watching
              </h2>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
            >
              View History →
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {watchHistory.slice(0, 4).map((item) => {
              const matchedSiteAnime = siteAnime.find((a) => a.mal_id === item.anime_mal_id);
              const title =
                matchedSiteAnime?.local?.custom_title ||
                matchedSiteAnime?.jikan?.title ||
                `Anime #${item.anime_mal_id}`;
              const cover =
                matchedSiteAnime?.local?.custom_cover_url ||
                matchedSiteAnime?.jikan?.images?.jpg?.image_url;

              const progressPct =
                item.duration_seconds > 0
                  ? Math.min(100, Math.floor((item.progress_seconds / item.duration_seconds) * 100))
                  : 0;

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(watchPath(item.anime_mal_id, item.episode_number))}
                  className="group relative flex cursor-pointer items-center gap-3 rounded-2xl border border-white/5 bg-[#08080c] p-3 hover:border-rose-600/50 transition-all"
                >
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-black">
                    <img src={cover} alt={title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-rose-600/40 transition-colors">
                      <Play className="h-5 w-5 fill-white text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="truncate text-xs font-bold text-white group-hover:text-rose-400 uppercase">
                      {title}
                    </h4>
                    <p className="text-[11px] font-bold text-rose-400 mt-0.5">
                      Episode {item.episode_number}
                    </p>

                    {/* Progress Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-rose-600 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Site Anime Row */}
      {siteAnime.length > 0 && (
        <AnimeCarousel
          title="Streaming Library"
          subtitle="Anime with episodes available on AniVault"
          items={siteAnime}
          navigate={navigate}
          icon={<Compass className="h-5 w-5 text-rose-500" />}
        />
      )}

      {/* Popular Trending Anime from Jikan */}
      {topAnime.length > 0 && (
        <AnimeCarousel
          title="Most Popular Anime"
          subtitle="Top rated series worldwide"
          items={topAnime.map((j) => ({ mal_id: j.mal_id, jikan: j }))}
          navigate={navigate}
          icon={<Flame className="h-5 w-5 text-rose-500" />}
        />
      )}

      {/* Currently Airing Season */}
      {seasonalAnime.length > 0 && (
        <AnimeCarousel
          title="Current Season Releases"
          subtitle="Airing anime series this season"
          items={seasonalAnime.map((j) => ({ mal_id: j.mal_id, jikan: j }))}
          navigate={navigate}
          icon={<TrendingUp className="h-5 w-5 text-rose-500" />}
        />
      )}

      {/* Explore Genres Banner */}
      <section className="rounded-3xl border border-white/5 bg-[#0a0a10] p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white sm:text-2xl flex items-center gap-2 border-l-4 border-rose-600 pl-3">
              <Sparkles className="h-5 w-5 text-rose-500" /> Explore Popular Genres
            </h2>
            <p className="text-xs text-slate-400 font-medium pl-4 mt-1">Find anime matching your favorite style</p>
          </div>
          <button
            onClick={() => navigate('/genres')}
            className="text-xs font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
          >
            All Genres →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {popularGenreList.map((genre) => (
            <button
              key={genre.name}
              onClick={() => navigate(`/search?genre=${encodeURIComponent(genre.name)}`)}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 text-left shadow-lg hover:scale-105 hover:border-rose-600/50 hover:bg-rose-600/10 transition-all"
            >
              <span className="text-2xl">{genre.icon}</span>
              <span className="text-xs font-bold text-white uppercase tracking-wider">{genre.name}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
