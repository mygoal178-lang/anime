import React, { useState } from 'react';
import { Flag, X, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeTitle: string;
  episodeNumber: number;
  currentServerName: string;
}

export function ReportModal({
  isOpen,
  onClose,
  animeTitle,
  episodeNumber,
  currentServerName,
}: ReportModalProps) {
  const { showToast } = useAuth();
  const [issueType, setIssueType] = useState('video_not_playing');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      showToast('Thank you! Issue report submitted to AniVault engineers.');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e18] p-5 sm:p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Flag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Report Episode Issue</h3>
              <p className="text-[11px] text-slate-400">
                {animeTitle} · Episode {episodeNumber}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Select Issue
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-[#141424] px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none"
            >
              <option value="video_not_playing">Video Not Playing / Black Screen</option>
              <option value="buffering">Excessive Buffering / Slow Loading</option>
              <option value="audio_desync">Audio Desynced / Missing</option>
              <option value="wrong_episode">Wrong Episode or Title</option>
              <option value="subtitles_broken">Subtitles Broken or Missing</option>
              <option value="other">Other Technical Problem</option>
            </select>
          </div>

          <div>
            <span className="text-[11px] text-slate-400">
              Reported Server: <strong className="text-purple-400">{currentServerName}</strong>
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Additional Details (Optional)
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="e.g. Video stops at 04:15, or audio is missing in English..."
              className="w-full rounded-xl border border-white/15 bg-[#141424] p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-rose-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
