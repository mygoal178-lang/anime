import React from 'react';
import {
  Maximize2,
  Minimize2,
  Play,
  SkipForward,
  FastForward,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Flag,
  Bookmark,
  BookmarkCheck,
  Check,
} from 'lucide-react';

interface WatchControlsBarProps {
  autoPlay: boolean;
  setAutoPlay: (v: boolean) => void;
  autoNext: boolean;
  setAutoNext: (v: boolean) => void;
  autoSkip: boolean;
  setAutoSkip: (v: boolean) => void;
  lightsOff: boolean;
  setLightsOff: (v: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenReport: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
}

export function WatchControlsBar({
  autoPlay,
  setAutoPlay,
  autoNext,
  setAutoNext,
  autoSkip,
  setAutoSkip,
  lightsOff,
  setLightsOff,
  isFullscreen,
  onToggleFullscreen,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpenReport,
  isWatchlisted,
  onToggleWatchlist,
}: WatchControlsBarProps) {
  return (
    <div
      id="watch-controls-bar"
      className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-white/10 bg-[#0d0d15] px-3 py-2.5 shadow-lg backdrop-blur-md sm:px-4"
    >
      {/* Left Control Group */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
        {/* Expand / Fullscreen */}
        <button
          id="btn-expand-player"
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand / Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Expand</span>
        </button>

        <div className="h-4 w-px bg-white/10 hidden sm:block" />

        {/* Auto Play */}
        <label
          id="toggle-autoplay"
          className="flex items-center gap-1.5 cursor-pointer select-none rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={(e) => setAutoPlay(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-purple-600"
          />
          <span>Auto Play</span>
        </label>

        {/* Auto Next */}
        <label
          id="toggle-autonext"
          className="flex items-center gap-1.5 cursor-pointer select-none rounded-lg px-2 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <input
            type="checkbox"
            checked={autoNext}
            onChange={(e) => setAutoNext(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-purple-600"
          />
          <span>Auto Next</span>
        </label>

        {/* Auto Skip */}
        <label
          id="toggle-autoskip"
          className="flex items-center gap-1.5 cursor-pointer select-none rounded-lg px-2 py-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
        >
          <input
            type="checkbox"
            checked={autoSkip}
            onChange={(e) => setAutoSkip(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-amber-500"
          />
          <span className="font-semibold">Auto Skip</span>
        </label>

        {/* Light (Theater / Lights Off toggle) */}
        <button
          id="btn-toggle-light"
          onClick={() => setLightsOff(!lightsOff)}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            lightsOff
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title="Toggle Lights Off (Theater Mode)"
        >
          {lightsOff ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5" />}
          <span>Light</span>
        </button>

        {/* Prev / Next Episode Buttons */}
        <div className="flex items-center gap-1 ml-1">
          <button
            id="btn-prev-episode"
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:border-purple-500 hover:bg-purple-600/20 hover:text-purple-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Previous Episode"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>

          <button
            id="btn-next-episode"
            onClick={onNext}
            disabled={!hasNext}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-200 hover:border-purple-500 hover:bg-purple-600/20 hover:text-purple-300 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Next Episode"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Right Control Group */}
      <div className="flex items-center gap-2">
        {/* Report Button */}
        <button
          id="btn-report-issue"
          onClick={onOpenReport}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
          title="Report Broken Episode / Stream Issue"
        >
          <Flag className="h-3.5 w-3.5" />
          <span>Report</span>
        </button>

        {/* Add to List / Watchlist Button */}
        <button
          id="btn-add-watchlist"
          onClick={onToggleWatchlist}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            isWatchlisted
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'border border-white/15 bg-white/5 text-slate-200 hover:border-purple-500 hover:bg-purple-600/20 hover:text-purple-300'
          }`}
          title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          {isWatchlisted ? (
            <>
              <BookmarkCheck className="h-3.5 w-3.5" />
              <span>In Watchlist</span>
            </>
          ) : (
            <>
              <Bookmark className="h-3.5 w-3.5" />
              <span>+ Watchlist</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
