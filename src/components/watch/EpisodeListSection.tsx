import React, { useState, useMemo } from 'react';
import { Play, Search, Filter, Layers, ChevronDown } from 'lucide-react';
import { LocalEpisodeRecord } from '../../types';

interface EpisodeListSectionProps {
  animeMalId: number;
  currentEpNum: number;
  episodes: LocalEpisodeRecord[];
  onSelectEpisode: (epNum: number) => void;
}

export function EpisodeListSection({
  animeMalId,
  currentEpNum,
  episodes,
  onSelectEpisode,
}: EpisodeListSectionProps) {
  const [filterType, setFilterType] = useState<'all' | 'sub' | 'dub'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRangeIndex, setSelectedRangeIndex] = useState(0);

  const RANGE_SIZE = 100;

  // Calculate episode chunks for range dropdown (e.g. 001-100, 101-200)
  const ranges = useMemo(() => {
    if (!episodes || episodes.length === 0) return [{ label: '001-100', start: 1, end: 100 }];
    const maxEp = Math.max(...episodes.map((e) => e.episode_number), episodes.length);
    const chunkCount = Math.ceil(maxEp / RANGE_SIZE);
    const result = [];
    for (let i = 0; i < chunkCount; i++) {
      const start = i * RANGE_SIZE + 1;
      const end = (i + 1) * RANGE_SIZE;
      const padStart = String(start).padStart(3, '0');
      const padEnd = String(end).padStart(3, '0');
      result.push({
        label: `${padStart}-${padEnd}`,
        start,
        end,
      });
    }
    return result;
  }, [episodes]);

  // If current episode is in a specific range, default to that range index
  React.useEffect(() => {
    const matchingIdx = ranges.findIndex((r) => currentEpNum >= r.start && currentEpNum <= r.end);
    if (matchingIdx >= 0) {
      setSelectedRangeIndex(matchingIdx);
    }
  }, [currentEpNum, ranges]);

  const currentRange = ranges[selectedRangeIndex] || ranges[0];

  // Filter episodes based on search query and range
  const filteredEpisodes = useMemo(() => {
    return episodes.filter((ep) => {
      // Range filter (if no active search query)
      if (!searchQuery.trim()) {
        if (ep.episode_number < currentRange.start || ep.episode_number > currentRange.end) {
          return false;
        }
      } else {
        const q = searchQuery.trim().toLowerCase();
        const numMatch = String(ep.episode_number).includes(q);
        const titleMatch = (ep.title || '').toLowerCase().includes(q);
        if (!numMatch && !titleMatch) return false;
      }
      return true;
    });
  }, [episodes, searchQuery, currentRange]);

  return (
    <div
      id="episode-list-section"
      className="rounded-xl border border-white/10 bg-[#0d0d15] p-3.5 sm:p-4 shadow-lg backdrop-blur-md space-y-3"
    >
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/10 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sub / Dub filter dropdown */}
          <div className="relative inline-block">
            <select
              id="select-audio-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="appearance-none rounded-lg border border-white/15 bg-[#141420] px-3 py-1.5 pr-8 text-xs font-semibold text-slate-200 hover:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              <option value="all">Sub & Dub</option>
              <option value="sub">Sub Only</option>
              <option value="dub">Dub Only</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Episode Range Dropdown */}
          {ranges.length > 1 && (
            <div className="relative inline-block">
              <select
                id="select-episode-range"
                value={selectedRangeIndex}
                onChange={(e) => setSelectedRangeIndex(Number(e.target.value))}
                className="appearance-none rounded-lg border border-white/15 bg-[#141420] px-3 py-1.5 pr-8 text-xs font-semibold text-slate-200 hover:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                {ranges.map((r, idx) => (
                  <option key={idx} value={idx}>
                    EPS: {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}
        </div>

        {/* Search / Find episode number input */}
        <div className="relative min-w-[140px] sm:min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            id="input-find-episode"
            type="text"
            placeholder="Find number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/15 bg-[#141420] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Episode Items List View */}
      <div
        id="episode-rows-container"
        className="space-y-1.5 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-black/40"
      >
        {filteredEpisodes.length > 0 ? (
          filteredEpisodes.map((ep) => {
            const isActive = ep.episode_number === currentEpNum;
            return (
              <div
                key={ep.id || `ep-${ep.episode_number}`}
                id={`episode-row-${ep.episode_number}`}
                onClick={() => onSelectEpisode(ep.episode_number)}
                className={`group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white font-semibold shadow-md shadow-purple-600/30'
                    : 'bg-[#12121c] text-slate-300 hover:bg-[#1c1c2b] hover:text-white border border-white/5'
                }`}
              >
                {/* Left: Episode Number & Title */}
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`flex h-6 min-w-[24px] px-1.5 items-center justify-center rounded text-xs font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-950/60 text-purple-400 group-hover:bg-purple-900 group-hover:text-purple-300'
                    }`}
                  >
                    {ep.episode_number}
                  </span>

                  <span className="truncate text-xs tracking-wide">
                    {ep.title ? ep.title : `Episode ${ep.episode_number}`}
                  </span>
                </div>

                {/* Right: Active Play Icon or Status */}
                <div className="flex items-center gap-2 shrink-0">
                  {isActive && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-purple-700 shadow">
                      <Play className="h-3 w-3 fill-purple-700 ml-0.5" />
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            No episodes matched "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
}
