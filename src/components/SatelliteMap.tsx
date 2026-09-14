import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map as MapLibreMap,
  Marker,
  Popup,
  NavigationControl,
  AttributionControl,
  LngLatBounds,
  type StyleSpecification,
  type GeoJSONSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { UserProfile } from '../types';
import { Navigation, Maximize2, Radio, Layers, Compass, ShieldCheck } from 'lucide-react';

interface SatelliteMapProps {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  distanceKm: number;
  onToggleSharing?: (enabled: boolean) => void;
  className?: string;
}

// Open high-resolution satellite raster style (No API keys required)
const OPEN_SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'satellite-tiles': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'satellite-tiles-layer',
      type: 'raster',
      source: 'satellite-tiles',
      minzoom: 0,
      maxzoom: 22,
    },
  ],
};

// Great-circle arc generator for romantic connecting line between Mama and Akshu
function generateGreatCirclePoints(
  start: [number, number],
  end: [number, number],
  numPoints = 64
): [number, number][] {
  const points: [number, number][] = [];
  const [lon1, lat1] = start.map((d) => (d * Math.PI) / 180);
  const [lon2, lat2] = end.map((d) => (d * Math.PI) / 180);

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.pow(Math.sin((lat1 - lat2) / 2), 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon1 - lon2) / 2), 2)
      )
    );

  if (d === 0) return [start, end];

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2)));
    const lon = Math.atan2(y, x);
    points.push([(lon * 180) / Math.PI, (lat * 180) / Math.PI]);
  }
  return points;
}

export const SatelliteMap: React.FC<SatelliteMapProps> = ({
  currentUser,
  partnerUser,
  distanceKm,
  onToggleSharing,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const currentUserMarkerRef = useRef<Marker | null>(null);
  const partnerUserMarkerRef = useRef<Marker | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapViewMode, setMapViewMode] = useState<'satellite' | 'hybrid'>('satellite');

  // Determine initial center
  const getInitialCoordinates = useCallback((): [number, number] => {
    if (currentUser.isSharingLocation && currentUser.lng && currentUser.lat) {
      return [currentUser.lng, currentUser.lat];
    }
    if (partnerUser.isSharingLocation && partnerUser.lng && partnerUser.lat) {
      return [partnerUser.lng, partnerUser.lat];
    }
    // Default to midpoint between southern India (Puducherry & Bangalore)
    return [78.7, 12.4];
  }, [currentUser, partnerUser]);

  // Create refined custom marker element
  const createMarkerElement = (user: UserProfile, isCurrent: boolean) => {
    const el = document.createElement('div');
    el.className = 'akra-satellite-marker';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.cursor = 'pointer';

    const ringColor = isCurrent ? '#b06a5e' : '#d9a89e';
    const nickname = user.nickname || (user.name.includes('Ragul') ? 'Mama' : 'Akshu');

    el.innerHTML = `
      <div style="
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          user.isSharingLocation
            ? `<div style="
                position: absolute;
                width: 52px;
                height: 52px;
                border-radius: 50%;
                background: ${ringColor}33;
                animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></div>`
            : ''
        }
        <div style="
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2.5px solid #f9efe8;
          box-shadow: 0 4px 16px rgba(44, 26, 23, 0.45);
          overflow: hidden;
          background: #4a2e24;
          position: relative;
          z-index: 2;
        ">
          <img
            src="${user.avatar}"
            alt="${user.name}"
            style="width: 100%; height: 100%; object-fit: cover; display: block;"
            onerror="this.style.display='none'"
          />
        </div>
        <div style="
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: ${user.isSharingLocation ? '#22c55e' : '#a8a29e'};
          border: 2px solid #f9efe8;
          z-index: 3;
        "></div>
      </div>
      <div style="
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 9999px;
        background: rgba(44, 26, 23, 0.88);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(249, 239, 232, 0.3);
        color: #f9efe8;
        font-family: 'Playfair Display', serif;
        font-size: 11px;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        gap: 4px;
        z-index: 4;
      ">
        <span>${nickname}</span>
        ${
          user.isSharingLocation
            ? '<span style="color: #4ade80; font-size: 8px;">● LIVE</span>'
            : '<span style="color: #d6d3d1; font-size: 8px;">OFF</span>'
        }
      </div>
    `;

    return el;
  };

  // Initialize MapLibre GL JS
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const initialCoords = getInitialCoordinates();
    const mapStyle: StyleSpecification = OPEN_SATELLITE_STYLE;

    try {
      const map = new MapLibreMap({
        container: mapContainerRef.current,
        style: mapStyle,
        center: initialCoords,
        zoom: 7,
        pitch: 20,
        bearing: 0,
        attributionControl: false,
      });

      // Add clean navigation controls
      map.addControl(new NavigationControl({ showCompass: true }), 'bottom-right');
      map.addControl(
        new AttributionControl({ compact: true }),
        'bottom-left'
      );

      map.on('load', () => {
        setMapLoaded(true);
      });

      mapRef.current = map;
    } catch (err) {
      console.error('Failed to initialize MapLibre GL satellite map:', err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers & Connection Line
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // 1. Current User Marker
    if (currentUser.lng && currentUser.lat) {
      const currentCoords: [number, number] = [currentUser.lng, currentUser.lat];
      if (!currentUserMarkerRef.current) {
        const el = createMarkerElement(currentUser, true);
        const popup = new Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="font-family: var(--font-sans); color: #4a2e24; padding: 4px;">
            <div style="font-family: var(--font-serif); font-weight: 600; font-size: 13px;">${currentUser.name} (${currentUser.nickname || 'Mama'})</div>
            <div style="font-size: 10px; color: #7a5240; margin-top: 2px;">
              ${currentUser.isSharingLocation ? '🟢 Live GPS Active' : '⚪ Sharing Paused'}
            </div>
            ${currentUser.accuracy ? `<div style="font-size: 9px; color: #a87865;">Accuracy: ±${Math.round(currentUser.accuracy)}m</div>` : ''}
            <div style="font-size: 9px; color: #a87865; font-family: monospace; margin-top: 2px;">
              ${currentUser.lat.toFixed(4)}°, ${currentUser.lng.toFixed(4)}°
            </div>
          </div>
        `);

        currentUserMarkerRef.current = new Marker({ element: el })
          .setLngLat(currentCoords)
          .setPopup(popup)
          .addTo(map);
      } else {
        currentUserMarkerRef.current.setLngLat(currentCoords);
        // Replace element content to reflect live status & accuracy
        const newEl = createMarkerElement(currentUser, true);
        const currentEl = currentUserMarkerRef.current.getElement();
        if (currentEl && currentEl.parentNode) {
          currentEl.parentNode.replaceChild(newEl, currentEl);
        }
      }
    }

    // 2. Partner User Marker
    if (partnerUser.lng && partnerUser.lat && partnerUser.isSharingLocation) {
      const partnerCoords: [number, number] = [partnerUser.lng, partnerUser.lat];
      if (!partnerUserMarkerRef.current) {
        const el = createMarkerElement(partnerUser, false);
        const popup = new Popup({ offset: 25, closeButton: false }).setHTML(`
          <div style="font-family: var(--font-sans); color: #4a2e24; padding: 4px;">
            <div style="font-family: var(--font-serif); font-weight: 600; font-size: 13px;">${partnerUser.name} (${partnerUser.nickname || 'Akshu'})</div>
            <div style="font-size: 10px; color: #7a5240; margin-top: 2px;">
              ${partnerUser.isSharingLocation ? '🟢 Live GPS Active' : '⚪ Sharing Paused'}
            </div>
            ${partnerUser.accuracy ? `<div style="font-size: 9px; color: #a87865;">Accuracy: ±${Math.round(partnerUser.accuracy)}m</div>` : ''}
            <div style="font-size: 9px; color: #a87865; font-family: monospace; margin-top: 2px;">
              ${partnerUser.lat.toFixed(4)}°, ${partnerUser.lng.toFixed(4)}°
            </div>
          </div>
        `);

        partnerUserMarkerRef.current = new Marker({ element: el })
          .setLngLat(partnerCoords)
          .setPopup(popup)
          .addTo(map);
      } else {
        partnerUserMarkerRef.current.setLngLat(partnerCoords);
        const newEl = createMarkerElement(partnerUser, false);
        const currentEl = partnerUserMarkerRef.current.getElement();
        if (currentEl && currentEl.parentNode) {
          currentEl.parentNode.replaceChild(newEl, currentEl);
        }
      }
    } else if (partnerUserMarkerRef.current && !partnerUser.isSharingLocation) {
      // Remove partner marker if they paused location sharing
      partnerUserMarkerRef.current.remove();
      partnerUserMarkerRef.current = null;
    }

    // 3. Romantic Great Circle Thread Arc
    const sourceId = 'akra-connecting-thread';
    const glowLayerId = 'akra-thread-glow';
    const lineLayerId = 'akra-thread-line';

    if (
      currentUser.isSharingLocation &&
      partnerUser.isSharingLocation &&
      currentUser.lng &&
      currentUser.lat &&
      partnerUser.lng &&
      partnerUser.lat
    ) {
      const arcPoints = generateGreatCirclePoints(
        [currentUser.lng, currentUser.lat],
        [partnerUser.lng, partnerUser.lat],
        64
      );

      const geojsonData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: arcPoints,
            },
          },
        ],
      };

      const existingSource = map.getSource(sourceId) as GeoJSONSource;
      if (existingSource) {
        existingSource.setData(geojsonData);
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geojsonData,
        });

        map.addLayer({
          id: glowLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#f9efe8',
            'line-width': 5,
            'line-opacity': 0.45,
            'line-blur': 2,
          },
        });

        map.addLayer({
          id: lineLayerId,
          type: 'line',
          source: sourceId,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#b06a5e',
            'line-width': 2.5,
            'line-dasharray': [3, 2],
          },
        });
      }
    } else {
      // Remove arc if either is not sharing
      if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId);
      if (map.getLayer(glowLayerId)) map.removeLayer(glowLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    }
  }, [currentUser, partnerUser, mapLoaded]);

  // Fit bounds when both locations are available
  const handleFitBoth = () => {
    const map = mapRef.current;
    if (!map) return;

    if (
      currentUser.isSharingLocation &&
      partnerUser.isSharingLocation &&
      currentUser.lng &&
      currentUser.lat &&
      partnerUser.lng &&
      partnerUser.lat
    ) {
      const bounds = new LngLatBounds();
      bounds.extend([currentUser.lng, currentUser.lat]);
      bounds.extend([partnerUser.lng, partnerUser.lat]);
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 90, left: 70, right: 70 },
        maxZoom: 14,
        duration: 1200,
      });
    } else if (currentUser.lng && currentUser.lat) {
      map.flyTo({
        center: [currentUser.lng, currentUser.lat],
        zoom: 12,
        duration: 1000,
      });
    }
  };

  // Center on Current User
  const handleCenterMe = () => {
    const map = mapRef.current;
    if (!map || !currentUser.lng || !currentUser.lat) return;
    map.flyTo({
      center: [currentUser.lng, currentUser.lat],
      zoom: 13,
      duration: 1000,
    });
  };

  // Handle Container Resize cleanly
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const hasAnySharing = currentUser.isSharingLocation || partnerUser.isSharingLocation;

  return (
    <div
      className={`relative w-full rounded-[32px] overflow-hidden border border-[#7a5240]/20 shadow-2xl bg-[#1c110f] ${className}`}
      style={{ height: '440px' }}
    >
      {/* The MapLibre GL Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Floating Glass Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass-cream px-3 py-1.5 rounded-full border border-[#7a5240]/20 shadow-md flex items-center gap-2">
            <Radio
              className={`w-3.5 h-3.5 ${
                currentUser.isSharingLocation ? 'text-[#b06a5e] animate-pulse' : 'text-[#7a5240]'
              }`}
            />
            <span className="text-xs font-serif text-[#5b3a2e]">
              High-Res Satellite Orbit
            </span>
          </div>
        </div>

        {/* Distance Badge */}
        {hasAnySharing && (
          <div className="pointer-events-auto glass-cream px-3.5 py-1.5 rounded-full border border-[#7a5240]/20 shadow-md flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-[#7a5240] font-mono">Distance</span>
            <span className="font-serif text-sm font-semibold text-[#5b3a2e]">{distanceKm} km</span>
          </div>
        )}
      </div>

      {/* Floating Action Controls */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
        <button
          onClick={handleFitBoth}
          className="glass-cream px-3 py-1.5 rounded-full border border-[#7a5240]/20 text-xs text-[#5b3a2e] hover:bg-[#f9efe8] transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
          title="Fit Both Mama & Akshu in view"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#b06a5e]" />
          <span>Fit Both</span>
        </button>

        <button
          onClick={handleCenterMe}
          className="glass-cream px-3 py-1.5 rounded-full border border-[#7a5240]/20 text-xs text-[#5b3a2e] hover:bg-[#f9efe8] transition flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95"
          title="Center on my device GPS"
        >
          <Navigation className="w-3.5 h-3.5 text-[#b06a5e]" />
          <span>My GPS</span>
        </button>
      </div>

      {/* Inactive Overlay if neither user is sharing location */}
      {!hasAnySharing && (
        <div className="absolute inset-0 bg-[#2c1a17]/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-20 space-y-3 select-none">
          <div className="w-12 h-12 rounded-full bg-[#f9efe8]/15 border border-[#f9efe8]/30 flex items-center justify-center text-[#f9efe8] shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[#ecd0c8]" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="font-serif text-lg text-[#f9efe8] font-normal">
              Satellite Tracking Paused
            </h3>
            <p className="text-xs text-[#d9a89e] font-sans">
              Neither you nor your partner are currently sharing live location. Tap below to activate real device GPS tracking.
            </p>
          </div>
          {onToggleSharing && (
            <button
              onClick={() => onToggleSharing(true)}
              className="mt-2 px-5 py-2 rounded-full bg-[#b06a5e] text-[#f9efe8] text-xs font-semibold hover:bg-[#9c574c] transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Share My Live Location</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
