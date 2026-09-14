// AKRA: Persistent Audio Storage using IndexedDB
// Ensures custom uploaded soundtrack files persist across page refreshes and tabs

const DB_NAME = 'akra_audio_db';
const DB_VERSION = 1;
const STORE_NAME = 'custom_soundtrack';

function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioFile(file: File): Promise<string> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, 'active_track');
    tx.oncomplete = () => {
      resolve(URL.createObjectURL(file));
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSavedAudioFile(): Promise<{ url: string; fileName: string } | null> {
  try {
    const db = await openAudioDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('active_track');
      req.onsuccess = () => {
        const file = req.result as File | undefined;
        if (file && file instanceof Blob) {
          const url = URL.createObjectURL(file);
          resolve({ url, fileName: (file as any).name || 'Custom Uploaded Track' });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to load audio from IndexedDB:', err);
    return null;
  }
}

export async function clearSavedAudioFile(): Promise<void> {
  try {
    const db = await openAudioDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('active_track');
  } catch {
    // ignore
  }
}
