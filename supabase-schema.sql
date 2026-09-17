-- ==============================================================================
-- AKRA - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Dedicated to Ragul (Mama) & Akshya (Akshu)
-- Enforces real Supabase Auth (auth.uid()) and couple membership isolation
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. COUPLES TABLE
CREATE TABLE IF NOT EXISTS public.couples (
  id TEXT PRIMARY KEY, -- e.g. 'couple_akra_1'
  name TEXT NOT NULL DEFAULT 'AKRA',
  partner_code TEXT NOT NULL DEFAULT 'AKRA-2024',
  anniversary_date TEXT NOT NULL DEFAULT '2023-11-14',
  start_date TEXT NOT NULL DEFAULT '2022-04-18',
  story TEXT DEFAULT 'From Puducherry to Bangalore, connected by an unbreakable thread.',
  song_title TEXT DEFAULT 'golden hour',
  song_artist TEXT DEFAULT 'JVKE',
  song_url TEXT,
  vault_pin TEXT NOT NULL DEFAULT '1403',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USERS TABLE (Linked to Supabase Auth auth.users via UUID)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  uid TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  city TEXT NOT NULL DEFAULT 'Puducherry',
  bio TEXT,
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. COUPLE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.couple_members (
  id BIGSERIAL PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'partner',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (couple_id, user_id)
);

-- 5. Helper function: Check if authenticated user belongs to couple
CREATE OR REPLACE FUNCTION public.is_couple_member(check_couple_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.couple_members
    WHERE couple_id = check_couple_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. Helper function: Get couple_id for currently authenticated user
CREATE OR REPLACE FUNCTION public.get_auth_couple_id()
RETURNS TEXT AS $$
DECLARE
  res_couple_id TEXT;
BEGIN
  SELECT couple_id INTO res_couple_id
  FROM public.couple_members
  WHERE user_id = auth.uid()
  LIMIT 1;
  RETURN res_couple_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 7. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  attachment_type TEXT DEFAULT 'none',
  audio_url TEXT,
  reaction TEXT,
  is_read BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. MEDIA TABLE (Supabase Storage references)
CREATE TABLE IF NOT EXISTS public.media (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  url TEXT NOT NULL,
  caption TEXT,
  category TEXT DEFAULT 'gallery',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. VAULT ITEMS TABLE (Private encrypted storage)
CREATE TABLE IF NOT EXISTS public.vault_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  uploaded_by TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  storage_path TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,
  category TEXT DEFAULT 'general',
  is_locked BOOLEAN DEFAULT true,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. MEMORIES TABLE
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  category TEXT DEFAULT 'special',
  image_url TEXT NOT NULL,
  caption TEXT,
  likes INTEGER DEFAULT 0,
  liked_by_you BOOLEAN DEFAULT false,
  comments JSONB DEFAULT '[]'::jsonb,
  creator_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.letters (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sealed_until TIMESTAMPTZ,
  is_opened BOOLEAN DEFAULT false,
  wax_color TEXT DEFAULT 'rose',
  paper_style TEXT DEFAULT 'classic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ
);

-- 12. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Heart',
  image_url TEXT,
  category TEXT DEFAULT 'milestone',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. BUCKET LIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.bucket_list_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_date TEXT,
  completed BOOLEAN DEFAULT false,
  category TEXT DEFAULT 'travel',
  location TEXT,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. LOCATIONS TABLE (Realtime GPS Sync)
CREATE TABLE IF NOT EXISTS public.locations (
  user_id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  latitude TEXT,
  longitude TEXT,
  accuracy DOUBLE PRECISION DEFAULT 10,
  city TEXT DEFAULT 'Puducherry',
  is_sharing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 15. MOVIE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.movie_sessions (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL,
  is_playing BOOLEAN DEFAULT false,
  current_time DOUBLE PRECISION DEFAULT 0,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforce auth.uid() validation against couple membership
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bucket_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_sessions ENABLE ROW LEVEL SECURITY;

-- 1. USERS POLICIES
DROP POLICY IF EXISTS "Users can read couple partner profile" ON public.users;
CREATE POLICY "Users can read couple partner profile" ON public.users
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR
    id IN (
      SELECT cm2.user_id FROM public.couple_members cm1
      JOIN public.couple_members cm2 ON cm1.couple_id = cm2.couple_id
      WHERE cm1.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. COUPLES POLICIES
DROP POLICY IF EXISTS "Couple members can view couple" ON public.couples;
CREATE POLICY "Couple members can view couple" ON public.couples
  FOR SELECT TO authenticated
  USING (public.is_couple_member(id));

DROP POLICY IF EXISTS "Couple members can update couple space" ON public.couples;
CREATE POLICY "Couple members can update couple space" ON public.couples
  FOR UPDATE TO authenticated
  USING (public.is_couple_member(id))
  WITH CHECK (public.is_couple_member(id));

-- 3. COUPLE MEMBERS POLICIES
DROP POLICY IF EXISTS "Couple members can view members" ON public.couple_members;
CREATE POLICY "Couple members can view members" ON public.couple_members
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id) OR user_id = auth.uid());

-- 4. MESSAGES POLICIES
DROP POLICY IF EXISTS "Couple members can view messages" ON public.messages;
CREATE POLICY "Couple members can view messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can insert messages" ON public.messages;
CREATE POLICY "Couple members can insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id) AND
    sender_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Couple members can update messages" ON public.messages;
CREATE POLICY "Couple members can update messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (public.is_couple_member(couple_id));

-- 5. VAULT ITEMS POLICIES
DROP POLICY IF EXISTS "Couple members can view vault items" ON public.vault_items;
CREATE POLICY "Couple members can view vault items" ON public.vault_items
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can insert vault items" ON public.vault_items;
CREATE POLICY "Couple members can insert vault items" ON public.vault_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id) AND
    uploaded_by = auth.uid()::text
  );

DROP POLICY IF EXISTS "Creators can delete vault items" ON public.vault_items;
CREATE POLICY "Creators can delete vault items" ON public.vault_items
  FOR DELETE TO authenticated
  USING (
    public.is_couple_member(couple_id) AND
    uploaded_by = auth.uid()::text
  );

-- 6. MEMORIES POLICIES
DROP POLICY IF EXISTS "Couple members can view memories" ON public.memories;
CREATE POLICY "Couple members can view memories" ON public.memories
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can insert memories" ON public.memories;
CREATE POLICY "Couple members can insert memories" ON public.memories
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id) AND
    (creator_id IS NULL OR creator_id = auth.uid()::text)
  );

DROP POLICY IF EXISTS "Couple members can update memories" ON public.memories;
CREATE POLICY "Couple members can update memories" ON public.memories
  FOR UPDATE TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can delete memories" ON public.memories;
CREATE POLICY "Couple members can delete memories" ON public.memories
  FOR DELETE TO authenticated
  USING (public.is_couple_member(couple_id));

-- 7. LETTERS POLICIES
DROP POLICY IF EXISTS "Couple members can view letters" ON public.letters;
CREATE POLICY "Couple members can view letters" ON public.letters
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can insert letters" ON public.letters;
CREATE POLICY "Couple members can insert letters" ON public.letters
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_couple_member(couple_id) AND
    sender_id = auth.uid()::text
  );

DROP POLICY IF EXISTS "Couple members can update letters" ON public.letters;
CREATE POLICY "Couple members can update letters" ON public.letters
  FOR UPDATE TO authenticated
  USING (public.is_couple_member(couple_id));

-- 8. LOCATIONS POLICIES
DROP POLICY IF EXISTS "Couple members can view locations" ON public.locations;
CREATE POLICY "Couple members can view locations" ON public.locations
  FOR SELECT TO authenticated
  USING (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Users can only update own location" ON public.locations;
CREATE POLICY "Users can only update own location" ON public.locations
  FOR ALL TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text AND public.is_couple_member(couple_id));

-- 9. MEDIA POLICIES
DROP POLICY IF EXISTS "Couple members can access media" ON public.media;
CREATE POLICY "Couple members can access media" ON public.media
  FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

-- 10. TIMELINE, BUCKET LIST, MOVIE SESSIONS
DROP POLICY IF EXISTS "Couple members can access timeline" ON public.timeline_events;
CREATE POLICY "Couple members can access timeline" ON public.timeline_events
  FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can access bucket list" ON public.bucket_list_items;
CREATE POLICY "Couple members can access bucket list" ON public.bucket_list_items
  FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

DROP POLICY IF EXISTS "Couple members can access movie sessions" ON public.movie_sessions;
CREATE POLICY "Couple members can access movie sessions" ON public.movie_sessions
  FOR ALL TO authenticated
  USING (public.is_couple_member(couple_id))
  WITH CHECK (public.is_couple_member(couple_id));

-- ==============================================================================
-- REALTIME PUBLICATIONS (Enable Supabase Realtime)
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'locations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'memories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.memories;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'letters') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.letters;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'vault_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vault_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'movie_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.movie_sessions;
  END IF;
END $$;

-- ==============================================================================
-- AUTO-SYNC TRIGGER: Provision user profile on auth.users sign up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, nickname, city, is_online)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'city', 'Puducherry'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  -- Ensure membership in default couple
  INSERT INTO public.couple_members (couple_id, user_id, role)
  VALUES ('couple_akra_1', new.id, 'partner')
  ON CONFLICT (couple_id, user_id) DO NOTHING;

  -- Initialize location record
  INSERT INTO public.locations (user_id, couple_id, lat, lng, latitude, longitude, accuracy, city, is_sharing)
  VALUES (
    new.id::text,
    'couple_akra_1',
    11.9416,
    79.8083,
    '11.9416',
    '79.8083',
    10,
    COALESCE(new.raw_user_meta_data->>'city', 'Puducherry'),
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- ==============================================================================
-- INITIAL SEED: Couple space
-- ==============================================================================
INSERT INTO public.couples (id, name, partner_code, anniversary_date, start_date, story, song_title, song_artist, vault_pin)
VALUES (
  'couple_akra_1',
  'AKRA',
  'AKRA-2024',
  '2023-11-14',
  '2022-04-18',
  'From Puducherry to Bangalore, connected by an unbreakable thread.',
  'golden hour',
  'JVKE',
  '1403'
)
ON CONFLICT (id) DO UPDATE SET
  vault_pin = EXCLUDED.vault_pin,
  name = EXCLUDED.name;

-- ==============================================================================
-- STORAGE BUCKETS SETUP (Public media & secure vault storage)
-- Max file size: 10MB (10485760 bytes)
-- Allowed types: image/jpeg, image/png, image/webp
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('akra-media', 'akra-media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('akra-photobooth', 'akra-photobooth', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('akra-vault', 'akra-vault', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS: Authenticated couple members can read & write their media
DROP POLICY IF EXISTS "Authenticated users can upload media" ON storage.objects;
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('akra-media', 'akra-photobooth', 'akra-vault')
    AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
  );

DROP POLICY IF EXISTS "Authenticated users can read media" ON storage.objects;
CREATE POLICY "Authenticated users can read media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id IN ('akra-media', 'akra-photobooth', 'akra-vault'));

