import React, { useState, useEffect } from 'react';
import {
  Search,
  Tv,
  Film,
  Plus,
  Edit,
  Trash2,
  Radio,
  Mic,
  Save,
  X,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  ArrowLeft,
  Calendar,
  Clock,
  Eye,
  RefreshCw,
  Image,
  ImageOff,
  FileText,
  Check,
  Minus,
} from 'lucide-react';
import { api } from '../../services/api';
import { QuickAddEpisodeModal } from './QuickAddEpisodeModal';
import { AnikotoImportModal } from './AnikotoImportModal';

interface EpisodeManagerProps {
  initialSelectedAnime?: any | null;
  onSelectAnimeForCMS?: (anime: any) => void;
  showToast: (title: string, desc: string, variant?: 'default' | 'destructive') => void;
}

interface ServerItem {
  id: string;
  episode_id: string;
  server_name: string;
  server?: string;
  embed_url: string;
  embedUrl?: string;
  language: 'sub' | 'dub';
  created_at?: string;
}

interface EpisodeItem {
  id: string;
  anime_id: string;
  anime_mal_id: number;
  episode_number: number;
  title: string;
  thumbnail_url?: string | null;
  subtitle_url?: string | null;
  sub_count?: number;
  dub_count?: number;
  sub?: ServerItem[];
  dub?: ServerItem[];
  created_at?: string;
  updated_at?: string;
}

export function EpisodeManager({
  initialSelectedAnime = null,
  onSelectAnimeForCMS,
  showToast,
}: EpisodeManagerProps) {
  // Search Anime State
  const [animeQuery, setAnimeQuery] = useState('');
  const [isSearchingAnime, setIsSearchingAnime] = useState(false);
  const [animeResults, setAnimeResults] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Selected Anime State
  const [selectedAnime, setSelectedAnime] = useState<any | null>(initialSelectedAnime);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState(false);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState('');

  // Modals & Editors State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAnikotoImportOpen, setIsAnikotoImportOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<EpisodeItem | null>(null);

  // Active Episode Server Editor State
  const [epNumberInput, setEpNumberInput] = useState<number>(1);
  const [epTitleInput, setEpTitleInput] = useState('');
  const [epThumbnailInput, setEpThumbnailInput] = useState('');
  const [epSubtitleInput, setEpSubtitleInput] = useState('');
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false);
  const [isSavingEpMeta, setIsSavingEpMeta] = useState(false);

  // Server Adding Form State (SUB)
  const [newSubName, setNewSubName] = useState('');
  const [newSubUrl, setNewSubUrl] = useState('');
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Server Adding Form State (DUB)
  const [newDubName, setNewDubName] = useState('');
  const [newDubUrl, setNewDubUrl] = useState('');
  const [isAddingDub, setIsAddingDub] = useState(false);

  // Server Editing State
  const [savingServerId, setSavingServerId] = useState<string | null>(null);
  const [serverEditMap, setServerEditMap] = useState<
    Record<string, { server_name: string; embed_url: string }>
  >({});

  // Confirmation Modals
  const [deleteServerConfirm, setDeleteServerConfirm] = useState<{
    server: ServerItem;
    episode: EpisodeItem;
  } | null>(null);
  const [deleteEpisodeConfirm, setDeleteEpisodeConfirm] = useState<EpisodeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Initial Load / Prop updates
  useEffect(() => {
    if (initialSelectedAnime) {
      setSelectedAnime(initialSelectedAnime);
      loadEpisodesForAnime(initialSelectedAnime);
    } else {
      // Load recent anime list on mount
      handleSearchAnime('');
    }
  }, [initialSelectedAnime]);

  // Database-side search for anime
  const handleSearchAnime = async (queryText: string) => {
    setIsSearchingAnime(true);
    try {
      const results = await api.searchAdminAnime(queryText);
      setAnimeResults(results || []);
      setHasSearched(true);
    } catch (err: any) {
      showToast('Search Failed', err.message || 'Failed to search anime in database.', 'destructive');
    } finally {
      setIsSearchingAnime(false);
    }
  };

  // Debounce search anime
  useEffect(() => {
    if (!selectedAnime) {
      const timer = setTimeout(() => {
        handleSearchAnime(animeQuery);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [animeQuery, selectedAnime]);

  // Load episodes and servers for selected anime
  const loadEpisodesForAnime = async (anime: any) => {
    setIsLoadingEpisodes(true);
    try {
      const res = await api.getAdminAnimeWithEpisodes(anime.id || anime.external_id);
      setSelectedAnime(res.anime || anime);
      setEpisodes(res.episodes || []);
    } catch (err: any) {
      showToast('Failed to Load Episodes', err.message || 'Could not fetch episodes.', 'destructive');
    } finally {
      setIsLoadingEpisodes(false);
    }
  };

  // Select Anime Handler
  const handleSelectAnime = (anime: any) => {
    setSelectedAnime(anime);
    setEpisodeSearchQuery('');
    setEditingEpisode(null);
    loadEpisodesForAnime(anime);
  };

  // Open Edit Episode & Server Manager
  const handleOpenEpisodeEditor = (ep: EpisodeItem) => {
    setEditingEpisode(ep);
    setEpNumberInput(ep.episode_number);
    setEpTitleInput(ep.title);
    setEpThumbnailInput(ep.thumbnail_url || '');
    setThumbnailLoadError(false);
    setEpSubtitleInput(ep.subtitle_url || '');
    setNewSubName('');
    setNewSubUrl('');
    setNewDubName('');
    setNewDubUrl('');

    // Pre-populate server edit states
    const editState: Record<string, { server_name: string; embed_url: string }> = {};
    (ep.sub || []).forEach((s) => {
      editState[s.id] = {
        server_name: s.server_name || s.server || 'Server',
        embed_url: s.embed_url || s.embedUrl || '',
      };
    });
    (ep.dub || []).forEach((s) => {
      editState[s.id] = {
        server_name: s.server_name || s.server || 'Server',
        embed_url: s.embed_url || s.embedUrl || '',
      };
    });
    setServerEditMap(editState);
  };

  // Save Episode Title & Metadata
  const handleSaveEpisodeMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode) return;

    setIsSavingEpMeta(true);
    try {
      const res = await api.updateAdminEpisode(editingEpisode.id, {
        episode_number: Number(epNumberInput),
        title: epTitleInput.trim(),
        thumbnail_url: epThumbnailInput.trim() || null,
        subtitle_url: epSubtitleInput.trim() || null,
      });

      showToast('Episode Updated', `Episode ${epNumberInput} updated successfully.`);
      
      // Update local state
      setEditingEpisode((prev) =>
        prev
          ? {
              ...prev,
              episode_number: Number(epNumberInput),
              title: epTitleInput.trim(),
              thumbnail_url: epThumbnailInput.trim() || null,
              subtitle_url: epSubtitleInput.trim() || null,
            }
          : null
      );

      // Refresh list
      if (selectedAnime) {
        loadEpisodesForAnime(selectedAnime);
      }
    } catch (err: any) {
      showToast('Failed to Save Episode', err.message || 'Could not update episode.', 'destructive');
    } finally {
      setIsSavingEpMeta(false);
    }
  };

  // Add individual SUB server
  const handleAddSubServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode || !newSubName.trim() || !newSubUrl.trim()) {
      showToast('Missing Fields', 'Please enter server name and embed URL.', 'destructive');
      return;
    }

    setIsAddingSub(true);
    try {
      const res = await api.addAdminServer(editingEpisode.id, {
        language: 'sub',
        server_name: newSubName.trim(),
        embed_url: newSubUrl.trim(),
      });

      const newServer: ServerItem = res.server;
      showToast('Server Added', `SUB server "${newServer.server_name}" added.`);

      // Reset form
      setNewSubName('');
      setNewSubUrl('');

      // Update editing episode local state
      setEditingEpisode((prev) => {
        if (!prev) return null;
        const nextSub = [...(prev.sub || []), newServer];
        return {
          ...prev,
          sub: nextSub,
          sub_count: nextSub.length,
        };
      });

      // Add to serverEditMap
      setServerEditMap((prev) => ({
        ...prev,
        [newServer.id]: {
          server_name: newServer.server_name,
          embed_url: newServer.embed_url,
        },
      }));

      // Refresh episode list in background
      if (selectedAnime) loadEpisodesForAnime(selectedAnime);
    } catch (err: any) {
      showToast('Failed to Add Server', err.message || 'Could not add server.', 'destructive');
    } finally {
      setIsAddingSub(false);
    }
  };

  // Add individual DUB server
  const handleAddDubServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEpisode || !newDubName.trim() || !newDubUrl.trim()) {
      showToast('Missing Fields', 'Please enter server name and embed URL.', 'destructive');
      return;
    }

    setIsAddingDub(true);
    try {
      const res = await api.addAdminServer(editingEpisode.id, {
        language: 'dub',
        server_name: newDubName.trim(),
        embed_url: newDubUrl.trim(),
      });

      const newServer: ServerItem = res.server;
      showToast('Server Added', `DUB server "${newServer.server_name}" added.`);

      // Reset form
      setNewDubName('');
      setNewDubUrl('');

      // Update editing episode local state
      setEditingEpisode((prev) => {
        if (!prev) return null;
        const nextDub = [...(prev.dub || []), newServer];
        return {
          ...prev,
          dub: nextDub,
          dub_count: nextDub.length,
        };
      });

      // Add to serverEditMap
      setServerEditMap((prev) => ({
        ...prev,
        [newServer.id]: {
          server_name: newServer.server_name,
          embed_url: newServer.embed_url,
        },
      }));

      // Refresh episode list in background
      if (selectedAnime) loadEpisodesForAnime(selectedAnime);
    } catch (err: any) {
      showToast('Failed to Add Server', err.message || 'Could not add server.', 'destructive');
    } finally {
      setIsAddingDub(false);
    }
  };

  // Update existing server
  const handleUpdateServer = async (serverId: string, language: 'sub' | 'dub') => {
    const editData = serverEditMap[serverId];
    if (!editData || !editData.server_name.trim() || !editData.embed_url.trim()) {
      showToast('Validation Error', 'Server name and embed URL cannot be empty.', 'destructive');
      return;
    }

    setSavingServerId(serverId);
    try {
      const res = await api.updateAdminServer(serverId, {
        server_name: editData.server_name.trim(),
        embed_url: editData.embed_url.trim(),
        language,
      });

      showToast('Server Saved', `Server "${res.server.server_name}" updated.`);

      // Update editing episode local state
      setEditingEpisode((prev) => {
        if (!prev) return null;
        if (language === 'sub') {
          const updated = (prev.sub || []).map((s) =>
            s.id === serverId ? { ...s, server_name: editData.server_name, embed_url: editData.embed_url } : s
          );
          return { ...prev, sub: updated };
        } else {
          const updated = (prev.dub || []).map((s) =>
            s.id === serverId ? { ...s, server_name: editData.server_name, embed_url: editData.embed_url } : s
          );
          return { ...prev, dub: updated };
        }
      });
    } catch (err: any) {
      showToast('Failed to Save Server', err.message || 'Could not update server.', 'destructive');
    } finally {
      setSavingServerId(null);
    }
  };

  // Delete single server
  const handleConfirmDeleteServer = async () => {
    if (!deleteServerConfirm) return;
    const { server, episode } = deleteServerConfirm;

    setIsDeleting(true);
    try {
      await api.deleteAdminServer(server.id);
      showToast('Server Deleted', `Server "${server.server_name}" removed from Episode ${episode.episode_number}.`);

      // Update editing episode local state
      setEditingEpisode((prev) => {
        if (!prev) return null;
        if (server.language === 'dub') {
          const nextDub = (prev.dub || []).filter((s) => s.id !== server.id);
          return { ...prev, dub: nextDub, dub_count: nextDub.length };
        } else {
          const nextSub = (prev.sub || []).filter((s) => s.id !== server.id);
          return { ...prev, sub: nextSub, sub_count: nextSub.length };
        }
      });

      setDeleteServerConfirm(null);
      if (selectedAnime) loadEpisodesForAnime(selectedAnime);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Failed to delete server.', 'destructive');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete entire episode
  const handleConfirmDeleteEpisode = async () => {
    if (!deleteEpisodeConfirm) return;
    const ep = deleteEpisodeConfirm;

    setIsDeleting(true);
    try {
      await api.deleteAdminEpisode(ep.id);
      showToast('Episode Deleted', `Episode ${ep.episode_number} deleted successfully.`);
      setDeleteEpisodeConfirm(null);
      if (editingEpisode?.id === ep.id) {
        setEditingEpisode(null);
      }
      if (selectedAnime) loadEpisodesForAnime(selectedAnime);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Failed to delete episode.', 'destructive');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter episodes based on episode search input
  const filteredEpisodes = episodes.filter((ep) => {
    if (!episodeSearchQuery.trim()) return true;
    const q = episodeSearchQuery.toLowerCase().trim();
    const epNumStr = String(ep.episode_number);
    const titleStr = (ep.title || '').toLowerCase();
    return epNumStr === q || epNumStr.startsWith(q) || titleStr.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* VIEW 1: ANIME SEARCH & SELECTION                              */}
      {/* ------------------------------------------------------------- */}
      {!selectedAnime ? (
        <div className="space-y-5">
          {/* Top Search Bar */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0a14] p-5 backdrop-blur-md shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Tv className="h-5 w-5 text-rose-500" /> Episode Management — Select Anime
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Search anime in your Supabase database to manage its episodes and streaming servers
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search anime by title (e.g. One Piece, Naruto, Demon Slayer)..."
                value={animeQuery}
                onChange={(e) => setAnimeQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#08080c] py-3.5 pl-12 pr-12 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              {isSearchingAnime && (
                <div className="absolute right-4 top-3.5">
                  <span className="h-5 w-5 block rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Search Results List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                {animeQuery.trim() ? `Search Results (${animeResults.length})` : 'Database Anime Catalog'}
              </span>
              <button
                type="button"
                onClick={() => setIsAnikotoImportOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Import from Anikoto
              </button>
            </div>

            {isSearchingAnime && animeResults.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl bg-slate-900/60 animate-pulse" />
                ))}
              </div>
            ) : animeResults.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0a0a14]/60 p-12 text-center">
                <Search className="mx-auto h-10 w-10 text-slate-600 mb-2" />
                <h3 className="text-base font-bold text-white">No matching anime found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Try searching another title or add the anime first in Anime CMS.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {animeResults.map((anime) => (
                  <div
                    key={anime.id || anime.external_id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a14] p-3.5 hover:border-rose-500/50 hover:bg-white/[0.03] transition-all shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={anime.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop'}
                        alt={anime.title}
                        className="h-16 w-12 shrink-0 rounded-xl object-cover border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white truncate">{anime.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{anime.year || 2024}</span>
                          <span>•</span>
                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                            {anime.type || 'TV'}
                          </span>
                          <span>•</span>
                          <span className="text-emerald-400 text-[11px] font-medium">{anime.status || 'Finished'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectAnime(anime)}
                      className="shrink-0 flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-rose-600/30 hover:bg-rose-500 transition-all cursor-pointer"
                    >
                      <span>Manage Episodes</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* VIEW 2: SELECTED ANIME EPISODES DASHBOARD                     */
        /* ------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Selected Anime Header Banner */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0c0c16] p-5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4">
                <img
                  src={selectedAnime.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop'}
                  alt={selectedAnime.title}
                  className="h-20 w-16 shrink-0 rounded-2xl object-cover border border-white/10 shadow-lg"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedAnime(null);
                        setEditingEpisode(null);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer mr-2"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" /> Back to Search
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-600/20 border border-rose-500/30 text-rose-400">
                      {selectedAnime.type || 'TV'}
                    </span>
                    <span className="text-xs text-slate-400">{selectedAnime.year || 2024}</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white mt-1">{selectedAnime.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>MAL ID: #{selectedAnime.external_id}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{episodes.length} Episodes Uploaded</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {onSelectAnimeForCMS && (
                  <button
                    onClick={() => onSelectAnimeForCMS(selectedAnime)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5" /> Edit Anime in CMS
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsAnikotoImportOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Anikoto Import
                </button>
                <button
                  onClick={() => setIsQuickAddOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Add Episode</span>
                </button>
              </div>
            </div>
          </div>

          {/* Episode List Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search episode number or title (e.g. 1, 12, Battle)..."
                value={episodeSearchQuery}
                onChange={(e) => setEpisodeSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#08080c] py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => loadEpisodesForAnime(selectedAnime)}
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[#0a0a14] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingEpisodes ? 'animate-spin' : ''}`} />
              <span>Refresh List</span>
            </button>
          </div>

          {/* Episodes Grid / Cards List */}
          {isLoadingEpisodes ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-slate-900/60 animate-pulse" />
              ))}
            </div>
          ) : filteredEpisodes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0a0a14]/60 p-12 text-center">
              <Tv className="mx-auto h-10 w-10 text-slate-600 mb-2" />
              <h3 className="text-base font-bold text-white">
                {episodeSearchQuery ? 'No episodes match your search' : 'No episodes added yet'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {episodeSearchQuery
                  ? 'Try searching by a different number or keyword.'
                  : 'Click "+ Add Episode" above to add the first episode and attach servers.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredEpisodes.map((ep) => {
                const subCount = ep.sub_count ?? (ep.sub || []).length;
                const dubCount = ep.dub_count ?? (ep.dub || []).length;

                return (
                  <div
                    key={ep.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a14] p-4 hover:border-white/20 transition-all shadow-md"
                  >
                    {/* Left Ep Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 font-black text-sm">
                        {ep.episode_number}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white truncate">
                            Episode {ep.episode_number}: {ep.title}
                          </h4>
                        </div>

                        {/* Server & Asset Status Indicators */}
                        <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1.5 flex-wrap">
                          {/* SUB Badge */}
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded bg-purple-900/30 border border-purple-600/40 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-300 uppercase">
                              <Radio className="h-2.5 w-2.5" /> SUB
                            </span>
                            <span className="text-[11px] font-semibold text-slate-300">
                              {subCount > 0 ? `${subCount} ${subCount === 1 ? 'server' : 'servers'}` : 'No servers'}
                            </span>
                          </div>

                          <span>•</span>

                          {/* DUB Badge */}
                          <div className="flex items-center gap-1.5">
                            <span className="flex items-center gap-1 rounded bg-rose-900/30 border border-rose-600/40 px-1.5 py-0.5 text-[10px] font-extrabold text-rose-300 uppercase">
                              <Mic className="h-2.5 w-2.5" /> DUB
                            </span>
                            <span className="text-[11px] font-semibold text-slate-300">
                              {dubCount > 0 ? `${dubCount} ${dubCount === 1 ? 'server' : 'servers'}` : 'No servers'}
                            </span>
                          </div>

                          <span>•</span>

                          {/* Thumbnail Status Indicator */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                ep.thumbnail_url
                                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                                  : 'bg-white/5 border border-white/10 text-slate-500'
                              }`}
                              title={ep.thumbnail_url ? 'Thumbnail configured' : 'No thumbnail'}
                            >
                              <Image className="h-2.5 w-2.5" />
                              <span>Thumbnail:</span>
                              <span className="font-extrabold">{ep.thumbnail_url ? '✓' : '—'}</span>
                            </span>
                          </div>

                          <span>•</span>

                          {/* Subtitle Status Indicator */}
                          <div className="flex items-center gap-1">
                            <span
                              className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                ep.subtitle_url
                                  ? 'bg-blue-950/40 border border-blue-500/30 text-blue-300'
                                  : 'bg-white/5 border border-white/10 text-slate-500'
                              }`}
                              title={ep.subtitle_url ? 'Subtitle track configured' : 'No subtitle track'}
                            >
                              <FileText className="h-2.5 w-2.5" />
                              <span>Subtitle:</span>
                              <span className="font-extrabold">{ep.subtitle_url ? '✓' : '—'}</span>
                            </span>
                          </div>

                          {ep.updated_at && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <span className="hidden md:inline text-[11px] text-slate-500">
                                Updated {new Date(ep.updated_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleOpenEpisodeEditor(ep)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-600 hover:border-rose-500 transition-all cursor-pointer"
                      >
                        <Edit className="h-3.5 w-3.5 text-rose-400" />
                        <span>Edit / Manage Servers</span>
                      </button>

                      <button
                        onClick={() => setDeleteEpisodeConfirm(ep)}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                        title="Delete Episode"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL: EDIT EPISODE & MULTI-SERVER MANAGER                    */}
      {/* ------------------------------------------------------------- */}
      {editingEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0c0c14] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#10101c]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-400 border border-rose-500/30 uppercase">
                    Episode Editor
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {selectedAnime?.title} — Episode {editingEpisode.episode_number}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update episode details and manage individual SUB/DUB streaming servers
                </p>
              </div>

              <button
                onClick={() => setEditingEpisode(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Episode Details Form */}
              <form onSubmit={handleSaveEpisodeMeta} className="rounded-2xl border border-white/10 bg-[#08080c] p-4 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-xs font-extrabold uppercase text-slate-300 tracking-wider">
                    Episode Details
                  </h4>
                  <button
                    type="submit"
                    disabled={isSavingEpMeta}
                    className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>{isSavingEpMeta ? 'Saving...' : 'Save Details'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Episode Number *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={epNumberInput}
                      onChange={(e) => setEpNumberInput(parseFloat(e.target.value) || 1)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Episode Title *
                    </label>
                    <input
                      type="text"
                      value={epTitleInput}
                      onChange={(e) => setEpTitleInput(e.target.value)}
                      required
                      className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Thumbnail URL & Live Preview */}
                <div className="rounded-xl border border-white/10 bg-[#06060a] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Thumbnail URL (Optional)
                    </label>
                    {epThumbnailInput.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEpThumbnailInput('');
                          setThumbnailLoadError(false);
                        }}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Remove Thumbnail
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    value={epThumbnailInput}
                    onChange={(e) => {
                      setEpThumbnailInput(e.target.value);
                      setThumbnailLoadError(false);
                    }}
                    placeholder="https://example.com/episode1.jpg"
                    className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />

                  {/* Thumbnail Preview Area */}
                  <div className="rounded-lg border border-white/5 bg-[#020205] p-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Thumbnail Preview
                    </div>
                    {epThumbnailInput.trim() ? (
                      thumbnailLoadError ? (
                        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs text-amber-300">
                          <ImageOff className="h-4 w-4 shrink-0 text-amber-400" />
                          <span>Unable to load thumbnail. Please verify image URL.</span>
                        </div>
                      ) : (
                        <div className="relative aspect-video max-h-32 w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black/50">
                          <img
                            src={epThumbnailInput.trim()}
                            alt="Episode thumbnail"
                            className="h-full w-full object-cover"
                            onError={() => setThumbnailLoadError(true)}
                          />
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 p-2.5 text-xs text-slate-500">
                        <Image className="h-4 w-4 text-slate-600" />
                        <span>No thumbnail configured. Will use default anime banner on player.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtitle URL (Optional) */}
                <div className="rounded-xl border border-white/10 bg-[#06060a] p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">
                      Subtitle URL (Optional)
                    </label>
                    {epSubtitleInput.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => setEpSubtitleInput('')}
                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Remove Subtitle
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    value={epSubtitleInput}
                    onChange={(e) => setEpSubtitleInput(e.target.value)}
                    placeholder="https://example.com/episode1.vtt"
                    className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <FileText className="h-3 w-3 text-slate-500" />
                    Supports WebVTT (.vtt) and SubRip (.srt) subtitle track URLs.
                  </p>
                </div>
              </form>

              {/* Section 2: SUB SERVERS MANAGER */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-purple-600/30 border border-purple-500/40 px-2 py-0.5 text-[10px] font-extrabold text-purple-300 uppercase">
                      <Radio className="h-3 w-3" /> SUB SERVERS
                    </span>
                    <span className="text-xs text-slate-400">
                      ({(editingEpisode.sub || []).length} active)
                    </span>
                  </div>
                </div>

                {/* List Existing SUB Servers */}
                {(editingEpisode.sub || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No SUB streaming servers configured for this episode.</p>
                ) : (
                  <div className="space-y-3">
                    {(editingEpisode.sub || []).map((srv, idx) => {
                      const editVal = serverEditMap[srv.id] || {
                        server_name: srv.server_name || srv.server || '',
                        embed_url: srv.embed_url || srv.embedUrl || '',
                      };
                      const isSaving = savingServerId === srv.id;

                      return (
                        <div
                          key={srv.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-purple-500/20 bg-[#0a0a14] p-3 shadow-sm"
                        >
                          <div className="flex items-center gap-1.5 w-full sm:w-1/3">
                            <span className="text-[10px] font-bold text-purple-400 w-5">#{idx + 1}</span>
                            <input
                              type="text"
                              value={editVal.server_name}
                              onChange={(e) =>
                                setServerEditMap((prev) => ({
                                  ...prev,
                                  [srv.id]: { ...editVal, server_name: e.target.value },
                                }))
                              }
                              placeholder="Server Name"
                              className="w-full rounded-lg border border-white/10 bg-[#08080c] px-2.5 py-1.5 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                            />
                          </div>

                          <input
                            type="url"
                            value={editVal.embed_url}
                            onChange={(e) =>
                              setServerEditMap((prev) => ({
                                ...prev,
                                [srv.id]: { ...editVal, embed_url: e.target.value },
                              }))
                            }
                            placeholder="Embed URL (https://...)"
                            className="flex-1 w-full rounded-lg border border-white/10 bg-[#08080c] px-2.5 py-1.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                          />

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateServer(srv.id, 'sub')}
                              disabled={isSaving}
                              className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Save className="h-3 w-3" />
                              <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteServerConfirm({ server: srv, episode: editingEpisode })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete Server"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form to Add New SUB Server */}
                <form onSubmit={handleAddSubServer} className="pt-2 border-t border-purple-500/10 space-y-2">
                  <span className="text-[11px] font-bold text-purple-300 uppercase block">+ Add SUB Server</span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Server Name (e.g. Vidplay)"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full sm:w-1/3 rounded-xl border border-purple-500/30 bg-[#08080c] px-3 py-2 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                    />
                    <input
                      type="url"
                      placeholder="Embed Stream URL (https://...)"
                      value={newSubUrl}
                      onChange={(e) => setNewSubUrl(e.target.value)}
                      className="w-full sm:flex-1 rounded-xl border border-purple-500/30 bg-[#08080c] px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isAddingSub}
                      className="w-full sm:w-auto flex items-center justify-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isAddingSub ? 'Adding...' : 'Add Server'}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Section 3: DUB SERVERS MANAGER */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-rose-600/30 border border-rose-500/40 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 uppercase">
                      <Mic className="h-3 w-3" /> DUB SERVERS
                    </span>
                    <span className="text-xs text-slate-400">
                      ({(editingEpisode.dub || []).length} active)
                    </span>
                  </div>
                </div>

                {/* List Existing DUB Servers */}
                {(editingEpisode.dub || []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No DUB streaming servers configured for this episode.</p>
                ) : (
                  <div className="space-y-3">
                    {(editingEpisode.dub || []).map((srv, idx) => {
                      const editVal = serverEditMap[srv.id] || {
                        server_name: srv.server_name || srv.server || '',
                        embed_url: srv.embed_url || srv.embedUrl || '',
                      };
                      const isSaving = savingServerId === srv.id;

                      return (
                        <div
                          key={srv.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-2 rounded-xl border border-rose-500/20 bg-[#0a0a14] p-3 shadow-sm"
                        >
                          <div className="flex items-center gap-1.5 w-full sm:w-1/3">
                            <span className="text-[10px] font-bold text-rose-400 w-5">#{idx + 1}</span>
                            <input
                              type="text"
                              value={editVal.server_name}
                              onChange={(e) =>
                                setServerEditMap((prev) => ({
                                  ...prev,
                                  [srv.id]: { ...editVal, server_name: e.target.value },
                                }))
                              }
                              placeholder="Server Name"
                              className="w-full rounded-lg border border-white/10 bg-[#08080c] px-2.5 py-1.5 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                            />
                          </div>

                          <input
                            type="url"
                            value={editVal.embed_url}
                            onChange={(e) =>
                              setServerEditMap((prev) => ({
                                ...prev,
                                [srv.id]: { ...editVal, embed_url: e.target.value },
                              }))
                            }
                            placeholder="Embed URL (https://...)"
                            className="flex-1 w-full rounded-lg border border-white/10 bg-[#08080c] px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                          />

                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => handleUpdateServer(srv.id, 'dub')}
                              disabled={isSaving}
                              className="flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <Save className="h-3 w-3" />
                              <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteServerConfirm({ server: srv, episode: editingEpisode })}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete Server"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Form to Add New DUB Server */}
                <form onSubmit={handleAddDubServer} className="pt-2 border-t border-rose-500/10 space-y-2">
                  <span className="text-[11px] font-bold text-rose-300 uppercase block">+ Add DUB Server</span>
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <input
                      type="text"
                      placeholder="Server Name (e.g. VidCloud DUB)"
                      value={newDubName}
                      onChange={(e) => setNewDubName(e.target.value)}
                      className="w-full sm:w-1/3 rounded-xl border border-rose-500/30 bg-[#08080c] px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                    />
                    <input
                      type="url"
                      placeholder="Embed Stream URL (https://...)"
                      value={newDubUrl}
                      onChange={(e) => setNewDubUrl(e.target.value)}
                      className="w-full sm:flex-1 rounded-xl border border-rose-500/30 bg-[#08080c] px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isAddingDub}
                      className="w-full sm:w-auto flex items-center justify-center gap-1 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isAddingDub ? 'Adding...' : 'Add Server'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-6 py-4 bg-[#10101c] flex items-center justify-between">
              <span className="text-xs text-slate-400">
                All server changes are applied directly to the episode database.
              </span>
              <button
                type="button"
                onClick={() => setEditingEpisode(null)}
                className="rounded-full bg-white/10 px-5 py-2 text-xs font-bold text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD EPISODE MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {selectedAnime && (
        <QuickAddEpisodeModal
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          anime={selectedAnime}
          initialEpisodeNumber={
            episodes.length > 0
              ? Math.max(...episodes.map((e) => Number(e.episode_number) || 0)) + 1
              : 1
          }
          onSuccess={(savedEp) => {
            showToast('Episode Created', `Episode ${savedEp.episode_number} created successfully.`);
            loadEpisodesForAnime(selectedAnime);
          }}
        />
      )}

      <AnikotoImportModal
        isOpen={isAnikotoImportOpen}
        onClose={() => setIsAnikotoImportOpen(false)}
        showToast={showToast}
        onSuccess={(result) => {
          // Refresh catalog search and select the imported anime if possible
          const malId = result.mal_id || result.anime?.external_id;
          if (malId) {
            api
              .searchAdminAnime(String(result.anime?.title || ''))
              .then((list) => {
                const found =
                  (list || []).find(
                    (a: any) => Number(a.external_id) === Number(malId) || a.id === result.anime?.id
                  ) || result.anime;
                if (found) {
                  setSelectedAnime(found);
                  loadEpisodesForAnime(found);
                }
              })
              .catch(() => {
                if (result.anime) {
                  setSelectedAnime(result.anime);
                  loadEpisodesForAnime(result.anime);
                }
              });
          } else if (result.anime) {
            setSelectedAnime(result.anime);
            loadEpisodesForAnime(result.anime);
          }
        }}
      />

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM DELETE SERVER DIALOG                                  */}
      {/* ------------------------------------------------------------- */}
      {deleteServerConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e18] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Server?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Delete "{deleteServerConfirm.server.server_name}" from Episode {deleteServerConfirm.episode.episode_number}?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-white/5 p-3 rounded-xl">
              This will remove only this streaming server. The episode and other servers will not be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteServerConfirm(null)}
                disabled={isDeleting}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteServer}
                disabled={isDeleting}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Server'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM DELETE EPISODE DIALOG                                 */}
      {/* ------------------------------------------------------------- */}
      {deleteEpisodeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e18] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Episode?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you sure you want to delete Episode {deleteEpisodeConfirm.episode_number}: "{deleteEpisodeConfirm.title}"?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl text-rose-300">
              This will permanently delete this episode and all associated streaming servers from Supabase.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteEpisodeConfirm(null)}
                disabled={isDeleting}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEpisode}
                disabled={isDeleting}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Episode'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
