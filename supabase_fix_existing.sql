-- AniVault Supabase repair migration
-- Run this ONCE in Supabase SQL Editor after deploying the repaired project.
-- This migration is intended for an existing AniVault database created by an
-- older schema. It fixes the most common auth/RLS/type mismatches.
--
-- IMPORTANT: back up your database first. The type conversions below assume
-- existing user IDs are valid UUID strings.

BEGIN;

-- 1. Remove policies that can recurse through public.users.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname='public' AND tablename='users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', r.policyname);
  END LOOP;
END $$;

-- 2. If an older install created users.id as TEXT, convert it to UUID.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users'
      AND column_name='id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN id TYPE uuid USING NULLIF(id, '')::uuid;
  END IF;
END $$;

-- 3. Ensure users.id is linked to Supabase Auth.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(c.conkey)
    WHERE c.conrelid='public.users'::regclass
      AND c.contype='f'
      AND a.attname='id'
      AND c.confrelid='auth.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_users_fk
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- 4. Convert old text user_id columns to UUID where needed.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='watchlist'
      AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.watchlist
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id, '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='watch_history'
      AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.watch_history
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id, '')::uuid;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='comments'
      AND column_name='user_id' AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.comments
      ALTER COLUMN user_id TYPE uuid USING NULLIF(user_id, '')::uuid;
  END IF;
END $$;

-- 5. Recreate the profile trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar, role, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email,''), '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar', '/avatars/avatar-01.svg'),
    'user',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(NULLIF(EXCLUDED.name,''), public.users.name),
    avatar = COALESCE(EXCLUDED.avatar, public.users.avatar),
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path=public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Recreate admin helper without users-policy recursion.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path=public
SET row_security=off;

-- 7. Users policies: own profile only. Admin server reads use service role.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users Read Own Profile"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "User Insert Own Profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND role = 'user');

CREATE POLICY "User Update Own Profile"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = 'user');

CREATE POLICY "Admin Update User Profiles"
ON public.users FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 8. Watchlist policies.
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users Read Own Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users Insert Own Watchlist" ON public.watchlist;
DROP POLICY IF EXISTS "Users Delete Own Watchlist" ON public.watchlist;

CREATE POLICY "Users Read Own Watchlist"
ON public.watchlist FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users Insert Own Watchlist"
ON public.watchlist FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Delete Own Watchlist"
ON public.watchlist FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 9. Watch history policies.
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users Read Own Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Users Insert Own Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Users Update Own Watch History" ON public.watch_history;
DROP POLICY IF EXISTS "Users Delete Own Watch History" ON public.watch_history;

CREATE POLICY "Users Read Own Watch History"
ON public.watch_history FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users Insert Own Watch History"
ON public.watch_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Update Own Watch History"
ON public.watch_history FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Delete Own Watch History"
ON public.watch_history FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 10. Public catalog reads + admin writes.
ALTER TABLE public.anime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_servers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Anime Catalog" ON public.anime;
CREATE POLICY "Public Read Anime Catalog"
ON public.anime FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read Episodes Catalog" ON public.episodes;
CREATE POLICY "Public Read Episodes Catalog"
ON public.episodes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Public Read Episode Servers Catalog" ON public.episode_servers;
CREATE POLICY "Public Read Episode Servers Catalog"
ON public.episode_servers FOR SELECT TO anon, authenticated USING (true);

-- 11. Comments.
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated Users Insert Comments" ON public.comments;
DROP POLICY IF EXISTS "Users Delete Own Comments" ON public.comments;

CREATE POLICY "Public Read Comments"
ON public.comments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated Users Insert Comments"
ON public.comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users Delete Own Comments"
ON public.comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

COMMIT;

-- Verify with:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema='public' AND table_name IN
-- ('users','watchlist','watch_history','comments')
-- ORDER BY table_name, ordinal_position;
