import { createClient } from "@supabase/supabase-js";

const SITE_URL = "https://www.anivault.online";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default async function handler(req: any, res: any) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(500).send("Supabase environment variables are missing");
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey
    );

    /*
     * ---------------------------------------------------------
     * STATIC PAGES
     * ---------------------------------------------------------
     */

    const staticPages = [
      {
        url: `${SITE_URL}/`,
        changefreq: "daily",
        priority: "1.0",
      },
      {
        url: `${SITE_URL}/home`,
        changefreq: "daily",
        priority: "0.9",
      },
      {
        url: `${SITE_URL}/search`,
        changefreq: "daily",
        priority: "0.8",
      },
      {
        url: `${SITE_URL}/genres`,
        changefreq: "weekly",
        priority: "0.8",
      },
      {
        url: `${SITE_URL}/updated`,
        changefreq: "hourly",
        priority: "0.8",
      },
      {
        url: `${SITE_URL}/updates`,
        changefreq: "hourly",
        priority: "0.7",
      },
    ];

    /*
     * ---------------------------------------------------------
     * GET ANIME
     * ---------------------------------------------------------
     */

    const { data: anime, error: animeError } = await supabase
      .from("anime")
      .select("id, external_id, title, updated_at")
      .order("updated_at", { ascending: false });

    if (animeError) {
      console.error("Anime sitemap error:", animeError);
      return res.status(500).send("Failed to load anime");
    }

    /*
     * ---------------------------------------------------------
     * GET EPISODES
     *
     * This assumes your episodes table has:
     *   id
     *   anime_id
     *   episode_number
     *   updated_at
     *
     * If your table/column names are different, tell me and
     * I'll adjust them.
     * ---------------------------------------------------------
     */

    const { data: episodes, error: episodeError } = await supabase
      .from("episodes")
      .select("id, anime_id, episode_number, updated_at")
      .order("episode_number", { ascending: true });

    /*
     * If the episodes table does not exist, don't break the
     * entire sitemap. Anime pages will still be generated.
     */

    if (episodeError) {
      console.warn(
        "Episode sitemap warning:",
        episodeError.message
      );
    }

    const urls: any[] = [...staticPages];

    /*
     * ---------------------------------------------------------
     * ANIME PAGES
     * ---------------------------------------------------------
     */

    for (const item of anime || []) {
      const externalId = item.external_id ?? item.id;

      if (!externalId || !item.title) continue;

      const slug = slugify(item.title);

      const animeUrl =
        `${SITE_URL}/anime/${slug}-${externalId}`;

      urls.push({
        url: animeUrl,
        lastmod: item.updated_at,
        changefreq: "daily",
        priority: "0.9",
      });
    }

    /*
     * ---------------------------------------------------------
     * EPISODE / WATCH PAGES
     * ---------------------------------------------------------
     */

    for (const episode of episodes || []) {
      const animeItem = (anime || []).find(
        (a: any) =>
          String(a.id) === String(episode.anime_id) ||
          String(a.external_id) === String(episode.anime_id)
      );

      if (!animeItem) continue;

      const externalId =
        animeItem.external_id ?? animeItem.id;

      if (
        !externalId ||
        !animeItem.title ||
        episode.episode_number === null ||
        episode.episode_number === undefined
      ) {
        continue;
      }

      const slug = slugify(animeItem.title);

      const episodeUrl =
        `${SITE_URL}/watch/${slug}-${externalId}/ep-${episode.episode_number}`;

      urls.push({
        url: episodeUrl,
        lastmod: episode.updated_at || animeItem.updated_at,
        changefreq: "weekly",
        priority: "0.7",
      });
    }

    /*
     * ---------------------------------------------------------
     * REMOVE DUPLICATES
     * ---------------------------------------------------------
     */

    const uniqueUrls = Array.from(
      new Map(
        urls.map((item) => [item.url, item])
      ).values()
    );

    /*
     * ---------------------------------------------------------
     * CREATE XML
     * ---------------------------------------------------------
     */

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueUrls
  .map(
    (item) => `  <url>
    <loc>${escapeXml(item.url)}</loc>${
      item.lastmod
        ? `\n    <lastmod>${new Date(item.lastmod).toISOString()}</lastmod>`
        : ""
    }
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");

    /*
     * Prevent unnecessary caching while testing.
     * You can increase this later if needed.
     */
    res.setHeader(
      "Cache-Control",
      "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"
    );

    return res.status(200).send(xml);
  } catch (error) {
    console.error("Sitemap generation error:", error);

    return res.status(500).send(
      "Failed to generate sitemap"
    );
  }
}

/*
 * ---------------------------------------------------------
 * SLUG GENERATOR
 * ---------------------------------------------------------
 */

function slugify(value: string): string {
  return value
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/*
 * ---------------------------------------------------------
 * XML ESCAPE
 * ---------------------------------------------------------
 */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
