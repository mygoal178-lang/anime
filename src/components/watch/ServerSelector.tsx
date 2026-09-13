import React from 'react';
import { Server, Mic, Radio, AlertCircle } from 'lucide-react';

export interface ServerOption {
  id: string;
  name: string;
  category: 'SUB' | 'DUB';
  url: string;
  isEmbed?: boolean;
}

interface ServerSelectorProps {
  episodeNumber: number;
  servers: ServerOption[];
  activeServerId: string;
  onSelectServer: (server: ServerOption) => void;
}

export function ServerSelector({
  episodeNumber,
  servers,
  activeServerId,
  onSelectServer,
}: ServerSelectorProps) {
  const subServers = servers.filter((s) => s.category === 'SUB');
  const dubServers = servers.filter((s) => s.category === 'DUB');
  const hasAnyServer = subServers.length > 0 || dubServers.length > 0;

  if (!hasAnyServer) {
    return (
      <div
        id="server-selector-container"
        className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 sm:p-4 text-amber-300 shadow-md backdrop-blur-md"
      >
        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
        <span className="text-xs font-medium">
          No streaming server is available for this episode.
        </span>
      </div>
    );
  }

  return (
    <div
      id="server-selector-container"
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0a0a14] p-3.5 sm:p-4 shadow-md backdrop-blur-md"
    >
      {/* Left Notification Text */}
      <div className="flex items-start gap-2.5 max-w-sm sm:max-w-md">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
          <Server className="h-3.5 w-3.5" />
        </div>
        <div className="text-xs leading-relaxed text-slate-300">
          <span className="font-medium text-slate-400">You're watching </span>
          <strong className="text-white font-bold">Episode {episodeNumber}</strong>.
          <p className="text-[11px] text-slate-400 mt-0.5">
            If current server doesn't work, please try other servers beside.
          </p>
        </div>
      </div>

      {/* Right Server Categories */}
      <div className="flex flex-col gap-2.5 min-w-0">
        {/* SUB Category - Only shown if SUB servers exist */}
        {subServers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-purple-900/40 border border-purple-700/50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-300 shrink-0">
              <Radio className="h-3 w-3" />
              <span>SUB</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {subServers.map((srv) => {
                const isActive = srv.id === activeServerId;
                return (
                  <button
                    key={srv.id}
                    id={`btn-server-${srv.id}`}
                    onClick={() => onSelectServer(srv)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-purple-500/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span>{srv.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* DUB Category - Only shown if DUB servers exist */}
        {dubServers.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 rounded bg-rose-900/40 border border-rose-700/50 px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-rose-300 shrink-0">
              <Mic className="h-3 w-3" />
              <span>DUB</span>
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {dubServers.map((srv) => {
                const isActive = srv.id === activeServerId;
                return (
                  <button
                    key={srv.id}
                    id={`btn-server-${srv.id}`}
                    onClick={() => onSelectServer(srv)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400'
                        : 'border border-white/10 bg-white/5 text-slate-300 hover:border-rose-500/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span>{srv.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
