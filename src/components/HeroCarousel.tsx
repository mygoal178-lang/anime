import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Info,
  Star,
  Heart,
  Film,
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
} from 'lucide-react';
import { animePath, watchPath } from '../lib/seo';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { SiteAnime } from '../types';

export interface HeroCarouselProps {
  items: SiteAnime[];
  navigate: (route: string) => void;
  autoSlideInterval?: number;
}

export function HeroCarousel({
  items,
  navigate,
  autoSlideInterval = 5000,
}: HeroCarouselProps) {
  const { toggleFavorite, isFavorite } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [isHovered, setIsHovered] = useState(false);
  const [isTabVisible, setIsTabVisible] = useState(!document.hidden);
  const [showTrailerModal, setShowTrailerModal] = useState(false);
  const [trailerAnime, setTrailerAnime] = useState<SiteAnime | null>(null);

  // Swipe gesture coordinate refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);

  const totalSlides = items.length;

  // Safe boundary check: if items change, keep index in range
  useEffect(() => {
    if (currentIndex >= totalSlides && totalSlides > 0) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  // Navigate to Next Slide
  const nextSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // Navigate to Previous Slide
  const prevSlide = useCallback(() => {
    if (totalSlides <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Jump to specific slide
  const goToSlide = useCallback(
    (index: number) => {
      if (index === currentIndex || totalSlides <= 1) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex, totalSlides]
  );

  // Listen to browser tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-slide Timer logic:
  // Runs whenever tab is visible, not hovered, trailer not open, and more than 1 slide.
  // Re-creates the clean interval whenever currentIndex changes, ensuring full 5s duration per slide.
  useEffect(() => {
    if (totalSlides <= 1 || isHovered || !isTabVisible || showTrailerModal) {
      return;
    }

    const timer = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => {
      clearInterval(timer);
    };
  }, [totalSlides, isHovered, isTabVisible, showTrailerModal, autoSlideInterval, currentIndex, nextSlide]);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (totalSlides <= 1) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide();
    }
  };

  // Touch Swipe Handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchEndXRef.current = touch.clientX;
    touchEndYRef.current = touch.clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchEndXRef.current = touch.clientX;
    touchEndYRef.current = touch.clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchEndXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndYRef.current === null
    ) {
      return;
    }

    const deltaX = touchStartXRef.current - touchEndXRef.current;
    const deltaY = Math.abs(touchStartYRef.current - touchEndYRef.current);

    // Minimum swipe threshold of 45px, and horizontal movement must clearly exceed vertical movement
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > deltaY * 1.3) {
      if (deltaX > 0) {
        // Swiped Left -> Next Slide
        nextSlide();
      } else {
        // Swiped Right -> Previous Slide
        prevSlide();
      }
    }

    // Reset touch coordinates
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  if (!items || items.length === 0) {
    return (
      <div className="h-96 w-full rounded-2xl sm:rounded-3xl border border-white/5 bg-[#0a0a10] animate-pulse" />
    );
  }

  const currentAnime = items[currentIndex] || items[0];
  const anilist = currentAnime?.anilist || currentAnime?.jikan;
  const local = currentAnime?.local;
  const malId = currentAnime?.mal_id;

  const title = local?.custom_title || anilist?.title_english || anilist?.title || 'Anime';
  const synopsis = local?.custom_description || anilist?.synopsis || 'No description available.';
  const coverUrl =
    local?.custom_banner_url ||
    anilist?.banner_url ||
    local?.custom_cover_url ||
    anilist?.images?.jpg?.large_image_url ||
    anilist?.images?.jpg?.image_url;

  const posterUrl =
    anilist?.images?.jpg?.large_image_url ||
    local?.custom_cover_url ||
    anilist?.images?.jpg?.image_url ||
    coverUrl;

  const score = anilist?.score || (local?.featured ? 9.2 : 8.8);
  const year =
    anilist?.year ||
    (anilist?.aired?.from ? new Date(anilist.aired.from).getFullYear() : '2024');
  const rating = anilist?.rating ? anilist.rating.split(' ')[0] : '13+';
  const genres = anilist?.genres ? anilist.genres.slice(0, 3).map((g: any) => g.name) : [];

  const inWatchlist = isFavorite(malId);
  const latestEp = currentAnime?.latest_episode_number || 1;
  const trailerEmbedUrl = anilist?.trailer?.embed_url;

  const openTrailer = (anime: SiteAnime) => {
    setTrailerAnime(anime);
    setShowTrailerModal(true);
  };

  return (
    <div
      id="anivault-hero-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured Anime Hero Carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0a0a10] shadow-2xl select-none outline-none focus-visible:ring-2 focus-visible:ring-rose-500 min-h-[460px] sm:min-h-[500px]"
    >
      {/* Slide Container with Smooth Animated Transition */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={`hero-slide-${malId}-${currentIndex}`}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 25 : -25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -25 : 25 }}
          transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
          className="relative w-full h-full min-h-[460px] sm:min-h-[500px] flex flex-col justify-between"
        >
          {/* Background Banner Artwork */}
          <div className="absolute inset-0 z-0">
            {coverUrl && (
              <img
                src={coverUrl}
                alt={title}
                className="h-full w-full object-cover object-center opacity-30 blur-xs scale-105 transition-transform duration-700"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-[#08080c] via-[#08080c]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-[#08080c]/50" />
            <div className="absolute inset-0 bg-rose-900/10 mix-blend-overlay z-0" />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 p-5 sm:p-10 lg:p-12 w-full min-w-0 flex-1">
            <div className="max-w-2xl space-y-3.5 w-full min-w-0 pb-10 sm:pb-0">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-rose-600 px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-rose-600/30">
                  {local?.featured ? 'FEATURED SPOTLIGHT' : 'TOP STREAMING'}
                </span>

                {score && (
                  <div className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-black/60 px-2.5 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span>★ {typeof score === 'number' ? score.toFixed(1) : score}</span>
                  </div>
                )}

                <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-xs font-bold text-slate-300 backdrop-blur-md">
                  {year}
                </span>

                <span className="rounded-full border border-white/10 bg-black/60 px-2.5 py-0.5 text-xs font-bold text-rose-400 backdrop-blur-md">
                  {rating}
                </span>

                {totalSlides > 1 && isHovered && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-black/50 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                    <Pause className="h-2.5 w-2.5" /> Paused
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black italic tracking-tighter text-white uppercase drop-shadow-lg leading-tight sm:leading-none break-words max-w-full">
                {title}
              </h1>

              {/* Genre Tags */}
              {genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs font-bold text-rose-400">
                  {genres.map((g: string) => (
                    <span
                      key={g}
                      className="rounded-full bg-rose-950/40 px-2.5 py-0.5 border border-rose-600/20 uppercase tracking-wider text-[10px]"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Synopsis */}
              <p className="line-clamp-3 text-xs sm:text-base text-slate-300 leading-relaxed max-w-xl">
                {synopsis}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3">
                <button
                  onClick={() => navigate(watchPath(malId, latestEp, title))}
                  className="flex items-center gap-2 bg-white text-black px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-xs sm:text-sm hover:bg-rose-600 hover:text-white transition-all transform active:scale-95 shadow-xl cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>WATCH EP {latestEp} NOW</span>
                </button>

                <button
                  onClick={() => navigate(animePath(malId, title))}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm hover:bg-white/20 transition-all cursor-pointer"
                >
                  <Info className="h-4 w-4" />
                  <span>DETAILS</span>
                </button>

                {trailerEmbedUrl && (
                  <button
                    onClick={() => openTrailer(currentAnime)}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 text-rose-400 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-full font-bold text-xs sm:text-sm hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <Film className="h-4 w-4" />
                    <span>TRAILER</span>
                  </button>
                )}

                <button
                  onClick={() => toggleFavorite(malId)}
                  className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border transition-all cursor-pointer ${
                    inWatchlist
                      ? 'border-rose-500 bg-rose-600 text-white'
                      : 'border-white/20 bg-white/10 text-slate-300 hover:border-rose-500 hover:text-rose-400'
                  }`}
                  title={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  aria-label={inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <Heart className={`h-4 w-4 sm:h-5 sm:w-5 ${inWatchlist ? 'fill-white' : ''}`} />
                </button>
              </div>
            </div>

            {/* Poster Card Artwork */}
            <div className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl group/card">
                <img
                  src={posterUrl}
                  alt={title}
                  className="h-72 xl:h-80 w-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#08080c] via-transparent to-transparent opacity-60" />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Manual Desktop Previous / Next Navigation Arrows */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Previous slide"
            className="hidden sm:flex absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/40 hover:bg-rose-600 border border-white/15 text-white backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 shadow-xl opacity-70 hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>

          <button
            onClick={nextSlide}
            aria-label="Next slide"
            className="hidden sm:flex absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/40 hover:bg-rose-600 border border-white/15 text-white backdrop-blur-md transition-all transform hover:scale-110 active:scale-95 shadow-xl opacity-70 hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Dot Indicators at Bottom */}
      {totalSlides > 1 && (
        <div
          className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10"
          role="tablist"
          aria-label="Carousel slides"
        >
          {items.map((item, idx) => {
            const isActive = idx === currentIndex;
            const itemTitle =
              item.local?.custom_title || item.anilist?.title || item.jikan?.title || `Slide ${idx + 1}`;

            return (
              <button
                key={`dot-${item.mal_id || idx}`}
                onClick={() => goToSlide(idx)}
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}: ${itemTitle}`}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 sm:w-8 bg-rose-500 shadow-md shadow-rose-500/50'
                    : 'w-2 sm:w-2.5 bg-white/30 hover:bg-white/70'
                }`}
              />
            );
          })}
        </div>
      )}

      {/* Embedded Trailer Modal */}
      {showTrailerModal && trailerEmbedUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Film className="h-4 w-4 text-rose-500" />{' '}
                {trailerAnime?.local?.custom_title ||
                  trailerAnime?.anilist?.title ||
                  trailerAnime?.jikan?.title ||
                  title}{' '}
                - Official Trailer
              </h3>
              <button
                onClick={() => setShowTrailerModal(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                aria-label="Close trailer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full bg-black">
              <iframe
                src={`${trailerEmbedUrl}?autoplay=1`}
                title={`${title} Trailer`}
                className="h-full w-full"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
