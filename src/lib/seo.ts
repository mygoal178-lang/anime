/**
 * SEO helpers for AniVault SPA
 * - SEO-friendly slug URLs: /anime/{slug}-{malId}
 * - Dynamic document title / meta / OG updates
 */

/** Convert a title into a URL-safe slug */
export function slugify(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80); // keep URLs reasonable
}

/** Prefer English / custom title for slug generation */
export function getAnimeSlugTitle(anime: {
  title?: any;
  custom_title?: string | null;
  english_title?: string | null;
  title_english?: string | null;
  local?: { custom_title?: string | null; english_title?: string | null; title?: string };
  anilist?: { title?: any; title_english?: string };
  jikan?: { title?: any; title_english?: string };
}): string {
  const local = anime.local;
  const anilist = anime.anilist || anime.jikan;
  const raw =
    local?.custom_title ||
    anime.custom_title ||
    local?.english_title ||
    anime.english_title ||
    anime.title_english ||
    anilist?.title_english ||
    (typeof anilist?.title === 'string' ? anilist.title : anilist?.title?.english || anilist?.title?.romaji || anilist?.title?.userPreferred) ||
    (typeof anime.title === 'string' ? anime.title : anime.title?.english || anime.title?.romaji) ||
    local?.title ||
    '';
  return String(raw || '').trim();
}

/** Build /anime/{slug}-{malId} or fallback /anime/{malId} */
export function animePath(malId: number | string, titleOrAnime?: string | object | null): string {
  const id = Number(malId);
  if (!id || isNaN(id)) return '/home';
  let slug = '';
  if (typeof titleOrAnime === 'string') {
    slug = slugify(titleOrAnime);
  } else if (titleOrAnime && typeof titleOrAnime === 'object') {
    slug = slugify(getAnimeSlugTitle(titleOrAnime as any));
  }
  return slug ? `/anime/${slug}-${id}` : `/anime/${id}`;
}

/** Build /watch/{slug}-{malId}/{ep} or fallback /watch/{malId}/{ep} */
export function watchPath(
  malId: number | string,
  epNum: number | string,
  titleOrAnime?: string | object | null
): string {
  const id = Number(malId);
  if (!id || isNaN(id)) return '/home';
  let slug = '';
  if (typeof titleOrAnime === 'string') {
    slug = slugify(titleOrAnime);
  } else if (titleOrAnime && typeof titleOrAnime === 'object') {
    slug = slugify(getAnimeSlugTitle(titleOrAnime as any));
  }
  const ep = String(epNum);
  return slug ? `/watch/${slug}-${id}/${ep}` : `/watch/${id}/${ep}`;
}

/**
 * Parse path segments that may be pure ID or "slug-id".
 * Returns malId (number) or null.
 */
export function parseMalIdFromSegment(segment: string | undefined): number | null {
  if (!segment) return null;
  // Pure numeric
  if (/^\d+$/.test(segment)) {
    const n = parseInt(segment, 10);
    return isNaN(n) ? null : n;
  }
  // Ends with -{digits}
  const m = segment.match(/-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/** Update or create a meta tag by name or property */
function setMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Set or update <link rel="canonical"> */
function setCanonical(url: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export interface PageSeoOptions {
  title: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: 'website' | 'video.episode' | 'video.tv_show';
  noindex?: boolean;
}

/** Apply page-level SEO tags (title, description, OG, Twitter, canonical) */
export function setPageSeo(opts: PageSeoOptions) {
  if (typeof document === 'undefined') return;

  const siteName = 'AniVault';
  const fullTitle = opts.title.includes(siteName) ? opts.title : `${opts.title} — ${siteName}`;
  document.title = fullTitle;

  const desc =
    opts.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    'Discover anime, explore new releases, and watch your favorite anime on AniVault.';

  setMeta('name', 'description', desc);
  setMeta('property', 'og:title', fullTitle);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:type', opts.type || 'website');
  setMeta('property', 'og:site_name', siteName);

  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('name', 'twitter:title', fullTitle);
  setMeta('name', 'twitter:description', desc);

  if (opts.image) {
    const img = opts.image.startsWith('http') ? opts.image : `https://www.anivault.online${opts.image.startsWith('/') ? '' : '/'}${opts.image}`;
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:image', img);
  }

  if (opts.url) {
    const abs = opts.url.startsWith('http') ? opts.url : `https://www.anivault.online${opts.url.startsWith('/') ? '' : '/'}${opts.url}`;
    setMeta('property', 'og:url', abs);
    setCanonical(abs);
  }

  setMeta('name', 'robots', opts.noindex ? 'noindex, nofollow' : 'index, follow');
}

/** Inject or update JSON-LD structured data */
export function setJsonLd(data: object | null) {
  if (typeof document === 'undefined') return;
  const id = 'anivault-jsonld';
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    if (script) script.remove();
    return;
  }
  if (!script) {
    script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}
