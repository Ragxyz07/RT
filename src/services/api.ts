// Client-side API service for AKRA full-stack integration

let authToken = localStorage.getItem('akra_auth_token') || '';

export const setAuthToken = (token: string) => {
  authToken = token;
  if (token) {
    localStorage.setItem('akra_auth_token', token);
  } else {
    localStorage.removeItem('akra_auth_token');
  }
};

export const getAuthToken = () => authToken;

const getHeaders = (isJson = true) => {
  const headers: Record<string, string> = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  return headers;
};

// Generic fetch wrapper
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...getHeaders(!(options.body instanceof FormData)),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorBody.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: async (nickname: string, password: string) => {
    const data = await apiFetch<{
      success: boolean;
      token: string;
      user: any;
      partner: any;
      couple: any;
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ nickname, password }),
    });
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  },

  getMe: async () => {
    return apiFetch<{ user: any; partner: any; couple: any }>('/api/auth/me');
  },

  logout: async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken('');
    }
  },

  // Messages
  getMessages: async () => {
    return apiFetch<any[]>('/api/messages');
  },

  sendMessage: async (msg: {
    text: string;
    imageUrl?: string;
    attachmentType?: string;
    audioUrl?: string;
  }) => {
    return apiFetch<any>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(msg),
    });
  },

  reactToMessage: async (id: string, reaction: string) => {
    return apiFetch<any>(`/api/messages/${id}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
  },

  markMessagesRead: async () => {
    return apiFetch<any>('/api/messages/mark-read', { method: 'POST' });
  },

  // Memories
  getMemories: async () => {
    return apiFetch<any[]>('/api/memories');
  },

  addMemory: async (memory: any) => {
    return apiFetch<any>('/api/memories', {
      method: 'POST',
      body: JSON.stringify(memory),
    });
  },

  deleteMemory: async (id: string) => {
    return apiFetch<any>(`/api/memories/${id}`, { method: 'DELETE' });
  },

  likeMemory: async (id: string) => {
    return apiFetch<any>(`/api/memories/${id}/like`, { method: 'POST' });
  },

  // Letters
  getLetters: async () => {
    return apiFetch<any[]>('/api/letters');
  },

  addLetter: async (letter: any) => {
    return apiFetch<any>('/api/letters', {
      method: 'POST',
      body: JSON.stringify(letter),
    });
  },

  openLetter: async (id: string) => {
    return apiFetch<any>(`/api/letters/${id}/open`, { method: 'POST' });
  },

  // Vault
  verifyVaultPin: async (pin: string) => {
    return apiFetch<{ success: boolean }>('/api/vault/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  getVaultItems: async () => {
    return apiFetch<any[]>('/api/vault');
  },

  addVaultItem: async (item: any) => {
    return apiFetch<any>('/api/vault', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  deleteVaultItem: async (id: string) => {
    return apiFetch<any>(`/api/vault/${id}`, { method: 'DELETE' });
  },

  // Timeline
  getTimeline: async () => {
    return apiFetch<any[]>('/api/timeline');
  },

  addTimelineEvent: async (event: any) => {
    return apiFetch<any>('/api/timeline', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  deleteTimelineEvent: async (id: string) => {
    return apiFetch<any>(`/api/timeline/${id}`, { method: 'DELETE' });
  },

  // Bucket List
  getBucketList: async () => {
    return apiFetch<any[]>('/api/bucket-list');
  },

  addBucketItem: async (item: any) => {
    return apiFetch<any>('/api/bucket-list', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  updateBucketItem: async (id: string, updates: any) => {
    return apiFetch<any>(`/api/bucket-list/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  deleteBucketItem: async (id: string) => {
    return apiFetch<any>(`/api/bucket-list/${id}`, { method: 'DELETE' });
  },

  // Location
  getLocationData: async () => {
    return apiFetch<{
      myLocation: any;
      mySharingEnabled: boolean;
      partnerLocation: any;
      partnerSharingEnabled: boolean;
    }>('/api/location');
  },

  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
    city?: string;
    isSharing?: boolean;
  }) => {
    return apiFetch<any>('/api/location', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  toggleLocationSharing: async (enabled: boolean) => {
    return apiFetch<any>('/api/location/toggle-sharing', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  },

  // Couple Settings
  getCouple: async () => {
    return apiFetch<any>('/api/couple');
  },

  updateCouple: async (updates: any) => {
    return apiFetch<any>('/api/couple', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // Media & Storage Upload
  getMedia: async () => {
    return apiFetch<any[]>('/api/media');
  },

  addMedia: async (item: any) => {
    return apiFetch<any>('/api/media', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  uploadFile: async (
    file: File | Blob,
    options?: { bucket?: string; folder?: string; caption?: string; category?: string; filename?: string }
  ) => {
    const formData = new FormData();
    const finalFilename = options?.filename || (file instanceof File ? file.name : `file-${Date.now()}.jpg`);
    formData.append('file', file, finalFilename);
    if (options?.bucket) formData.append('bucket', options.bucket);
    if (options?.folder) formData.append('folder', options.folder);
    if (options?.caption) formData.append('caption', options.caption);
    if (options?.category) formData.append('category', options.category);

    return apiFetch<{
      success: boolean;
      url: string;
      storagePath: string;
      bucket: string;
      filename: string;
    }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },

  uploadBase64: async (
    dataUrl: string,
    options?: { filename?: string; bucket?: string; folder?: string; caption?: string; category?: string }
  ) => {
    return apiFetch<{ success: boolean; url: string; storagePath: string; bucket: string }>('/api/upload-base64', {
      method: 'POST',
      body: JSON.stringify({
        dataUrl,
        filename: options?.filename,
        bucket: options?.bucket || 'akra-photobooth',
        folder: options?.folder || 'photobooth',
        caption: options?.caption,
        category: options?.category,
      }),
    });
  },
};
