# AniVault

Anime streaming platform: discover anime, watch episodes, manage watchlist, and track history.

## Run locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Fill in Supabase values (see `.env.example`).
3. Run:
   ```bash
   npm run dev
   ```

## Production smoke test

After deployment, verify in order:

1. `/api/health`
2. `/api/db/health`
3. AniList search / top endpoints
4. Admin anime import
5. Anime details + watch page
6. Watchlist + Recently Updated

The app treats **MAL ID** as the canonical public/database ID and keeps AniList native ID separate.

## Deploy (Vercel)

See `VERCEL_DEPLOY.md` and `FINAL_DEPLOY_CHECKLIST.md`.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, never prefix with `VITE_`)

## AniList outage/rate-limit fallback

AniVault uses the official AniList GraphQL endpoint (`https://graphql.anilist.co`) for live metadata. The server now:
- caches AniList responses in warm server instances;
- throttles requests to stay below AniList's currently documented temporary limit;
- stops immediately on `429` instead of waiting for AniList's one-minute timeout;
- falls back to the Supabase `anime` catalog for search, genres, top/season lists, and anime metadata;
- automatically uses AniList again as soon as it becomes available.

The fallback only uses records already stored in your Supabase database.
