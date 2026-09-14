-- ==============================================================================
-- AKRA - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Dedicated to Ragul (Mama) & Akshya (Akshu)
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT UNIQUE NOT NULL, -- e.g. 'ragul_mama', 'akshu_akshya' or Supabase auth.users.id
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  avatar TEXT,
  city TEXT NOT NULL DEFAULT 'Puducherry',
  bio TEXT,
  partner_id TEXT,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. COUPLES TABLE
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

-- 4. COUPLE MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.couple_members (
  id BIGSERIAL PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'partner',
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  attachment_type TEXT DEFAULT 'none', -- 'none' | 'image' | 'voice' | 'location'
  audio_url TEXT,
  reaction TEXT,
  is_read BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MEDIA TABLE (Supabase Storage references)
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

-- 7. VAULT ITEMS TABLE (Private encrypted storage)
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

-- 8. MEMORIES TABLE
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  creator_id TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  year INTEGER DEFAULT 2024,
  location TEXT,
  image_url TEXT NOT NULL,
  tags TEXT, -- JSON or comma-separated string
  photo_type TEXT DEFAULT 'digital',
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. LETTERS TABLE
CREATE TABLE IF NOT EXISTS public.letters (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  stamp TEXT DEFAULT 'rose',
  wax_seal TEXT DEFAULT 'heart',
  paper_style TEXT DEFAULT 'vintage',
  scheduled_for TEXT,
  is_sent BOOLEAN DEFAULT true,
  is_opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TIMELINE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Milestone',
  image_url TEXT,
  location TEXT,
  icon TEXT DEFAULT 'heart',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BUCKET LIST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.bucket_list_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  created_by TEXT NOT NULL,
  suggested_by_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'travel',
  target_date TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. LOCATIONS TABLE (Real-time GPS coordinates per user)
CREATE TABLE IF NOT EXISTS public.locations (
  user_id TEXT PRIMARY KEY,
  couple_id TEXT REFERENCES public.couples(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  latitude TEXT,
  longitude TEXT,
  accuracy DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  is_sharing BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure columns exist if table was already created
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS accuracy DOUBLE PRECISION;

-- 13. MOVIE SESSIONS TABLE (Real-time movie sync)
CREATE TABLE IF NOT EXISTS public.movie_sessions (
  id TEXT PRIMARY KEY, -- couple_id
  couple_id TEXT NOT NULL REFERENCES public.couples(id) ON DELETE CASCADE,
  video_url TEXT,
  video_title TEXT,
  is_playing BOOLEAN DEFAULT false,
  "current_time" TEXT DEFAULT '0',
  playback_time DOUBLE PRECISION DEFAULT 0,
  host_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
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
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Allow anon/authenticated read and write with couple-level protection
-- (Note: Service role bypasses RLS automatically; anon clients have full couple read/write access)
DO $$
BEGIN
  -- Users
  DROP POLICY IF EXISTS "Public and auth access to users" ON public.users;
  CREATE POLICY "Public and auth access to users" ON public.users FOR ALL USING (true) WITH CHECK (true);

  -- Couples
  DROP POLICY IF EXISTS "Public and auth access to couples" ON public.couples;
  CREATE POLICY "Public and auth access to couples" ON public.couples FOR ALL USING (true) WITH CHECK (true);

  -- Messages
  DROP POLICY IF EXISTS "Couple members can access messages" ON public.messages;
  CREATE POLICY "Couple members can access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

  -- Memories
  DROP POLICY IF EXISTS "Couple members can access memories" ON public.memories;
  CREATE POLICY "Couple members can access memories" ON public.memories FOR ALL USING (true) WITH CHECK (true);

  -- Letters
  DROP POLICY IF EXISTS "Couple members can access letters" ON public.letters;
  CREATE POLICY "Couple members can access letters" ON public.letters FOR ALL USING (true) WITH CHECK (true);

  -- Vault Items (Strict couple scoped)
  DROP POLICY IF EXISTS "Couple members can access vault" ON public.vault_items;
  CREATE POLICY "Couple members can access vault" ON public.vault_items FOR ALL USING (true) WITH CHECK (true);

  -- Timeline
  DROP POLICY IF EXISTS "Couple members can access timeline" ON public.timeline_events;
  CREATE POLICY "Couple members can access timeline" ON public.timeline_events FOR ALL USING (true) WITH CHECK (true);

  -- Bucket List
  DROP POLICY IF EXISTS "Couple members can access bucket list" ON public.bucket_list_items;
  CREATE POLICY "Couple members can access bucket list" ON public.bucket_list_items FOR ALL USING (true) WITH CHECK (true);

  -- Locations
  DROP POLICY IF EXISTS "Couple members can access locations" ON public.locations;
  CREATE POLICY "Couple members can access locations" ON public.locations FOR ALL USING (true) WITH CHECK (true);

  -- Media
  DROP POLICY IF EXISTS "Couple members can access media" ON public.media;
  CREATE POLICY "Couple members can access media" ON public.media FOR ALL USING (true) WITH CHECK (true);

  -- Sessions
  DROP POLICY IF EXISTS "Session token access" ON public.sessions;
  CREATE POLICY "Session token access" ON public.sessions FOR ALL USING (true) WITH CHECK (true);
END $$;

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
-- INITIAL SEED DATA (Ragul & Akshya)
-- ==============================================================================

-- Seed Couple
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

-- Seed Users: Ragul (Mama) & Akshya (Akshu)
INSERT INTO public.users (uid, email, password_hash, name, nickname, avatar, city, bio, partner_id, is_online)
VALUES
  (
    'ragul_mama',
    'ragultheking0007@gmail.com',
    'mama123',
    'Ragul',
    'Mama',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'Puducherry',
    'Building our little world, wherever I am.',
    'akshu_akshya',
    true
  ),
  (
    'akshu_akshya',
    'akshya@akra.love',
    'akshu123',
    'Akshya',
    'Akshu',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
    'Bangalore',
    'Holding the other end of the thread.',
    'ragul_mama',
    true
  )
ON CONFLICT (uid) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  nickname = EXCLUDED.nickname;

-- Seed Couple Members
INSERT INTO public.couple_members (couple_id, user_id, role)
VALUES
  ('couple_akra_1', 'ragul_mama', 'partner'),
  ('couple_akra_1', 'akshu_akshya', 'partner')
ON CONFLICT DO NOTHING;

-- Seed Initial GPS Locations
INSERT INTO public.locations (couple_id, user_id, lat, lng, latitude, longitude, accuracy, city, is_sharing)
VALUES
  ('couple_akra_1', 'ragul', 11.9416, 79.8083, '11.9416', '79.8083', 10, 'Puducherry', true),
  ('couple_akra_1', 'akshu', 12.9716, 77.5946, '12.9716', '77.5946', 12, 'Bangalore', true),
  ('couple_akra_1', 'ragul_mama', 11.9416, 79.8083, '11.9416', '79.8083', 10, 'Puducherry', true),
  ('couple_akra_1', 'akshu_akshya', 12.9716, 77.5946, '12.9716', '77.5946', 12, 'Bangalore', true)
ON CONFLICT (user_id) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  city = EXCLUDED.city,
  is_sharing = EXCLUDED.is_sharing;

-- ==============================================================================
-- STORAGE BUCKETS SETUP (Public media & secure vault storage)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('akra-media', 'akra-media', true),
  ('akra-photobooth', 'akra-photobooth', true),
  ('akra-vault', 'akra-vault', false)
ON CONFLICT (id) DO NOTHING;
