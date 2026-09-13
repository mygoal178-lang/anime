-- ==============================================================================
-- AniStream Secure Supabase PostgreSQL Schema, Auth Triggers & RLS Policies
-- Single Source of Truth for AniStream Anime Streaming Platform
--
-- Instructions: Run this script in your Supabase SQL Editor:
-- Open your own Supabase project -> SQL Editor and run this script.
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PUBLIC USERS / PROFILES TABLE (Linked 1:1 with auth.users)
-- NO PASSWORD HASHES STORED HERE. Supabase Auth manages all authentication.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC USER PROFILE TRIGGER (handle_new_user)
-- Automatically provisions public.users profile when a new user registers in auth.users
-- Defaults role = 'user'. Admin promotion must be performed manually in Supabase.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, avatar, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar', '/avatars/avatar-01.svg'),
        'user',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.users.name),
        avatar = COALESCE(EXCLUDED.avatar, public.users.avatar, '/avatars/avatar-01.svg'),
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on Supabase auth.users INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Automatic updated_at trigger function for all public tables
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 3. ANIME TABLE
-- Stores curated anime records, custom titles, covers, banners, and search analytics
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id BIGINT UNIQUE NOT NULL, -- MAL ID / External ID
    title TEXT NOT NULL,
    cover_url TEXT,
    banner_url TEXT,
    description TEXT,
    genres JSONB DEFAULT '[]'::jsonb,
    type TEXT DEFAULT 'TV',
    year INTEGER,
    rating TEXT,
    status TEXT DEFAULT 'Finished Airing',
    featured BOOLEAN DEFAULT false,
    search_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anime_external_id ON public.anime(external_id);
CREATE INDEX IF NOT EXISTS idx_anime_featured ON public.anime(featured);
CREATE INDEX IF NOT EXISTS idx_anime_search_count ON public.anime(search_count DESC);
CREATE INDEX IF NOT EXISTS idx_anime_updated_at ON public.anime(updated_at DESC);

DROP TRIGGER IF EXISTS set_anime_updated_at ON public.anime;
CREATE TRIGGER set_anime_updated_at
    BEFORE UPDATE ON public.anime
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 4. EPISODES TABLE
-- Stores real uploaded episodes. No fake episodes created.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anime_id UUID NOT NULL REFERENCES public.anime(id) ON DELETE CASCADE,
    anime_mal_id BIGINT NOT NULL, -- MAL ID retained for high-performance external API matching
    episode_number NUMERIC NOT NULL, -- NUMERIC supports fractional specials like 12.5 or 0.5
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    subtitle_url TEXT,
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Strict unique constraint preventing duplicate episode numbers per anime
    CONSTRAINT unique_anime_episode UNIQUE (anime_mal_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_episodes_anime_mal_id ON public.episodes(anime_mal_id);
CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_number ON public.episodes(episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_created_at ON public.episodes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_episodes_updated_at ON public.episodes(updated_at DESC);

DROP TRIGGER IF EXISTS set_episodes_updated_at ON public.episodes;
CREATE TRIGGER set_episodes_updated_at
    BEFORE UPDATE ON public.episodes
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 5. EPISODE SERVERS TABLE
-- Relational SUB and DUB embed stream servers directly linked to each episode.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.episode_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    language TEXT NOT NULL CHECK (language IN ('sub', 'dub')),
    server_name TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_episode_servers_episode_id ON public.episode_servers(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_servers_language ON public.episode_servers(language);

DROP TRIGGER IF EXISTS set_episode_servers_updated_at ON public.episode_servers;
CREATE TRIGGER set_episode_servers_updated_at
    BEFORE UPDATE ON public.episode_servers
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 6. WATCH HISTORY TABLE
-- Tracks playback progress per Supabase authenticated user and episode.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    anime_mal_id BIGINT NOT NULL,
    episode_number NUMERIC NOT NULL,
    progress_seconds NUMERIC DEFAULT 0,
    duration_seconds NUMERIC DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_watch_progress UNIQUE (user_id, anime_mal_id, episode_number)
);

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_updated ON public.watch_history(updated_at DESC);

DROP TRIGGER IF EXISTS set_watch_history_updated_at ON public.watch_history;
CREATE TRIGGER set_watch_history_updated_at
    BEFORE UPDATE ON public.watch_history
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ------------------------------------------------------------------------------
-- 7. WATCHLIST / BOOKMARKS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    anime_mal_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_watchlist UNIQUE (user_id, anime_mal_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);

-- ------------------------------------------------------------------------------
-- 8. COMMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anime_mal_id BIGINT NOT NULL,
    episode_number NUMERIC,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'AniStream Fan',
    user_avatar TEXT,
    comment TEXT NOT NULL,
    likes INTEGER DEFAULT 0,
    liked_by JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_anime_mal_id ON public.comments(anime_mal_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- ==============================================================================
-- PRODUCTION-GRADE ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Security: NO public write access. No "FOR ALL USING (true)".
-- Users can only modify their OWN records (auth.uid() = user_id).
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current request is from an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- This function is SECURITY DEFINER and is intentionally independent
    -- of public.users RLS. It is used by admin policies/functions only.
    RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public
SET row_security = off;

-- ------------------------------------------------------------------------------
-- A. CATALOG ACCESS POLICIES (Read-Only for Public, Admin for Write)
-- ------------------------------------------------------------------------------

-- Anime
DROP POLICY IF EXISTS "Public Read Anime Catalog" ON public.anime;
CREATE POLICY "Public Read Anime Catalog"
    ON public.anime FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin Insert Anime" ON public.anime;
CREATE POLICY "Admin Insert Anime"
    ON public.anime FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Update Anime" ON public.anime;
CREATE POLICY "Admin Update Anime"
    ON public.anime FOR UPDATE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin Delete Anime" ON public.anime;
CREATE POLICY "Admin Delete Anime"
    ON public.anime FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Episodes
DROP POLICY IF EXISTS "Public Read Episodes Catalog" ON public.episodes;
CREATE POLICY "Public Read Episodes Catalog"
    ON public.episodes FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin Insert Episodes" ON public.episodes;
CREATE POLICY "Admin Insert Episodes"
    ON public.episodes FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Update Episodes" ON public.episodes;
CREATE POLICY "Admin Update Episodes"
    ON public.episodes FOR UPDATE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin Delete Episodes" ON public.episodes;
CREATE POLICY "Admin Delete Episodes"
    ON public.episodes FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- Episode Servers
DROP POLICY IF EXISTS "Public Read Episode Servers Catalog" ON public.episode_servers;
CREATE POLICY "Public Read Episode Servers Catalog"
    ON public.episode_servers FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admin Insert Episode Servers" ON public.episode_servers;
CREATE POLICY "Admin Insert Episode Servers"
    ON public.episode_servers FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin Update Episode Servers" ON public.episode_servers;
CREATE POLICY "Admin Update Episode Servers"
    ON public.episode_servers FOR UPDATE
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admin Delete Episode Servers" ON public.episode_servers;
CREATE POLICY "Admin Delete Episode Servers"
    ON public.episode_servers FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- B. USER PROFILES POLICIES
-- Users can only read their own profile, update their own name/avatar, NEVER role.
-- Admins can read all profiles.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read User Profiles" ON public.users;
DROP POLICY IF EXISTS "Users Read Own Profile" ON public.users;
DROP POLICY IF EXISTS "Admin Read User Profiles" ON public.users;

-- IMPORTANT: do not call is_admin() from the users SELECT policy.
-- is_admin() itself reads public.users. Doing so creates an RLS recursion
-- loop and can make login/admin/database reads fail.
CREATE POLICY "Users Read Own Profile"
    ON public.users FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Server-side admin operations use the service-role client after the user's
-- Supabase Auth token has already been verified, so an admin SELECT policy is
-- not required here.

DROP POLICY IF EXISTS "User Insert Own Profile" ON public.users;
CREATE POLICY "User Insert Own Profile"
    ON public.users FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "User Update Own Profile" ON public.users;
CREATE POLICY "User Update Own Profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id AND role = 'user')
    WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "Admin Update User Profiles" ON public.users;
CREATE POLICY "Admin Update User Profiles"
    ON public.users FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- C. WATCHLIST POLICIES (Strict User-Isolation)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users Read Own Watchlist" ON public.watchlist;
CREATE POLICY "Users Read Own Watchlist"
    ON public.watchlist FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Insert Own Watchlist" ON public.watchlist;
CREATE POLICY "Users Insert Own Watchlist"
    ON public.watchlist FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Delete Own Watchlist" ON public.watchlist;
CREATE POLICY "Users Delete Own Watchlist"
    ON public.watchlist FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- D. WATCH HISTORY POLICIES (Strict User-Isolation)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users Read Own Watch History" ON public.watch_history;
CREATE POLICY "Users Read Own Watch History"
    ON public.watch_history FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Insert Own Watch History" ON public.watch_history;
CREATE POLICY "Users Insert Own Watch History"
    ON public.watch_history FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Update Own Watch History" ON public.watch_history;
CREATE POLICY "Users Update Own Watch History"
    ON public.watch_history FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Delete Own Watch History" ON public.watch_history;
CREATE POLICY "Users Delete Own Watch History"
    ON public.watch_history FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- E. COMMENTS POLICIES & LIKE RPC
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
CREATE POLICY "Public Read Comments"
    ON public.comments FOR SELECT
    TO public, anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated Users Insert Comments" ON public.comments;
CREATE POLICY "Authenticated Users Insert Comments"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users Delete Own Comments" ON public.comments;
CREATE POLICY "Users Delete Own Comments"
    ON public.comments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id OR public.is_admin());

-- Secure Comment Like Toggle Function (enforces toggling only own user_id in liked_by)
CREATE OR REPLACE FUNCTION public.toggle_comment_like(p_comment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id TEXT := auth.uid()::text;
    v_comment RECORD;
    v_liked_by JSONB;
    v_is_liked BOOLEAN;
    v_new_likes INTEGER;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to like comments.';
    END IF;

    SELECT * INTO v_comment FROM public.comments WHERE id = p_comment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Comment not found.';
    END IF;

    v_liked_by := COALESCE(v_comment.liked_by, '[]'::jsonb);
    v_is_liked := v_liked_by ? v_user_id;

    IF v_is_liked THEN
        -- Remove user from liked_by
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
        INTO v_liked_by
        FROM jsonb_array_elements(v_liked_by) elem
        WHERE elem #>> '{}' <> v_user_id;
        v_new_likes := GREATEST(0, v_comment.likes - 1);
    ELSE
        -- Append user to liked_by
        v_liked_by := v_liked_by || to_jsonb(v_user_id);
        v_new_likes := v_comment.likes + 1;
    END IF;

    UPDATE public.comments
    SET likes = v_new_likes,
        liked_by = v_liked_by
    WHERE id = p_comment_id;

    RETURN jsonb_build_object(
        'success', true,
        'likes', v_new_likes,
        'liked', NOT v_is_liked
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.toggle_comment_like(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_comment_like(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- F. ADMIN AGGREGATED STATS FUNCTION
-- Performs high-performance database-level count/sum aggregations
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_anime BIGINT;
    v_total_episodes BIGINT;
    v_total_views BIGINT;
    v_total_users BIGINT;
    v_total_comments BIGINT;
BEGIN
    SELECT count(*) INTO v_total_anime FROM public.anime;
    SELECT count(*), COALESCE(sum(views), 0) INTO v_total_episodes, v_total_views FROM public.episodes;
    SELECT count(*) INTO v_total_users FROM public.users;
    SELECT count(*) INTO v_total_comments FROM public.comments;

    RETURN jsonb_build_object(
        'total_anime', v_total_anime,
        'total_episodes', v_total_episodes,
        'total_views', v_total_views,
        'total_users', v_total_users,
        'total_comments', v_total_comments
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.get_admin_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ------------------------------------------------------------------------------
-- G. ATOMIC SAVE ADMIN EPISODE RPC
-- Atomically creates/updates episode and replaces sub/dub streaming servers
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.save_admin_episode(
    p_anime_mal_id BIGINT,
    p_episode_number NUMERIC,
    p_title TEXT,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_subtitle_url TEXT DEFAULT NULL,
    p_sub_servers JSONB DEFAULT '[]'::jsonb,
    p_dub_servers JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_anime_id UUID;
    v_episode_id UUID;
    v_server JSONB;
    v_episode RECORD;
BEGIN
    -- Check admin privileges
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Access denied. Administrator privileges required.';
    END IF;

    -- Look up internal UUID for anime
    SELECT id INTO v_anime_id FROM public.anime WHERE external_id = p_anime_mal_id;
    IF v_anime_id IS NULL THEN
        RAISE EXCEPTION 'Anime with external_id % does not exist in catalog.', p_anime_mal_id;
    END IF;

    -- Upsert episode
    INSERT INTO public.episodes (anime_id, anime_mal_id, episode_number, title, thumbnail_url, subtitle_url, updated_at)
    VALUES (v_anime_id, p_anime_mal_id, p_episode_number, p_title, p_thumbnail_url, p_subtitle_url, now())
    ON CONFLICT (anime_mal_id, episode_number) DO UPDATE
    SET title = EXCLUDED.title,
        thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, public.episodes.thumbnail_url),
        subtitle_url = EXCLUDED.subtitle_url,
        updated_at = now()
    RETURNING id INTO v_episode_id;

    -- Atomically replace episode servers
    DELETE FROM public.episode_servers WHERE episode_id = v_episode_id;

    IF p_sub_servers IS NOT NULL AND jsonb_array_length(p_sub_servers) > 0 THEN
        FOR v_server IN SELECT * FROM jsonb_array_elements(p_sub_servers)
        LOOP
            INSERT INTO public.episode_servers (episode_id, language, server_name, embed_url)
            VALUES (v_episode_id, 'sub', v_server->>'server_name', v_server->>'embed_url');
        END LOOP;
    END IF;

    IF p_dub_servers IS NOT NULL AND jsonb_array_length(p_dub_servers) > 0 THEN
        FOR v_server IN SELECT * FROM jsonb_array_elements(p_dub_servers)
        LOOP
            INSERT INTO public.episode_servers (episode_id, language, server_name, embed_url)
            VALUES (v_episode_id, 'dub', v_server->>'server_name', v_server->>'embed_url');
        END LOOP;
    END IF;

    SELECT * INTO v_episode FROM public.episodes WHERE id = v_episode_id;

    RETURN jsonb_build_object(
        'success', true,
        'episode', row_to_json(v_episode)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION public.save_admin_episode(BIGINT, NUMERIC, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_admin_episode(BIGINT, NUMERIC, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- H. ATOMIC INCREMENT EPISODE VIEWS RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_episode_views(p_episode_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.episodes
    SET views = COALESCE(views, 0) + 1
    WHERE id = p_episode_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.increment_episode_views(UUID) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- I. SAFE NON-DESTRUCTIVE MIGRATIONS & SCHEMA COMPATIBILITY
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE IF EXISTS public.episodes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE IF EXISTS public.episodes ADD COLUMN IF NOT EXISTS subtitle_url TEXT;
ALTER TABLE IF EXISTS public.anime ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

