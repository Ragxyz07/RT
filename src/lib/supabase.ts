import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read public Supabase credentials from environment
const metaEnv = (import.meta as any).env || {};

function cleanSupabaseUrl(url: string): string {
  if (!url) return '';
  return url
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const rawSupabaseUrl: string = metaEnv.VITE_SUPABASE_URL || '';
const supabaseUrl: string = cleanSupabaseUrl(rawSupabaseUrl);
const supabaseAnonKey: string = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

// Fallback dummy client if credentials aren't supplied yet to prevent application crash
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: localStorage,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
} else {
  // Graceful fallback dummy client so methods don't throw syntax errors
  clientInstance = createClient(
    'https://xyzcompany.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy',
    {
      auth: { persistSession: false },
    }
  );
}

export const supabase = clientInstance;

/**
 * Storage helpers for AKRA media, vault, and photobooth
 */
export async function uploadToSupabaseStorage(
  bucket: 'akra-media' | 'akra-vault' | 'akra-photobooth',
  filePath: string,
  fileBlob: Blob,
  contentType: string = 'image/jpeg'
): Promise<{ url: string; path: string; error?: any }> {
  if (!isSupabaseConfigured) {
    return { url: '', path: filePath, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBlob, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    // For public buckets (media & photobooth), return public URL
    // For private vault, get signed URL
    if (bucket === 'akra-vault') {
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours
      return { url: signedData?.signedUrl || '', path: filePath };
    } else {
      const { data: publicData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      return { url: publicData.publicUrl, path: filePath };
    }
  } catch (err) {
    console.error(`Storage upload failed to ${bucket}:`, err);
    return { url: '', path: filePath, error: err };
  }
}

/**
 * Helper to retrieve a signed URL for private vault assets
 */
export async function getSignedVaultUrl(filePath: string): Promise<string> {
  if (!isSupabaseConfigured || !filePath) return '';
  try {
    const { data, error } = await supabase.storage
      .from('akra-vault')
      .createSignedUrl(filePath, 60 * 60 * 24);
    if (error) throw error;
    return data?.signedUrl || '';
  } catch (e) {
    console.warn('Failed to generate signed vault URL:', e);
    return '';
  }
}
