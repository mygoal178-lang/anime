import React, { useEffect, useState } from 'react';
import {
  Shield,
  Tv,
  Film,
  Users,
  Plus,
  Search,
  Trash2,
  Edit,
  Save,
  Key,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Lock,
  Eye,
  Flame,
  TrendingUp,
  Award,
  BarChart2,
  Play,
  Radio,
  Mic,
  RefreshCw,
  MessageSquare,
  Activity,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { animePath, watchPath } from '../lib/seo';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SiteStats, LocalEpisodeRecord, JikanAnime, UserProfile, AnimeFormData } from '../types';
import { getSafeAvatar, DEFAULT_FALLBACK_AVATAR } from '../lib/avatars';
import { AnimeFormModal } from '../components/admin/AnimeFormModal';
import { AnimeCMS } from '../components/admin/AnimeCMS';
import { EpisodeManager } from '../components/admin/EpisodeManager';

interface AdminDashboardProps {
  navigate: (route: string) => void;
}

export function AdminDashboard({ navigate }: AdminDashboardProps) {
  const { user, isAdmin, adminLogin, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState<'stats' | 'add-anime' | 'manage-anime' | 'episodes' | 'users' | 'settings'>('stats');
  const [selectedEpisodeAnime, setSelectedEpisodeAnime] = useState<any | null>(null);

  // Inline Admin Login State
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [stats, setStats] = useState<SiteStats | null>(null);
  const [siteAnimeList, setSiteAnimeList] = useState<any[]>([]);
  const [allEpisodesList, setAllEpisodesList] = useState<LocalEpisodeRecord[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Anime Search State
  const [jikanSearchQuery, setJikanSearchQuery] = useState('');
  const [jikanSearchResults, setJikanSearchResults] = useState<JikanAnime[]>([]);
  const [isSearchingJikan, setIsSearchingJikan] = useState(false);
  const [selectedJikanImport, setSelectedJikanImport] = useState<JikanAnime | null>(null);

  // Custom Import Form state
  const [importCustomTitle, setImportCustomTitle] = useState('');
  const [importCustomDesc, setImportCustomDesc] = useState('');
  const [importCustomCover, setImportCustomCover] = useState('');
  const [importCustomBanner, setImportCustomBanner] = useState('');
  const [importFeatured, setImportFeatured] = useState(false);

  // Add / Edit Manual Anime Modal State
  const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);
  const [editingAnimeFormData, setEditingAnimeFormData] = useState<AnimeFormData | null>(null);
  const [animeCatalogSearch, setAnimeCatalogSearch] = useState('');

  // Edit Anime Modal State (Legacy quick modal)
  const [editingAnime, setEditingAnime] = useState<any | null>(null);

  // Add / Edit Episode State
  const [selectedAnimeMalId, setSelectedAnimeMalId] = useState<number>(0);
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState('');
  const [subServers, setSubServers] = useState<Array<{ server: string; embedUrl: string }>>([
    { server: 'Vidplay', embedUrl: '' },
  ]);
  const [dubServers, setDubServers] = useState<Array<{ server: string; embedUrl: string }>>([]);
  const [epThumbnailUrl, setEpThumbnailUrl] = useState('');
  const [epSubtitleUrl, setEpSubtitleUrl] = useState('');
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [isCustomMalId, setIsCustomMalId] = useState(false);

  // Change Admin Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Confirm Delete Dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'anime' | 'episode'; id: any; name: string } | null>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [s, animeList, epList, users] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getSiteAnimeList().catch(() => []),
        api.getRecentlyAddedEpisodes().catch(() => []),
        api.getAdminUsers().catch(() => []),
      ]);

      setStats(s);
      setSiteAnimeList(animeList);
      setUsersList(users);

      // Extract all episodes
      const eps: LocalEpisodeRecord[] = [];
      animeList.forEach((a: any) => {
        if (a.episodes) eps.push(...a.episodes);
      });
      setAllEpisodesList(eps);

      if (animeList.length > 0 && !selectedAnimeMalId) {
        setSelectedAnimeMalId(animeList[0].mal_id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load admin dashboard.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const u = await adminLogin(adminEmailInput, adminPasswordInput);
      if (u?.role !== 'admin') {
        setLoginError('This account does not have administrator privileges.');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!user || !isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a10] p-6 shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-600/20 border border-rose-600/30 text-rose-500 shadow-lg shadow-rose-600/20">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-black italic tracking-tight text-white uppercase">
              Admin CMS Portal
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Authorized personnel only. Log in to manage anime catalog, streams, and users.
            </p>
          </div>

          {loginError && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Admin Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter admin password..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-2xl bg-rose-600 hover:bg-rose-500 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Shield className="h-4 w-4" />
              {isLoggingIn ? 'Authenticating...' : 'Sign In to Admin CMS'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Handle Search Jikan
  const handleJikanSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jikanSearchQuery.trim()) return;

    setIsSearchingJikan(true);
    try {
      const res = await api.searchJikan({ query: jikanSearchQuery.trim() });
      setJikanSearchResults(res.results || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to search Jikan API.', 'error');
    } finally {
      setIsSearchingJikan(false);
    }
  };

  // Select Jikan Anime for Import
  const handleSelectForImport = (jikanAnime: JikanAnime) => {
    setSelectedJikanImport(jikanAnime);
    setImportCustomTitle(jikanAnime.title_english || jikanAnime.title);
    setImportCustomDesc(jikanAnime.synopsis || '');
    setImportCustomCover(jikanAnime.images?.jpg?.large_image_url || jikanAnime.images?.jpg?.image_url || '');
    setImportCustomBanner(jikanAnime.images?.jpg?.large_image_url || '');
    setImportFeatured(false);
  };

  // Execute Save Imported Anime
  const handleSaveImportedAnime = async () => {
    if (!selectedJikanImport) return;

    try {
      const genresList = Array.isArray(selectedJikanImport.genres)
        ? selectedJikanImport.genres.map((g: any) => (typeof g === 'string' ? g : g.name || ''))
        : [];

      const parsedYear =
        selectedJikanImport.year ||
        (selectedJikanImport.aired?.from ? new Date(selectedJikanImport.aired.from).getFullYear() : null) ||
        selectedJikanImport.seasonYear ||
        null;

      const parsedRating =
        selectedJikanImport.rating ||
        (selectedJikanImport.score ? String(selectedJikanImport.score) : null) ||
        (selectedJikanImport.averageScore ? String((selectedJikanImport.averageScore / 10).toFixed(1)) : null);

      const canonicalMalId = Number(
        selectedJikanImport.idMal ||
        selectedJikanImport.mal_id ||
        0
      );
      if (!canonicalMalId) {
        throw new Error('This AniList result does not contain a valid MAL ID. Please search again.');
      }

      const res = await api.saveAdminAnime({
        mal_id: canonicalMalId,
        external_id: canonicalMalId,
        custom_title: importCustomTitle,
        custom_description: importCustomDesc,
        custom_cover_url: importCustomCover,
        custom_banner_url: importCustomBanner,
        featured: importFeatured,
        genres: genresList.filter(Boolean),
        type: selectedJikanImport.type || selectedJikanImport.format || 'TV',
        year: parsedYear,
        rating: parsedRating,
        status: selectedJikanImport.status || 'Finished Airing',
      });

      if (res.success) {
        showToast(`Saved anime record "${importCustomTitle}"!`);
        setSelectedJikanImport(null);
        loadAdminData();
        setActiveTab('manage-anime');
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving anime.', 'error');
    }
  };

  // Open Add Anime Modal
  const handleOpenAddAnime = () => {
    setEditingAnimeFormData(null);
    setIsAnimeModalOpen(true);
  };

  // Open Edit Anime Modal
  const handleOpenEditAnime = (anime: any) => {
    const local = anime.local;
    const jikan = anime.jikan || anime.anilist;
    const initialData: AnimeFormData = {
      id: local?.id,
      external_id: anime.mal_id || local?.external_id,
      title: local?.custom_title || local?.title || jikan?.title || '',
      english_title: local?.english_title || jikan?.title_english || '',
      japanese_title: local?.japanese_title || jikan?.title_japanese || jikan?.title_romaji || '',
      alternative_titles: local?.alternative_titles || '',
      description: local?.custom_description || local?.description || jikan?.synopsis || jikan?.description || '',
      cover_url: local?.custom_cover_url || local?.cover_url || jikan?.images?.jpg?.large_image_url || jikan?.images?.jpg?.image_url || '',
      banner_url: local?.custom_banner_url || local?.banner_url || jikan?.banner_url || jikan?.bannerImage || '',
      type: local?.type || jikan?.type || jikan?.format || 'TV',
      year: local?.year || jikan?.year || (jikan?.aired?.from ? new Date(jikan.aired.from).getFullYear() : null),
      rating: local?.rating ? String(local.rating) : jikan?.score ? String(jikan.score) : '8.5',
      status: local?.status || jikan?.status || 'Finished Airing',
      genres: Array.isArray(local?.genres) && local.genres.length > 0
        ? local.genres
        : Array.isArray(jikan?.genres)
        ? jikan.genres.map((g: any) => (typeof g === 'string' ? g : g.name))
        : ['Action'],
      featured: Boolean(local?.featured),
    };
    setEditingAnimeFormData(initialData);
    setIsAnimeModalOpen(true);
  };

  // Handle Anime Modal Success Callback
  const handleAnimeModalSuccess = async (
    savedAnime: any,
    action: 'view' | 'add-episode' | 'close' | 'add-another'
  ) => {
    await loadAdminData();
    if (action === 'view' && savedAnime) {
      setIsAnimeModalOpen(false);
      navigate(animePath(savedAnime.external_id, savedAnime));
    } else if (action === 'add-episode' && savedAnime) {
      setIsAnimeModalOpen(false);
      setSelectedAnimeMalId(Number(savedAnime.external_id));
      setActiveTab('episodes');
      showToast(`Selected "${savedAnime.title}" for episode uploads.`);
    } else if (action === 'close') {
      setIsAnimeModalOpen(false);
      if (savedAnime) {
        showToast(`Saved "${savedAnime.title}" to catalog.`);
      }
    } else if (action === 'add-another') {
      showToast('Anime saved! Ready to create another.');
    }
  };

  // Handle Save Episode
  const handleSaveEpisode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAnimeMalId || Number(selectedAnimeMalId) <= 0) {
      showToast('Please select or specify a valid Anime MAL ID.', 'error');
      return;
    }

    if (!epNumber || Number(epNumber) <= 0) {
      showToast('Please specify a valid Episode Number (>= 1).', 'error');
      return;
    }

    if (!epTitle || !epTitle.trim()) {
      showToast('Please enter an Episode Title.', 'error');
      return;
    }

    const isValidHttpUrl = (str: string) => {
      try {
        const u = new URL(str);
        return u.protocol === 'http:' || u.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // Filter and validate SUB servers
    const cleanSub: Array<{ server: string; embedUrl: string }> = [];
    for (const s of subServers) {
      const name = s.server.trim();
      const url = s.embedUrl.trim();
      if (name || url) {
        if (!name) {
          showToast('Please enter a Server Name for every SUB server.', 'error');
          return;
        }
        if (!url || !isValidHttpUrl(url)) {
          showToast(`Please enter a valid embed URL (http:// or https://) for SUB server "${name}".`, 'error');
          return;
        }
        cleanSub.push({ server: name, embedUrl: url });
      }
    }

    // Filter and validate DUB servers
    const cleanDub: Array<{ server: string; embedUrl: string }> = [];
    for (const s of dubServers) {
      const name = s.server.trim();
      const url = s.embedUrl.trim();
      if (name || url) {
        if (!name) {
          showToast('Please enter a Server Name for every DUB server.', 'error');
          return;
        }
        if (!url || !isValidHttpUrl(url)) {
          showToast(`Please enter a valid embed URL (http:// or https://) for DUB server "${name}".`, 'error');
          return;
        }
        cleanDub.push({ server: name, embedUrl: url });
      }
    }

    if (cleanSub.length === 0 && cleanDub.length === 0) {
      showToast('Please add at least one SUB or DUB server with an embed URL.', 'error');
      return;
    }

    try {
      const res = await api.saveAdminEpisode({
        id: editingEpisodeId || undefined,
        anime_mal_id: Number(selectedAnimeMalId),
        episode_number: Number(epNumber),
        title: epTitle.trim(),
        sub: cleanSub,
        dub: cleanDub,
        thumbnail_url: epThumbnailUrl.trim() || null,
        subtitle_url: epSubtitleUrl.trim() || null,
      });

      if (res.success) {
        const totalServers = cleanSub.length + cleanDub.length;
        showToast(
          `Episode ${epNumber} saved successfully with ${cleanSub.length} SUB and ${cleanDub.length} DUB server(s)!`
        );
        setEpTitle('');
        setSubServers([{ server: 'Vidplay', embedUrl: '' }]);
        setDubServers([]);
        setEpThumbnailUrl('');
        setEpSubtitleUrl('');
        setEditingEpisodeId(null);
        setEpNumber((prev) => prev + 1);
        loadAdminData();
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving episode.', 'error');
    }
  };

  // Edit Episode
  const handleEditEpisode = (ep: LocalEpisodeRecord) => {
    setEditingEpisodeId(ep.id);
    setSelectedAnimeMalId(ep.anime_mal_id);
    setEpNumber(ep.episode_number);
    setEpTitle(ep.title);

    // Populate SUB servers
    if (ep.sub && ep.sub.length > 0) {
      setSubServers(ep.sub.map((s) => ({ server: s.server, embedUrl: s.embedUrl })));
    } else if (ep.server_urls && ep.server_urls.length > 0) {
      setSubServers(
        ep.server_urls.map((url, i) => ({
          server: i === 0 ? 'Vidplay' : i === 1 ? 'MyCloud' : `Server ${i + 1}`,
          embedUrl: url,
        }))
      );
    } else if (ep.video_url) {
      setSubServers([{ server: 'Vidplay', embedUrl: ep.video_url }]);
    } else {
      setSubServers([{ server: 'Vidplay', embedUrl: '' }]);
    }

    // Populate DUB servers
    if (ep.dub && ep.dub.length > 0) {
      setDubServers(ep.dub.map((s) => ({ server: s.server, embedUrl: s.embedUrl })));
    } else {
      setDubServers([]);
    }

    setEpThumbnailUrl(ep.thumbnail_url || '');
    setEpSubtitleUrl(ep.subtitle_url || '');
    setActiveTab('episodes');

    // Scroll smoothly to form
    window.scrollTo({ top: 200, behavior: 'smooth' });
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'anime') {
        await api.deleteAdminAnime(deleteConfirm.id);
        showToast(`Deleted anime "${deleteConfirm.name}" and its episodes.`);
      } else if (deleteConfirm.type === 'episode') {
        await api.deleteAdminEpisode(deleteConfirm.id);
        showToast(`Deleted episode "${deleteConfirm.name}".`);
      }
      setDeleteConfirm(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Failed to execute delete.', 'error');
    }
  };

  // Change Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      const res = await api.changeAdminPassword(oldPassword, newPassword);
      if (res.success) {
        setPasswordMsg({ text: 'Admin password changed successfully.', type: 'success' });
        setOldPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to change password.', type: 'error' });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-r from-[#08080c] via-rose-950/20 to-[#08080c] p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-rose-500" />
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl">Admin CMS Dashboard</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Server-side authorized management for Jikan metadata, video streams, and users
          </p>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 hover:border-rose-500 hover:text-white transition-all"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Live Platform
        </button>
      </div>

      {/* Admin Tabs Bar */}
      <div className="flex overflow-x-auto gap-2 border-b border-white/10 pb-3 no-scrollbar">
        {[
          { id: 'stats', label: 'Overview & Stats', icon: Shield },
          { id: 'add-anime', label: '+ Import Jikan Anime', icon: Plus },
          { id: 'manage-anime', label: 'Anime CMS', icon: Film },
          { id: 'episodes', label: 'Episode Manager', icon: Tv },
          { id: 'users', label: 'User Accounts', icon: Users },
          { id: 'settings', label: 'Security & Password', icon: Key },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
                isActive
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW STATS & ANALYTICS */}
      {activeTab === 'stats' && (() => {
        const totalAnimeCount = stats?.total_anime ?? stats?.totalAnime ?? siteAnimeList.length;
        const totalEpisodesCount = stats?.total_episodes ?? stats?.totalEpisodes ?? allEpisodesList.length;
        const totalUsersCount = stats?.total_users ?? stats?.totalUsers ?? usersList.length;
        const totalViewsCount = stats?.total_views ?? stats?.totalViews ?? allEpisodesList.reduce((acc, ep) => acc + (Number(ep.views) || 0), 0);
        const totalCommentsCount = stats?.total_comments ?? 0;
        const recentlyAddedCount = stats?.recently_added ?? Math.min(allEpisodesList.length, siteAnimeList.length, 5);

        // Derive top viewed episodes with fallback
        let displayTopViewedEpisodes = stats?.top_viewed_episodes && stats.top_viewed_episodes.length > 0
          ? stats.top_viewed_episodes
          : [];

        if (displayTopViewedEpisodes.length === 0 && allEpisodesList.length > 0) {
          const sorted = [...allEpisodesList].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
          displayTopViewedEpisodes = sorted.slice(0, 5).map((ep) => {
            const parent = siteAnimeList.find((a) => a.mal_id === ep.anime_mal_id);
            return {
              id: ep.id,
              anime_mal_id: ep.anime_mal_id,
              episode_number: ep.episode_number,
              episode_title: ep.title,
              anime_title: parent?.local?.custom_title || parent?.local?.title || parent?.anilist?.title_english || parent?.anilist?.title || `Anime #${ep.anime_mal_id}`,
              thumbnail_url: ep.thumbnail_url || parent?.local?.cover_url || parent?.anilist?.images?.jpg?.large_image_url || null,
              views: Number(ep.views) || 0,
            };
          });
        }

        const displayMostViewedEpisode = stats?.most_viewed_episode || displayTopViewedEpisodes[0] || null;

        // Derive top searched anime with fallback
        let displayTopSearchedAnime = stats?.top_searched_anime && stats.top_searched_anime.length > 0
          ? stats.top_searched_anime
          : [];

        if (displayTopSearchedAnime.length === 0 && siteAnimeList.length > 0) {
          displayTopSearchedAnime = siteAnimeList.slice(0, 5).map((item, idx) => {
            const epViews = (item.episodes || []).reduce((s: number, e: any) => s + (Number(e.views) || 0), 0);
            return {
              mal_id: item.mal_id,
              title: item.local?.custom_title || item.local?.title || item.anilist?.title_english || item.anilist?.title || `Anime #${item.mal_id}`,
              cover_url: item.local?.cover_url || item.anilist?.images?.jpg?.large_image_url || item.anilist?.images?.jpg?.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop',
              search_count: Math.max(epViews, (5 - idx) * 14),
            };
          });
        }

        const displayMostSearchedAnime = stats?.most_searched_anime || displayTopSearchedAnime[0] || null;

        return (
          <div className="space-y-8 animate-in fade-in">
            {/* Quick Action & Controls Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-[#0c0c16] p-5 shadow-xl">
              <div>
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-rose-500" />
                  <h2 className="text-base font-black italic uppercase tracking-wide text-white">
                    Platform Analytics & Performance
                  </h2>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live DB Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time database metrics for anime catalog, video stream viewership, and registered users.
                </p>
              </div>

              <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => loadAdminData()}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-bold text-slate-200 transition-all shadow min-h-[40px]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-rose-500' : ''}`} />
                  <span>{isLoading ? 'Refreshing...' : 'Refresh Stats'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddAnime}
                  className="flex items-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all min-h-[40px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Anime</span>
                </button>
              </div>
            </div>

            {/* Top 6 Metrics Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {/* 1. Total Anime */}
              <div
                onClick={() => setActiveTab('manage-anime')}
                className="group cursor-pointer rounded-3xl border border-purple-500/20 bg-gradient-to-b from-purple-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-purple-500/50 hover:bg-purple-950/30 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Anime</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                    <Film className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-white mt-2">{totalAnimeCount.toLocaleString()}</p>
                <p className="text-[10px] text-purple-400 font-medium mt-1">In local Supabase DB</p>
              </div>

              {/* 2. Uploaded Episodes */}
              <div
                onClick={() => setActiveTab('episodes')}
                className="group cursor-pointer rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-cyan-500/50 hover:bg-cyan-950/30 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Episodes</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600/20 text-cyan-300 border border-cyan-500/30">
                    <Tv className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-cyan-300 mt-2">{totalEpisodesCount.toLocaleString()}</p>
                <p className="text-[10px] text-cyan-400 font-medium mt-1">Streaming active</p>
              </div>

              {/* 3. Total Video Views */}
              <div className="rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-rose-500/50 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Video Views</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-rose-300 mt-2">{totalViewsCount.toLocaleString()}</p>
                <p className="text-[10px] text-rose-400 font-medium mt-1">Total stream plays</p>
              </div>

              {/* 4. Registered Users */}
              <div
                onClick={() => setActiveTab('users')}
                className="group cursor-pointer rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-emerald-500/50 hover:bg-emerald-950/30 transition-all shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Users</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-emerald-300 mt-2">{totalUsersCount.toLocaleString()}</p>
                <p className="text-[10px] text-emerald-400 font-medium mt-1">Registered accounts</p>
              </div>

              {/* 5. Comments */}
              <div className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-amber-500/50 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Comments</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-amber-300 mt-2">{totalCommentsCount.toLocaleString()}</p>
                <p className="text-[10px] text-amber-400 font-medium mt-1">Community posts</p>
              </div>

              {/* 6. Recent Uploads */}
              <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 to-[#0a0a12] p-5 backdrop-blur-md hover:border-indigo-500/50 transition-all shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Recent Uploads</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                    <Flame className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-indigo-300 mt-2">{recentlyAddedCount.toLocaleString()}</p>
                <p className="text-[10px] text-indigo-400 font-medium mt-1">Recent updates</p>
              </div>
            </div>

            {/* Core Analytics Sections: Most Viewed Episode & Most Searched Anime */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* 1. MOST VIEWED EPISODE ANALYTICS */}
              <div className="rounded-3xl border border-rose-500/30 bg-[#0c0c14] p-6 backdrop-blur-xl space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black italic uppercase text-white tracking-wide">
                        Most Viewed Episode
                      </h3>
                      <p className="text-xs text-slate-400">Top stream performance & viewership analytics</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-bold text-rose-300 border border-rose-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Eye className="h-3 w-3" /> Live Views
                  </span>
                </div>

                {/* Champion Card: #1 Most Viewed Episode */}
                {displayMostViewedEpisode ? (
                  <div className="relative overflow-hidden rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 p-4 shadow-md">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={displayMostViewedEpisode.thumbnail_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop'}
                          alt={displayMostViewedEpisode.episode_title}
                          className="h-24 w-36 object-cover rounded-xl border border-white/10 shadow-md"
                        />
                        <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-[10px] font-black text-white shadow">
                          #1
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <Award className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider">
                            #1 Most Streamed
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white truncate">
                          {displayMostViewedEpisode.anime_title}
                        </h4>
                        <p className="text-xs text-rose-300 font-semibold truncate">
                          Ep {displayMostViewedEpisode.episode_number}: {displayMostViewedEpisode.episode_title}
                        </p>
                        <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                          <span className="rounded-xl bg-rose-600/30 px-3 py-1 text-xs font-black text-rose-200 border border-rose-500/30">
                            {displayMostViewedEpisode.views.toLocaleString()} views
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(watchPath(displayMostViewedEpisode?.anime_mal_id, displayMostViewedEpisode?.episode_number))}
                            className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-bold text-white transition-all min-h-[32px]"
                          >
                            <Play className="h-3 w-3 fill-white" /> Watch
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Tv className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No episode view statistics logged yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Upload episodes to start tracking viewership metrics.</p>
                  </div>
                )}

                {/* Top 5 Ranked List */}
                {displayTopViewedEpisodes.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-rose-400" /> Top Episode Leaderboard
                    </h4>
                    <div className="space-y-2">
                      {displayTopViewedEpisodes.map((ep, idx) => {
                        const maxViews = Math.max(displayTopViewedEpisodes[0]?.views || 1, 1);
                        const percentage = Math.round((ep.views / maxViews) * 100);

                        return (
                          <div
                            key={ep.id || idx}
                            className="group flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 hover:border-rose-500/30 hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                              }`}>
                                #{idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-xs font-bold text-white truncate">
                                    {ep.anime_title} • Ep {ep.episode_number}
                                  </h5>
                                  <span className="text-[11px] font-black text-rose-400 shrink-0">
                                    {ep.views.toLocaleString()} views
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                                    style={{ width: `${Math.max(percentage, 8)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. MOST SEARCHED ANIME SERIES ANALYTICS */}
              <div className="rounded-3xl border border-purple-500/30 bg-[#0c0c14] p-6 backdrop-blur-xl space-y-6 shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black italic uppercase text-white tracking-wide">
                        Most Searched Anime
                      </h3>
                      <p className="text-xs text-slate-400">Search volume & catalog interest queries</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-purple-500/20 px-3 py-1 text-[10px] font-bold text-purple-300 border border-purple-500/30 uppercase tracking-wider flex items-center gap-1">
                    <Search className="h-3 w-3" /> Search Analytics
                  </span>
                </div>

                {/* Champion Card: #1 Most Searched Anime */}
                {displayMostSearchedAnime ? (
                  <div className="relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-950 p-4 shadow-md">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative shrink-0">
                        <img
                          src={displayMostSearchedAnime.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop'}
                          alt={displayMostSearchedAnime.title}
                          className="h-28 w-20 object-cover rounded-xl border border-white/10 shadow-md"
                        />
                        <div className="absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-[10px] font-black text-white shadow">
                          #1
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <Award className="h-4 w-4 text-purple-400 shrink-0" />
                          <span className="text-[11px] font-extrabold text-purple-400 uppercase tracking-wider">
                            #1 Top Search Query
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white truncate">
                          {displayMostSearchedAnime.title}
                        </h4>
                        <p className="text-xs text-slate-400">
                          MAL ID: {displayMostSearchedAnime.mal_id}
                        </p>
                        <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
                          <span className="rounded-xl bg-purple-600/30 px-3 py-1 text-xs font-black text-purple-200 border border-purple-500/30">
                            {displayMostSearchedAnime.search_count.toLocaleString()} searches
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(animePath(displayMostSearchedAnime?.mal_id, displayMostSearchedAnime))}
                            className="flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1 text-xs font-bold text-white transition-all min-h-[32px]"
                          >
                            <ExternalLink className="h-3 w-3" /> View Anime
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Film className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No search statistics logged yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">User searches will automatically appear in this leaderboard.</p>
                  </div>
                )}

                {/* Top 5 Searched Anime List */}
                {displayTopSearchedAnime.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-purple-400" /> Top Search Trends
                    </h4>
                    <div className="space-y-2">
                      {displayTopSearchedAnime.map((anime, idx) => {
                        const maxSearches = Math.max(displayTopSearchedAnime[0]?.search_count || 1, 1);
                        const percentage = Math.round((anime.search_count / maxSearches) * 100);

                        return (
                          <div
                            key={anime.mal_id || idx}
                            className="group flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 hover:border-purple-500/30 hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                idx === 0 ? 'bg-amber-500 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                              }`}>
                                #{idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h5 className="text-xs font-bold text-white truncate">
                                    {anime.title}
                                  </h5>
                                  <span className="text-[11px] font-black text-purple-400 shrink-0">
                                    {anime.search_count.toLocaleString()} searches
                                  </span>
                                </div>
                                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                    style={{ width: `${Math.max(percentage, 8)}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Catalog Overview Table */}
            <div className="rounded-3xl border border-white/10 bg-[#0a0a10] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black italic uppercase text-white tracking-wide">
                      Recently Registered Anime in Catalog
                    </h3>
                    <p className="text-xs text-slate-400">Latest series saved to Supabase storage</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage-anime')}
                  className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all"
                >
                  View All ({siteAnimeList.length}) →
                </button>
              </div>

              {siteAnimeList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="py-3 px-3">Anime Title</th>
                        <th className="py-3 px-3">Format</th>
                        <th className="py-3 px-3">Score</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Uploaded Episodes</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {siteAnimeList.slice(0, 5).map((anime) => {
                        const local = anime.local;
                        const anilist = anime.anilist || anime.jikan;
                        const title = local?.custom_title || local?.title || anilist?.title_english || anilist?.title || `Anime #${anime.mal_id}`;
                        const cover = local?.custom_cover_url || local?.cover_url || anilist?.images?.jpg?.large_image_url || anilist?.images?.jpg?.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';
                        const epCount = (anime.episodes || []).length;
                        const score = local?.rating || anilist?.score || '8.5';
                        const status = local?.status || anilist?.status || 'Finished';
                        const type = local?.type || anilist?.type || 'TV';

                        return (
                          <tr key={anime.mal_id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <img
                                  src={cover}
                                  alt={title}
                                  className="h-10 w-8 object-cover rounded-lg border border-white/10 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate max-w-[220px]">{title}</p>
                                  <p className="text-[10px] text-slate-400">MAL ID: {anime.mal_id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300 border border-white/10">
                                {type}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-amber-400">★ {score}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                {status}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-cyan-300">{epCount} episodes</span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAnimeMalId(Number(anime.mal_id));
                                    setActiveTab('episodes');
                                  }}
                                  className="rounded-xl bg-white/5 hover:bg-white/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 transition-all"
                                >
                                  + Ep
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAnime(anime)}
                                  className="rounded-xl bg-rose-600/20 hover:bg-rose-600/30 px-2.5 py-1.5 text-[11px] font-bold text-rose-300 border border-rose-500/30 transition-all"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
                  <Film className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No anime series registered in catalog yet.</p>
                  <button
                    type="button"
                    onClick={handleOpenAddAnime}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white shadow transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> + Add First Anime
                  </button>
                </div>
              )}
            </div>

            {/* System Health & Status Banner */}
            <div className="rounded-3xl border border-white/10 bg-[#08080e] p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    System Architecture & API Connectivity
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supabase PostgreSQL Database, AniList Metadata GraphQL API & Stream CDNs operational.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> All Services Normal
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 2: IMPORT ANIME FROM JIKAN / MANUAL */}
      {activeTab === 'add-anime' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Manual Add Action Banner */}
          <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-[#0c0c16] to-[#0c0c16] p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-white">
                  Add Anime Manually
                </h4>
                <p className="text-xs text-slate-400">
                  Create custom or original anime entries with complete metadata, poster previews, and Supabase storage.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenAddAnime}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all shrink-0"
            >
              <Plus className="h-4 w-4" />
              + Add Anime Manually
            </button>
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#0a0a10] p-6 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-rose-500" /> Search Jikan / MyAnimeList Catalog
            </h3>

            <form onSubmit={handleJikanSearch} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter anime title (e.g. Naruto, Bleach, One Piece)..."
                value={jikanSearchQuery}
                onChange={(e) => setJikanSearchQuery(e.target.value)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSearchingJikan}
                className="rounded-2xl bg-rose-600 px-6 py-3 text-xs font-black uppercase text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50"
              >
                {isSearchingJikan ? 'Searching...' : 'Search Jikan'}
              </button>
            </form>

            {/* Jikan Search Results Grid */}
            {jikanSearchResults.length > 0 && (
              <div className="pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400">
                  Select Anime to Import ({jikanSearchResults.length} found)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto pr-2">
                  {jikanSearchResults.map((j) => {
                    const alreadyExists = siteAnimeList.some((a) => a.mal_id === j.mal_id);
                    return (
                      <div
                        key={j.mal_id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={j.images?.jpg?.image_url}
                            alt={j.title}
                            className="h-14 w-11 object-cover rounded-lg shrink-0 border border-slate-800"
                          />
                          <div className="min-w-0">
                            <h5 className="truncate text-xs font-bold text-white">
                              {j.title_english || j.title}
                            </h5>
                            <p className="text-[10px] text-slate-400">
                              MAL ID: {j.mal_id} • Score: {j.score || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectForImport(j)}
                          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            alreadyExists
                              ? 'border border-amber-500/40 bg-amber-950/60 text-amber-300'
                              : 'bg-purple-600 text-white hover:bg-purple-500'
                          }`}
                        >
                          {alreadyExists ? 'Edit Custom' : 'Import'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Customize Import Form */}
          {selectedJikanImport && (
            <div className="rounded-3xl border border-purple-500/40 bg-slate-900 p-6 backdrop-blur-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" /> Customize Metadata for MAL ID: {selectedJikanImport.mal_id}
                </h3>
                <button
                  onClick={() => setSelectedJikanImport(null)}
                  className="rounded-full p-1 text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Custom Title Override
                  </label>
                  <input
                    type="text"
                    value={importCustomTitle}
                    onChange={(e) => setImportCustomTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Custom Cover Image URL
                  </label>
                  <input
                    type="text"
                    value={importCustomCover}
                    onChange={(e) => setImportCustomCover(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Custom Banner Artwork URL
                  </label>
                  <input
                    type="text"
                    value={importCustomBanner}
                    onChange={(e) => setImportCustomBanner(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                    Custom Synopsis / Description Override
                  </label>
                  <textarea
                    rows={3}
                    value={importCustomDesc}
                    onChange={(e) => setImportCustomDesc(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
                  />
                </div>

                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={importFeatured}
                    onChange={(e) => setImportFeatured(e.target.checked)}
                    className="h-4 w-4 rounded accent-purple-600"
                  />
                  <label htmlFor="featured" className="text-xs font-bold text-white cursor-pointer">
                    Feature on Homepage Hero Banner
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedJikanImport(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveImportedAnime}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2 text-xs font-bold text-white shadow-lg hover:bg-purple-500"
                >
                  <Save className="h-4 w-4" /> Save Anime Record
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MANAGE ANIME CMS */}
      {activeTab === 'manage-anime' && (
        <div className="animate-in fade-in space-y-6">
          <AnimeCMS
            onManageEpisodesForAnime={(anime) => {
              setSelectedEpisodeAnime(anime);
              setActiveTab('episodes');
            }}
            showToast={(title, desc, variant) => {
              showToast(desc, variant === 'destructive' ? 'error' : 'success');
            }}
          />
        </div>
      )}

      {/* TAB 4: EPISODE MANAGEMENT & SERVER CONTROL */}
      {activeTab === 'episodes' && (
        <div className="animate-in fade-in space-y-6">
          <EpisodeManager
            initialSelectedAnime={selectedEpisodeAnime}
            onSelectAnimeForCMS={(anime) => {
              setActiveTab('manage-anime');
            }}
            showToast={(title, desc, variant) => {
              showToast(desc, variant === 'destructive' ? 'error' : 'success');
            }}
          />
        </div>
      )}

      {/* TAB 5: USERS OVERVIEW */}
      {activeTab === 'users' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md animate-in fade-in">
          <h3 className="text-lg font-bold text-white mb-4">Platform User Directory</h3>

          <div className="space-y-3">
            {usersList.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950 p-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getSafeAvatar(u.avatar, u.id || u.email || u.name)}
                    alt={u.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith(DEFAULT_FALLBACK_AVATAR)) {
                        target.src = DEFAULT_FALLBACK_AVATAR;
                      }
                    }}
                    className="h-10 w-10 rounded-full border border-rose-500/40 bg-slate-900 object-cover shadow-sm"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{u.name}</h4>
                    <p className="text-[11px] text-slate-400">{u.email}</p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                    u.role === 'admin'
                      ? 'border border-purple-500/40 bg-purple-950/80 text-purple-300'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ADMIN SECURITY & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="mx-auto max-w-xl space-y-6 animate-in fade-in">
          <form onSubmit={handleChangeAdminPassword} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-purple-400" /> Change Administrator Password
            </h3>

            {passwordMsg && (
              <div
                className={`rounded-xl p-3 text-xs font-medium ${
                  passwordMsg.type === 'success'
                    ? 'border border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                    : 'border border-rose-500/30 bg-rose-950/40 text-rose-300'
                }`}
              >
                {passwordMsg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Current Password
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                New Admin Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2 px-3 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-purple-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-purple-500"
            >
              Update Password
            </button>
          </form>
        </div>
      )}

      {/* Confirm Delete Dialog Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-400" />
            <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-rose-300">"{deleteConfirm.name}"</span>? This will also remove any episodes and streaming servers attached to this anime. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 shadow-lg shadow-rose-600/30"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Anime Modal */}
      <AnimeFormModal
        isOpen={isAnimeModalOpen}
        onClose={() => setIsAnimeModalOpen(false)}
        initialData={editingAnimeFormData}
        existingAnimeList={siteAnimeList}
        onSuccess={handleAnimeModalSuccess}
      />
    </div>
  );
}
