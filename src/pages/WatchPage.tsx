import React, { useEffect, useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Home,
  Tv,
} from 'lucide-react';
import { VideoPlayer, checkIsIframeEmbed } from '../components/VideoPlayer';
import { WatchControlsBar } from '../components/watch/WatchControlsBar';
import { ServerSelector } from '../components/watch/ServerSelector';
import { EpisodeListSection } from '../components/watch/EpisodeListSection';
import { AnimeInfoSection } from '../components/watch/AnimeInfoSection';
import { ShareSection } from '../components/watch/ShareSection';
import { CommentsSection } from '../components/watch/CommentsSection';
import { WatchSidebar } from '../components/watch/WatchSidebar';
import { ReportModal } from '../components/watch/ReportModal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LocalEpisodeRecord, AniListAnime } from '../types';
import { setPageSeo, setJsonLd, watchPath, animePath } from '../lib/seo';

interface WatchPageProps {
  malId: number;
  epNum: number;
  navigate: (route: string) => void;
}

export function WatchPage({ malId, epNum, navigate }: WatchPageProps) {
  const { toggleFavorite, isFavorite, showToast } = useAuth();

  const [data, setData] = useState<{
    episode: LocalEpisodeRecord;
    allEpisodes: LocalEpisodeRecord[];
    localAnime: any;
    anilist?: AniListAnime;
    jikan?: AniListAnime;
    hasPrev: boolean;
    hasNext: boolean;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Player Options & State
  const [autoPlay, setAutoPlay] = useState(() => {
    const val = localStorage.getItem('anivault_autoplay') ?? localStorage.getItem('anistream_autoplay');
    return val !== 'false';
  });
  const [autoNext, setAutoNext] = useState(() => {
    const val = localStorage.getItem('anivault_autonext') ?? localStorage.getItem('anistream_autonext');
    return val !== 'false';
  });
  const [autoSkip, setAutoSkip] = useState(() => {
    const val = localStorage.getItem('anivault_autoskip') ?? localStorage.getItem('anistream_autoskip');
    return val === 'true';
  });
  const [lightsOff, setLightsOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeServerId, setActiveServerId] = useState('server-1');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Sync player preferences to localStorage
  useEffect(() => {
    localStorage.setItem('anivault_autoplay', String(autoPlay));
    localStorage.setItem('anistream_autoplay', String(autoPlay));
  }, [autoPlay]);

  useEffect(() => {
    localStorage.setItem('anivault_autonext', String(autoNext));
    localStorage.setItem('anistream_autonext', String(autoNext));
  }, [autoNext]);

  useEffect(() => {
    localStorage.setItem('anivault_autoskip', String(autoSkip));
    localStorage.setItem('anistream_autoskip', String(autoSkip));
  }, [autoSkip]);

  // Fetch episode details
  useEffect(() => {
    let isMounted = true;
    async function loadEpisodeData() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getEpisodeDetails(malId, epNum);
        if (isMounted) {
          setData(res);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Episode not available.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (malId && epNum) {
      loadEpisodeData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return () => {
      isMounted = false;
    };
  }, [malId, epNum]);

  // Dynamic SEO for watch page
  useEffect(() => {
    if (!data) return;
    const localAnime = data.localAnime;
    const animeMeta = data.anilist || data.jikan;
    const animeTitle =
      localAnime?.custom_title ||
      animeMeta?.title_english ||
      (typeof animeMeta?.title === 'string' ? animeMeta.title : animeMeta?.title?.english || animeMeta?.title?.romaji) ||
      'Anime';
    const epTitle = data.episode?.title ? ` — ${data.episode.title}` : '';
    const cover =
      localAnime?.custom_cover_url ||
      animeMeta?.images?.jpg?.large_image_url ||
      animeMeta?.images?.jpg?.image_url ||
      animeMeta?.coverImage?.extraLarge ||
      null;
    const path = watchPath(malId, epNum, animeTitle);
    setPageSeo({
      title: `Watch ${animeTitle} Episode ${epNum}${epTitle}`,
      description: `Watch ${animeTitle} Episode ${epNum} free online in HD on AniVault. English subtitles and dub available.`,
      image: cover,
      url: path,
      type: 'video.episode',
    });
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'TVEpisode',
      name: `${animeTitle} Episode ${epNum}`,
      episodeNumber: epNum,
      partOfSeries: {
        '@type': 'TVSeries',
        name: animeTitle,
      },
      url: `https://anivault-pi.vercel.app${path}`,
      image: cover || undefined,
    });
    if (typeof window !== 'undefined') {
      const current = window.location.pathname;
      const pure = `/watch/${malId}/${epNum}`;
      if ((current === pure || current === `/watch/${malId}/${epNum}`) && path !== current) {
        window.history.replaceState({}, '', path);
      }
    }
    return () => setJsonLd(null);
  }, [data, malId, epNum]);

  // Assemble server options (strictly from database episode.sub and episode.dub)
  const serverOptions = useMemo(() => {
    if (!data?.episode) return [];
    const ep = data.episode;
    const list: Array<{
      id: string;
      name: string;
      category: 'SUB' | 'DUB';
      url: string;
      isEmbed?: boolean;
    }> = [];

    const hasExplicitSub = Array.isArray(ep.sub) && ep.sub.length > 0;
    const hasExplicitDub = Array.isArray(ep.dub) && ep.dub.length > 0;

    if (hasExplicitSub || hasExplicitDub) {
      if (hasExplicitSub) {
        ep.sub.forEach((s, idx) => {
          if (s?.embedUrl && s.embedUrl.trim()) {
            list.push({
              id: `sub-${idx}-${s.server || `Server ${idx + 1}`}`,
              name: s.server || `Server ${idx + 1}`,
              category: 'SUB',
              url: s.embedUrl.trim(),
              isEmbed: checkIsIframeEmbed(s.embedUrl.trim()),
            });
          }
        });
      }

      if (hasExplicitDub) {
        ep.dub.forEach((s, idx) => {
          if (s?.embedUrl && s.embedUrl.trim()) {
            list.push({
              id: `dub-${idx}-${s.server || `Server ${idx + 1}`}`,
              name: s.server || `Server ${idx + 1}`,
              category: 'DUB',
              url: s.embedUrl.trim(),
              isEmbed: checkIsIframeEmbed(s.embedUrl.trim()),
            });
          }
        });
      }
    } else {
      // Direct servers fallback from episode record
      const rawList: string[] = [];
      if (ep.server_urls && Array.isArray(ep.server_urls)) {
        ep.server_urls.forEach((s) => {
          if (s && typeof s === 'string' && s.trim() && !rawList.includes(s.trim())) {
            rawList.push(s.trim());
          }
        });
      }
      if (ep.video_url && !rawList.includes(ep.video_url.trim())) {
        rawList.unshift(ep.video_url.trim());
      }

      rawList.forEach((url, idx) => {
        list.push({
          id: `server-${idx}`,
          name: `Server ${idx + 1}`,
          category: 'SUB',
          url,
          isEmbed: checkIsIframeEmbed(url),
        });
      });
    }

    return list;
  }, [data?.episode]);

  // Keep activeServerId in sync with available options
  useEffect(() => {
    if (serverOptions.length > 0) {
      const exists = serverOptions.some((s) => s.id === activeServerId);
      if (!exists) {
        setActiveServerId(serverOptions[0].id);
      }
    } else {
      setActiveServerId('');
    }
  }, [serverOptions, activeServerId]);

  // Active server index
  const activeServerIndex = useMemo(() => {
    const idx = serverOptions.findIndex((s) => s.id === activeServerId);
    return idx >= 0 ? idx : 0;
  }, [serverOptions, activeServerId]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-6 space-y-6 animate-pulse">
        <div className="h-6 w-48 rounded-lg bg-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            <div className="aspect-video w-full rounded-2xl bg-white/5" />
            <div className="h-12 w-full rounded-xl bg-white/5" />
            <div className="h-20 w-full rounded-xl bg-white/5" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-96 w-full rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Episode Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'This episode is not currently published.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(`/anime/${malId}`)}
            className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500"
          >
            Anime Details
          </button>
          <button
            onClick={() => navigate('/home')}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/10"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const { episode, allEpisodes, localAnime, hasPrev, hasNext } = data;
  const animeMeta = data.anilist || data.jikan;
  const animeTitle =
    localAnime?.custom_title ||
    animeMeta?.title_english ||
    (typeof animeMeta?.title === 'string'
      ? animeMeta.title
      : animeMeta?.title?.english ||
        animeMeta?.title?.romaji ||
        animeMeta?.title?.userPreferred) ||
    localAnime?.title ||
    'Anime';
  const isWatchlisted = isFavorite(malId);
  const currentServerObj = serverOptions[activeServerIndex] || serverOptions[0];

  return (
    <div id="anivault-watch-page" className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
          <span>/</span>
          <button
            onClick={() => navigate(animePath(malId, animeTitle))}
            className="text-slate-300 hover:text-purple-400 font-semibold truncate transition-colors max-w-[200px] sm:max-w-md"
          >
            {animeTitle}
          </button>
          <span>/</span>
          <span className="text-purple-400 font-bold shrink-0">Episode {epNum}</span>
        </div>

        <button
          onClick={() => navigate(animePath(malId, animeTitle))}
          className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300 hover:border-purple-500 hover:bg-purple-600/20 hover:text-purple-300 transition-colors shrink-0"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Anime Page</span>
        </button>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* LEFT COLUMN: Video Player, Controls, Servers, Episode List, Anime Info, Share, Comments */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Video Player Container */}
          <VideoPlayer
            videoUrl={currentServerObj?.url || episode.video_url || ''}
            serverUrls={serverOptions.map((s) => s.url)}
            title={episode.title}
            animeTitle={animeTitle}
            animeMalId={malId}
            episodeNumber={epNum}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={() => navigate(watchPath(malId, epNum - 1, animeTitle))}
            onNext={() => navigate(watchPath(malId, epNum + 1, animeTitle))}
            posterUrl={episode.thumbnail_url}
            subtitleUrl={episode.subtitle_url}
            autoPlay={autoPlay}
            autoNext={autoNext}
            autoSkip={autoSkip}
            lightsOff={lightsOff}
            activeServerIndex={activeServerIndex}
            onServerIndexChange={(idx) => {
              const srv = serverOptions[idx];
              if (srv) setActiveServerId(srv.id);
            }}
            onFullscreenChange={setIsFullscreen}
          />

          {/* 2. Action Controls Bar directly under video */}
          <WatchControlsBar
            autoPlay={autoPlay}
            setAutoPlay={setAutoPlay}
            autoNext={autoNext}
            setAutoNext={setAutoNext}
            autoSkip={autoSkip}
            setAutoSkip={setAutoSkip}
            lightsOff={lightsOff}
            setLightsOff={setLightsOff}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => {
              const videoElem = document.getElementById('anivault-video-container');
              if (videoElem) {
                if (!document.fullscreenElement) {
                  videoElem.requestFullscreen().catch(console.error);
                } else {
                  document.exitFullscreen().catch(console.error);
                }
              }
            }}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPrev={() => navigate(watchPath(malId, epNum - 1, animeTitle))}
            onNext={() => navigate(watchPath(malId, epNum + 1, animeTitle))}
            onOpenReport={() => setIsReportOpen(true)}
            isWatchlisted={isWatchlisted}
            onToggleWatchlist={() => toggleFavorite(malId)}
          />

          {/* 3. Server Selector Box */}
          <ServerSelector
            episodeNumber={epNum}
            servers={serverOptions}
            activeServerId={activeServerId}
            onSelectServer={(srv) => {
              setActiveServerId(srv.id);
              showToast(`Switched to ${srv.name}`);
            }}
          />

          {/* 4. Episode Navigation & List Section */}
          <EpisodeListSection
            animeMalId={malId}
            currentEpNum={epNum}
            episodes={allEpisodes}
            onSelectEpisode={(targetEp) => navigate(watchPath(malId, targetEp, animeTitle))}
          />

          {/* 5. Anime Information Section */}
          <AnimeInfoSection
            animeMeta={animeMeta}
            localAnime={localAnime}
            totalEpisodes={allEpisodes.length}
            navigate={navigate}
          />

          {/* 6. Social Share Section */}
          <ShareSection animeTitle={animeTitle} episodeNumber={epNum} />

          {/* 7. Comments & Community Section */}
          <CommentsSection
            animeMalId={malId}
            currentEpNum={epNum}
            animeTitle={animeTitle}
          />

          {/* On Mobile Only: Recommended / Trending appears below main content */}
          <div className="block lg:hidden pt-2">
            <WatchSidebar currentMalId={malId} navigate={navigate} />
          </div>
        </div>

        {/* RIGHT COLUMN (Desktop 20-25%): Recommended & Trending Anime Sidebar */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20">
          <WatchSidebar currentMalId={malId} navigate={navigate} />
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        animeTitle={animeTitle}
        episodeNumber={epNum}
        currentServerName={currentServerObj?.name || 'Server 1'}
      />
    </div>
  );
}
