import React from 'react';
import { HeroCarousel } from './HeroCarousel';
import { SiteAnime } from '../types';

export { HeroCarousel };

export interface HeroBannerProps {
  anime?: SiteAnime;
  items?: SiteAnime[];
  navigate: (route: string) => void;
  autoSlideInterval?: number;
}

export function HeroBanner({
  anime,
  items,
  navigate,
  autoSlideInterval = 5000,
}: HeroBannerProps) {
  const slides = items && items.length > 0 ? items : anime ? [anime] : [];
  if (slides.length === 0) return null;

  return (
    <HeroCarousel
      items={slides}
      navigate={navigate}
      autoSlideInterval={autoSlideInterval}
    />
  );
}

