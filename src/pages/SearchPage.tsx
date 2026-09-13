import React, { useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Flame,
  Star,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';
import { AnimeCard } from '../components/AnimeCard';
import { api } from '../services/api';
import { AniListAnime, SearchFilters } from '../types';

interface SearchPageProps {
  key?: string;
  initialQuery?: string;
  initialGenre?: string;
  initialSort?: string;
  initialLetter?: string;
  initialPage?: number;
  navigate: (route: string) => void;
}

export function SearchPage({
  initialQuery = '',
  initialGenre = '',
  initialSort = '',
  initialLetter = '',
  initialPage = 1,
  navigate,
}: SearchPageProps) {
  // Normalize initial sort
  const normalizeSort = (s: string) => {
    const lower = (s || '').toLowerCase();
    if (lower === 'trending') return 'trending';
    if (lower === 'popular' || lower === 'popularity') return 'popularity';
    if (lower === 'score' || lower === 'rating' || lower === 'top_rated') return 'score';
    if (lower === 'latest' || lower === 'newest' || lower === 'new_releases') return 'newest';
    if (lower === 'title') return 'title';
    return 'popularity';
  };

  const [query, setQuery] = useState(
    initialLetter && initialLetter !== 'all'
      ? initialLetter === '0-9'
        ? ''
        : initialLetter
      : initialQuery
  );
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [orderBy, setOrderBy] = useState(normalizeSort(initialSort));
  const [selectedLetter, setSelectedLetter] = useState(initialLetter);
  const [page, setPage] = useState(initialPage || 1);

  const [genresList, setGenresList] = useState<any[]>([]);
  const [results, setResults] = useState<AniListAnime[]>([]);
  const [pageInfo, setPageInfo] = useState<{
    currentPage: number;
    lastPage?: number;
    hasNextPage: boolean;
    total?: number;
  }>({ currentPage: 1, hasNextPage: false });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Load available genres
  useEffect(() => {
    api
      .getGenres()
      .then((g) => {
        const list = g || [];
        setGenresList(list);
        if (selectedGenre) {
          const found = list.find(
            (item: any) =>
              String(item.mal_id) === selectedGenre ||
              String(item.name).toLowerCase() === selectedGenre.toLowerCase()
          );
          if (found) {
            setSelectedGenre(found.name);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Update browser URL query params without full reload
  const syncUrlParams = (
    qVal: string,
    genreVal: string,
    sortVal: string,
    letterVal: string,
    pVal: number
  ) => {
    const params = new URLSearchParams();
    if (qVal.trim()) params.set('q', qVal.trim());
    if (genreVal) params.set('genre', genreVal);
    if (sortVal && sortVal !== 'popularity') params.set('sort', sortVal);
    if (letterVal && letterVal !== 'all') params.set('letter', letterVal);
    if (pVal > 1) params.set('page', String(pVal));

    const qs = params.toString();
    const newUrl = qs ? `/search?${qs}` : '/search';
    window.history.replaceState({}, '', newUrl);
  };

  // Reset page when filters change
  const handleFilterChange = (setter: (val: any) => void, value: any) => {
    setter(value);
    setPage(1);
  };

  const handleLetterClick = (letter: string) => {
    setSelectedLetter(letter);
    if (letter === 'all') {
      setQuery('');
    } else if (letter === '0-9') {
      setQuery('');
    } else {
      setQuery(letter);
    }
    setPage(1);
  };

  // Fetch search results whenever filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      async function doSearch() {
        setIsLoading(true);
        setError(null);
        try {
          syncUrlParams(query, selectedGenre, orderBy, selectedLetter, page);

          const filters: SearchFilters = {
            query: query.trim(),
            genre: selectedGenre,
            type: selectedType,
            status: selectedStatus,
            rating: selectedRating,
            order_by: orderBy,
            sort: orderBy,
            page,
          };
          const data = await api.searchAniList(filters);
          setResults(data.results || []);
          setPageInfo(
            data.pageInfo || {
              currentPage: page,
              hasNextPage: (data.results || []).length >= 20,
            }
          );
        } catch (err: any) {
          setError(err.message || 'Failed to perform anime search.');
        } finally {
          setIsLoading(false);
        }
      }

      doSearch();
    }, 350);

    return () => clearTimeout(timer);
  }, [query, selectedGenre, selectedType, selectedStatus, selectedRating, orderBy, selectedLetter, page]);

  const resetFilters = () => {
    setQuery('');
    setSelectedGenre('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedRating('');
    setOrderBy('popularity');
    setSelectedLetter('');
    setPage(1);
    syncUrlParams('', '', 'popularity', '', 1);
  };

  const goToPage = (newPage: number) => {
    if (newPage < 1) return;
    setPage(newPage);
    syncUrlParams(query, selectedGenre, orderBy, selectedLetter, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white sm:text-3xl flex items-center gap-2 border-l-4 border-rose-600 pl-3">
              <Search className="h-6 w-6 text-rose-500" /> Search & Browse Catalog
            </h1>
            {orderBy === 'trending' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-400 text-xs font-bold">
                <Flame className="h-3.5 w-3.5" /> Trending
              </span>
            )}
            {orderBy === 'score' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Award className="h-3.5 w-3.5" /> Top Rated
              </span>
            )}
            {orderBy === 'newest' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5" /> New Releases
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium pl-4 mt-1">
            Explore thousands of anime series and movies in HD
          </p>
        </div>

        {/* Current Page Badge */}
        {!isLoading && results.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-300 font-bold bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full w-fit">
            <Layers className="h-3.5 w-3.5 text-rose-500" />
            <span>Page {pageInfo.currentPage}</span>
            {pageInfo.total && <span className="text-slate-500">({pageInfo.total} total)</span>}
          </div>
        )}
      </div>

      {/* Quick Sort Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-3">
        <span className="text-xs font-bold uppercase text-slate-400 mr-1">Sort:</span>
        <button
          onClick={() => handleFilterChange(setOrderBy, 'trending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            orderBy === 'trending'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Flame className="h-3.5 w-3.5 text-rose-400" />
          <span>Trending</span>
        </button>

        <button
          onClick={() => handleFilterChange(setOrderBy, 'popularity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            orderBy === 'popularity'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Star className="h-3.5 w-3.5 text-amber-400" />
          <span>Most Popular</span>
        </button>

        <button
          onClick={() => handleFilterChange(setOrderBy, 'score')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            orderBy === 'score'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Award className="h-3.5 w-3.5 text-yellow-400" />
          <span>Top Rated</span>
        </button>

        <button
          onClick={() => handleFilterChange(setOrderBy, 'newest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            orderBy === 'newest'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>New Releases</span>
        </button>

        <button
          onClick={() => handleFilterChange(setOrderBy, 'title')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
            orderBy === 'title'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
              : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-cyan-400" />
          <span>Title (A-Z)</span>
        </button>
      </div>

      {/* A-Z Alphabet Quick Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-white/[0.02] border border-white/5">
        <span className="text-[11px] font-bold text-slate-400 uppercase mr-1 pl-1">A-Z:</span>
        <button
          onClick={() => handleLetterClick('all')}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
            !selectedLetter || selectedLetter === 'all'
              ? 'bg-rose-600 text-white'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          All
        </button>
        <button
          onClick={() => handleLetterClick('0-9')}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
            selectedLetter === '0-9'
              ? 'bg-rose-600 text-white'
              : 'bg-white/5 text-slate-300 hover:bg-white/10'
          }`}
        >
          0-9
        </button>
        {alphabet.map((letter) => (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors cursor-pointer ${
              selectedLetter === letter || query.toUpperCase() === letter
                ? 'bg-rose-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Filter Controls Panel */}
      <div className="rounded-3xl border border-white/5 bg-[#0a0a10] p-5 backdrop-blur-md space-y-4 shadow-xl">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search anime by title, Japanese name, or keyword..."
            value={query}
            onChange={(e) => {
              setSelectedLetter('');
              handleFilterChange(setQuery, e.target.value);
            }}
            className="w-full rounded-full border border-white/10 bg-[#08080c] py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:border-rose-600 focus:outline-none"
          />
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Genre */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => handleFilterChange(setSelectedGenre, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 px-3 text-xs font-bold text-slate-200 focus:border-rose-600 focus:outline-none"
            >
              <option value="">All Genres</option>
              {genresList.map((g) => (
                <option key={g.mal_id || g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Type</label>
            <select
              value={selectedType}
              onChange={(e) => handleFilterChange(setSelectedType, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 px-3 text-xs font-bold text-slate-200 focus:border-rose-600 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="tv">TV Series</option>
              <option value="movie">Movie</option>
              <option value="ova">OVA</option>
              <option value="special">Special</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 px-3 text-xs font-bold text-slate-200 focus:border-rose-600 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="airing">Currently Airing</option>
              <option value="complete">Finished</option>
              <option value="upcoming">Upcoming</option>
            </select>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Rating</label>
            <select
              value={selectedRating}
              onChange={(e) => handleFilterChange(setSelectedRating, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 px-3 text-xs font-bold text-slate-200 focus:border-rose-600 focus:outline-none"
            >
              <option value="">All Ratings</option>
              <option value="g">G - All Ages</option>
              <option value="pg13">PG-13 - Teens</option>
              <option value="r17">R17+ - Adults</option>
            </select>
          </div>

          {/* Order By */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Order By</label>
            <select
              value={orderBy}
              onChange={(e) => handleFilterChange(setOrderBy, e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 px-3 text-xs font-bold text-slate-200 focus:border-rose-600 focus:outline-none"
            >
              <option value="trending">Trending</option>
              <option value="popularity">Most Popular</option>
              <option value="score">Highest Score</option>
              <option value="newest">New Releases</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-2 text-xs font-bold text-slate-300 hover:bg-rose-600 hover:text-white transition-all uppercase cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Search Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 animate-pulse">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-900/80" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-400 mb-2" />
          <h3 className="text-base font-bold text-white">Search Error</h3>
          <p className="text-xs text-slate-400 mt-1">{error}</p>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-950/60 p-12 text-center">
          <Search className="mx-auto h-10 w-10 text-slate-600 mb-2" />
          <h3 className="text-base font-bold text-white">No anime matched your search criteria.</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting keywords or clearing genre filters.</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {results.map((jikanAnime) => (
              <AnimeCard
                key={jikanAnime.mal_id}
                anime={{ mal_id: jikanAnime.mal_id, jikan: jikanAnime }}
                navigate={navigate}
              />
            ))}
          </div>

          {/* Pagination Navigation Bar */}
          <div className="rounded-3xl border border-white/10 bg-[#0a0a10]/95 p-4 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400 font-medium">
              Showing Page <span className="font-bold text-white">{pageInfo.currentPage}</span>
              {pageInfo.lastPage && pageInfo.lastPage > 1 && (
                <span> of <span className="font-bold text-white">{pageInfo.lastPage}</span></span>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-white/5 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {/* Dynamic Page Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pageInfo.lastPage || (pageInfo.hasNextPage ? page + 2 : page)) }).map((_, idx) => {
                  let targetP = page;
                  if (page <= 3) {
                    targetP = idx + 1;
                  } else {
                    targetP = page - 2 + idx;
                  }
                  if (pageInfo.lastPage && targetP > pageInfo.lastPage) return null;
                  if (targetP < 1) return null;

                  return (
                    <button
                      key={targetP}
                      onClick={() => goToPage(targetP)}
                      className={`h-9 w-9 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        targetP === page
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 scale-105'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {targetP}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(page + 1)}
                disabled={!pageInfo.hasNextPage && Boolean(pageInfo.lastPage && page >= pageInfo.lastPage)}
                className="flex items-center gap-1.5 rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <span>Next Page</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
