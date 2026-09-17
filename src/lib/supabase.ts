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
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('xyzcompany')
);

export const supabaseConfigStatus = {
  isConfigured: isSupabaseConfigured,
  hasUrl: Boolean(supabaseUrl && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder')),
  hasKey: Boolean(supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('dummy')),
  supabaseUrl,
};

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ [AKRA] Supabase is NOT configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to enable real database storage and realtime communication.'
  );
}

// Fallback client: if not configured, queries will return an informative error instead of silent mock data
let clientInstance: SupabaseClient;

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
  clientInstance = createClient(
    'https://unconfigured-supabase.invalid',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.unconfigured.invalid',
    {
      auth: { persistSession: false },
    }
  );
}

export const supabase = clientInstance;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB per image
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates file size and type before sending to storage
 */
export function validateImageFile(fileOrBlob: { size: number; type?: string }, explicitMime?: string): { valid: boolean; error?: string } {
  if (!fileOrBlob || typeof fileOrBlob.size !== 'number') {
    return { valid: false, error: 'No file provided for upload.' };
  }

  if (fileOrBlob.size <= 0) {
    return { valid: false, error: 'Cannot upload an empty file.' };
  }

  if (fileOrBlob.size > MAX_UPLOAD_BYTES) {
    const sizeMb = (fileOrBlob.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb}MB) exceeds the maximum limit of 10MB. Please select a smaller photo.`,
    };
  }

  const mime = (explicitMime || fileOrBlob.type || '').toLowerCase();
  if (mime && !ALLOWED_IMAGE_MIME_TYPES.includes(mime)) {
    return {
      valid: false,
      error: `Unsupported file type (${mime}). Only JPEG, PNG, and WebP images are allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Storage helpers for AKRA media, vault, and photobooth
 */
export async function uploadToSupabaseStorage(
  bucket: 'akra-media' | 'akra-vault' | 'akra-photobooth',
  filePath: string,
  fileBlob: Blob,
  contentType: string = 'image/jpeg'
): Promise<{ url: string; path: string; error?: any }> {
  // 1. Client-side validation: reject invalid file size or type with descriptive error
  const validation = validateImageFile(fileBlob, contentType);
  if (!validation.valid) {
    console.warn(`[AKRA Storage Validation Error]: ${validation.error}`);
    return { url: '', path: filePath, error: new Error(validation.error) };
  }

  if (!isSupabaseConfigured) {
    return { url: '', path: filePath, error: new Error('Supabase is not configured.') };
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBlob, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error(`Storage error from Supabase (${bucket}):`, error.message);
      return { url: '', path: filePath, error };
    }

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
  } catch (err: any) {
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
