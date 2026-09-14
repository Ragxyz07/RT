/**
 * AKRA Private Storage Engine for Photobooth & Memories.
 * Uses high-capacity private IndexedDB on the client,
 * with seamless hook for private cloud storage (Supabase Storage) if credentials exist.
 */
import { supabase, isSupabaseConfigured, uploadToSupabaseStorage } from '../lib/supabase.ts';

export interface PrivatePhotoRecord {
  id: string;
  coupleId: string;
  uploadedBy: string;
  uploadedByName: string;
  storagePath: string;
  photoType: 'single' | '4cut' | 'polaroid' | 'film' | 'gif';
  caption: string;
  location?: string;
  createdDate: string;
  createdAt: number;
  imageDataUrl: string;
  thumbnailUrl?: string;
}

const DB_NAME = 'akra_private_vault_db';
const STORE_NAME = 'photobooth_memories';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('coupleId', 'coupleId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a photobooth memory into private client storage and optional Supabase private bucket
 */
export async function savePrivatePhoto(photo: Omit<PrivatePhotoRecord, 'storagePath'>): Promise<PrivatePhotoRecord> {
  const coupleId = photo.coupleId || 'couple_akra_1';
  const storagePath = `photobooth/${photo.id}.jpg`;

  const fullRecord: PrivatePhotoRecord = {
    ...photo,
    storagePath,
  };

  // 1. Store in durable IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(fullRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB write warning:', err);
  }

  // 2. Upload to server backend storage
  try {
    const token = localStorage.getItem('akra_auth_token') || '';
    const res = await fetch('/api/upload-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        dataUrl: photo.imageDataUrl,
        filename: photo.id,
        bucket: 'akra-photobooth',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) {
        fullRecord.thumbnailUrl = data.url;
      }
    }
  } catch (err) {
    console.warn('Server photo upload warning:', err);
  }

  // 3. Upload directly to Supabase Storage if configured
  if (isSupabaseConfigured) {
    try {
      const res = await fetch(photo.imageDataUrl);
      const blob = await res.blob();
      const uploadRes = await uploadToSupabaseStorage('akra-photobooth', storagePath, blob, 'image/jpeg');
      if (uploadRes?.url) {
        fullRecord.thumbnailUrl = uploadRes.url;
      }

      // Record in Supabase media table
      await supabase.from('media').insert({
        id: photo.id,
        couple_id: 'couple_akra_1',
        uploaded_by: photo.uploadedBy,
        storage_path: storagePath,
        file_type: 'image/jpeg',
        url: uploadRes?.url || fullRecord.thumbnailUrl || '',
        caption: photo.caption || 'Photobooth capture',
        category: 'photobooth',
      });
    } catch (e) {
      console.warn('Supabase storage upload note:', e);
    }
  }

  return fullRecord;
}

/**
 * Retrieve all photobooth memories from private storage
 */
export async function getPrivatePhotos(coupleId = 'couple_akra_1'): Promise<PrivatePhotoRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const results = (request.result as PrivatePhotoRecord[]) || [];
        const filtered = results
          .filter((p) => !p.coupleId || p.coupleId === coupleId || p.coupleId === 'ragul_akshya')
          .sort((a, b) => b.createdAt - a.createdAt);
        resolve(filtered);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}
