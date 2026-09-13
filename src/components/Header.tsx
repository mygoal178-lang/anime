import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getSafeAvatar, DEFAULT_FALLBACK_AVATAR } from '../lib/avatars';
import {
  Search,
  Play,
  Heart,
  History,
  Shield,
  LogOut,
  User,
  Menu,
  X,
  Compass,
  Sparkles,
  ChevronDown,
  Bell,
  Film,
} from 'lucide-react';

interface HeaderProps {
  currentRoute?: string;
  currentPath?: string;
  navigate: (route: string) => void;
}

export function Header({ currentRoute, currentPath, navigate }: HeaderProps) {
  const activeRoute = currentRoute || currentPath || '/';
  const { user, isAdmin, logout, favorites } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const navMenuRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns and hamburger menu on click outside or Escape key press
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(event.target as Node)) {
        setIsNavMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNavMenuOpen(false);
        setIsUserDropdownOpen(false);
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsNavMenuOpen(false);
      setIsMobileSearchOpen(false);
    } else {
      navigate('/search');
      setIsNavMenuOpen(false);
      setIsMobileSearchOpen(false);
    }
  };

  const handleNavClick = (route: string) => {
    navigate(route);
    setIsNavMenuOpen(false);
  };

  // Nav menu items shown exclusively inside the ☰ Hamburger Drawer/Dropdown
  const menuItems = [
    { label: 'Home', route: '/home', icon: Compass, description: 'Explore trending & top anime' },
    { label: 'Genres', route: '/genres', icon: Sparkles, description: 'Action, Shonen, Romance & more' },
    {
      label: 'Watchlist',
      route: '/watchlist',
      icon: Heart,
      description: 'Your bookmarked anime shows',
      badge: favorites.length > 0 ? favorites.length : undefined,
    },
    { label: 'Updates', route: '/updated', icon: Bell, description: 'Fresh episode releases & seasonals' },
    { label: 'History', route: '/history', icon: History, description: 'Resume playback & past watched' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#08080c]/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 w-full min-w-0">
        
        {/* ========================================================================= */}
        {/* LEFT SECTION: ☰ Hamburger Button + Brand Logo (No permanently visible links) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0" ref={navMenuRef}>
          {/* Hamburger Menu Button (☰) */}
          <div className="relative">
            <button
              id="hamburger-nav-btn"
              onClick={() => {
                setIsNavMenuOpen(!isNavMenuOpen);
                setIsUserDropdownOpen(false);
              }}
              aria-label="Navigation Menu"
              aria-expanded={isNavMenuOpen}
              className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border transition-all active:scale-95 shrink-0 ${
                isNavMenuOpen
                  ? 'border-rose-500 bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-rose-500/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isNavMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* ☰ Opened Navigation Menu (Desktop Popover Dropdown & Mobile Slide Panel) */}
            {isNavMenuOpen && (
              <div
                id="hamburger-nav-menu"
                className="absolute left-0 mt-2.5 w-72 sm:w-80 rounded-2xl border border-white/10 bg-[#0a0a10]/98 p-2.5 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 z-50"
              >
                <div className="px-3 py-2 border-b border-white/5 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-500">
                      AniVault Menu
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Press Esc to close</span>
                </div>

                <div className="flex flex-col gap-1">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      activeRoute === item.route ||
                      (item.route === '/updated' && (activeRoute === '/updated' || activeRoute === '/updates'));
                    return (
                      <button
                        key={item.label}
                        id={`nav-menu-item-${item.label.toLowerCase()}`}
                        onClick={() => handleNavClick(item.route)}
                        className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-left transition-all min-h-[44px] ${
                          isActive
                            ? 'bg-rose-600/20 text-rose-400 border border-rose-600/30 shadow-sm'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                              isActive
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                                : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-rose-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`text-xs sm:text-sm font-bold ${isActive ? 'text-rose-400' : 'text-slate-200 group-hover:text-white'}`}>
                              {item.label}
                            </p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {item.badge !== undefined && (
                          <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Protected Admin link inside menu */}
                  {isAdmin && (
                    <>
                      <div className="my-1 border-t border-white/5" />
                      <button
                        id="nav-menu-item-admin"
                        onClick={() => handleNavClick('/admin')}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-rose-400 hover:bg-rose-600/10 transition-all min-h-[44px] ${
                          activeRoute === '/admin' ? 'bg-rose-600/20 border border-rose-600/30' : ''
                        }`}
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400">
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold">Admin CMS Dashboard</p>
                          <p className="text-[10px] text-rose-500/70">Manage anime, episodes & site</p>
                        </div>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AniVault Brand Logo */}
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none shrink-0"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-rose-600 shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform shrink-0">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl font-black italic tracking-tighter text-white uppercase group-hover:text-rose-500 transition-colors leading-none">
                Ani<span className="text-rose-500">Vault</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-rose-400/80 uppercase mt-1">
                HD Anime
              </span>
            </div>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CENTER SECTION: Search Box (Desktop) */}
        {/* ========================================================================= */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4 max-w-sm lg:max-w-md mx-auto">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search anime title, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-8 text-xs text-white placeholder-slate-400 transition-all focus:border-rose-600 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-rose-600/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT SECTION: Search Icon (Mobile) + Authentication / Account Controls */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 md:hidden active:scale-95 shrink-0 hover:text-white"
            title="Search Anime"
          >
            <Search className="h-4 w-4 text-rose-500" />
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              {/* Admin Button (Only visible to authenticated administrators on desktop) */}
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  title="Admin Dashboard"
                  className={`hidden sm:flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                    activeRoute === '/admin'
                      ? 'border-rose-500 bg-rose-600/20 text-rose-400 shadow-sm'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-rose-500/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5 text-rose-500" />
                  <span>Admin</span>
                </button>
              )}

              {/* User Account / Profile Dropdown */}
              <div className="relative" ref={userRef}>
                <button
                  id="user-profile-menu-btn"
                  onClick={() => {
                    setIsUserDropdownOpen(!isUserDropdownOpen);
                    setIsNavMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-full border p-1 sm:pl-3 sm:pr-2 transition-all group ${
                    isUserDropdownOpen
                      ? 'border-rose-500 bg-rose-600/20 shadow-lg shadow-rose-600/20'
                      : 'border-white/10 bg-white/5 hover:border-rose-500/40 hover:bg-white/10'
                  }`}
                  title={`${user.name} Account Menu`}
                >
                  <img
                    src={getSafeAvatar(user.avatar, user.id || user.email)}
                    alt={user.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith(DEFAULT_FALLBACK_AVATAR)) {
                        target.src = DEFAULT_FALLBACK_AVATAR;
                      }
                    }}
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-rose-500/70 bg-slate-900 object-cover shrink-0 shadow-md shadow-rose-600/30 group-hover:scale-105 transition-transform"
                  />
                  <span className="hidden sm:inline text-xs font-bold text-slate-200 max-w-[100px] lg:max-w-[140px] truncate group-hover:text-white">
                    {user.name}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-white transition-colors" />
                </button>

                {/* User Dropdown Menu */}
                {isUserDropdownOpen && (
                  <div
                    id="user-profile-dropdown"
                    className="absolute right-0 mt-2.5 w-64 rounded-3xl border border-white/10 bg-[#0a0a10]/98 p-3 shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 z-50"
                    onClick={() => setIsUserDropdownOpen(false)}
                  >
                    {/* User Header with Large Anime Avatar */}
                    <div className="flex items-center gap-3 p-2 border-b border-white/5 mb-2">
                      <div className="relative shrink-0">
                        <img
                          src={getSafeAvatar(user.avatar, user.id || user.email)}
                          alt={user.name}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.src.endsWith(DEFAULT_FALLBACK_AVATAR)) {
                              target.src = DEFAULT_FALLBACK_AVATAR;
                            }
                          }}
                          className="h-11 w-11 rounded-full border-2 border-rose-500 bg-slate-900 object-cover shadow-lg shadow-rose-600/20"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#0a0a10]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                        {isAdmin && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-rose-600/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-rose-400 border border-rose-600/30">
                            <Shield className="h-2.5 w-2.5" /> Administrator
                          </span>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => navigate('/admin')}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600/10 transition-colors"
                      >
                        <Shield className="h-4 w-4 text-rose-500" />
                        Admin Dashboard
                      </button>
                    )}

                    <button
                      onClick={() => navigate('/watchlist')}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <Heart className="h-4 w-4 text-rose-500" />
                      Watchlist
                      {favorites.length > 0 && (
                        <span className="ml-auto rounded-full bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white">
                          {favorites.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => navigate('/history')}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                    >
                      <History className="h-4 w-4 text-slate-400" />
                      Watch History
                    </button>

                    <div className="my-1.5 border-t border-white/5" />

                    <button
                      onClick={logout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-600/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 rounded-full bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-black text-white shadow-lg shadow-rose-600/20 transition-all shrink-0 active:scale-95"
            >
              <User className="h-3.5 w-3.5" />
              <span>SIGN IN</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE QUICK SEARCH BAR (SLIDE-DOWN) */}
      {/* ========================================================================= */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#0a0a10]/98 px-4 py-3 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-rose-500 pointer-events-none" />
            <input
              type="text"
              autoFocus
              placeholder="Search anime title or genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-rose-500/30 bg-white/5 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-400 focus:border-rose-500 focus:bg-white/10 focus:outline-none shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      )}
    </header>
  );
}


