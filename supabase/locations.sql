-- ==============================================================================
-- AKRA: Supabase Locations Table & Realtime Setup
-- Two users: Ragul ('ragul') & Akshya ('akshu')
-- ==============================================================================

-- 1. Create the locations table
CREATE TABLE IF NOT EXISTS public.locations (
  user_id text PRIMARY KEY CHECK (user_id IN ('ragul', 'akshu')),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies:
-- Allow authenticated Ragul & Akshu accounts to read location rows
DROP POLICY IF EXISTS "Allow authenticated read on locations" ON public.locations;
CREATE POLICY "Allow authenticated read on locations"
  ON public.locations
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow each user to write only to their own row (auth.uid()::text = user_id)
DROP POLICY IF EXISTS "Allow individual write to own location" ON public.locations;
CREATE POLICY "Allow individual write to own location"
  ON public.locations
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id 
    OR (auth.jwt() ->> 'sub')::text = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'user_id')::text = user_id
  )
  WITH CHECK (
    auth.uid()::text = user_id 
    OR (auth.jwt() ->> 'sub')::text = user_id
    OR (auth.jwt() -> 'user_metadata' ->> 'user_id')::text = user_id
  );

-- For development/anon access when testing with public anon key:
DROP POLICY IF EXISTS "Allow anon pair read and write" ON public.locations;
CREATE POLICY "Allow anon pair read and write"
  ON public.locations
  FOR ALL
  TO anon
  USING (user_id IN ('ragul', 'akshu'))
  WITH CHECK (user_id IN ('ragul', 'akshu'));

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
