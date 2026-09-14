import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { UserProfile } from '../types';
import {
  Maximize2,
  RefreshCw,
  Compass,
  AlertCircle,
  MapPin,
  Crosshair,
} from 'lucide-react';

export interface LocationRecord {
  user_id: 'ragul' | 'akshu';
  lat: number;
  lng: number;
  updated_at: string;
  city?: string;
  accuracy?: number;
  is_real_device?: boolean;
}

interface LeafletMapProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  myUserId: 'ragul' | 'akshu';
  partnerUserId: 'ragul' | 'akshu';
  myLocationRecord: LocationRecord | null;
  partnerLocationRecord: LocationRecord | null;
  isRealtimeConnected: boolean;
  distanceKm: number;
  onRefreshGPS?: () => void;
  isRefreshingGPS?: boolean;
  className?: string;
}

// Helper to calculate great circle distance in km
function computeDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Helper to format relative time
function formatRelativeTime(dateString?: string | null): { text: string; isStale: boolean; isLive: boolean } {
  if (!dateString) {
    return { text: 'Awaiting device fix', isStale: true, isLive: false };
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { text: 'Unknown', isStale: true, isLive: false };
  }
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 0 || diffSec < 15) {
    return { text: 'Just now', isStale: false, isLive: true };
  }
  if (diffSec < 60) {
    return { text: `${diffSec}s ago`, isStale: false, isLive: true };
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 5) {
    return { text: `${diffMin}m ago`, isStale: false, isLive: true };
  }
  if (diffMin < 60) {
    return { text: `${diffMin}m ago`, isStale: true, isLive: false };
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return { text: `${diffHours}h ago`, isStale: true, isLive: false };
  }
  const diffDays = Math.floor(diffHours / 24);
  return { text: `${diffDays}d ago`, isStale: true, isLive: false };
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  currentUser,
  partnerUser,
  myUserId,
  partnerUserId,
  myLocationRecord,
  partnerLocationRecord,
  isRealtimeConnected,
  distanceKm,
  onRefreshGPS,
  isRefreshingGPS = false,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const ragulMarkerRef = useRef<L.Marker | null>(null);
  const akshuMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const distanceMarkerRef = useRef<L.Marker | null>(null);
  const hasAutoCenteredOnRealGps = useRef(false);

  const [mapReady, setMapReady] = useState(false);

  // Derive coordinates from either Supabase location records or user profile
  const ragulRecord = myUserId === 'ragul' ? myLocationRecord : partnerLocationRecord;
  const akshuRecord = myUserId === 'akshu' ? myLocationRecord : partnerLocationRecord;

  // Mama (Puducherry) coordinates: live coordinates with Puducherry fallback
  const ragulLat = ragulRecord?.lat ?? (myUserId === 'ragul' ? currentUser.lat : partnerUser.lat) ?? 11.9416;
  const ragulLng = ragulRecord?.lng ?? (myUserId === 'ragul' ? currentUser.lng : partnerUser.lng) ?? 79.8083;
  const ragulCity = ragulRecord?.city ?? (myUserId === 'ragul' ? currentUser.city : partnerUser.city) ?? 'Puducherry';
  const ragulUpdated = ragulRecord?.updated_at ?? (myUserId === 'ragul' ? currentUser.lastLocationUpdate : partnerUser.lastLocationUpdate);

  // Akshu (Bangalore) coordinates: live coordinates with Bangalore fallback
  const akshuLat = akshuRecord?.lat ?? (myUserId === 'akshu' ? currentUser.lat : partnerUser.lat) ?? 12.9716;
  const akshuLng = akshuRecord?.lng ?? (myUserId === 'akshu' ? currentUser.lng : partnerUser.lng) ?? 77.5946;
  const akshuCity = akshuRecord?.city ?? (myUserId === 'akshu' ? currentUser.city : partnerUser.city) ?? 'Bangalore';
  const akshuUpdated = akshuRecord?.updated_at ?? (myUserId === 'akshu' ? currentUser.lastLocationUpdate : partnerUser.lastLocationUpdate);

  const ragulTime = formatRelativeTime(ragulUpdated);
  const akshuTime = formatRelativeTime(akshuUpdated);

  // User's own coordinates
  const myLat = myUserId === 'ragul' ? ragulLat : akshuLat;
  const myLng = myUserId === 'ragul' ? ragulLng : akshuLng;

  // Avatar photos
  const ragulAvatar =
    (myUserId === 'ragul' ? currentUser.avatar : partnerUser.avatar) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const akshuAvatar =
    (myUserId === 'akshu' ? currentUser.avatar : partnerUser.avatar) ||
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80';

  // Helper to create custom HTML avatar marker for Leaflet
  const createAvatarIcon = (
    name: string,
    nickname: string,
    avatarUrl: string,
    timeText: string,
    isLive: boolean,
    isCurrentUser: boolean,
    city?: string
  ) => {
    const ringColor = isCurrentUser ? '#b06a5e' : '#7a5240';
    const statusBg = isLive ? '#22c55e' : '#eab308';
    const glowClass = isLive ? 'leaflet-live-pulse' : '';

    const html = `
      <div class="leaflet-custom-marker ${glowClass}" style="position: relative; display: flex; flex-direction: column; align-items: center; pointer-events: auto;">
        <!-- Avatar Ring -->
        <div style="
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #f9efe8;
          padding: 2.5px;
          box-shadow: 0 4px 14px rgba(74, 46, 36, 0.35);
          border: 2px solid ${ringColor};
        ">
          <img
            src="${avatarUrl}"
            alt="${name}"
            style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;"
            onerror="this.src='https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'"
          />
          <!-- Status Dot -->
          <span style="
            position: absolute;
            bottom: 0px;
            right: 0px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background-color: ${statusBg};
            border: 2px solid #ffffff;
            box-shadow: 0 0 4px rgba(0,0,0,0.25);
          "></span>
        </div>

        <!-- Name, City & Updated At Label -->
        <div style="
          margin-top: 4px;
          white-space: nowrap;
          background: rgba(249, 239, 232, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(122, 82, 64, 0.25);
          border-radius: 12px;
          padding: 2px 8px;
          box-shadow: 0 2px 8px rgba(91, 58, 46, 0.2);
          text-align: center;
        ">
          <div style="font-family: var(--font-serif, serif); font-size: 11px; font-weight: 600; color: #5b3a2e; line-height: 1.2;">
            ${nickname} <span style="font-size: 10px; font-weight: 500; color: #b06a5e;">(${city || (nickname === 'Mama' ? 'Puducherry' : 'Bangalore')})</span>
          </div>
          <div style="font-family: var(--font-sans, sans-serif); font-size: 9px; color: ${isLive ? '#15803d' : '#854d0e'}; font-weight: 500;">
            ${isLive ? '● ' : ''}${timeText}
          </div>
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'leaflet-avatar-container',
      html,
      iconSize: [90, 84],
      iconAnchor: [45, 50],
      popupAnchor: [0, -52],
    });
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Calculate initial bounds to frame both Mama (Puducherry) and Akshu (Bangalore)
    const bounds =
      ragulLat && ragulLng && akshuLat && akshuLng
        ? L.latLngBounds([
            [ragulLat, ragulLng],
            [akshuLat, akshuLng],
          ])
        : null;

    const defaultCenter: [number, number] = bounds
      ? [bounds.getCenter().lat, bounds.getCenter().lng]
      : [myLat || 12.45, myLng || 78.7];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: bounds ? undefined : 8,
      zoomControl: false,
    });

    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
    }

    // OpenStreetMap tile layer (no API key, no signup required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Add zoom control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Ensure map tiles render sharply after container mount
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      if (distanceMarkerRef.current) {
        distanceMarkerRef.current.remove();
        distanceMarkerRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers, Polyline, & Accuracy circle when positions change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // --- Ragul Marker ---
    if (ragulLat && ragulLng) {
      const ragulIcon = createAvatarIcon(
        'Ragul',
        'Mama',
        ragulAvatar,
        ragulTime.text,
        ragulTime.isLive,
        myUserId === 'ragul',
        ragulCity
      );

      if (!ragulMarkerRef.current) {
        const marker = L.marker([ragulLat, ragulLng], { icon: ragulIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
            <strong style="font-size: 13px; color: #5b3a2e;">Ragul (Mama)</strong><br/>
            ${ragulCity ? `<span style="font-size: 11px; color: #7a5240;">Area: ${ragulCity}</span><br/>` : ''}
            <span style="font-size: 11px; color: #7a5240;">Updated: ${ragulTime.text}</span><br/>
            <span style="font-size: 10px; color: #888; font-family: monospace;">GPS: ${ragulLat.toFixed(5)}°, ${ragulLng.toFixed(5)}°</span>
          </div>
        `);
        ragulMarkerRef.current = marker;
      } else {
        ragulMarkerRef.current.setLatLng([ragulLat, ragulLng]);
        ragulMarkerRef.current.setIcon(ragulIcon);
      }
    }

    // --- Akshya Marker ---
    if (akshuLat && akshuLng) {
      const akshuIcon = createAvatarIcon(
        'Akshya',
        'Akshu',
        akshuAvatar,
        akshuTime.text,
        akshuTime.isLive,
        myUserId === 'akshu',
        akshuCity
      );

      if (!akshuMarkerRef.current) {
        const marker = L.marker([akshuLat, akshuLng], { icon: akshuIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; min-width: 140px;">
            <strong style="font-size: 13px; color: #5b3a2e;">Akshya (Akshu)</strong><br/>
            ${akshuCity ? `<span style="font-size: 11px; color: #7a5240;">Area: ${akshuCity}</span><br/>` : ''}
            <span style="font-size: 11px; color: #7a5240;">Updated: ${akshuTime.text}</span><br/>
            <span style="font-size: 10px; color: #888; font-family: monospace;">GPS: ${akshuLat.toFixed(5)}°, ${akshuLng.toFixed(5)}°</span>
          </div>
        `);
        akshuMarkerRef.current = marker;
      } else {
        akshuMarkerRef.current.setLatLng([akshuLat, akshuLng]);
        akshuMarkerRef.current.setIcon(akshuIcon);
      }
    }

    // --- Accuracy Circle around Current User's GPS ---
    if (myLat && myLng) {
      const accRadius = myLocationRecord?.accuracy || 25;
      if (!accuracyCircleRef.current) {
        const circle = L.circle([myLat, myLng], {
          radius: Math.min(accRadius, 100),
          color: '#b06a5e',
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#b06a5e',
          fillOpacity: 0.12,
        }).addTo(map);
        accuracyCircleRef.current = circle;
      } else {
        accuracyCircleRef.current.setLatLng([myLat, myLng]);
        accuracyCircleRef.current.setRadius(Math.min(accRadius, 100));
      }
    }

    // --- Connecting Thread Polyline & Distance Label between Mama & Akshu ---
    if (ragulLat && ragulLng && akshuLat && akshuLng) {
      const latlngs: [number, number][] = [
        [ragulLat, ragulLng],
        [akshuLat, akshuLng],
      ];

      const effectiveDist =
        distanceKm > 0 ? distanceKm : computeDistanceKm(ragulLat, ragulLng, akshuLat, akshuLng);

      if (!polylineRef.current) {
        const polyline = L.polyline(latlngs, {
          color: '#b06a5e',
          weight: 3,
          opacity: 0.85,
          dashArray: '6, 8',
          lineCap: 'round',
        }).addTo(map);

        polyline.bindTooltip(`${effectiveDist} km apart`, {
          permanent: false,
          direction: 'center',
          className: 'leaflet-distance-tooltip',
        });

        polylineRef.current = polyline;
      } else {
        polylineRef.current.setLatLngs(latlngs);
        polylineRef.current.setTooltipContent(`${effectiveDist} km apart`);
      }

      // Midpoint distance label marker
      const midLat = (ragulLat + akshuLat) / 2;
      const midLng = (ragulLng + akshuLng) / 2;

      const distHtml = `
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #5b3a2e;
          color: #f9efe8;
          font-family: ui-monospace, monospace;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 9999px;
          border: 1.5px solid #ecd0c8;
          box-shadow: 0 4px 14px rgba(74, 46, 36, 0.4);
          white-space: nowrap;
          transform: translate(-50%, -50%);
          cursor: pointer;
        ">
          <span style="font-size: 12px;">❤️</span>
          <span>${effectiveDist} km apart</span>
        </div>
      `;

      const distIcon = L.divIcon({
        className: 'leaflet-distance-marker-container',
        html: distHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      if (!distanceMarkerRef.current) {
        const distMarker = L.marker([midLat, midLng], {
          icon: distIcon,
          interactive: true,
          zIndexOffset: 600,
        }).addTo(map);

        distMarker.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px; text-align: center; min-width: 140px;">
            <strong style="font-size: 12px; color: #5b3a2e;">Mama (Puducherry) ↔ Akshu (Bangalore)</strong><br/>
            <span style="font-size: 13px; font-weight: bold; color: #b06a5e; font-family: monospace;">${effectiveDist} km</span>
          </div>
        `);

        distanceMarkerRef.current = distMarker;
      } else {
        distanceMarkerRef.current.setLatLng([midLat, midLng]);
        distanceMarkerRef.current.setIcon(distIcon);
      }
    }

    // Auto Center: Fly to real user GPS once acquired
    if (!hasAutoCenteredOnRealGps.current && myLocationRecord?.is_real_device && myLat && myLng) {
      hasAutoCenteredOnRealGps.current = true;
      map.flyTo([myLat, myLng], 14, { duration: 1.2 });
    }
  }, [
    mapReady,
    ragulLat,
    ragulLng,
    akshuLat,
    akshuLng,
    ragulCity,
    akshuCity,
    ragulTime.text,
    akshuTime.text,
    ragulTime.isLive,
    akshuTime.isLive,
    myLat,
    myLng,
    myLocationRecord,
    myUserId,
    ragulAvatar,
    akshuAvatar,
    distanceKm,
  ]);

  // Fit Both Markers View
  const handleFitBoth = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (ragulLat && ragulLng && akshuLat && akshuLng) {
      const bounds = L.latLngBounds([
        [ragulLat, ragulLng],
        [akshuLat, akshuLng],
      ]);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true });
    } else if (myLat && myLng) {
      map.setView([myLat, myLng], 14, { animate: true });
    }
  }, [ragulLat, ragulLng, akshuLat, akshuLng, myLat, myLng]);

  // Fly straight to current device live location
  const handleCenterMyGps = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || !myLat || !myLng) return;
    map.flyTo([myLat, myLng], 15, { duration: 1 });
    if (myUserId === 'ragul' && ragulMarkerRef.current) {
      ragulMarkerRef.current.openPopup();
    } else if (myUserId === 'akshu' && akshuMarkerRef.current) {
      akshuMarkerRef.current.openPopup();
    }
  }, [myLat, myLng, myUserId]);

  const partnerIsStale = myUserId === 'ragul' ? akshuTime.isStale : ragulTime.isStale;
  const partnerName = myUserId === 'ragul' ? 'Akshu' : 'Mama';
  const partnerLastSeen = myUserId === 'ragul' ? akshuTime.text : ragulTime.text;
  const displayDistance =
    distanceKm > 0 ? distanceKm : computeDistanceKm(ragulLat, ragulLng, akshuLat, akshuLng);

  return (
    <div
      className={`relative w-full rounded-[32px] overflow-hidden border border-[#7a5240]/20 shadow-2xl bg-[#f4eae3] ${className}`}
      style={{ height: '560px' }}
    >
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Top Header: Live Tracking Glassmorphism Badge */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="px-3.5 py-1.5 rounded-full bg-[#f9efe8]/95 backdrop-blur-md border border-[#7a5240]/20 shadow-md flex items-center gap-2 text-xs font-medium text-[#5b3a2e]">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRealtimeConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="font-serif tracking-tight">
            {myLocationRecord?.is_real_device ? '🟢 Live Device GPS Active' : '📡 Acquiring Live GPS...'}
          </span>
        </div>

        {/* Distance Badge */}
        {displayDistance > 0 && (
          <div className="px-3 py-1.5 rounded-full bg-[#5b3a2e]/90 backdrop-blur-md border border-[#5b3a2e] text-[#f9efe8] text-xs font-mono shadow-md flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#ecd0c8]" />
            <span>{displayDistance} km apart</span>
          </div>
        )}
      </div>

      {/* Floating Top-Right Controls */}
      <div className="absolute top-4 right-14 z-[1000] flex items-center gap-2 pointer-events-auto">
        <button
          onClick={handleCenterMyGps}
          title="Center on my real GPS location"
          className="px-3 py-1.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] text-xs font-medium transition cursor-pointer shadow-md flex items-center gap-1.5"
        >
          <Crosshair className="w-3.5 h-3.5 text-[#ecd0c8]" />
          <span>My Live GPS</span>
        </button>

        <button
          onClick={handleFitBoth}
          title="Fit both markers"
          className="px-3 py-1.5 rounded-full bg-[#f9efe8]/90 backdrop-blur-md border border-[#7a5240]/20 text-[#5b3a2e] hover:bg-[#ecd0c8] text-xs font-medium transition cursor-pointer shadow-md flex items-center gap-1.5"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#b06a5e]" />
          <span className="hidden sm:inline">Fit Both</span>
        </button>

        {onRefreshGPS && (
          <button
            onClick={onRefreshGPS}
            disabled={isRefreshingGPS}
            title="Poll real device GPS"
            className="p-2 rounded-full bg-[#f9efe8]/90 backdrop-blur-md border border-[#7a5240]/20 text-[#5b3a2e] hover:bg-[#ecd0c8] text-xs transition cursor-pointer shadow-md flex items-center justify-center"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#b06a5e] ${isRefreshingGPS ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Floating Bottom Center Bar: Partner Status & Quick Focus */}
      <div className="absolute bottom-4 inset-x-4 z-[1000] flex flex-col sm:flex-row items-center justify-between gap-3 pointer-events-none">
        {/* Partner Stale or Active Warning / Reassurance Pill */}
        <div className="pointer-events-auto w-full sm:w-auto">
          {partnerIsStale ? (
            <div className="px-4 py-2 rounded-2xl bg-[#f9efe8]/95 backdrop-blur-md border border-amber-300/60 shadow-lg text-xs text-[#5b3a2e] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>{partnerName}'s location unavailable</strong> — {partnerLastSeen}
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-[#f9efe8]/95 backdrop-blur-md border border-[#7a5240]/20 shadow-lg text-xs text-[#5b3a2e] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>
                <strong>{partnerName} is Live</strong> • {partnerLastSeen}
              </span>
            </div>
          )}
        </div>

        {/* Center on Live Coordinates Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#f9efe8]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#7a5240]/20 shadow-lg">
          <button
            onClick={handleCenterMyGps}
            className="px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 bg-[#5b3a2e] text-[#f9efe8]"
          >
            <MapPin className="w-3 h-3 text-[#ecd0c8]" />
            <span>Focus on Me ({myLocationRecord?.city || currentUser.city})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
