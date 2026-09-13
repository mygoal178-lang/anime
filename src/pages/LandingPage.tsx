import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Flame,
  Menu,
  Play,
  Search,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';

interface LandingPageProps {
  navigate: (route: string) => void;
}

const mobileLinks = [
  { label: 'Home', route: '/home', icon: Compass },
  { label: 'Trending', route: '/search?sort=trending', icon: Flame },
  { label: 'New Releases', route: '/search?sort=popular', icon: Sparkles },
  { label: 'Recently Updated', route: '/updated', icon: Sparkles },
];

export function LandingPage({ navigate }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const go = (route: string) => {
    setMenuOpen(false);
    navigate(route);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    go(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  const share = async () => {
    const url = window.location.origin;
    const text = 'Discover anime on AniVault.';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'AniVault', text, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      // User cancelled the native share dialog.
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050507] text-white">
      {/* Ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[38%] h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/10 blur-[120px]" />
        <div className="absolute left-[12%] top-[18%] h-[280px] w-[280px] rounded-full bg-purple-700/10 blur-[100px]" />
        <div className="absolute right-[8%] bottom-[20%] h-[260px] w-[260px] rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_25%,#050507_78%)]" />
      </div>

      {/* Header */}
      <header className="relative z-40 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8 lg:py-7">
        <button
          onClick={() => go('/home')}
          className="group flex items-center gap-2.5"
          aria-label="Open AniVault homepage"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-purple-600 shadow-lg shadow-rose-500/20 transition-transform group-hover:scale-105">
            <Play className="ml-0.5 h-4 w-4 fill-white" />
          </span>
          <span className="text-xl font-black italic tracking-[-0.06em] sm:text-2xl">
            ANI<span className="text-rose-500">VAULT</span>
          </span>
        </button>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
          <button onClick={() => go('/home')} className="transition hover:text-white">Home</button>
          <button onClick={() => go('/search?sort=trending')} className="transition hover:text-white">Trending</button>
          <button onClick={() => go('/search?sort=popular')} className="transition hover:text-white">New Releases</button>
          <button onClick={() => go('/updated')} className="transition hover:text-white">Recently Updated</button>
        </nav>

        <button
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 md:hidden"
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {menuOpen && (
        <div className="relative z-50 mx-5 rounded-2xl border border-white/10 bg-[#0c0c12]/95 p-2 shadow-2xl backdrop-blur-xl md:hidden">
          {mobileLinks.map(({ label, route, icon: Icon }) => (
            <button
              key={label}
              onClick={() => go(route)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/5"
            >
              <Icon className="h-4 w-4 text-rose-400" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-86px)] w-full max-w-6xl flex-col items-center px-5 pb-10 pt-3 text-center sm:px-8 sm:pt-5">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 sm:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,.8)]" />
          Watch anime online in HD
        </div>

        <form onSubmit={handleSearch} className="relative z-30 w-full max-w-xl">
          <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.055] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl focus-within:border-rose-500/50 focus-within:ring-4 focus-within:ring-rose-500/10">
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime, characters, or titles..."
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              aria-label="Search anime"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-950 transition hover:bg-rose-500 hover:text-white sm:px-5"
            >
              Search <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {/* Uploaded Zoro artwork — transparent cutout, no card/background */}
        <div className="relative mt-2 flex w-full flex-1 items-center justify-center sm:mt-0">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[270px] w-[270px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/10 blur-[85px] sm:h-[380px] sm:w-[380px]" />
          <img
            src="/landing/zoro-user-cutout.png"
            alt="Zoro anime character artwork"
            loading="eager"
            fetchPriority="high"
            className="relative z-10 w-[min(92vw,560px)] max-h-[54vh] object-contain drop-shadow-[0_28px_38px_rgba(0,0,0,.72)]"
          />
        </div>

        <div className="relative z-20 -mt-2 sm:-mt-5">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white sm:text-3xl">
            Discover Your Next Anime
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-slate-400 sm:text-sm">
            Search thousands of anime titles, find new releases, and continue watching from one clean place.
          </p>
          <button
            onClick={() => go('/home')}
            className="group mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-7 py-3.5 text-xs font-black uppercase tracking-[0.08em] text-slate-950 shadow-[0_12px_35px_rgba(245,158,11,.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_45px_rgba(245,158,11,.4)] active:scale-95 sm:px-9 sm:text-sm"
          >
            Enter AniVault
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.025] px-3 py-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> HD streaming
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.025] px-3 py-1.5">
            <Check className="h-3 w-3 text-emerald-400" /> Watchlist & history
          </span>
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/5 bg-white/[0.025] px-3 py-1.5 transition hover:bg-white/5">
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3" />}
            {copied ? 'Copied' : 'Share'}
          </button>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-5 py-4 text-center text-[10px] text-slate-600">
        © {new Date().getFullYear()} AniVault · Anime discovery and streaming platform
      </footer>
    </div>
  );
}
