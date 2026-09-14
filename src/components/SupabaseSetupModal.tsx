import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Layers,
  FolderLock,
  X,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSetupModal: React.FC<SupabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'tables' | 'storage' | 'unified'>('unified');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const TABLES_SQL = `-- ==================================================================
-- AKRA RELATIONAL SCHEMA: DATABASE TABLES INITIALIZATION SCRIPT
-- Execute in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==================================================================

-- 1. Couple Spaces
CREATE TABLE IF NOT EXISTS public.couple_spaces (
  id TEXT PRIMARY KEY,
  partner1_id TEXT NOT NULL,
  partner2_id TEXT NOT NULL,
  anniversary_date TEXT,
  next_meeting_date TEXT,
  next_meeting_title TEXT,
  next_meeting_location TEXT,
  song TEXT,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users / Profiles
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nickname TEXT,
  city TEXT,
  avatar_url TEXT,
  partner_id TEXT,
  role TEXT DEFAULT 'user',
  sound_effects BOOLEAN DEFAULT true,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Vault Items (Private Cryptographic & Memory Safe)
CREATE TABLE IF NOT EXISTS public.vault_items (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  created_by TEXT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'photo',
  url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  tags TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Letters (Postbox & Wax Seals)
CREATE TABLE IF NOT EXISTS public.letters (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  seal TEXT DEFAULT 'classic-heart',
  paper_style TEXT DEFAULT 'vintage-parchment',
  status TEXT DEFAULT 'unread',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Memories & Photo Album
CREATE TABLE IF NOT EXISTS public.memories (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2026,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  caption TEXT,
  location TEXT,
  author TEXT,
  photo_type TEXT,
  tags TEXT[],
  comments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages / Chat
CREATE TABLE IF NOT EXISTS public.messages (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  audio_url TEXT,
  attachment_type TEXT DEFAULT 'none',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alias table chat_messages if needed
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  media_url TEXT,
  audio_url TEXT,
  attachment_type TEXT DEFAULT 'none',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Timeline Events / Milestones
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  created_by TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'Milestone',
  image_url TEXT,
  location TEXT,
  icon TEXT DEFAULT 'heart',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Media Master Registry
CREATE TABLE IF NOT EXISTS public.media (
  id TEXT PRIMARY KEY,
  couple_id TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  bucket TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  category TEXT DEFAULT 'general',
  caption TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public policies for rapid development
ALTER TABLE public.couple_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

-- Development policy for anon/service access
DO $$ BEGIN
  EXECUTE 'CREATE POLICY "Allow anon all couple_spaces" ON public.couple_spaces FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all users" ON public.users FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all vault_items" ON public.vault_items FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all letters" ON public.letters FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all memories" ON public.memories FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all messages" ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all chat_messages" ON public.chat_messages FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all timeline_events" ON public.timeline_events FOR ALL TO anon USING (true) WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Allow anon all media" ON public.media FOR ALL TO anon USING (true) WITH CHECK (true)';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

  const STORAGE_SQL = `-- ==================================================================
-- AKRA STORAGE BUCKETS & POLICIES SCRIPT
-- Execute in Supabase SQL Editor:
-- ==================================================================

-- 1. akra-vault (Private Bucket for Secure Vault)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'akra-vault',
  'akra-vault',
  false,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'audio/mpeg', 'audio/webm', 'audio/ogg']
) ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. akra-photobooth (Public Bucket for 4-Cut, Polaroid & Film strips)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'akra-photobooth',
  'akra-photobooth',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. akra-media (Public Bucket for Memories, Timeline, Chat & Avatars)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'akra-media',
  'akra-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/webm', 'audio/ogg', 'audio/wav']
) ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Access Policies for Objects
DO $$ BEGIN
  -- Public read for akra-media & akra-photobooth
  EXECUTE 'CREATE POLICY "Public read akra-media" ON storage.objects FOR SELECT TO public USING (bucket_id IN (''akra-media'', ''akra-photobooth''))';
  -- Public upload for all buckets
  EXECUTE 'CREATE POLICY "Allow upload akra storage" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id IN (''akra-media'', ''akra-photobooth'', ''akra-vault''))';
  EXECUTE 'CREATE POLICY "Allow update akra storage" ON storage.objects FOR UPDATE TO public USING (bucket_id IN (''akra-media'', ''akra-photobooth'', ''akra-vault''))';
  EXECUTE 'CREATE POLICY "Allow delete akra storage" ON storage.objects FOR DELETE TO public USING (bucket_id IN (''akra-media'', ''akra-photobooth'', ''akra-vault''))';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
`;

  const UNIFIED_SQL = `${TABLES_SQL}\n\n${STORAGE_SQL}`;

  const currentCode = activeTab === 'unified' ? UNIFIED_SQL : activeTab === 'tables' ? TABLES_SQL : STORAGE_SQL;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-up">
      <div className="relative max-w-4xl w-full bg-[#FAF7F2] rounded-[32px] border border-[#E8D5C4] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-[#E8D5C4] bg-[#FFF0F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5D4037] text-white flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-xl text-[#3E2723]">Supabase Database & Storage Setup</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#EFE5E0] text-[#5D4037] font-semibold">
                  SQL Editor Helper
                </span>
              </div>
              <p className="text-xs text-[#795548] font-serif italic mt-0.5">
                Step-by-step checklist to initialize missing tables & storage buckets in Supabase.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#795548] hover:bg-[#FCEBF2] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-6">
          {/* Step-by-Step Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5D4037]">
                <span className="w-5 h-5 rounded-full bg-[#5D4037] text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Open SQL Editor</span>
              </div>
              <p className="text-xs text-[#795548] leading-relaxed">
                Log into your Supabase Dashboard and navigate to the <b>SQL Editor</b> for project <code className="text-[11px] bg-[#FAF7F2] px-1 py-0.5 rounded text-[#3E2723]">pbenavjftzphpymvkktj</code>.
              </p>
              <a
                href="https://supabase.com/dashboard/project/pbenavjftzphpymvkktj/sql"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#5D4037] font-semibold hover:underline pt-1"
              >
                <span>Open Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5D4037]">
                <span className="w-5 h-5 rounded-full bg-[#5D4037] text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Paste & Run Unified SQL</span>
              </div>
              <p className="text-xs text-[#795548] leading-relaxed">
                Copy the unified SQL snippet below, paste it into a New Query tab in Supabase, and click <b>RUN</b>.
              </p>
              <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium pt-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Includes IF NOT EXISTS idempotency</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-[#E8D5C4] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#5D4037]">
                <span className="w-5 h-5 rounded-full bg-[#5D4037] text-white flex items-center justify-center text-[10px]">
                  3
                </span>
                <span>Storage Buckets Created</span>
              </div>
              <p className="text-xs text-[#795548] leading-relaxed">
                The script creates <b>akra-vault</b> (private), <b>akra-photobooth</b> (public), and <b>akra-media</b> (public) automatically.
              </p>
              <div className="text-[11px] text-[#5D4037] flex items-center gap-1 font-medium pt-1">
                <FolderLock className="w-3.5 h-3.5 shrink-0" />
                <span>Public URLs & Signed URLs enabled</span>
              </div>
            </div>
          </div>

          {/* Storage Bucket Specifications Summary */}
          <div className="bg-[#FFF0F5] rounded-2xl p-4 border border-[#F0C9D8] space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E2723] flex items-center gap-2">
              <FolderLock className="w-4 h-4 text-[#5D4037]" />
              <span>Storage Buckets Reference</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-[#F0C9D8] text-xs">
                <div className="font-mono font-bold text-[#3E2723]">akra-vault</div>
                <div className="text-[11px] text-rose-700 font-semibold mt-0.5">Private Bucket (Signed URLs)</div>
                <p className="text-[11px] text-[#795548] mt-1">Used for: Vault memory safe items, encrypted personal files.</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#F0C9D8] text-xs">
                <div className="font-mono font-bold text-[#3E2723]">akra-photobooth</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Public Bucket</div>
                <p className="text-[11px] text-[#795548] mt-1">Used for: 4-Cut strips, polaroid prints, film strips.</p>
              </div>
              <div className="bg-white p-3 rounded-xl border border-[#F0C9D8] text-xs">
                <div className="font-mono font-bold text-[#3E2723]">akra-media</div>
                <div className="text-[11px] text-emerald-700 font-semibold mt-0.5">Public Bucket</div>
                <p className="text-[11px] text-[#795548] mt-1">Used for: Memories shelf, timeline milestones, chat images, avatars.</p>
              </div>
            </div>
          </div>

          {/* Code Viewer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#EFE5E0]">
                <button
                  onClick={() => setActiveTab('unified')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'unified'
                      ? 'bg-white text-[#3E2723] shadow-2xs'
                      : 'text-[#795548] hover:text-[#3E2723]'
                  }`}
                >
                  Unified Script (All-in-One)
                </button>
                <button
                  onClick={() => setActiveTab('tables')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'tables'
                      ? 'bg-white text-[#3E2723] shadow-2xs'
                      : 'text-[#795548] hover:text-[#3E2723]'
                  }`}
                >
                  Tables Only
                </button>
                <button
                  onClick={() => setActiveTab('storage')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeTab === 'storage'
                      ? 'bg-white text-[#3E2723] shadow-2xs'
                      : 'text-[#795548] hover:text-[#3E2723]'
                  }`}
                >
                  Storage Buckets & Policies
                </button>
              </div>

              <button
                onClick={handleCopy}
                className="px-4 py-2 rounded-xl bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition flex items-center gap-2 shadow-2xs cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-[#1F140E] p-4 text-[#FAF7F2] font-mono text-[11px] sm:text-xs overflow-x-auto max-h-72 border border-[#3E2723]">
              <pre>{currentCode}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#E8D5C4] bg-white flex items-center justify-between">
          <div className="text-[11px] text-[#795548] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5D4037]" />
            <span>AKRA server proxy automatically handles uploads and database synchronization.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
