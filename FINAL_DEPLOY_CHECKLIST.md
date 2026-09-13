# AniVault final deployment checklist

## 1. Supabase
Run `supabase_schema.sql` in the Supabase SQL Editor for a new/empty database.

If your existing database was created with an older AniVault schema, run
`supabase_fix_existing.sql` once after taking a backup.

Then promote your own Auth account:
```sql
UPDATE public.users
SET role = 'admin'
WHERE email = 'YOUR_EMAIL@example.com';
```

Verify:
```sql
SELECT id, email, role FROM public.users WHERE email = 'YOUR_EMAIL@example.com';
```

The result must show `role = admin`.

## 2. Vercel environment variables

Required:
- VITE_SUPABASE_URL = your Supabase project URL
- VITE_SUPABASE_PUBLISHABLE_KEY = your Supabase publishable key
- SUPABASE_URL = your Supabase project URL
- SUPABASE_PUBLISHABLE_KEY = your Supabase publishable key
- SUPABASE_SERVICE_ROLE_KEY = your newly rotated service-role key

Never prefix the service-role key with VITE_.

After changing environment variables, redeploy. Vite embeds VITE_* values at build time.

## 3. Test after deployment

Open:
`/api/health`

Then:
`/api/db/health`

Then sign in and open:
`/api/admin/diagnostics`

The diagnostics endpoint requires an admin session.

## 4. Functional test

1. Sign in.
2. Open Admin.
3. Add/import one anime.
4. Confirm it appears under Manage Anime.
5. Open Episode Manager.
6. Select the anime.
7. Add an episode with at least one valid SUB or DUB embed URL.
8. Add thumbnail/subtitle URLs if needed.
9. Confirm the episode appears in Recently Updated.
10. Open the anime details page and confirm the episode number appears.
11. Add the anime to Watchlist.
12. Open Watchlist and click the anime.
13. Watch an episode and refresh the page.
14. Confirm watch history is saved.
15. Post a comment and test a like.

## Important
The service-role key is server-only. Do not put it in the ZIP, GitHub, React code, or any VITE_ variable.
