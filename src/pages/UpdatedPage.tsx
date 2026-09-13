import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Filter as FilterIcon,
  RotateCcw,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  X,
  Flame,
} from 'lucide-react';
import { api } from '../services/api';
import { AniListAnime, SearchFilters } from '../types';
import { UpdatedAnimeCard } from '../components/UpdatedAnimeCard';
import { TopRatedSidebar } from '../components/TopRatedSidebar';

interface UpdatedPageProps {
  navigate: (route: string) => void;
}

const GENRE_OPTIONS = [
  'All',
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

const COUNTRY_OPTIONS = [
  { label: 'All Countries', value: 'all' },
  { label: 'Japan (JP)', value: 'JP' },
  { label: 'China (CN)', value: 'CN' },
  { label: 'South Korea (KR)', value: 'KR' },
  { label: 'Taiwan (TW)', value: 'TW' },
];

const SEASON_OPTIONS = [
  { label: 'All Seasons', value: 'all' },
  { label: 'Winter', value: 'WINTER' },
  { label: 'Spring', value: 'SPRING' },
  { label: 'Summer', value: 'SUMMER' },
  { label: 'Fall', value: 'FALL' },
];

const YEAR_OPTIONS = [
  'All',
  '2026',
  '2025',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2010',
  '2000',
];

const TYPE_OPTIONS = [
  { label: 'All Types', value: 'all' },
  { label: 'TV Series', value: 'TV' },
  { label: 'Movie', value: 'MOVIE' },
  { label: 'OVA', value: 'OVA' },
  { label: 'ONA', value: 'ONA' },
  { label: 'Special', value: 'SPECIAL' },
  { label: 'Music', value: 'MUSIC' },
];

const STATUS_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Currently Airing', value: 'airing' },
  { label: 'Finished Airing', value: 'complete' },
  { label: 'Upcoming', value: 'upcoming' },
];

const LANGUAGE_OPTIONS = [
  { label: 'All Audio', value: 'all' },
  { label: 'Subbed (JP)', value: 'sub' },
  { label: 'Dubbed (EN)', value: 'dub' },
  { label: 'Sub & Dub', value: 'both' },
];

const RATING_OPTIONS = [
  { label: 'All Ratings', value: 'all' },
  { label: '9+ Stars (Masterpiece)', value: '9' },
  { label: '8+ Stars (Great)', value: '8' },
  { label: '7+ Stars (Good)', value: '7' },
  { label: '6+ Stars (Average)', value: '6' },
];

const SORT_OPTIONS = [
  { label: 'Recently updated', value: 'recently_updated' },
  { label: 'Newest Added', value: 'newest' },
  { label: 'Highest Rated', value: 'score' },
  { label: 'Most Popular', value: 'popularity' },
  { label: 'Trending Now', value: 'trending' },
  { label: 'Most Favorited', value: 'favourites' },
];

export function UpdatedPage({ navigate }: UpdatedPageProps) {
  // Read initial params from URL if available
  const getUrlParams = () => {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    return {
      q: p.get('q') || '',
      genre: p.get('genre') || 'all',
      country: p.get('country') || 'all',
      season: p.get('season') || 'all',
      year: p.get('year') || 'all',
      type: p.get('type') || 'all',
      status: p.get('status') || 'all',
      language: p.get('language') || 'all',
      rating: p.get('rating') || 'all',
      sort: p.get('sort') || 'recently_updated',
      page: Number(p.get('page')) || 1,
    };
  };

  const initialUrl = getUrlParams();

  // Filter states
  const [searchQuery, setSearchQuery] = useState(initialUrl.q || '');
  const [selectedGenre, setSelectedGenre] = useState(initialUrl.genre || 'all');
  const [selectedCountry, setSelectedCountry] = useState(initialUrl.country || 'all');
  const [selectedSeason, setSelectedSeason] = useState(initialUrl.season || 'all');
  const [selectedYear, setSelectedYear] = useState(initialUrl.year || 'all');
  const [selectedType, setSelectedType] = useState(initialUrl.type || 'all');
  const [selectedStatus, setSelectedStatus] = useState(initialUrl.status || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState(initialUrl.language || 'all');
  const [selectedRating, setSelectedRating] = useState(initialUrl.rating || 'all');
  const [selectedSort, setSelectedSort] = useState(initialUrl.sort || 'recently_updated');
  const [currentPage, setCurrentPage] = useState(initialUrl.page || 1);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Data states
  const [animeList, setAnimeList] = useState<AniListAnime[]>([]);
  const [topRatedAnime, setTopRatedAnime] = useState<AniListAnime[]>([]);
  const [pageInfo, setPageInfo] = useState<{
    currentPage: number;
    lastPage?: number;
    hasNextPage: boolean;
    total?: number;
  }>({
    currentPage: 1,
    hasNextPage: true,
    total: 9637,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isTopRatedLoading, setIsTopRatedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state with URL without full reload
  const syncUrl = useCallback(
    (pageNumber: number) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedGenre !== 'all') params.set('genre', selectedGenre);
      if (selectedCountry !== 'all') params.set('country', selectedCountry);
      if (selectedSeason !== 'all') params.set('season', selectedSeason);
      if (selectedYear !== 'all') params.set('year', selectedYear);
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);
      if (selectedLanguage !== 'all') params.set('language', selectedLanguage);
      if (selectedRating !== 'all') params.set('rating', selectedRating);
      if (selectedSort !== 'recently_updated') params.set('sort', selectedSort);
      if (pageNumber > 1) params.set('page', String(pageNumber));

      const queryStr = params.toString();
      const newUrl = queryStr ? `/updated?${queryStr}` : '/updated';
      window.history.replaceState({}, '', newUrl);
    },
    [
      searchQuery,
      selectedGenre,
      selectedCountry,
      selectedSeason,
      selectedYear,
      selectedType,
      selectedStatus,
      selectedLanguage,
      selectedRating,
      selectedSort,
    ]
  );

  // Fetch updated catalog anime
  const fetchAnime = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setError(null);

      try {
        const filters: SearchFilters = {
          query: searchQuery.trim() || undefined,
          genre: selectedGenre !== 'all' ? selectedGenre : undefined,
          country: selectedCountry !== 'all' ? selectedCountry : undefined,
          season: selectedSeason !== 'all' ? selectedSeason : undefined,
          year: selectedYear !== 'all' ? selectedYear : undefined,
          type: selectedType !== 'all' ? selectedType : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          rating: selectedRating !== 'all' ? selectedRating : undefined,
          sort: selectedSort,
          page: pageToLoad,
          perPage: 24,
        };

        const res = await api.getUpdatedAnimeCatalog(filters);
        setAnimeList(res.results || []);
        setPageInfo({
          currentPage: res.pageInfo?.currentPage || pageToLoad,
          lastPage: res.pageInfo?.lastPage,
          hasNextPage: res.pageInfo?.hasNextPage ?? false,
          total: res.pageInfo?.total ?? res.results?.length ?? 0,
        });
        setCurrentPage(pageToLoad);
        syncUrl(pageToLoad);
      } catch (err: any) {
        console.error('Failed to load updated anime:', err);
        setError('Unable to load anime catalog. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [
      searchQuery,
      selectedGenre,
      selectedCountry,
      selectedSeason,
      selectedYear,
      selectedType,
      selectedStatus,
      selectedRating,
      selectedSort,
      syncUrl,
    ]
  );

  // Fetch top rated anime once for right sidebar
  useEffect(() => {
    let isMounted = true;
    async function loadTopRated() {
      setIsTopRatedLoading(true);
      try {
        const res = await api.getTopRatedAnime(1);
        if (isMounted) {
          setTopRatedAnime(res || []);
        }
      } catch (e) {
        console.error('Failed to load top rated sidebar:', e);
      } finally {
        if (isMounted) setIsTopRatedLoading(false);
      }
    }
    loadTopRated();
    return () => {
      isMounted = false;
    };
  }, []);

  // Trigger catalog fetch on mount or page change
  useEffect(() => {
    fetchAnime(currentPage);
  }, []); // Initial load

  // Form submit handler for filters
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCurrentPage(1);
    fetchAnime(1);
    setShowMobileFilters(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGenre('all');
    setSelectedCountry('all');
    setSelectedSeason('all');
    setSelectedYear('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSelectedLanguage('all');
    setSelectedRating('all');
    setSelectedSort('recently_updated');
    setCurrentPage(1);

    // Fetch default
    setIsLoading(true);
    api
      .getUpdatedAnimeCatalog({ page: 1, perPage: 24, sort: 'recently_updated' })
      .then((res) => {
        setAnimeList(res.results || []);
        setPageInfo({
          currentPage: 1,
          hasNextPage: res.pageInfo?.hasNextPage ?? false,
          total: res.pageInfo?.total ?? res.results?.length ?? 0,
        });
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', '/updated');
        }
      })
      .catch((err) => {
        setError('Failed to reset anime list.');
      })
      .finally(() => setIsLoading(false));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return;
    setCurrentPage(newPage);
    fetchAnime(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Count active non-default filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedGenre !== 'all') count++;
    if (selectedCountry !== 'all') count++;
    if (selectedSeason !== 'all') count++;
    if (selectedYear !== 'all') count++;
    if (selectedType !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedLanguage !== 'all') count++;
    if (selectedRating !== 'all') count++;
    if (selectedSort !== 'recently_updated') count++;
    return count;
  }, [
    searchQuery,
    selectedGenre,
    selectedCountry,
    selectedSeason,
    selectedYear,
    selectedType,
    selectedStatus,
    selectedLanguage,
    selectedRating,
    selectedSort,
  ]);

  return (
    <div className="min-h-screen bg-[#08080c] py-6 sm:py-8 px-3.5 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* 1. Page Title & Header */}
      <div className="mb-6 sm:mb-8 border-b border-white/5 pb-4 sm:pb-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-rose-600/10 px-3 py-1 text-xs font-bold text-rose-400 border border-rose-500/20 mb-2.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Fresh Broadcast Releases</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
          Recently Updated Anime <span className="text-rose-500 font-bold text-lg sm:text-2xl">— Fresh Episodes Added Daily</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Fresh episodes and recently updated anime streaming in ultra-high definition.
        </p>
      </div>

      {/* 2. Filter Bar Section (Faithful to reference layout) */}
      <div className="mb-8 rounded-2xl border border-white/5 bg-[#0a0a10] p-4 sm:p-5 shadow-xl">
        {/* Mobile Header Filter Toggle */}
        <div className="flex sm:hidden items-center justify-between gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
              placeholder="Search anime..."
              className="w-full h-11 pl-9 pr-8 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className={`flex h-11 items-center gap-1.5 px-3.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
              showMobileFilters || activeFilterCount > 0
                ? 'border-rose-500 bg-rose-600/20 text-rose-400'
                : 'border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter Form (Desktop Row Layout & Mobile Collapsible) */}
        <form
          onSubmit={handleApplyFilter}
          className={`space-y-3 sm:space-y-3.5 ${showMobileFilters ? 'block' : 'hidden sm:block'}`}
        >
          {/* Row 1: Search, Genre, Country, Season, Year, Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Desktop Search Field */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                id="filter-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full h-10 pl-8 pr-7 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Genre Select */}
            <div>
              <select
                id="filter-genre-select"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                <option value="all" className="bg-[#12121c] text-slate-300">
                  Genre: All
                </option>
                {GENRE_OPTIONS.filter((g) => g !== 'All').map((genre) => (
                  <option key={genre} value={genre} className="bg-[#12121c] text-white">
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Select */}
            <div>
              <select
                id="filter-country-select"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value} className="bg-[#12121c] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Select */}
            <div>
              <select
                id="filter-season-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {SEASON_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#12121c] text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Select */}
            <div>
              <select
                id="filter-year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                <option value="all" className="bg-[#12121c] text-slate-300">
                  Year: All
                </option>
                {YEAR_OPTIONS.filter((y) => y !== 'All').map((year) => (
                  <option key={year} value={year} className="bg-[#12121c] text-white">
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Select */}
            <div>
              <select
                id="filter-type-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value} className="bg-[#12121c] text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Status, Language, Rating, Sort, Filter Button */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {/* Status Select */}
            <div>
              <select
                id="filter-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value} className="bg-[#12121c] text-white">
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Language Select */}
            <div>
              <select
                id="filter-language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value} className="bg-[#12121c] text-white">
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Select */}
            <div>
              <select
                id="filter-rating-select"
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {RATING_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value} className="bg-[#12121c] text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Select (Defaults to Recently updated) */}
            <div className="lg:col-span-2">
              <select
                id="filter-sort-select"
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value} className="bg-[#12121c] text-white">
                    Sort: {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons: Filter & Clear */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                id="filter-submit-button"
                className="flex-1 h-10 flex items-center justify-center gap-1.5 rounded-xl bg-[#5c3cd6] hover:bg-[#6c4be8] active:scale-95 text-white text-xs font-bold shadow-lg shadow-[#5c3cd6]/25 transition-all"
              >
                <FilterIcon className="h-3.5 w-3.5 fill-white" />
                <span>Filter</span>
              </button>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  id="filter-reset-button"
                  title="Reset Filters"
                  className="h-10 px-3 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* 3. Catalog Header (Items Count & View Switcher) */}
      <div className="flex items-center justify-between gap-4 mb-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-black text-slate-200 uppercase tracking-wider">
            {pageInfo.total ? `${pageInfo.total.toLocaleString()} Items` : `${animeList.length} Items`}
          </span>
          {activeFilterCount > 0 && (
            <span className="hidden sm:inline-block text-[11px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              Filtered ({activeFilterCount})
            </span>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('grid')}
            title="Grid View"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List View"
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 4. Main Two-Column Layout (75% Grid / 25% Sidebar on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column: Anime Grid/List (Col span 9 on LG) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">
          {/* Error State with Retry Button */}
          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-8 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Unable to load anime</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">{error}</p>
              <button
                onClick={() => fetchAnime(currentPage)}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-rose-700 active:scale-95 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          ) : isLoading ? (
            /* Loading Skeletons */
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                {Array.from({ length: 18 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a10] animate-pulse"
                  >
                    <div className="aspect-[3/4] w-full bg-white/5" />
                    <div className="p-3 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-white/10" />
                      <div className="h-2.5 w-1/2 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-[#0a0a10] animate-pulse"
                  >
                    <div className="h-20 w-16 rounded-xl bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-1/2 rounded bg-white/10" />
                      <div className="h-3 w-1/4 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : animeList.length === 0 ? (
            /* Empty State */
            <div className="py-16 text-center rounded-2xl border border-white/5 bg-[#0a0a10] p-8">
              <Search className="mx-auto h-12 w-12 text-slate-600 mb-3" />
              <h3 className="text-base font-bold text-white">No anime found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Try changing your search terms or adjusting the filters above.
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>
          ) : (
            /* Anime Results Render */
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                  {animeList.map((anime) => (
                    <UpdatedAnimeCard
                      key={anime.mal_id || anime.id}
                      anime={anime}
                      navigate={navigate}
                      viewMode="grid"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5 sm:space-y-3">
                  {animeList.map((anime) => (
                    <UpdatedAnimeCard
                      key={anime.mal_id || anime.id}
                      anime={anime}
                      navigate={navigate}
                      viewMode="list"
                    />
                  ))}
                </div>
              )}

              {/* 5. Pagination Controls */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-6 border-t border-white/5 flex-wrap">
                {/* Prev Button */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading}
                  className="flex h-9 sm:h-10 items-center gap-1 px-3 sm:px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: 5 }).map((_, i) => {
                  const pNum = Math.max(1, currentPage - 2) + i;
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      disabled={isLoading}
                      className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl text-xs font-black transition-all active:scale-95 ${
                        pNum === currentPage
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                          : 'border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {/* Next Button */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pageInfo.hasNextPage || isLoading}
                  className="flex h-9 sm:h-10 items-center gap-1 px-3 sm:px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Top Rated Sidebar (Col span 3 on LG, stacks below on mobile/tablet) */}
        <div className="lg:col-span-4 xl:col-span-3">
          <div className="sticky top-24">
            <TopRatedSidebar
              animeList={topRatedAnime}
              isLoading={isTopRatedLoading}
              navigate={navigate}
              title="Top rated anime"
              subtitle="Based on global community rating"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
