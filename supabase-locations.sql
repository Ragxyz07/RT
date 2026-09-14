-- ==============================================================================
-- AKRA: Supabase Locations Table, Realtime & Row Level Security (RLS)
-- Columns: user_id (text, PK), lat (double precision), lng (double precision), updated_at (timestamptz)
-- ==============================================================================

-- 1. Create the locations table
CREATE TABLE IF NOT EXISTS public.locations (
  user_id text PRIMARY KEY,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  city text,
  accuracy double precision,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure all columns exist
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS accuracy double precision;
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- General SELECT access for authorized couple members
DROP POLICY IF EXISTS "Allow select locations for couple members" ON public.locations;
CREATE POLICY "Allow select locations for couple members"
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT policy: auth.uid()::text = user_id
DROP POLICY IF EXISTS "Allow insert own location" ON public.locations;
CREATE POLICY "Allow insert own location"
  ON public.locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'user_id') = user_id
    OR (auth.uid() = 'dcc699cf-7931-4589-832f-558094faa8b7' AND user_id = 'ragul')
    OR (auth.uid() = '5c14cc26-441c-4117-9827-642de9a35b12' AND user_id = 'akshu')
  );

-- UPDATE policy: auth.uid()::text = user_id
DROP POLICY IF EXISTS "Allow update own location" ON public.locations;
CREATE POLICY "Allow update own location"
  ON public.locations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'user_id') = user_id
    OR (auth.uid() = 'dcc699cf-7931-4589-832f-558094faa8b7' AND user_id = 'ragul')
    OR (auth.uid() = '5c14cc26-441c-4117-9827-642de9a35b12' AND user_id = 'akshu')
  )
  WITH CHECK (
    auth.uid()::text = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'user_id') = user_id
    OR (auth.uid() = 'dcc699cf-7931-4589-832f-558094faa8b7' AND user_id = 'ragul')
    OR (auth.uid() = '5c14cc26-441c-4117-9827-642de9a35b12' AND user_id = 'akshu')
  );

-- Optional anon policy for development testing
DROP POLICY IF EXISTS "Allow anon pair read and write" ON public.locations;
CREATE POLICY "Allow anon pair read and write"
  ON public.locations
  FOR ALL
  TO anon
  USING (user_id IN ('ragul', 'akshu', 'dcc699cf-7931-4589-832f-558094faa8b7', '5c14cc26-441c-4117-9827-642de9a35b12'))
  WITH CHECK (user_id IN ('ragul', 'akshu', 'dcc699cf-7931-4589-832f-558094faa8b7', '5c14cc26-441c-4117-9827-642de9a35b12'));

-- 4. Enable Supabase Realtime replication on public.locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'locations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
  END IF;
END $$;

-- 5. Seed initial coordinate records for Ragul and Akshu
INSERT INTO public.locations (user_id, lat, lng, city, accuracy, updated_at)
VALUES
  ('ragul', 11.9416, 79.8083, 'Puducherry', 10, now()),
  ('akshu', 12.9716, 77.5946, 'Bangalore', 12, now())
ON CONFLICT (user_id) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  city = EXCLUDED.city,
  accuracy = EXCLUDED.accuracy,
  updated_at = EXCLUDED.updated_at;
