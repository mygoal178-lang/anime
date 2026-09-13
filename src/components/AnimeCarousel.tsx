import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimeCard } from './AnimeCard';
import { SiteAnime } from '../types';

interface AnimeCarouselProps {
  title: string;
  subtitle?: string;
  items: any[];
  navigate: (route: string) => void;
  icon?: React.ReactNode;
}

export function AnimeCarousel({ title, subtitle, items, navigate, icon }: AnimeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="my-8">
      {/* Header & Controls */}
      <div className="mb-4 flex items-end justify-between px-1">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-black italic tracking-tight text-white uppercase sm:text-2xl border-l-4 border-rose-600 pl-3">{title}</h2>
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1 pl-4 font-medium">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-rose-600 hover:bg-rose-600 hover:text-white transition-all"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 hover:border-rose-600 hover:bg-rose-600 hover:text-white transition-all"
            aria-label="Scroll Right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth"
      >
        {items.map((item, idx) => (
          <div key={item.mal_id || item.jikan?.mal_id || `item-${idx}`} className="w-36 flex-shrink-0 sm:w-48 md:w-52">
            <AnimeCard anime={item} navigate={navigate} />
          </div>
        ))}
      </div>
    </section>
  );
}
