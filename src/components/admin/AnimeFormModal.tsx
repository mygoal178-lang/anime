import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Eye,
  Film,
  Tv,
  Calendar,
  Star,
  Tag,
  Layers,
  CheckCircle2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { AnimeFormData, SiteAnime } from '../../types';
import { api } from '../../services/api';

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

interface AnimeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AnimeFormData | null;
  existingAnimeList: SiteAnime[];
  onSuccess: (savedAnime: any, action: 'view' | 'add-episode' | 'close' | 'add-another') => void;
}

export function AnimeFormModal({
  isOpen,
  onClose,
  initialData,
  existingAnimeList,
  onSuccess,
}: AnimeFormModalProps) {
  const isEditing = Boolean(initialData?.id || initialData?.external_id);

  // Form fields state
  const [title, setTitle] = useState('');
  const [englishTitle, setEnglishTitle] = useState('');
  const [japaneseTitle, setJapaneseTitle] = useState('');
  const [alternativeTitles, setAlternativeTitles] = useState('');
  const [externalId, setExternalId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [type, setType] = useState('TV');
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [rating, setRating] = useState('8.5');
  const [status, setStatus] = useState('Finished Airing');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action']);
  const [featured, setFeatured] = useState(false);

  // Validation & UI states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverLoadError, setCoverLoadError] = useState(false);
  const [bannerLoadError, setBannerLoadError] = useState(false);

  // Success dialog state after saving
  const [savedResult, setSavedResult] = useState<any | null>(null);

  // Reset or populate form when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      setSavedResult(null);
      setErrors({});
      setDuplicateWarning(null);
      setCoverLoadError(false);
      setBannerLoadError(false);

      if (initialData) {
        setTitle(initialData.title || '');
        setEnglishTitle(initialData.english_title || '');
        setJapaneseTitle(initialData.japanese_title || '');
        setAlternativeTitles(initialData.alternative_titles || '');
        setExternalId(initialData.external_id ? String(initialData.external_id) : '');
        setDescription(initialData.description || '');
        setCoverUrl(initialData.cover_url || '');
        setBannerUrl(initialData.banner_url || '');
        setType(initialData.type || 'TV');
        setYear(initialData.year ? String(initialData.year) : new Date().getFullYear().toString());
        setRating(initialData.rating ? String(initialData.rating) : '8.5');
        setStatus(initialData.status || 'Finished Airing');
        setSelectedGenres(
          Array.isArray(initialData.genres) && initialData.genres.length > 0
            ? initialData.genres
            : ['Action']
        );
        setFeatured(Boolean(initialData.featured));
      } else {
        // Reset to clean defaults
        setTitle('');
        setEnglishTitle('');
        setJapaneseTitle('');
        setAlternativeTitles('');
        setExternalId('');
        setDescription('');
        setCoverUrl('');
        setBannerUrl('');
        setType('TV');
        setYear(new Date().getFullYear().toString());
        setRating('8.5');
        setStatus('Finished Airing');
        setSelectedGenres(['Action']);
        setFeatured(false);
      }
    }
  }, [isOpen, initialData]);

  // Check duplicate external ID and Title
  const checkDuplicates = (currentTitle: string, currentExtId: string) => {
    if (!currentTitle.trim() && !currentExtId.trim()) {
      setDuplicateWarning(null);
      return;
    }

    const currentId = initialData?.id;

    // Check external ID
    if (currentExtId.trim()) {
      const parsedExt = Number(currentExtId.trim());
      if (!isNaN(parsedExt) && parsedExt > 0) {
        const foundExt = existingAnimeList.find(
          (a) =>
            a.mal_id === parsedExt &&
            (!currentId || (a.local?.id && a.local.id !== currentId))
        );
        if (foundExt) {
          const extTitle =
            foundExt.local?.title ||
            (typeof foundExt.jikan?.title === 'string'
              ? foundExt.jikan?.title
              : foundExt.jikan?.title?.romaji || foundExt.jikan?.title?.english) ||
            `#${parsedExt}`;
          setDuplicateWarning(
            `Notice: An anime with External ID #${parsedExt} already exists ("${extTitle}"). Saving will update that record.`
          );
          return;
        }
      }
    }

    // Check Title
    if (currentTitle.trim()) {
      const cleanTitle = currentTitle.trim().toLowerCase();
      const foundTitle = existingAnimeList.find((a) => {
        const rawTitle =
          a.local?.title ||
          (typeof a.jikan?.title === 'string'
            ? a.jikan?.title
            : a.jikan?.title?.romaji || a.jikan?.title?.english) ||
          '';
        const existingTitle = String(rawTitle).toLowerCase();
        return (
          existingTitle === cleanTitle &&
          (!currentId || (a.local?.id && a.local.id !== currentId))
        );
      });
      if (foundTitle) {
        const matchedTitle =
          foundTitle.local?.title ||
          (typeof foundTitle.jikan?.title === 'string'
            ? foundTitle.jikan?.title
            : foundTitle.jikan?.title?.romaji || foundTitle.jikan?.title?.english) ||
          currentTitle;
        setDuplicateWarning(
          `Notice: An anime titled "${matchedTitle}" already exists.`
        );
        return;
      }
    }

    setDuplicateWarning(null);
  };

  const handleGenreToggle = (genreName: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genreName)
        ? prev.filter((g) => g !== genreName)
        : [...prev, genreName]
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Anime title is required.';
    }

    if (!coverUrl.trim()) {
      newErrors.coverUrl = 'Cover image URL is required.';
    } else {
      try {
        const parsed = new URL(coverUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          newErrors.coverUrl = 'Cover image URL must start with http:// or https://';
        }
      } catch {
        newErrors.coverUrl = 'Please enter a valid cover image URL.';
      }
    }

    if (bannerUrl.trim()) {
      try {
        const parsed = new URL(bannerUrl.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          newErrors.bannerUrl = 'Banner image URL must start with http:// or https://';
        }
      } catch {
        newErrors.bannerUrl = 'Please enter a valid banner image URL.';
      }
    }

    if (externalId.trim()) {
      const parsedId = Number(externalId.trim());
      if (isNaN(parsedId) || parsedId <= 0) {
        newErrors.externalId = 'External ID must be a positive number.';
      }
    }

    if (year.trim()) {
      const parsedYear = Number(year.trim());
      if (isNaN(parsedYear) || parsedYear < 1950 || parsedYear > 2050) {
        newErrors.year = 'Please enter a valid year (1950 - 2050).';
      }
    }

    if (selectedGenres.length === 0) {
      newErrors.genres = 'Please select at least one genre.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedExtId = externalId.trim() ? Number(externalId.trim()) : null;
      const parsedYear = year.trim() ? Number(year.trim()) : null;

      const payload = {
        id: initialData?.id,
        external_id: parsedExtId,
        mal_id: parsedExtId,
        title: title.trim(),
        english_title: englishTitle.trim() || undefined,
        japanese_title: japaneseTitle.trim() || undefined,
        alternative_titles: alternativeTitles.trim() || undefined,
        description: description.trim() || undefined,
        cover_url: coverUrl.trim(),
        banner_url: bannerUrl.trim() || coverUrl.trim(),
        type,
        year: parsedYear,
        rating: rating.trim() || '8.5',
        status,
        genres: selectedGenres,
        featured,
      };

      const res = await api.saveAdminAnime(payload);

      if (res.success && res.anime) {
        setSavedResult(res.anime);
      } else {
        throw new Error('Server did not confirm anime creation.');
      }
    } catch (err: any) {
      setErrors({ form: err.message || 'Failed to save anime record to Supabase.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setSavedResult(null);
    setTitle('');
    setEnglishTitle('');
    setJapaneseTitle('');
    setAlternativeTitles('');
    setExternalId('');
    setDescription('');
    setCoverUrl('');
    setBannerUrl('');
    setType('TV');
    setYear(new Date().getFullYear().toString());
    setRating('8.5');
    setStatus('Finished Airing');
    setSelectedGenres(['Action']);
    setFeatured(false);
    setErrors({});
    setDuplicateWarning(null);
    onSuccess(null, 'add-another');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c0c16] p-6 sm:p-8 shadow-2xl space-y-6 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SUCCESS MODAL OVERLAY */}
        {savedResult ? (
          <div className="space-y-6 py-4 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white">
                {isEditing ? 'Anime Updated Successfully!' : 'Anime Added Successfully!'}
              </h3>
              <p className="text-sm text-slate-300 max-w-md mx-auto">
                <span className="font-bold text-rose-400">"{savedResult.title}"</span> has been saved to Supabase and is ready for streaming and episode uploads.
              </p>
            </div>

            {/* Anime Preview Card */}
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-4 text-left">
              <img
                src={savedResult.cover_url || coverUrl}
                alt={savedResult.title}
                className="h-24 w-16 object-cover rounded-xl border border-white/10 shadow shrink-0"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="font-bold text-white text-base truncate">{savedResult.title}</h4>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <span className="font-mono text-rose-400 font-bold">ID: {savedResult.external_id}</span>
                  <span>•</span>
                  <span>{savedResult.type}</span>
                  <span>•</span>
                  <span>{savedResult.year}</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">★ {savedResult.rating}</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(savedResult.genres || []).slice(0, 3).map((g: string) => (
                    <span
                      key={g}
                      className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => onSuccess(savedResult, 'view')}
                className="flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-5 py-3 text-xs font-bold text-white transition-all shadow"
              >
                <ExternalLink className="h-4 w-4 text-rose-400" />
                View Anime Page
              </button>

              <button
                type="button"
                onClick={() => onSuccess(savedResult, 'add-episode')}
                className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                <Plus className="h-4 w-4" />
                Add Episode & Stream
              </button>

              {!isEditing && (
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="flex items-center gap-2 rounded-2xl border border-white/20 hover:border-white/40 px-5 py-3 text-xs font-bold text-slate-200 transition-all"
                >
                  <Plus className="h-4 w-4 text-slate-400" />
                  Add Another Anime
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-5 py-3 text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* FORM BODY */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-600/20 text-rose-500 border border-rose-500/30">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight text-white">
                    {isEditing ? 'Edit Anime Record' : 'Add Anime Manually'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditing
                      ? 'Modify anime metadata and artwork in Supabase'
                      : 'Create a custom anime entry in Supabase with complete metadata and image previews'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error / Warning Alert */}
            {errors.form && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errors.form}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-950/40 p-3.5 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            {/* Form Fields Grid */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Anime Title * */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Anime Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Solo Leveling: ReAwakening"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    checkDuplicates(e.target.value, externalId);
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.title ? 'border-rose-500 bg-rose-950/20' : 'border-white/10 bg-white/5'
                  } px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all`}
                />
                {errors.title && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.title}</p>
                )}
              </div>

              {/* English Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  English Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Solo Leveling"
                  value={englishTitle}
                  onChange={(e) => setEnglishTitle(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>

              {/* Japanese Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Japanese Title / Romaji (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ore dake Level Up na Ken"
                  value={japaneseTitle}
                  onChange={(e) => setJapaneseTitle(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>

              {/* Alternative Titles */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Alternative Titles / Synonyms (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Comma separated: Na Honjaman Rebeleop, I Alone Level Up"
                  value={alternativeTitles}
                  onChange={(e) => setAlternativeTitles(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>

              {/* External ID / MAL ID */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    External / MAL ID (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 italic">
                    Auto-generated if empty
                  </span>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 151807 or leave empty"
                  value={externalId}
                  onChange={(e) => {
                    setExternalId(e.target.value);
                    checkDuplicates(title, e.target.value);
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.externalId ? 'border-rose-500' : 'border-white/10 bg-white/5'
                  } px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all`}
                />
                {errors.externalId && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.externalId}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Media Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-[#12121f] px-4 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none transition-all"
                >
                  {ANIME_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Release Year
                </label>
                <input
                  type="number"
                  min={1950}
                  max={2050}
                  placeholder="2026"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className={`w-full rounded-2xl border ${
                    errors.year ? 'border-rose-500' : 'border-white/10 bg-white/5'
                  } px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all`}
                />
                {errors.year && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.year}</p>
                )}
              </div>

              {/* Rating / Score */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Rating / Score (0.0 - 10.0)
                </label>
                <input
                  type="text"
                  placeholder="8.5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all"
                />
              </div>

              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Airing Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ANIME_STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                        status === st
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover Image URL * with Live Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Cover Image Poster URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/poster.jpg"
                  value={coverUrl}
                  onChange={(e) => {
                    setCoverUrl(e.target.value);
                    setCoverLoadError(false);
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.coverUrl ? 'border-rose-500' : 'border-white/10 bg-white/5'
                  } px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all`}
                />
                {errors.coverUrl && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.coverUrl}</p>
                )}

                {/* Cover Live Preview */}
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  {coverUrl && !coverLoadError ? (
                    <img
                      src={coverUrl}
                      alt="Cover Preview"
                      onError={() => setCoverLoadError(true)}
                      className="h-20 w-14 object-cover rounded-lg border border-white/10 shadow shrink-0"
                    />
                  ) : (
                    <div className="flex h-20 w-14 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900 text-slate-500 shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-300">
                      {coverLoadError ? (
                        <span className="text-rose-400">Image failed to load. Check URL.</span>
                      ) : coverUrl ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Live Poster Preview Loaded
                        </span>
                      ) : (
                        'Enter a valid image URL to preview portrait poster'
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Standard vertical ratio ~2:3 recommended (e.g. 600x900)
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner Image URL with Live Preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Banner Backdrop Artwork URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={bannerUrl}
                  onChange={(e) => {
                    setBannerUrl(e.target.value);
                    setBannerLoadError(false);
                  }}
                  className={`w-full rounded-2xl border ${
                    errors.bannerUrl ? 'border-rose-500' : 'border-white/10 bg-white/5'
                  } px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all`}
                />
                {errors.bannerUrl && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.bannerUrl}</p>
                )}

                {/* Banner Live Preview */}
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                  {bannerUrl && !bannerLoadError ? (
                    <img
                      src={bannerUrl}
                      alt="Banner Preview"
                      onError={() => setBannerLoadError(true)}
                      className="h-20 w-32 object-cover rounded-lg border border-white/10 shadow shrink-0"
                    />
                  ) : (
                    <div className="flex h-20 w-32 items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900 text-slate-500 shrink-0">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-300">
                      {bannerLoadError ? (
                        <span className="text-rose-400">Banner failed to load.</span>
                      ) : bannerUrl ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Live Banner Preview Loaded
                        </span>
                      ) : (
                        'Backdrop artwork for headers & hero carousel'
                      )}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Horizontal ratio ~16:9 recommended (e.g. 1920x1080)
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Synopsis / Description
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter full plot summary, background, and storyline..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Interactive Genres Selector */}
              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Select Genres <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-rose-400">
                    {selectedGenres.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  {AVAILABLE_GENRES.map((g) => {
                    const isSelected = selectedGenres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleGenreToggle(g)}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                        {g}
                      </button>
                    );
                  })}
                </div>
                {errors.genres && (
                  <p className="mt-1 text-[11px] font-bold text-rose-400">{errors.genres}</p>
                )}
              </div>

              {/* Featured Switch */}
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <label
                    htmlFor="featured_checkbox"
                    className="text-xs font-bold uppercase tracking-wider text-white cursor-pointer"
                  >
                    Featured Anime Hero Spotlight
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Display prominently on the Homepage Hero carousel and top banner spotlight
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="featured_checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="h-5 w-5 rounded accent-rose-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 px-5 py-3 text-xs font-bold text-slate-300 hover:text-white transition-all"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-2xl bg-rose-600 hover:bg-rose-500 px-7 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 transition-all disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {isSubmitting
                  ? 'Saving to Supabase...'
                  : isEditing
                  ? 'Save Anime Updates'
                  : 'Save Anime Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
