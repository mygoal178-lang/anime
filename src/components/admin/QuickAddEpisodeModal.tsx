import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Tv,
  Radio,
  Mic,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Image,
  ImageOff,
  FileText,
} from 'lucide-react';
import { api } from '../../services/api';

interface QuickAddEpisodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  anime: {
    id?: string;
    external_id: number;
    title: string;
    cover_url?: string;
  } | null;
  initialEpisodeNumber?: number;
  onSuccess: (savedEpisode: any) => void;
}

export function QuickAddEpisodeModal({
  isOpen,
  onClose,
  anime,
  initialEpisodeNumber = 1,
  onSuccess,
}: QuickAddEpisodeModalProps) {
  const [epNum, setEpNum] = useState<number>(initialEpisodeNumber);
  const [title, setTitle] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [subtitleUrl, setSubtitleUrl] = useState('');
  const [thumbLoadError, setThumbLoadError] = useState(false);
  const [subServers, setSubServers] = useState<Array<{ server: string; embedUrl: string }>>([
    { server: 'Vidplay', embedUrl: '' },
  ]);
  const [dubServers, setDubServers] = useState<Array<{ server: string; embedUrl: string }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && anime) {
      setEpNum(initialEpisodeNumber || 1);
      setTitle(`Episode ${initialEpisodeNumber || 1}`);
      setThumbnailUrl(anime.cover_url || '');
      setThumbLoadError(false);
      setSubtitleUrl('');
      setSubServers([{ server: 'Vidplay', embedUrl: '' }]);
      setDubServers([]);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, anime, initialEpisodeNumber]);

  if (!isOpen || !anime) return null;

  const handleAddSubServer = () => {
    setSubServers((prev) => [
      ...prev,
      { server: `Server ${prev.length + 1}`, embedUrl: '' },
    ]);
  };

  const handleRemoveSubServer = (index: number) => {
    setSubServers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddDubServer = () => {
    setDubServers((prev) => [
      ...prev,
      { server: `DUB Server ${prev.length + 1}`, embedUrl: '' },
    ]);
  };

  const handleRemoveDubServer = (index: number) => {
    setDubServers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validSub = subServers.filter((s) => s.embedUrl.trim().length > 0);
    const validDub = dubServers.filter((s) => s.embedUrl.trim().length > 0);

    if (validSub.length === 0 && validDub.length === 0) {
      setError('Please provide at least one valid SUB or DUB streaming embed URL.');
      return;
    }

    if (!epNum || epNum <= 0) {
      setError('Please enter a valid episode number (greater than 0).');
      return;
    }

    if (!title.trim()) {
      setError('Please enter an episode title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.saveAdminEpisode({
        anime_mal_id: anime.external_id,
        episode_number: Number(epNum),
        title: title.trim(),
        sub: validSub,
        dub: validDub,
        thumbnail_url: thumbnailUrl.trim() || null,
        subtitle_url: subtitleUrl.trim() || null,
      });

      onSuccess(res.episode);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save episode.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-[#0c0c14] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-[#10101c]">
          <div className="flex items-center gap-3">
            {anime.cover_url && (
              <img
                src={anime.cover_url}
                alt={anime.title}
                className="h-10 w-8 object-cover rounded-lg border border-white/10"
              />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600/20 text-rose-400 border border-rose-500/30 uppercase">
                  + Add Episode
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                  {anime.title}
                </h3>
              </div>
              <p className="text-xs text-slate-400">Add episode and attach streaming servers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Episode Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Episode Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={epNum}
                onChange={(e) => setEpNum(parseFloat(e.target.value) || 1)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-sm font-bold text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Episode Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The New Beginning"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08080c] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Thumbnail URL & Live Preview */}
          <div className="rounded-2xl border border-white/10 bg-[#08080c] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Thumbnail URL (Optional)
              </label>
              {thumbnailUrl.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setThumbnailUrl('');
                    setThumbLoadError(false);
                  }}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Remove Thumbnail
                </button>
              )}
            </div>

            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => {
                setThumbnailUrl(e.target.value);
                setThumbLoadError(false);
              }}
              placeholder="https://example.com/episode1.jpg"
              className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />

            {/* Live Thumbnail Preview Box */}
            <div className="rounded-xl border border-white/5 bg-[#05050a] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Preview
              </div>
              {thumbnailUrl.trim() ? (
                thumbLoadError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300">
                    <ImageOff className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>Unable to load thumbnail. Please check the image URL.</span>
                  </div>
                ) : (
                  <div className="relative aspect-video max-h-36 w-full max-w-xs overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <img
                      src={thumbnailUrl.trim()}
                      alt="Episode thumbnail preview"
                      className="h-full w-full object-cover"
                      onError={() => setThumbLoadError(true)}
                    />
                  </div>
                )
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-white/10 p-3 text-xs text-slate-500">
                  <Image className="h-4 w-4 text-slate-600" />
                  <span>No thumbnail set. Uses anime default banner if empty.</span>
                </div>
              )}
            </div>
          </div>

          {/* Subtitle URL */}
          <div className="rounded-2xl border border-white/10 bg-[#08080c] p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Subtitle URL (Optional)
              </label>
              {subtitleUrl.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubtitleUrl('')}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  Remove Subtitle
                </button>
              )}
            </div>

            <input
              type="url"
              value={subtitleUrl}
              onChange={(e) => setSubtitleUrl(e.target.value)}
              placeholder="https://example.com/episode1.vtt"
              className="w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3 text-slate-500" />
              Supports WebVTT (.vtt) and SubRip (.srt) subtitle track URLs.
            </p>
          </div>

          {/* SUB Servers Section */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-purple-600/30 border border-purple-500/40 px-2 py-0.5 text-[10px] font-extrabold text-purple-300 uppercase">
                  <Radio className="h-3 w-3" /> SUB SERVERS
                </span>
                <span className="text-xs text-slate-400">({subServers.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddSubServer}
                className="flex items-center gap-1 text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add SUB Server
              </button>
            </div>

            {subServers.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Server Name (e.g. Vidplay)"
                  value={s.server}
                  onChange={(e) => {
                    const next = [...subServers];
                    next[idx].server = e.target.value;
                    setSubServers(next);
                  }}
                  className="w-1/3 rounded-xl border border-white/10 bg-[#08080c] px-3 py-2 text-xs font-bold text-white focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="url"
                  placeholder="Embed Stream URL (https://...)"
                  value={s.embedUrl}
                  onChange={(e) => {
                    const next = [...subServers];
                    next[idx].embedUrl = e.target.value;
                    setSubServers(next);
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-[#08080c] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-purple-500 focus:outline-none"
                />
                {subServers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSubServer(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* DUB Servers Section */}
          <div className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded bg-rose-600/30 border border-rose-500/40 px-2 py-0.5 text-[10px] font-extrabold text-rose-300 uppercase">
                  <Mic className="h-3 w-3" /> DUB SERVERS
                </span>
                <span className="text-xs text-slate-400">({dubServers.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddDubServer}
                className="flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Add DUB Server
              </button>
            </div>

            {dubServers.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No DUB servers added. Click above to add english dub stream.</p>
            ) : (
              dubServers.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Server Name (e.g. VidCloud DUB)"
                    value={s.server}
                    onChange={(e) => {
                      const next = [...dubServers];
                      next[idx].server = e.target.value;
                      setDubServers(next);
                    }}
                    className="w-1/3 rounded-xl border border-white/10 bg-[#08080c] px-3 py-2 text-xs font-bold text-white focus:border-rose-500 focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Embed Stream URL (https://...)"
                    value={s.embedUrl}
                    onChange={(e) => {
                      const next = [...dubServers];
                      next[idx].embedUrl = e.target.value;
                      setDubServers(next);
                    }}
                    className="flex-1 rounded-xl border border-white/10 bg-[#08080c] px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveDubServer(idx)}
                    className="p-2 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-full bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Saving Episode...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Create Episode</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
