# AniVault Final 5 Fixes

This build is based on the uploaded `AniVault-FINAL-CLEAN-VERCEL-SUPABASE` ZIP.

## Fixed
1. Admin statistics now requires and uses the server-only Supabase service-role client, so user counts and admin-wide queries are not blocked by `public.users` RLS.
2. Admin Users list now uses the server-only admin client and gives a clear 503 error if `SUPABASE_SERVICE_ROLE_KEY` is missing.
3. Recently Updated now reads only the latest 2,000 changed episodes and selects only the fields it needs, avoiding an unbounded full-episode fetch in Vercel.
4. Anime details routes are explicitly MAL-ID-only. The AniList resolver now has a dedicated `getAnimeByMalId()` method, preventing numeric AniList/MAL ID collisions.
5. Admin password changes now verify the current password before changing it, enforce a minimum length, and keep the existing browser session intact during verification.

## Vercel environment variables
Required:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Never use a `VITE_` variable for the service-role key.

## Supabase
If the database is empty, run the included `supabase_schema.sql` once. If the schema was already created from this project's previous schema, do not repeatedly run unrelated older SQL files.
