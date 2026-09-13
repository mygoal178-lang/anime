import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { parseMalIdFromSegment, setPageSeo } from './lib/seo';

// Route-level code splitting keeps the initial JS bundle smaller.
const LandingPage = lazy(() =>
  import('./pages/LandingPage').then((m) => ({ default: m.LandingPage }))
);
const HomePage = lazy(() =>
  import('./pages/HomePage').then((m) => ({ default: m.HomePage }))
);
const AnimeDetailsPage = lazy(() =>
  import('./pages/AnimeDetailsPage').then((m) => ({ default: m.AnimeDetailsPage }))
);
const WatchPage = lazy(() =>
  import('./pages/WatchPage').then((m) => ({ default: m.WatchPage }))
);
const SearchPage = lazy(() =>
  import('./pages/SearchPage').then((m) => ({ default: m.SearchPage }))
);
const GenresPage = lazy(() =>
  import('./pages/GenresPage').then((m) => ({ default: m.GenresPage }))
);
const WatchlistPage = lazy(() =>
  import('./pages/WatchlistPage').then((m) => ({ default: m.WatchlistPage }))
);
const HistoryPage = lazy(() =>
  import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage }))
);
const UpdatedPage = lazy(() =>
  import('./pages/UpdatedPage').then((m) => ({ default: m.UpdatedPage }))
);
const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
    </div>
  );
}

export function AppContent() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);

  useEffect(() => {
    const onPop = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentPath(route.startsWith('/') ? route : `/${route}`);
    window.scrollTo(0, 0);
  };

  const pathname = currentPath.split('?')[0];
  const searchParams = new URLSearchParams(
    currentPath.includes('?') ? currentPath.split('?')[1] : ''
  );

  // SEO metadata for static routes (dynamic pages set their own via setPageSeo)
  useEffect(() => {
    // Skip generic titles for anime/watch — those pages set rich meta after data loads
    if (pathname.startsWith('/anime/') || pathname.startsWith('/watch/')) {
      return;
    }

    if (pathname === '/') {
      setPageSeo({
        title: 'AniVault - Watch Anime Online',
        description: 'Discover anime, explore new releases, and watch your favorite anime free in HD on AniVault. Sub & Dub available.',
        url: '/',
        image: '/landing/zoro-hero.webp',
      });
    } else if (pathname === '/home') {
      setPageSeo({
        title: 'Watch Free Anime Online in HD',
        description: 'Browse trending, top-rated, and recently updated anime. Stream free subtitled and dubbed episodes on AniVault.',
        url: '/home',
      });
    } else if (pathname === '/search') {
      const q = searchParams.get('q') || '';
      setPageSeo({
        title: q ? `Search results for "${q}"` : 'Search Anime Catalog',
        description: q
          ? `Find anime matching "${q}" on AniVault. Watch free episodes in HD with subtitles and dub.`
          : 'Search the AniVault anime catalog by title, genre, year, and more.',
        url: pathname + (currentPath.includes('?') ? '?' + currentPath.split('?')[1] : ''),
      });
    } else if (pathname === '/watchlist') {
      setPageSeo({ title: 'My Saved Watchlist', description: 'Your personal anime watchlist on AniVault.', url: '/watchlist', noindex: true });
    } else if (pathname === '/updated' || pathname === '/updates') {
      setPageSeo({
        title: 'Recently Updated Anime',
        description: 'See the latest anime episodes added to AniVault. Watch newly uploaded episodes free in HD.',
        url: pathname,
      });
    } else if (pathname === '/history') {
      setPageSeo({ title: 'Watch History', description: 'Continue watching where you left off on AniVault.', url: '/history', noindex: true });
    } else if (pathname === '/admin') {
      setPageSeo({ title: 'Admin CMS', description: 'AniVault admin dashboard.', url: '/admin', noindex: true });
    } else if (pathname === '/login') {
      setPageSeo({ title: 'Sign In / Register', description: 'Sign in or create an AniVault account to save your watchlist and history.', url: '/login', noindex: true });
    } else if (pathname === '/genres') {
      setPageSeo({
        title: 'Anime Genres & Categories',
        description: 'Browse anime by genre on AniVault — Action, Romance, Fantasy, Isekai, and more.',
        url: '/genres',
      });
    } else {
      setPageSeo({ title: 'Anime Streaming Platform', description: 'Watch free anime online on AniVault.', url: pathname });
    }
  }, [pathname, currentPath]);

  // Root Landing Page View
  if (pathname === '/') {
    return (
      <Suspense fallback={<RouteFallback />}>
        <LandingPage navigate={navigate} />
      </Suspense>
    );
  }

  // Route matching logic for internal pages
  const renderRoute = () => {
    // Watch Page: /watch/:malId/:epNum  OR  /watch/:slug-malId/:epNum
    const watchMatch = pathname.match(/^\/watch\/([^/]+)\/(\d+(?:\.\d+)?)$/);
    if (watchMatch) {
      const malId = parseMalIdFromSegment(watchMatch[1]);
      if (malId) {
        const epNum = parseFloat(watchMatch[2]);
        return <WatchPage malId={malId} epNum={epNum} navigate={navigate} />;
      }
    }

    // Anime Details Page: /anime/:malId  OR  /anime/:slug-malId
    const animeMatch = pathname.match(/^\/anime\/([^/]+)$/);
    if (animeMatch) {
      const malId = parseMalIdFromSegment(animeMatch[1]);
      if (malId) {
        return <AnimeDetailsPage malId={malId} navigate={navigate} />;
      }
    }

    // Search Page: /search
    if (pathname === '/search') {
      const q = searchParams.get('q') || '';
      const genre = searchParams.get('genre') || '';
      const sort = searchParams.get('sort') || '';
      const letter = searchParams.get('letter') || '';
      const page = parseInt(searchParams.get('page') || '1', 10) || 1;
      return (
        <SearchPage
          key={`${q}-${genre}-${sort}-${letter}-${page}`}
          initialQuery={q}
          initialGenre={genre}
          initialSort={sort}
          initialLetter={letter}
          initialPage={page}
          navigate={navigate}
        />
      );
    }

    // Genres Page: /genres
    if (pathname === '/genres') {
      return <GenresPage navigate={navigate} />;
    }

    // Watchlist Page: /watchlist
    if (pathname === '/watchlist') {
      return <WatchlistPage navigate={navigate} />;
    }

    // Updated Anime Catalog Page: /updated and /updates
    if (pathname === '/updated' || pathname === '/updates') {
      return <UpdatedPage navigate={navigate} />;
    }

    // History Page: /history
    if (pathname === '/history') {
      return <HistoryPage navigate={navigate} />;
    }

    // Login / Register Page: /login
    if (pathname === '/login') {
      return <LoginPage navigate={navigate} />;
    }

    // Admin Dashboard Page: /admin
    if (pathname === '/admin') {
      return <AdminDashboard navigate={navigate} />;
    }

    // Existing AniVault Homepage: /home
    return <HomePage navigate={navigate} />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#08080c] font-sans text-slate-100 antialiased selection:bg-rose-600 selection:text-white w-full max-w-full overflow-x-hidden">
      <Header navigate={navigate} currentPath={pathname} />
      <main className="flex-1 pb-12 w-full max-w-full overflow-x-hidden">
        <Suspense fallback={<RouteFallback />}>{renderRoute()}</Suspense>
      </main>
      <Footer navigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
