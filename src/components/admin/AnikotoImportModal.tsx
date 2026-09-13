import React, { useEffect, useState } from 'react';
import {
  X,
  Download,
  Search,
  Loader2,
  Tv,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../../services/api';

interface AnikotoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: {
    anime: any;
    imported_episodes: number;
    mal_id?: number;
  }) => void;
  showToast: (title: string, message: string, variant?: 'default' | 'destructive') => void;
  /** Optional prefill Anikoto ID */
  initialAnikotoId?: number | string;
}

type RecentItem = {
  id: number;
  title: string;
  alternative?: string;
  poster?: string;
  mal_id?: number | null;
  year?: number | string;
  status?: string;
  is_sub?: number;
  is_dub?: number;
  episodes?: string | number;
  score?: string;
};

export function AnikotoImportModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
  initialAnikotoId,
}: AnikotoImportModalProps) {
  const [anikotoId, setAnikotoId] = useState('');
  const [maxEpisodes, setMaxEpisodes] = useState<string>('');
  const [startEpisode, setStartEpisode] = useState('1');
  const [animeOnly, setAnimeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState<{
    anime: any;
    total_episodes: number;
  } | null>(null);
  const [error, setError] = useState('');

  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentPage, setRecentPage] = useState(1);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setPreview(null);
    setLoading(false);
    if (initialAnikotoId) {
      setAnikotoId(String(initialAnikotoId));
    }
    loadRecent(1);
  }, [isOpen, initialAnikotoId]);

  async function loadRecent(page: number) {
    setRecentLoading(true);
    try {
      const res = await api.getAnikotoRecent(page, 12);
      setRecent(res.data || []);
      setRecentPage(page);
    } catch (e: any) {
      // non-fatal
      console.warn('Anikoto recent failed', e);
    } finally {
      setRecentLoading(false);
    }
  }

  async function handlePreview() {
    const id = Number(anikotoId);
    if (!Number.isInteger(id) || id <= 0) {
      setError('Enter a valid Anikoto series ID.');
      return;
    }
    setError('');
    setPreviewLoading(true);
    setPreview(null);
    try {
      const res = await api.getAnikotoSeries(id);
      setPreview({ anime: res.anime, total_episodes: res.total_episodes });
      if (!maxEpisodes && res.total_episodes > 0) {
        // leave blank = import all; user can still limit
      }
    } catch (e: any) {
      setError(e.message || 'Failed to preview series.');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleImport() {
    const id = Number(anikotoId);
    if (!Number.isInteger(id) || id <= 0) {
      setError('Enter a valid Anikoto series ID.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload: {
        anikotoId: number;
        maxEpisodes?: number | null;
        startEpisode?: number;
        animeOnly?: boolean;
      } = {
        anikotoId: id,
        startEpisode: Math.max(1, Number(startEpisode) || 1),
        animeOnly,
      };
      if (maxEpisodes.trim() !== '') {
        const n = Number(maxEpisodes);
        if (!Number.isFinite(n) || n <= 0) {
          setError('Max episodes must be a positive number (or leave empty for all).');
          setLoading(false);
          return;
        }
        payload.maxEpisodes = Math.floor(n);
      }

      const res = await api.importFromAnikoto(payload);
      showToast(
        'Import successful',
        res.message ||
          `Imported ${res.imported_episodes} episode(s) for ${res.anime?.title || 'anime'}.`,
        'default'
      );
      onSuccess({
        anime: res.anime,
        imported_episodes: res.imported_episodes,
        mal_id: res.mal_id || res.anime?.external_id,
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Import failed.');
      showToast('Import failed', e.message || 'Could not import from Anikoto.', 'destructive');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/80 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import from Anikoto</h2>
              <p className="text-xs text-slate-400">
                Anime details + episode embed links (works on Vercel, no VPS)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* ID + options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Anikoto Series ID *
              </label>
              <input
                type="number"
                min={1}
                value={anikotoId}
                onChange={(e) => setAnikotoId(e.target.value)}
                placeholder="e.g. 8719"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Max episodes to import
              </label>
              <input
                type="number"
                min={1}
                value={maxEpisodes}
                onChange={(e) => setMaxEpisodes(e.target.value)}
                placeholder="All (leave empty)"
                disabled={animeOnly}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Start from episode
              </label>
              <input
                type="number"
                min={1}
                value={startEpisode}
                onChange={(e) => setStartEpisode(e.target.value)}
                disabled={animeOnly}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={animeOnly}
              onChange={(e) => setAnimeOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
            />
            Import anime details only (skip episodes)
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || !anikotoId}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Preview
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={loading || !anikotoId}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {loading ? 'Importing…' : 'Import now'}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex gap-4">
              {preview.anime?.cover_url && (
                <img
                  src={preview.anime.cover_url}
                  alt=""
                  className="h-28 w-20 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Preview ready
                </div>
                <h3 className="font-bold text-white truncate">{preview.anime?.title}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {preview.anime?.description || 'No description'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5">
                    MAL: {preview.anime?.external_id || '—'}
                  </span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5">
                    Episodes available: {preview.total_episodes}
                  </span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5">
                    {preview.anime?.status || '—'}
                  </span>
                  <span className="rounded-md bg-slate-800 px-2 py-0.5">
                    {preview.anime?.type || 'TV'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recent list for easy ID picking */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Tv className="h-4 w-4 text-slate-400" />
                Recent on Anikoto (click to select ID)
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={recentPage <= 1 || recentLoading}
                  onClick={() => loadRecent(recentPage - 1)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs text-slate-500 px-1">Page {recentPage}</span>
                <button
                  type="button"
                  disabled={recentLoading}
                  onClick={() => loadRecent(recentPage + 1)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {recentLoading ? (
              <div className="flex justify-center py-8 text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {recent.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setAnikotoId(String(item.id));
                      setPreview(null);
                      setError('');
                    }}
                    className={`text-left rounded-xl border p-2 transition-colors hover:border-emerald-500/50 hover:bg-slate-800/80 ${
                      String(item.id) === String(anikotoId)
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800/40'
                    }`}
                  >
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-slate-900 mb-1.5">
                      {item.poster ? (
                        <img src={item.poster} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-600">
                          <Tv className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-white line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      ID {item.id}
                      {item.mal_id ? ` · MAL ${item.mal_id}` : ''}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Tip: Leave <strong className="text-slate-400">Max episodes</strong> empty to import all
            available episodes with Sub/Dub embed links from Anikoto (megaplay). Series without a
            MAL ID cannot be imported (AniVault uses MAL as the catalog key).
          </p>
        </div>
      </div>
    </div>
  );
}
