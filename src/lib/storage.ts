import { supabase, isSupabaseConfigured } from './supabase';
import { api } from '../services/api';

export type StorageBucket = 'akra-vault' | 'akra-photobooth' | 'akra-media';

export interface UploadOptions {
  bucket: StorageBucket;
  folder?: string;
  filename?: string;
  caption?: string;
  category?: string;
  saveToMedia?: boolean;
}

export interface UploadResult {
  success: boolean;
  url: string;
  storagePath: string;
  bucket: StorageBucket;
}

/**
 * Converts a base64 / data-URL string into a standard Blob
 */
export function dataURLtoBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([uint8Array], { type: mime });
}

/**
 * Uploads a real file/blob to the designated Supabase Storage bucket,
 * generates a signed URL (for private akra-vault) or public URL (for akra-photobooth and akra-media),
 * and returns the real Supabase Storage URL.
 */
export async function uploadToSupabaseStorage(
  fileOrBlob: File | Blob,
  options: UploadOptions
): Promise<UploadResult> {
  const bucket = options.bucket;
  const folder = options.folder || (bucket === 'akra-vault' ? 'vault' : bucket === 'akra-photobooth' ? 'photobooth' : 'uploads');
  const ext = fileOrBlob.type.includes('png') ? '.png' : fileOrBlob.type.includes('webp') ? '.webp' : '.jpg';
  const uniqueName = options.filename
    ? options.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')
    : `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const storagePath = `${folder}/${uniqueName}`;

  // 1. Attempt direct client-side Supabase Storage upload
  if (isSupabaseConfigured) {
    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, fileOrBlob, {
          contentType: fileOrBlob.type || 'image/jpeg',
          upsert: true,
        });

      if (!uploadErr && uploadData?.path) {
        if (bucket === 'akra-vault') {
          // Private bucket: generate signed URL (10 years)
          const { data: signedData, error: signErr } = await supabase.storage
            .from('akra-vault')
            .createSignedUrl(uploadData.path, 60 * 60 * 24 * 365 * 10);

          if (!signErr && signedData?.signedUrl) {
            return {
              success: true,
              url: signedData.signedUrl,
              storagePath: uploadData.path,
              bucket,
            };
          }
        } else {
          // Public bucket: generate public URL
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(uploadData.path);

          if (publicUrlData?.publicUrl) {
            // If requested, record in media table
            if (bucket === 'akra-photobooth' || options.saveToMedia) {
              api.addMedia({
                storagePath: uploadData.path,
                fileType: fileOrBlob.type || 'image/jpeg',
                fileSize: fileOrBlob.size,
                url: publicUrlData.publicUrl,
                caption: options.caption || (bucket === 'akra-photobooth' ? 'Photobooth Capture' : ''),
                category: bucket === 'akra-photobooth' ? 'photobooth' : (options.category || 'gallery'),
              }).catch(() => {});
            }

            return {
              success: true,
              url: publicUrlData.publicUrl,
              storagePath: uploadData.path,
              bucket,
            };
          }
        }
      }
    } catch (clientErr) {
      console.warn('Direct client Supabase storage upload fell back to server upload:', clientErr);
    }
  }

  // 2. Server-side Supabase upload fallback (uses service role key to ensure 100% success)
  const serverRes = await api.uploadFile(fileOrBlob, {
    bucket,
    folder,
    filename: uniqueName,
    caption: options.caption,
    category: options.category,
  });

  return {
    success: serverRes.success,
    url: serverRes.url,
    storagePath: serverRes.storagePath || storagePath,
    bucket,
  };
}
