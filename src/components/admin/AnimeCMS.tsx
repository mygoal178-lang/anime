import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Tv,
  Film,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Star,
  Calendar,
  X,
  ExternalLink,
  Save,
  Check,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { QuickAddEpisodeModal } from './QuickAddEpisodeModal';

const AVAILABLE_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
  'Mecha',
  'Music',
  'Isekai',
  'Shounen',
  'Seinen',
  'Shojo',
];

const ANIME_TYPES = ['TV', 'Movie', 'OVA', 'ONA', 'Special', 'Music'];
const ANIME_STATUSES = ['Currently Airing', 'Finished Airing', 'Not Yet Aired'];

interface AnimeCMSProps {
  onManageEpisodesForAnime: (anime: any) => void;
  showToast: (title: string, desc: string, variant?: 'default' | 'destructive') => void;
}

export function AnimeCMS({ onManageEpisodesForAnime, showToast }: AnimeCMSProps) {
  // Search & Catalog state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [animeList, setAnimeList] = useState<any[]>([]);

  // Anime Add / Edit Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAnime, setEditingAnime] = useState<any | null>(null);

  // Form inputs
  const [formTitle, setFormTitle] = useState('');
  const [formExternalId, setFormExternalId] = useState('');
  const [formCoverUrl, setFormCoverUrl] = useState('');
  const [formBannerUrl, setFormBannerUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formGenres, setFormGenres] = useState<string[]>(['Action']);
  const [formType, setFormType] = useState('TV');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formRating, setFormRating] = useState('8.5');
  const [formStatus, setFormStatus] = useState('Finished Airing');
  const [formFeatured, setFormFeatured] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Add Episode state
  const [quickAddAnime, setQuickAddAnime] = useState<any | null>(null);

  // Delete Confirmation state
  const [deleteConfirmAnime, setDeleteConfirmAnime] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch search results from Supabase
  const handleSearch = async (queryText: string) => {
    setIsSearching(true);
    try {
      const results = await api.searchAdminAnime(queryText);
      setAnimeList(results || []);
    } catch (err: any) {
      showToast('Search Error', err.message || 'Failed to search anime.', 'destructive');
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Open Form to Add New Anime
  const handleOpenAddAnime = () => {
    setEditingAnime(null);
    setFormTitle('');
    setFormExternalId('');
    setFormCoverUrl('');
    setFormBannerUrl('');
    setFormDescription('');
    setFormGenres(['Action']);
    setFormType('TV');
    setFormYear(new Date().getFullYear().toString());
    setFormRating('8.5');
    setFormStatus('Finished Airing');
    setFormFeatured(false);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Open Form to Edit Anime
  const handleOpenEditAnime = (anime: any) => {
    setEditingAnime(anime);
    setFormTitle(anime.title || '');
    setFormExternalId(anime.external_id ? String(anime.external_id) : '');
    setFormCoverUrl(anime.cover_url || '');
    setFormBannerUrl(anime.banner_url || '');
    setFormDescription(anime.description || '');
    setFormGenres(Array.isArray(anime.genres) ? anime.genres : ['Action']);
    setFormType(anime.type || 'TV');
    setFormYear(anime.year ? String(anime.year) : new Date().getFullYear().toString());
    setFormRating(anime.rating ? String(anime.rating) : '8.5');
    setFormStatus(anime.status || 'Finished Airing');
    setFormFeatured(Boolean(anime.featured));
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Toggle Genre Chip
  const toggleGenre = (genre: string) => {
    setFormGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  // Save Anime Submit Handler
  const handleSaveAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Anime title is required.');
      return;
    }

    if (!formExternalId.trim() || !Number.isInteger(Number(formExternalId)) || Number(formExternalId) <= 0) {
      setFormError('A valid MAL ID is required. Get the MAL ID from the anime metadata.');
      return;
    }

    if (!formCoverUrl.trim()) {
      setFormError('Cover image URL is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        id: editingAnime?.id,
        title: formTitle.trim(),
        custom_title: formTitle.trim(),
        external_id: formExternalId ? Number(formExternalId) : null,
        mal_id: formExternalId ? Number(formExternalId) : null,
        cover_url: formCoverUrl.trim(),
        custom_cover_url: formCoverUrl.trim(),
        banner_url: formBannerUrl.trim() || null,
        custom_banner_url: formBannerUrl.trim() || null,
        description: formDescription.trim() || null,
        custom_description: formDescription.trim() || null,
        genres: formGenres,
        type: formType,
        year: formYear ? parseInt(formYear, 10) : null,
        rating: formRating ? formRating : null,
        status: formStatus,
        featured: formFeatured,
      };

      const res = await api.saveAdminAnime(payload);
      showToast(
        editingAnime ? 'Anime Updated' : 'Anime Created',
        `"${res.anime.title}" has been saved to Supabase.`
      );

      setIsFormModalOpen(false);
      handleSearch(searchQuery);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save anime.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Anime
  const handleConfirmDeleteAnime = async () => {
    if (!deleteConfirmAnime) return;
    setIsDeleting(true);
    try {
      await api.deleteAdminAnime(deleteConfirmAnime.id || deleteConfirmAnime.external_id);
      showToast('Anime Deleted', `"${deleteConfirmAnime.title}" and its episodes were deleted.`);
      setDeleteConfirmAnime(null);
      handleSearch(searchQuery);
    } catch (err: any) {
      showToast('Delete Failed', err.message || 'Failed to delete anime.', 'destructive');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="rounded-3xl border border-white/10 bg-[#0a0a14] p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Film className="h-5 w-5 text-rose-500" /> Anime Content Management (CMS)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Search, create, and edit custom anime metadata in your Supabase database
            </p>
          </div>

          <button
            onClick={handleOpenAddAnime}
            className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>+ Add Anime Manually</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search anime by title or MAL ID in Supabase..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#08080c] py-3.5 pl-12 pr-12 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
          />
          {isSearching && (
            <div className="absolute right-4 top-3.5">
              <span className="h-5 w-5 block rounded-full border-2 border-rose-500/30 border-t-rose-500 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Catalog Table / Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            {searchQuery.trim() ? `Search Results (${animeList.length})` : `All Database Anime (${animeList.length})`}
          </span>
          <button
            onClick={() => handleSearch(searchQuery)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isSearching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {isSearching && animeList.length === 0 ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-slate-900/60 animate-pulse" />
            ))}
          </div>
        ) : animeList.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0a0a14]/60 p-12 text-center">
            <Film className="mx-auto h-10 w-10 text-slate-600 mb-2" />
            <h3 className="text-base font-bold text-white">No anime records found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Click "+ Add Anime Manually" to create your first entry in the database.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {animeList.map((anime) => (
              <div
                key={anime.id || anime.external_id}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0a0a14] p-4 hover:border-white/20 transition-all shadow-md"
              >
                {/* Anime Meta Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <img
                    src={anime.cover_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop'}
                    alt={anime.title}
                    className="h-16 w-12 shrink-0 rounded-xl object-cover border border-white/10 shadow-md"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate max-w-md">{anime.title}</h4>
                      {anime.featured && (
                        <span className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-400 uppercase">
                          <Star className="h-2.5 w-2.5 fill-amber-400" /> Featured
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      <span className="uppercase font-semibold text-[11px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300">
                        {anime.type || 'TV'}
                      </span>
                      <span>•</span>
                      <span>{anime.year || 2024}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-bold">★ {anime.rating || '8.5'}</span>
                      <span>•</span>
                      <span className="text-emerald-400 text-[11px]">{anime.status || 'Finished'}</span>
                      <span>•</span>
                      <span className="text-slate-500">ID: #{anime.external_id || anime.id?.slice(0, 8)}</span>
                    </div>

                    {/* Genres */}
                    {Array.isArray(anime.genres) && anime.genres.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1.5 flex-wrap">
                        {anime.genres.slice(0, 4).map((g: string) => (
                          <span key={g} className="px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 self-end md:self-auto flex-wrap shrink-0">
                  <button
                    onClick={() => handleOpenEditAnime(anime)}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit className="h-3.5 w-3.5 text-slate-400" />
                    <span>Edit Anime</span>
                  </button>

                  <button
                    onClick={() => onManageEpisodesForAnime(anime)}
                    className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-500 transition-colors cursor-pointer"
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>Manage Episodes</span>
                  </button>

                  <button
                    onClick={() => setQuickAddAnime(anime)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Episode</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmAnime(anime)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                    title="Delete Anime"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: ADD / EDIT ANIME IN CMS                                */}
      {/* ------------------------------------------------------------- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0c0c14] shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#10101c]">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingAnime ? `Edit Anime — ${editingAnime.title}` : 'Add New Anime to Supabase'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Save comprehensive metadata, poster art, banner, and categorization
                </p>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAnime} className="flex-1 overflow-y-auto p-6 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title & MAL ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Anime Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. One Piece, Attack on Titan"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    External / MAL ID
                  </label>
                  <input
                    type="number"
                    value={formExternalId}
                    onChange={(e) => setFormExternalId(e.target.value)}
                    placeholder="e.g. 21"
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Cover URL & Banner URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Cover Image URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formCoverUrl}
                    onChange={(e) => setFormCoverUrl(e.target.value)}
                    placeholder="https://.../cover.jpg"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Banner URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={formBannerUrl}
                    onChange={(e) => setFormBannerUrl(e.target.value)}
                    placeholder="https://.../banner.jpg"
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description / Synopsis
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Enter anime synopsis..."
                  className="w-full rounded-xl border border-white/10 bg-[#08080c] p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>

              {/* Type, Year, Rating, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Format / Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3 py-2.5 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                  >
                    {ANIME_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Rating (Score)
                  </label>
                  <input
                    type="text"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    placeholder="e.g. 8.7"
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3 py-2.5 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                  >
                    {ANIME_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Genres Multi-Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Genres (Click to toggle)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_GENRES.map((g) => {
                    const isSelected = formGenres.includes(g);
                    return (
                      <button
                        type="button"
                        key={g}
                        onClick={() => toggleGenre(g)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#08080c] p-4">
                <input
                  type="checkbox"
                  id="featured-toggle"
                  checked={formFeatured}
                  onChange={(e) => setFormFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-[#0c0c14] text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <label htmlFor="featured-toggle" className="text-xs font-bold text-white cursor-pointer select-none">
                  Featured Anime (Spotlight on Homepage & Hero carousels)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={isSubmitting}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{editingAnime ? 'Update Anime' : 'Create Anime'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* QUICK ADD EPISODE MODAL                                       */}
      {/* ------------------------------------------------------------- */}
      {quickAddAnime && (
        <QuickAddEpisodeModal
          isOpen={Boolean(quickAddAnime)}
          onClose={() => setQuickAddAnime(null)}
          anime={quickAddAnime}
          onSuccess={(savedEp) => {
            showToast('Episode Added', `Episode ${savedEp.episode_number} created for ${quickAddAnime.title}.`);
            onManageEpisodesForAnime(quickAddAnime);
          }}
        />
      )}

      {/* ------------------------------------------------------------- */}
      {/* CONFIRM DELETE ANIME MODAL                                    */}
      {/* ------------------------------------------------------------- */}
      {deleteConfirmAnime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0e0e18] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Anime?</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Are you sure you want to delete "{deleteConfirmAnime.title}"?
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-rose-950/20 border border-rose-500/20 p-3 rounded-xl text-rose-300">
              This will permanently delete this anime entry and all of its uploaded episodes and servers from Supabase.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAnime(null)}
                disabled={isDeleting}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAnime}
                disabled={isDeleting}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Anime'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
