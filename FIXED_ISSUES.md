# AniVault — Issues fixed

## Round 3 — Live production fixes (anivault-pi.vercel.app)

### Critical
1. **Vercel Express API 404s** — Nested routes (`/api/anime/updated`, `/api/anime/:id`, `/api/episodes/...`, `/api/admin/*`) returned platform `NOT_FOUND`.
   - Added dedicated serverless stubs under `api/anime/`, `api/episodes/`, `api/admin/`, `api/health.ts`, `api/index.ts`
   - Path-normalization middleware so Express still matches when `/api` is stripped
   - `vercel.json` rewrites for Express-backed paths

2. **Wrong anime IDs (AniList vs MAL)** — Admin create now coerces AniList native IDs to MAL IDs when possible. Import always sends both `mal_id` and `external_id`.

### High / medium
3. **Broken `/catalog` links** → `/search?sort=...`
4. **Genre chips** → `/search?genre=...` (was ignored on `/genres`)
5. **Client white-screen on missing VITE env** — soft placeholder instead of throw
6. **Iframe sandbox** — added `allow-top-navigation-by-user-activation` for embeds
7. **Relative OG images** — absolute URLs for social previews
8. **Fractional episode URLs** — `/watch/:malId/:ep` accepts `12.5` style episodes
9. **metadata.json** — removed stale Gemini capability flag

### Data note (must fix in Supabase / Admin, not only code)
- Live DB had **0 episodes** and Demon Slayer stored as `external_id=101922` (AniList) instead of **38000** (MAL).
- After deploy: re-save that anime in Admin (or run SQL update), then add episodes + embed servers.

## Deploy checklist
1. Push this zip / repo to Vercel and redeploy
2. Confirm env vars: `VITE_SUPABASE_*`, `SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`
3. Test: `/api/health`, `/api/anime/updated`, `/api/anime/38000`, `/api/anilist/genres`
4. In Admin: fix anime IDs, add at least one episode with SUB/DUB embed URL
5. Open `/anime/38000` and `/watch/38000/1`

## Round 3b — Vercel deploy path conflict

Vercel error:
`api/admin/episodes/[episodeId]/servers.ts` conflicts with `api/admin/episodes/[id].ts`

**Fixed:** unified dynamic segment name to `[id]`:
- `api/admin/episodes/[id]/index.ts`
- `api/admin/episodes/[id]/servers.ts`

Also resolved file+directory clashes:
- `api/admin/anime/[identifier]/index.ts` (+ episodes)
- `api/anilist/anime/[malId]/index.ts` (+ characters)
