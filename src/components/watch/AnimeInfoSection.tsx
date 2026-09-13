import React from 'react';
import { AniListAnime, LocalAnimeRecord } from '../../types';
import { Calendar, Clock, Film, Star, Tag, Tv, Users, Shield } from 'lucide-react';

interface AnimeInfoSectionProps {
  animeMeta?: AniListAnime;
  localAnime?: LocalAnimeRecord | null;
  totalEpisodes: number;
  navigate: (route: string) => void;
}

export function AnimeInfoSection({
  animeMeta,
  localAnime,
  totalEpisodes,
  navigate,
}: AnimeInfoSectionProps) {
  const title =
  localAnime?.custom_title ||
  localAnime?.title ||
  (typeof animeMeta?.title === 'object'
    ? animeMeta?.title_english ||
      animeMeta?.title?.english ||
      animeMeta?.title?.userPreferred ||
      animeMeta?.title?.romaji
    : animeMeta?.title_english || animeMeta?.title) ||
  'Anime';
    const japaneseTitle =
    typeof animeMeta?.title === 'object'
      ? animeMeta?.title_japanese || animeMeta?.title?.native
      : animeMeta?.title_japanese;

const coverUrl =
  localAnime?.custom_cover_url ||
  localAnime?.cover_url ||
  animeMeta?.coverImage?.large ||
  animeMeta?.coverImage?.extraLarge ||
  animeMeta?.images?.jpg?.large_image_url ||
  animeMeta?.images?.jpg?.image_url ||
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop';

const synopsis =
  localAnime?.custom_description ||
  localAnime?.description ||
  animeMeta?.description ||
  animeMeta?.synopsis ||
  'No synopsis available.';
  const score = animeMeta?.score || (animeMeta?.averageScore ? Number((animeMeta.averageScore / 10).toFixed(1)) : null);
  const ratingBadge = animeMeta?.rating ? animeMeta.rating.split(' ')[0] : 'PG-13';
  const type = animeMeta?.type || animeMeta?.format || 'TV';
  const country = animeMeta?.countryOfOrigin || 'Japan';
  const premiered = animeMeta?.season && animeMeta?.year ? `${animeMeta.season} ${animeMeta.year}` : animeMeta?.year ? `${animeMeta.year}` : 'Unknown';
  const dateAired = animeMeta?.aired?.string || (animeMeta?.aired?.from ? new Date(animeMeta.aired.from).toLocaleDateString() : 'Unknown');
  const duration = animeMeta?.duration ? `${animeMeta.duration}m / ep` : '24m / ep';
  const status = animeMeta?.status || 'Finished Airing';

  let studios = 'Unknown Studio';
  if (Array.isArray(animeMeta?.studios)) {
    studios = animeMeta.studios.map((s) => s.name).join(', ');
  } else if (animeMeta?.studios && Array.isArray((animeMeta.studios as any)?.nodes)) {
    studios = (animeMeta.studios as any).nodes.map((s: any) => s.name).join(', ');
  }

  const producers = animeMeta?.producers?.map((p) => p.name).join(', ') || 'Aniplex, Shueisha';
  const genres = animeMeta?.genres || [];
  const epCount = totalEpisodes || animeMeta?.episodes || '?';

  return (
    <div
      id="anime-info-section"
      className="rounded-xl border border-white/10 bg-[#0d0d15] p-4 sm:p-6 shadow-lg backdrop-blur-md"
    >
      <div className="flex flex-col md:flex-row gap-5 lg:gap-6">
        {/* Left: Poster Cover */}
        <div className="shrink-0 mx-auto md:mx-0 w-36 sm:w-44 lg:w-48">
          <div className="overflow-hidden rounded-xl border border-white/10 shadow-xl bg-black aspect-[3/4.2]">
            <img
              src={coverUrl}
              alt={String(title)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* Right: Metadata Details */}
        <div className="flex-1 min-w-0 space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-tight">
              {title}
            </h2>
            {japaneseTitle && (
              <p className="text-xs text-slate-400 mt-0.5 font-medium truncate">
                {japaneseTitle}
              </p>
            )}
          </div>

          {/* Badges Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {score && (
              <div className="flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-400">
                <Star className="h-3.5 w-3.5 fill-amber-400" />
                <span>{score}</span>
              </div>
            )}
            <span className="rounded-md bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 font-bold text-purple-300">
              {type}
            </span>
            <span className="rounded-md bg-white/10 border border-white/10 px-2 py-0.5 font-bold text-slate-300">
              {ratingBadge}
            </span>
            <span className="rounded-md bg-white/10 border border-white/10 px-2 py-0.5 font-bold text-slate-300">
              HD
            </span>
            <span className="rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 font-bold text-rose-300">
              {status}
            </span>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 sm:line-clamp-4 leading-relaxed">
            {synopsis}
          </p>

          {/* Genres Chips */}
          {genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <Tag className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              {genres.map((g) => {
                const gName = typeof g === 'string' ? g : g.name;
                return (
                  <button
                    key={gName}
                    onClick={() => navigate(`/search?genre=${encodeURIComponent(gName)}`)}
                    className="rounded-lg border border-white/10 bg-[#141420] px-2.5 py-0.5 text-[11px] font-semibold text-slate-300 hover:bg-purple-600 hover:text-white hover:border-purple-500 transition-all"
                  >
                    {gName}
                  </button>
                );
              })}
            </div>
          )}

          {/* Two-Column Specification Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/5 text-[11px]">
            <div>
              <span className="text-slate-500 block">Country:</span>
              <span className="text-slate-200 font-semibold">{country}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Premiered:</span>
              <span className="text-slate-200 font-semibold">{premiered}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Date Aired:</span>
              <span className="text-slate-200 font-semibold truncate block">{dateAired}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Episodes:</span>
              <span className="text-slate-200 font-semibold">{epCount} eps</span>
            </div>
            <div>
              <span className="text-slate-500 block">Duration:</span>
              <span className="text-slate-200 font-semibold">{duration}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 block">Studios:</span>
              <span className="text-slate-200 font-semibold truncate block">{studios}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
