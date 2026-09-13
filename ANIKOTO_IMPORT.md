# Anikoto API Import (Vercel-ready)

## What was added

- **Public Anikoto API** (`https://www.anikotoapi.site`) for:
  - Anime details (title, poster, description, genres, MAL ID, status, …)
  - Episode list with **embed links** (`embed_url.sub` / `embed_url.dub` → megaplay.buzz)
- **Admin UI**: **Episodes** tab → **Import from Anikoto**
  - Browse recent series
  - Enter Anikoto series ID
  - Optional **Max episodes** (leave empty = all)
  - Optional **Start from episode**
  - Option: **anime details only** (no episodes)

## How to use

1. Open **Admin → Episodes**
2. Click **Import from Anikoto**
3. Pick a series from “Recent” or paste Anikoto ID (e.g. `8719`)
4. Click **Preview** (optional)
5. Set how many episodes you want (or leave blank for all)
6. Click **Import now**

Anime is saved/updated in Supabase by **MAL ID**.  
Each episode gets servers:

- `Anikoto Sub` → sub embed  
- `Anikoto Dub` → dub embed (when available)

The existing **VideoPlayer** already treats megaplay / generic embed URLs as iframes.

## API endpoints (admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/anikoto/recent?page=1&per_page=12` | Recent catalog |
| GET | `/api/admin/anikoto/series/:id` | Preview series |
| POST | `/api/admin/anikoto/import` | Import anime + episodes |

Body for import:

```json
{
  "anikotoId": 8719,
  "maxEpisodes": 12,
  "startEpisode": 1,
  "animeOnly": false
}
```

## Vercel notes

- **No VPS required** for Anikoto (public API).
- Calls run in your existing `/api` serverless function (30s max).
- Import is one Anikoto request + DB writes — suitable for typical series lengths.
- Respect Anikoto rate limits (~60 requests / 120s per IP). Prefer admin-only use + caching of results in Supabase.

## Limitations

- Series **without `mal_id`** cannot be imported (AniVault keys catalog by MAL/external_id).
- Embed availability depends on Anikoto / megaplay upstream.
- No title search on Anikoto public API — use Recent list or known series ID.
