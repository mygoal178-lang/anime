# AniVault Vercel deployment

## Vercel project settings

- Framework / Application Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Root Directory: `/`

## Required environment variables

Add these in Vercel → Project → Settings → Environment Variables for Production (and Preview/Development if needed):

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_NEW_ROTATED_SERVICE_ROLE_KEY
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in frontend code, GitHub, or `.env.example`.

## Why the AniList API was fixed

The previous deployment relied on a generic `/api/[...path].ts` catch-all plus an API rewrite. Vercel was serving `/api/health` but returning its own `NOT_FOUND` page for deeper AniList URLs.

This version gives the AniList endpoints their own Vercel functions:

- `/api/anilist/top`
- `/api/anilist/search`
- `/api/anilist/season-now`
- `/api/anilist/genres`
- `/api/anilist/anime/:malId`
- `/api/anilist/anime/:malId/characters`

The frontend continues using the same URLs, so no frontend API migration is required.

## After deployment

Test:

```text
https://YOUR-DOMAIN.vercel.app/api/health
https://YOUR-DOMAIN.vercel.app/api/anilist/genres
https://YOUR-DOMAIN.vercel.app/api/anilist/top?filter=bypopularity&page=1
```

The second and third URLs should return JSON rather than Vercel's `NOT_FOUND` page.

## Database verification after deployment

Open:

- `/api/health` — checks that the deployed server can actually query Supabase.
- `/api/db/health` — checks every required public table and reports which one fails, without exposing secrets.

For Vercel, add these environment variables to the Production environment:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`.

`SUPABASE_SERVICE_ROLE_KEY` is optional for this version's normal request flow and must never be exposed to the browser. If you add it to Vercel, keep it server-only.

### Important

Do not hard-code Supabase keys into source files. The publishable key is safe for the browser, but the service-role key is privileged and must stay only in Vercel Environment Variables.

For a clean deployment, use the exact variable names above and redeploy after changing them.

## Supabase requirements

Add these Vercel environment variables for Production (and Preview if desired):

- `VITE_SUPABASE_URL` = your Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your publishable/anon key
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = your publishable/anon key
- `SUPABASE_SERVICE_ROLE_KEY` = your rotated service-role key (server-only)

Run the included `supabase_schema.sql` in the target Supabase project's SQL Editor. The service-role key must never be prefixed with `VITE_` and must never be committed to Git.

After deployment, test:

- `/api/health`
- `/api/db/health`
- `/api/anilist/top?filter=bypopularity&page=1`
- `/api/anilist/genres`
- `/api/admin/diagnostics` (while signed in as an admin)


## Supabase database repair
If you deployed an older AniVault schema, run `supabase_fix_existing.sql` once in Supabase SQL Editor. Then redeploy after setting all five environment variables. Never expose the service-role key in frontend code.
