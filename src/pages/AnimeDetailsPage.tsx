import React, { useEffect, useState, useMemo } from 'react';
import {
  Star,
  Play,
  Heart,
  Film,
  Tv,
  Users,
  ChevronRight,
  X,
  AlertCircle,
  Plus,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AniListAnime, LocalEpisodeRecord } from '../types';
import { setPageSeo, setJsonLd, watchPath, animePath, getAnimeSlugTitle } from '../lib/seo';

interface AnimeDetailsPageProps {
  malId: number;
  navigate: (route: string) => void;
}

export function AnimeDetailsPage({ malId, navigate }: AnimeDetailsPageProps) {
  const { toggleFavorite, isFavorite, isAdmin, watchHistory } = useAuth();

  const [details, setDetails] = useState<{
    local: any;
    anilist?: AniListAnime;
    jikan?: AniListAnime;
    episodes: LocalEpisodeRecord[];
  } | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTrailer, setShowTrailer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Episode range filter & search state for large catalogs
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [det, chars] = await Promise.all([
        api.getAnimeDetails(malId),
        api.getAnimeCharacters(malId).catch(() => []),
      ]);
      setDetails(det);
      setCharacters(chars.slice(0, 12));
    } catch (err: any) {
      setError(err.message || 'Failed to load anime information.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (malId) {
      loadData();
    }
  }, [malId]);

  // Dynamic SEO: title, description, OG, canonical, JSON-LD
useEffect(() => {
  if (!details) return;

  const local = details.local;
  const jikan = details.anilist || details.jikan || ({} as any);

  const title =
    local?.custom_title ||
    jikan.title_english ||
    (typeof jikan.title === 'string'
      ? jikan.title
      : jikan.title?.english ||
        jikan.title?.romaji) ||
    `Anime #${malId}`;

  const synopsisRaw =
    local?.custom_description ||
    jikan.synopsis ||
    jikan.description ||
    '';

  const synopsis = String(synopsisRaw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const cover =
    local?.custom_cover_url ||
    jikan.images?.jpg?.large_image_url ||
    jikan.images?.jpg?.image_url ||
    jikan.coverImage?.extraLarge ||
    jikan.coverImage?.large ||
    null;

  // SEO-friendly anime URL
  const path = animePath(malId, title);
  const canonicalUrl = `https://www.anivault.online${path}`;

  // Page SEO
  setPageSeo({
    title: `${title} - Watch Online | AniVault`,

    description: synopsis
      ? `Watch ${title} online on AniVault. ${synopsis.slice(0, 130)}`
      : `Watch ${title} online on AniVault. Find episodes, information, and more.`,

    image: cover,
    url: path,
    type: 'video.tv_show',
  });

  // Structured data
  setJsonLd({
    '@context': 'https://schema.org',
    '@type': 'TVSeries',

    name: title,

    description:
      synopsis.slice(0, 300) ||
      `Watch ${title} online on AniVault.`,

    image: cover || undefined,

    url: canonicalUrl,

    genre: Array.isArray(jikan.genres)
      ? jikan.genres
          .map((g: any) =>
            typeof g === 'string' ? g : g.name
          )
          .filter(Boolean)
      : undefined,

    aggregateRating: jikan.score
      ? {
          '@type': 'AggregateRating',
          ratingValue: jikan.score,
          bestRating: 10,
          worstRating: 1,
        }
      : undefined,

    numberOfEpisodes:
      jikan.episodes ||
      details.episodes?.length ||
      undefined,
  });

  // Convert /anime/123 to the SEO-friendly URL
  if (typeof window !== 'undefined') {
    const current = window.location.pathname;

    if (
      current === `/anime/${malId}` &&
      path !== current
    ) {
      window.history.replaceState({}, '', path);
    }
  }

  return () => setJsonLd(null);

}, [details, malId]);

  // Extract unique, numerically sorted uploaded episode records from database
  const uploadedEpisodes = useMemo(() => {
    if (!details?.episodes || !Array.isArray(details.episodes)) return [];
    
    // Deduplicate by episode_number to guarantee single button per episode number
    const map = new Map<number, LocalEpisodeRecord>();
    for (const ep of details.episodes) {
      const epNum = Number(ep.episode_number);
      if (!isNaN(epNum)) {
        if (!map.has(epNum)) {
          map.set(epNum, ep);
        } else {
          // Keep newest uploaded record if duplicate exists
          const existing = map.get(epNum)!;
          const exTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
          const curTime = new Date(ep.updated_at || ep.created_at || 0).getTime();
          if (curTime >= exTime) {
            map.set(epNum, ep);
          }
        }
      }
    }

    // Sort strictly in numeric order: 1, 2, 3, 4, ... 10, 11
    return Array.from(map.values()).sort(
      (a, b) => Number(a.episode_number) - Number(b.episode_number)
    );
  }, [details?.episodes]);

  // Find recently watched episode from user history if present
  const lastWatchedRecord = useMemo(() => {
    if (!watchHistory || watchHistory.length === 0) return null;
    return watchHistory.find((h) => Number(h.anime_mal_id) === Number(malId)) || null;
  }, [watchHistory, malId]);

  const lastWatchedEpNum = lastWatchedRecord ? Number(lastWatchedRecord.episode_number) : null;

  // Chunking for large episode counts (100 episodes per tab)
  const CHUNK_SIZE = 100;
  const totalUploaded = uploadedEpisodes.length;
  const chunkCount = Math.max(1, Math.ceil(totalUploaded / CHUNK_SIZE));

  const episodeRanges = useMemo(() => {
    if (totalUploaded <= CHUNK_SIZE) return [];
    const ranges: Array<{ label: string; start: number; end: number }> = [];
    for (let i = 0; i < chunkCount; i++) {
      const startEp = uploadedEpisodes[i * CHUNK_SIZE]?.episode_number || i * CHUNK_SIZE + 1;
      const endIdx = Math.min((i + 1) * CHUNK_SIZE - 1, totalUploaded - 1);
      const endEp = uploadedEpisodes[endIdx]?.episode_number || (i + 1) * CHUNK_SIZE;
      ranges.push({
        label: `${String(startEp).padStart(3, '0')}-${String(endEp).padStart(3, '0')}`,
        start: i * CHUNK_SIZE,
        end: endIdx + 1,
      });
    }
    return ranges;
  }, [uploadedEpisodes, totalUploaded, chunkCount]);

  // Filter episodes by active range and search query
  const displayedEpisodes = useMemo(() => {
    let list = uploadedEpisodes;

    if (episodeSearchQuery.trim()) {
      const queryNum = episodeSearchQuery.trim();
      list = list.filter((ep) => String(ep.episode_number).includes(queryNum));
    } else if (episodeRanges.length > 0) {
      const activeRange = episodeRanges[selectedRangeIndex];
      if (activeRange) {
        list = list.slice(activeRange.start, activeRange.end);
      }
    }

    return list;
  }, [uploadedEpisodes, episodeRanges, selectedRangeIndex, episodeSearchQuery]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-pulse">
        <div className="h-80 w-full rounded-3xl bg-slate-900" />
        <div className="h-40 w-full rounded-2xl bg-slate-900/60" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Anime Not Found</h2>
        <p className="text-slate-400 mb-6">{error || 'Could not locate anime details.'}</p>
        <button
          onClick={() => navigate('/home')}
          className="rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-purple-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const { local } = details;
  const jikan = details.anilist || details.jikan || ({} as any);
  const inWatchlist = isFavorite(malId);

  const title = local?.custom_title || jikan.title_english || jikan.title || `Anime #${malId}`;
  const japaneseTitle = jikan.title_japanese;
  const synopsis = local?.custom_description || jikan.synopsis || 'No description available.';

  const coverUrl =
    local?.custom_cover_url || jikan.images?.jpg?.large_image_url || jikan.images?.jpg?.image_url;
  const bannerUrl = local?.custom_banner_url || coverUrl;

  const score = jikan.score;
  const rank = jikan.rank;
  const popularity = jikan.popularity;
  const duration = jikan.duration;
  const status = jikan.status;
  const genres = jikan.genres || [];

  // Determine starting episode for hero action button
  const startEpisodeNumber =
    lastWatchedEpNum && uploadedEpisodes.some((e) => e.episode_number === lastWatchedEpNum)
      ? lastWatchedEpNum
      : uploadedEpisodes.length > 0
      ? uploadedEpisodes[0].episode_number
      : null;

  return (
    <div className="mx-auto max-w-7xl px-3.5 py-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner Artwork Backdrop */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src={bannerUrl}
            alt={title}
            className="h-full w-full object-cover opacity-30 blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/60" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-6 sm:p-10">
          {/* Cover Poster */}
          <div className="w-52 sm:w-64 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-purple-600/40 shadow-2xl">
            <img src={coverUrl} alt={title} className="h-full w-full object-cover" />
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                <span className="rounded-full bg-purple-600 px-3 py-1 text-xs font-black text-white uppercase tracking-wider">
                  {jikan.type || 'TV'}
                </span>
                {status && (
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                    {status}
                  </span>
                )}
                {score && (
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-slate-900/80 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>Score: {score}</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-black italic uppercase tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
                {title}
              </h1>

              {japaneseTitle && (
                <p className="text-xs text-slate-400 mt-1 font-sans">{japaneseTitle}</p>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 max-w-lg mx-auto md:mx-0">
              {rank && (
                <div className="rounded-xl border border-white/10 bg-[#08080c] p-2.5 text-center">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Rank</span>
                  <span className="text-sm font-black text-white">#{rank}</span>
                </div>
              )}
              {popularity && (
                <div className="rounded-xl border border-white/10 bg-[#08080c] p-2.5 text-center">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Popularity</span>
                  <span className="text-sm font-black text-purple-400">#{popularity}</span>
                </div>
              )}
              {jikan.year && (
                <div className="rounded-xl border border-white/10 bg-[#08080c] p-2.5 text-center">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Season</span>
                  <span className="text-sm font-bold text-purple-300">
                    {jikan.season} {jikan.year}
                  </span>
                </div>
              )}
              {duration && (
                <div className="rounded-xl border border-white/10 bg-[#08080c] p-2.5 text-center">
                  <span className="block text-[10px] font-bold uppercase text-slate-400">Duration</span>
                  <span className="text-xs font-bold text-slate-200 truncate">{duration}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              {genres.map((g: any) => (
                <span
                  key={g.name || g.mal_id}
                  onClick={() => navigate(`/search?genre=${encodeURIComponent(g.name || g)}`)}
                  className="cursor-pointer rounded-full border border-purple-600/30 bg-purple-950/40 px-3 py-1 text-xs font-bold text-purple-200 hover:border-purple-500 hover:text-white transition-colors uppercase tracking-wider"
                >
                  {g.name || g}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <p className="text-sm text-slate-300 leading-relaxed text-left max-w-3xl">
              {synopsis}
            </p>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
              {startEpisodeNumber !== null ? (
                <button
                  id="start-watching-btn"
                  onClick={() => navigate(watchPath(malId, startEpisodeNumber, title))}
                  className="flex items-center gap-2.5 rounded-full bg-purple-600 hover:bg-purple-700 px-6 py-3.5 text-xs font-black text-white shadow-xl shadow-purple-600/30 hover:scale-105 transition-all uppercase tracking-wider"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>
                    {lastWatchedEpNum === startEpisodeNumber
                      ? `CONTINUE WATCHING EP ${startEpisodeNumber}`
                      : `START WATCHING EP ${startEpisodeNumber}`}
                  </span>
                </button>
              ) : (
                <div className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  No Episodes Available Yet
                </div>
              )}

              <button
                id="watchlist-toggle-btn"
                onClick={() => toggleFavorite(malId)}
                className={`flex items-center gap-2 rounded-full border px-5 py-3.5 text-xs font-black transition-all uppercase tracking-wider ${
                  inWatchlist
                    ? 'border-purple-600 bg-purple-600 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-purple-500'
                }`}
              >
                <Heart className={`h-4 w-4 ${inWatchlist ? 'fill-white' : ''}`} />
                <span>{inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}</span>
              </button>

              {jikan.trailer?.embed_url && (
                <button
                  id="trailer-btn"
                  onClick={() => setShowTrailer(true)}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-xs font-bold text-slate-200 hover:border-purple-500 uppercase tracking-wider"
                >
                  <Film className="h-4 w-4 text-purple-400" />
                  <span>Trailer</span>
                </button>
              )}

              {isAdmin && (
                <button
                  id="manage-admin-btn"
                  onClick={() => navigate(`/admin`)}
                  className="flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-950/60 px-5 py-3.5 text-xs font-black text-purple-300 hover:bg-purple-900/80 uppercase tracking-wider"
                >
                  <Plus className="h-4 w-4" />
                  <span>Upload / Manage in Admin</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EPISODES SECTION - STRICTLY DISPLAYING UPLOADED EPISODE NUMBERS ONLY     */}
      {/* (NO VIDEO PLAYER, NO VIDEO FORMATS, NO STREAM SERVERS ON DETAILS PAGE)   */}
      {/* ========================================================================= */}
      <section
        id="anime-episodes-section"
        className="rounded-3xl border border-white/5 bg-[#0a0a10] p-4 sm:p-7 md:p-8 backdrop-blur-md shadow-xl"
      >
        {/* Section Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                <Tv className="h-4 w-4" />
              </div>
              <h2 className="text-xl font-black italic uppercase tracking-tight text-white sm:text-2xl">
                Episodes
              </h2>
              <span className="rounded-full bg-purple-950/80 border border-purple-600/40 px-2.5 py-0.5 text-xs font-bold text-purple-300">
                {uploadedEpisodes.length} {uploadedEpisodes.length === 1 ? 'Episode' : 'Episodes'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Select an episode number to start watching on AniVault.
            </p>
          </div>

          {/* Episode Filter Controls (if uploaded episodes exist) */}
          {uploadedEpisodes.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Jump / Search Number */}
              <div className="relative flex items-center">
                <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Find Ep #"
                  value={episodeSearchQuery}
                  onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                  className="h-8 w-28 sm:w-32 rounded-lg border border-white/10 bg-[#08080c] pl-8 pr-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                />
                {episodeSearchQuery && (
                  <button
                    onClick={() => setEpisodeSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Range Selectors if large count */}
              {episodeRanges.length > 1 && !episodeSearchQuery && (
                <div className="flex flex-wrap gap-1.5">
                  {episodeRanges.map((range, idx) => (
                    <button
                      key={range.label}
                      onClick={() => setSelectedRangeIndex(idx)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                        selectedRangeIndex === idx
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                          : 'border border-white/10 bg-[#08080c] text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* EPISODE CONTENT DISPLAY */}
        {uploadedEpisodes.length === 0 ? (
          /* NO UPLOADED EPISODES EMPTY STATE */
          <div
            id="no-episodes-placeholder"
            className="rounded-2xl border border-dashed border-white/10 bg-[#08080c] p-8 sm:p-12 text-center"
          >
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-950/40 border border-purple-500/20 text-purple-400">
              <Tv className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-white uppercase tracking-wide">
              No episodes available yet.
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              This anime exists in the catalog, but no episodes have been uploaded to the database yet.
            </p>
            {isAdmin && (
              <button
                id="empty-admin-upload-btn"
                onClick={() => navigate('/admin')}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-700 uppercase tracking-wider shadow-lg shadow-purple-600/20"
              >
                <Plus className="h-4 w-4" />
                <span>Upload Episode in Admin Panel</span>
              </button>
            )}
          </div>
        ) : displayedEpisodes.length === 0 ? (
          /* Search Filter Empty State */
          <div className="rounded-2xl border border-white/5 bg-[#08080c] p-8 text-center">
            <p className="text-xs text-slate-400">
              No uploaded episode found matching &quot;{episodeSearchQuery}&quot;.
            </p>
            <button
              onClick={() => setEpisodeSearchQuery('')}
              className="mt-2 text-xs font-bold text-purple-400 hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          /* CLEAN RESPONSIVE EPISODE NUMBER BUTTON GRID */
          <div
            id="episodes-grid"
            className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 sm:gap-2.5"
          >
            {displayedEpisodes.map((ep) => {
              const epNum = ep.episode_number;
              const isLastWatched = lastWatchedEpNum === epNum;

              return (
                <button
                  key={epNum}
                  id={`episode-number-btn-${epNum}`}
                  onClick={() => navigate(watchPath(malId, epNum, title))}
                  title={`Watch Episode ${epNum}`}
                  className={`group relative flex min-h-[44px] sm:min-h-[46px] items-center justify-center rounded-xl text-xs sm:text-sm font-black transition-all active:scale-95 focus:outline-none ${
                    isLastWatched
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/80 ring-offset-2 ring-offset-[#0a0a10]'
                      : 'bg-[#12121e] hover:bg-purple-600 text-slate-200 hover:text-white border border-white/10 hover:border-purple-500 hover:shadow-md hover:shadow-purple-600/20'
                  }`}
                >
                  <span className="tracking-tight">{epNum}</span>
                  
                  {isLastWatched && (
                    <span
                      title="Last Watched"
                      className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-black text-black ring-2 ring-[#0a0a10]"
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* CHARACTERS SECTION */}
      {characters.length > 0 && (
        <section className="rounded-3xl border border-white/5 bg-[#0a0a10] p-6 sm:p-8 backdrop-blur-md">
          <div className="mb-6">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2 border-l-4 border-purple-600 pl-3">
              <Users className="h-5 w-5 text-purple-400" /> Anime Characters & Cast
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {characters.map((item, idx) => {
              const char = item.character;
              return (
                <div
                  key={char.mal_id || idx}
                  className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#08080c] p-2.5"
                >
                  <img
                    src={char.images?.jpg?.image_url}
                    alt={char.name}
                    className="h-12 w-12 rounded-xl object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <h4 className="truncate text-xs font-bold text-white">{char.name}</h4>
                    <p className="text-[10px] text-purple-400 font-bold truncate">{item.role}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Trailer Modal */}
      {showTrailer && jikan.trailer?.embed_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="font-bold text-white">{title} - Official Trailer</h3>
              <button
                onClick={() => setShowTrailer(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`${jikan.trailer.embed_url}?autoplay=1`}
                title={`${title} Trailer`}
                className="h-full w-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

