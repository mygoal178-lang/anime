# AniVault2 — Fixes applied (embed + watch details + Vercel)

## Problems fixed

### 1. Embed / iframe player not working
**File:** `src/components/VideoPlayer.tsx`
- Expanded iframe `sandbox` with `allow-top-navigation-by-user-activation` and `allow-modals` (required by most embed hosts).
- Changed `referrerPolicy` from `origin` → `no-referrer` (many hosts block strict referrers).
- Expanded `allow` attribute.
- `checkIsIframeEmbed()` now treats **any** `http(s)` URL that is not a direct `.mp4/.m3u8/.webm` file as an iframe embed. New hosts no longer need manual domain lists.
- Server list order now matches the ServerSelector (no accidental unshift that broke active index).

### 2. Watch page missing anime details
**Files:** `server/app.ts`, `src/pages/WatchPage.tsx`
- Episode endpoint (`GET /api/episodes/:malId/:epNum`) now returns a rich local fallback (cover, synopsis, title, genres) when AniList is down or rate-limited.
- Anime details endpoint (`GET /api/anime/:malId`) local fallback now uses `custom_title` / `custom_cover_url` / `custom_description`.
- Watch page title extraction handles AniList `title` as object (`english` / `romaji` / `userPreferred`).

### 3. Player server switching reliability
**Files:** `src/pages/WatchPage.tsx`, `src/components/VideoPlayer.tsx`
- `serverUrls` passed to the player is built from the same `serverOptions` list the UI uses, so SUB/DUB index stays in sync.

### 4. Vercel deploy safety
**File:** `vercel.json`
- Explicit rewrite for `/api/db/health`.
- Clean API rewrites + SPA fallback.
- Function memory/duration for `api/index.ts` and `api/db/health.ts`.
- `package.json` `engines.node >= 18`.

## What you must still do in Supabase / Admin (data, not code)

1. Set all Vercel env vars (see `.env.example`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never `VITE_`)

2. Anime rows must use **MAL ID** as `external_id` (not AniList native ID).

3. Each episode needs at least one row in `episode_servers` with a real embed URL:
   - Must start with `https://` (or `http://`)
   - Prefer true embed paths (`/e/`, `/embed/`, `/stream/…`), not the host’s normal watch page.

4. After deploy, smoke test:
   - `/api/health`
   - `/api/db/health`
   - `/api/anime/<malId>`
   - `/watch/<malId>/1`

## Deploy steps (Vercel)

1. Import this repo / upload this zip.
2. Framework preset: Vite (or Other). Build command: `npm run build`. Output: `dist`.
3. Add the env vars above for Production + Preview.
4. Deploy.
5. In Admin, add one episode with a known-good embed URL and open the watch page.
