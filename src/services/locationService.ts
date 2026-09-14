import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LocationRecord {
  user_id: 'ragul' | 'akshu';
  lat: number;
  lng: number;
  updated_at: string;
  city?: string;
  accuracy?: number;
  is_real_device?: boolean;
}

export interface GeocodeResult {
  city: string;
  formatted: string;
  state?: string;
  country?: string;
}

export function normalizeUserId(rawId: string): 'ragul' | 'akshu' {
  const lower = (rawId || '').toLowerCase();
  if (
    lower.includes('akshu') ||
    lower.includes('akshya') ||
    lower.includes('maya') ||
    lower === '5c14cc26-441c-4117-9827-642de9a35b12'
  ) {
    return 'akshu';
  }
  return 'ragul';
}

class LocationService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<(record: LocationRecord) => void> = new Set();
  private statusListeners: Set<(status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED') => void> = new Set();
  private lastUpsertTimes: Record<string, number> = {};
  private currentStatus: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED' = 'CONNECTING';

  /**
   * Reverse geocode coordinates to get the human-readable city and location name.
   * Uses server proxy first, and falls back to direct OpenStreetMap Nominatim on static hosting.
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
    try {
      const res = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.city || data.formatted) {
          return {
            city: data.city || 'Detected Location',
            formatted: data.formatted || 'Current Location',
            state: data.state,
            country: data.country,
          };
        }
      }
    } catch {
      // Server proxy not available (e.g. on static hosting like Vercel / Netlify)
    }

    // Direct browser fallback to OpenStreetMap Nominatim (Free, no API key required)
    try {
      const directRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      );
      if (directRes.ok) {
        const d = await directRes.json();
        const addr = d.address || {};
        const city =
          addr.city ||
          addr.town ||
          addr.village ||
          addr.suburb ||
          addr.county ||
          addr.state_district ||
          'Detected Location';
        const formatted = d.display_name || `${city}, ${addr.state || addr.country || ''}`;
        return {
          city,
          formatted,
          state: addr.state,
          country: addr.country,
        };
      }
    } catch (e) {
      console.warn('[LocationService] Direct Nominatim lookup fallback failed:', e);
    }

    return { city: 'Live Location', formatted: 'Current Location' };
  }

  /**
   * Directly queries the device's real hardware GPS fix with high-accuracy
   * and progressive fallback (high accuracy -> standard accuracy -> IP lookup)
   */
  async getRealDevicePosition(): Promise<{
    lat: number;
    lng: number;
    accuracy: number;
    city: string;
    formatted: string;
  }> {
    if (!('geolocation' in navigator)) {
      // Try IP lookup fallback
      return this.getIpFallbackPosition();
    }

    const queryGPS = (enableHighAccuracy: boolean, timeout: number): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout,
          maximumAge: 0,
        });
      });
    };

    let pos: GeolocationPosition | null = null;

    try {
      // 1. First attempt: High-accuracy device GPS
      pos = await queryGPS(true, 7000);
    } catch {
      try {
        // 2. Second attempt: Low-accuracy fast Wi-Fi / cellular fix
        pos = await queryGPS(false, 5000);
      } catch (err2) {
        console.warn('[LocationService] Browser GPS unavailable or timed out, trying IP fallback:', err2);
      }
    }

    if (pos && pos.coords) {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy || 15;
      const geocode = await this.reverseGeocode(lat, lng);

      return {
        lat,
        lng,
        accuracy,
        city: geocode.city,
        formatted: geocode.formatted,
      };
    }

    // 3. Third attempt: Network IP geolocation
    return this.getIpFallbackPosition();
  }

  private async getIpFallbackPosition() {
    try {
      const res = await fetch('/api/location/ip-lookup');
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          return {
            lat: Number(data.lat),
            lng: Number(data.lng),
            accuracy: 2500, // IP accuracy is wider
            city: data.city || 'Detected Location',
            formatted: `${data.city || 'Detected City'}, ${data.country || 'India'}`,
          };
        }
      }
    } catch {
      // Ignore server proxy failure
    }

    // Direct client fallback to ipapi.co (Free, no API key required)
    try {
      const directIp = await fetch('https://ipapi.co/json/');
      if (directIp.ok) {
        const d = await directIp.json();
        if (d.latitude && d.longitude) {
          return {
            lat: Number(d.latitude),
            lng: Number(d.longitude),
            accuracy: 2500,
            city: d.city || 'Detected Location',
            formatted: `${d.city || 'Detected City'}, ${d.region || d.country_name || 'India'}`,
          };
        }
      }
    } catch (directErr) {
      console.warn('[LocationService] Direct IP fallback failed:', directErr);
    }

    throw new Error('Unable to acquire live location. Please ensure location permissions are allowed.');
  }

  /**
   * Fetch latest locations for Ragul & Akshya from Supabase Postgres table
   */
  async fetchLocations(): Promise<LocationRecord[]> {
    if (!isSupabaseConfigured) {
      // Fallback via server API
      try {
        const res = await fetch('/api/location');
        if (res.ok) {
          const data = await res.json();
          const list: LocationRecord[] = [];
          if (data.myLocation) {
            list.push({
              user_id: normalizeUserId(data.myLocation.userId),
              lat: parseFloat(data.myLocation.latitude || data.myLocation.lat),
              lng: parseFloat(data.myLocation.longitude || data.myLocation.lng),
              updated_at: data.myLocation.updatedAt || data.myLocation.updated_at || new Date().toISOString(),
              city: data.myLocation.city,
              accuracy: data.myLocation.accuracy ? parseFloat(data.myLocation.accuracy) : undefined,
              is_real_device: true,
            });
          }
          if (data.partnerLocation) {
            list.push({
              user_id: normalizeUserId(data.partnerLocation.userId),
              lat: parseFloat(data.partnerLocation.latitude || data.partnerLocation.lat),
              lng: parseFloat(data.partnerLocation.longitude || data.partnerLocation.lng),
              updated_at: data.partnerLocation.updatedAt || data.partnerLocation.updated_at || new Date().toISOString(),
              city: data.partnerLocation.city,
              accuracy: data.partnerLocation.accuracy ? parseFloat(data.partnerLocation.accuracy) : undefined,
              is_real_device: true,
            });
          }
          return list;
        }
      } catch (err) {
        console.warn('[LocationService] Failed to fetch locations via API:', err);
      }
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*');

      if (error) {
        console.warn('[LocationService] Supabase select error:', error.message);
        return [];
      }

      if (Array.isArray(data)) {
        return data.map((row: any) => ({
          user_id: normalizeUserId(row.user_id),
          lat: Number(row.lat),
          lng: Number(row.lng),
          updated_at: row.updated_at || new Date().toISOString(),
          is_real_device: true,
        }));
      }

      return [];
    } catch (err) {
      console.error('[LocationService] Error fetching locations:', err);
      return [];
    }
  }

  /**
   * Upsert current device GPS coordinates into Supabase locations table
   * Throttled roughly every 4-8 seconds to save battery and reduce DB strain
   */
  async upsertLocation(
    userId: 'ragul' | 'akshu',
    lat: number,
    lng: number,
    city?: string,
    accuracy?: number,
    force: boolean = false
  ): Promise<boolean> {
    const now = Date.now();
    const lastTime = this.lastUpsertTimes[userId] || 0;

    // Minimum 4 seconds throttle unless forced
    if (!force && now - lastTime < 4000) {
      return false;
    }

    this.lastUpsertTimes[userId] = now;
    const updatedAt = new Date().toISOString();

    let supabaseSuccess = false;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('locations')
          .upsert(
            {
              user_id: userId,
              lat,
              lng,
              city: city || null,
              accuracy: accuracy || null,
              updated_at: updatedAt,
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.warn('[LocationService] Supabase upsert failed:', error.message);
        } else {
          supabaseSuccess = true;
        }
      } catch (err) {
        console.error('[LocationService] Exception in Supabase upsert:', err);
      }
    }

    // Always also notify server endpoint to ensure WebSocket live sync
    try {
      await fetch('/api/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          latitude: lat,
          longitude: lng,
          lat,
          lng,
          city,
          accuracy,
          isSharing: true,
          updated_at: updatedAt,
        }),
      });
    } catch {
      // Non-blocking
    }

    // Locally notify listeners immediately
    const record: LocationRecord = {
      user_id: userId,
      lat,
      lng,
      updated_at: updatedAt,
      city,
      accuracy,
      is_real_device: true,
    };
    this.notifyListeners(record);

    return supabaseSuccess;
  }

  /**
   * Subscribe to Supabase Realtime postgres_changes events on the 'locations' table
   */
  subscribeToLocations(
    onLocationUpdate: (record: LocationRecord) => void,
    onStatusChange?: (status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED') => void
  ): () => void {
    this.listeners.add(onLocationUpdate);
    if (onStatusChange) {
      this.statusListeners.add(onStatusChange);
      onStatusChange(this.currentStatus);
    }

    // Initialize Supabase channel if not yet subscribed
    if (!this.channel && isSupabaseConfigured) {
      this.initSupabaseChannel();
    }

    // Return cleanup unsubscribe function
    return () => {
      this.listeners.delete(onLocationUpdate);
      if (onStatusChange) {
        this.statusListeners.delete(onStatusChange);
      }
      if (this.listeners.size === 0 && this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
        this.currentStatus = 'DISCONNECTED';
        this.notifyStatus('DISCONNECTED');
      }
    };
  }

  private initSupabaseChannel() {
    try {
      this.channel = supabase
        .channel('public:locations:realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'locations',
          },
          (payload) => {
            if (payload.new && (payload.new as any).user_id) {
              const row = payload.new as any;
              const record: LocationRecord = {
                user_id: normalizeUserId(row.user_id),
                lat: Number(row.lat),
                lng: Number(row.lng),
                updated_at: row.updated_at || new Date().toISOString(),
                city: row.city || undefined,
                accuracy: row.accuracy ? Number(row.accuracy) : undefined,
                is_real_device: true,
              };
              this.notifyListeners(record);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.currentStatus = 'SUBSCRIBED';
            this.notifyStatus('SUBSCRIBED');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.currentStatus = 'DISCONNECTED';
            this.notifyStatus('DISCONNECTED');
          } else {
            this.currentStatus = 'CONNECTING';
            this.notifyStatus('CONNECTING');
          }
        });
    } catch (err) {
      console.error('[LocationService] Failed to create Supabase channel:', err);
      this.currentStatus = 'DISCONNECTED';
      this.notifyStatus('DISCONNECTED');
    }
  }

  private notifyListeners(record: LocationRecord) {
    this.listeners.forEach((listener) => {
      try {
        listener(record);
      } catch (e) {
        console.error('[LocationService] Listener error:', e);
      }
    });
  }

  private notifyStatus(status: 'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED') {
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('[LocationService] Status listener error:', e);
      }
    });
  }
}

export const locationService = new LocationService();
