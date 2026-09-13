import React from 'react';
import { Play, Tv, Sparkles } from 'lucide-react';

interface FooterProps {
  navigate: (route: string) => void;
}

export function Footer({ navigate }: FooterProps) {
  return (
    <footer className="w-full border-t border-white/5 bg-[#0a0a10] text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 shadow-md shadow-rose-600/30">
                <Play className="h-4 w-4 fill-white text-white ml-0.5" />
              </div>
              <span className="text-lg font-black italic tracking-tighter text-white uppercase">
                Ani<span className="text-rose-500">Vault</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Your premier destination for high-definition anime streaming in full HD.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-bold">
              <Tv className="h-4 w-4 text-rose-500" />
              <span>Full HD 1080p Playback Engine</span>
            </div>
          </div>

          {/* Quick Navigation */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3 border-l-2 border-rose-600 pl-2">
              Explore
            </h4>
            <ul className="space-y-2 text-xs font-bold">
              <li>
                <button onClick={() => navigate('/home')} className="hover:text-rose-400 transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/search')} className="hover:text-rose-400 transition-colors">
                  Popular Anime
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/genres')} className="hover:text-rose-400 transition-colors">
                  Genres & Categories
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/updated')} className="hover:text-rose-400 transition-colors">
                  Recently Updated
                </button>
              </li>
            </ul>
          </div>

          {/* User & Favorites */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3 border-l-2 border-rose-600 pl-2">
              Personal
            </h4>
            <ul className="space-y-2 text-xs font-bold">
              <li>
                <button onClick={() => navigate('/watchlist')} className="hover:text-rose-400 transition-colors">
                  My Watchlist
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/history')} className="hover:text-rose-400 transition-colors">
                  Continue Watching
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/login')} className="hover:text-rose-400 transition-colors">
                  Sign In / Register
                </button>
              </li>
            </ul>
          </div>

          {/* About & Disclaimer */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-200 mb-3 border-l-2 border-rose-600 pl-2">
              About & Terms
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              AniVault provides free high-definition anime streaming for enthusiasts worldwide. All trademarks and content belong to their respective creators.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-rose-400">
              <Sparkles className="h-3 w-3" />
              <span>HD Streaming Ready</span>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} AniVault. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
