import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAkra } from '../context/AkraContext';
import { LeafletMap, LocationRecord } from '../components/LeafletMap';
import { SatelliteMap } from '../components/SatelliteMap';
import { Globe3D } from '../components/3d/Globe3D';
import { locationService, normalizeUserId } from '../services/locationService';
import {
  Clock,
  RefreshCw,
  Radio,
  Eye,
  EyeOff,
  Layers,
  Globe,
  AlertCircle,
  MapPin,
  Crosshair,
  Shield,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export const LocationView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    calculateDistanceKm,
    sendVirtualHeart,
    updateMyLocation,
    toggleLocationSharing,
  } = useAkra();

  // Normalize user IDs for Supabase locations table ('ragul' or 'akshu')
  const myUserId = normalizeUserId(currentUser.name);
  const partnerUserId = myUserId === 'ragul' ? 'akshu' : 'ragul';

  const [isSendingTouch, setIsSendingTouch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [showPermissionExplainer, setShowPermissionExplainer] = useState(false);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [mapPerspective, setMapPerspective] = useState<'leaflet' | 'satellite' | 'globe'>('leaflet');
  const [detectedAddress, setDetectedAddress] = useState<string>('');

  // Supabase Realtime location records
  const [myLocationRecord, setMyLocationRecord] = useState<LocationRecord | null>(null);
  const [partnerLocationRecord, setPartnerLocationRecord] = useState<LocationRecord | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<'SUBSCRIBED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');

  // Geolocation watch tracking refs
  const watchIdRef = useRef<number | null>(null);
  const lastUpsertTimeRef = useRef<number>(0);
  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Live clocks for Puducherry & Bangalore
  const [timeClock, setTimeClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeClock(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Distance calculation helper in meters to throttle GPS ticks
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const p1 = (lat1 * Math.PI) / 180;
    const p2 = (lat2 * Math.PI) / 180;
    const dp = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Immediate Real Device Location Fetch Function
  const acquireRealLiveLocation = useCallback(
    async (isManual: boolean = false) => {
      setIsRefreshing(true);
      setGeoError(null);

      try {
        const real = await locationService.getRealDevicePosition();
        setAccuracyMeters(real.accuracy);
        setPermissionState('granted');
        setShowPermissionExplainer(false);
        setDetectedAddress(real.formatted);

        // Update local context
        updateMyLocation(real.lat, real.lng, real.city, real.accuracy);

        // Upsert into Supabase locations table under this user's user_id ('ragul' or 'akshu')
        await locationService.upsertLocation(
          myUserId,
          real.lat,
          real.lng,
          real.city,
          real.accuracy,
          true
        );

        const rec: LocationRecord = {
          user_id: myUserId,
          lat: real.lat,
          lng: real.lng,
          city: real.city,
          accuracy: real.accuracy,
          updated_at: new Date().toISOString(),
          is_real_device: true,
        };
        setMyLocationRecord(rec);
      } catch (err: any) {
        console.warn('[LocationView] Real GPS acquisition warning:', err);
        if (isManual) {
          setGeoError(
            err?.message ||
              'Unable to acquire live location. Please allow location permissions in your browser.'
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [myUserId, updateMyLocation]
  );

  // Check browser permission status
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setPermissionState('unsupported');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          setPermissionState(result.state);
          result.onchange = () => {
            setPermissionState(result.state);
          };
        })
        .catch(() => {});
    }
  }, []);

  // 1. Initial Load: Fetch existing database records AND trigger immediate Real Device GPS query
  useEffect(() => {
    let isMounted = true;

    // Fetch existing records from Supabase
    locationService.fetchLocations().then((records) => {
      if (!isMounted) return;
      records.forEach((rec) => {
        if (rec.user_id === myUserId) {
          setMyLocationRecord(rec);
          if (rec.lat && rec.lng) {
            updateMyLocation(rec.lat, rec.lng, rec.city || currentUser.city);
          }
        } else if (rec.user_id === partnerUserId) {
          setPartnerLocationRecord(rec);
        }
      });
    });

    // Query real live device GPS immediately on mount
    acquireRealLiveLocation(false);

    return () => {
      isMounted = false;
    };
  }, [acquireRealLiveLocation, currentUser.city, myUserId, partnerUserId, updateMyLocation]);

  // 2. Realtime Listener: Subscribe to Supabase Realtime postgres_changes on 'locations' table
  useEffect(() => {
    const unsubscribe = locationService.subscribeToLocations(
      (newRecord: LocationRecord) => {
        if (newRecord.user_id === myUserId) {
          setMyLocationRecord(newRecord);
        } else if (newRecord.user_id === partnerUserId) {
          setPartnerLocationRecord(newRecord);
        }
      },
      (status) => {
        setRealtimeStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [myUserId, partnerUserId]);

  // 3. Continuous GPS Tracking via navigator.geolocation.watchPosition()
  useEffect(() => {
    if (!currentUser.isSharingLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastCoordsRef.current = null;
      return;
    }

    if (!('geolocation' in navigator)) {
      setGeoError('GPS Geolocation is not supported by your browser.');
      return;
    }

    const onWatchSuccess = async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      setAccuracyMeters(accuracy);
      setPermissionState('granted');
      setShowPermissionExplainer(false);

      const now = Date.now();
      const lastCoords = lastCoordsRef.current;
      const lastUpsertTime = lastUpsertTimeRef.current;

      const timeSinceLastUpsert = now - lastUpsertTime;
      const movedMeters = lastCoords
        ? getDistanceMeters(lastCoords.lat, lastCoords.lng, latitude, longitude)
        : 999;

      // Throttle GPS updates: roughly every 5-8 seconds or if moved > 5 meters
      if (lastCoords && timeSinceLastUpsert < 5000 && movedMeters < 5) {
        return;
      }

      lastCoordsRef.current = { lat: latitude, lng: longitude };
      lastUpsertTimeRef.current = now;

      // Reverse geocode to get real area/city name
      const geocode = await locationService.reverseGeocode(latitude, longitude);
      setDetectedAddress(geocode.formatted);

      // Update local context with real city
      updateMyLocation(latitude, longitude, geocode.city || currentUser.city, accuracy);

      // Upsert into Supabase
      locationService.upsertLocation(
        myUserId,
        latitude,
        longitude,
        geocode.city,
        accuracy
      );
    };

    const onWatchError = (err: GeolocationPositionError) => {
      console.warn('[LocationView] Geolocation error:', err.message);
      if (err.code === err.PERMISSION_DENIED) {
        setPermissionState('denied');
        setGeoError('Location permission was declined. Please allow location access to share live GPS.');
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setGeoError('GPS signal temporarily unavailable. Seeking location lock...');
      } else if (err.code === err.TIMEOUT) {
        setGeoError('GPS request timed out. Re-acquiring...');
      }
    };

    const options: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 3000,
      timeout: 12000,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      onWatchSuccess,
      onWatchError,
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [currentUser.city, currentUser.isSharingLocation, myUserId, updateMyLocation]);

  const handleSendTouch = () => {
    setIsSendingTouch(true);
    sendVirtualHeart();
    setTimeout(() => setIsSendingTouch(false), 2000);
  };

  const distanceKm = calculateDistanceKm();

  const getPartnerStatus = () => {
    const updatedAt = partnerLocationRecord?.updated_at || partnerUser.lastLocationUpdate;
    if (!partnerUser.isSharingLocation && !partnerLocationRecord) {
      return { text: 'Sharing paused', isLive: false, isStale: true };
    }
    if (!updatedAt) {
      return { text: 'Awaiting device update', isLive: false, isStale: true };
    }
    const date = new Date(updatedAt);
    if (isNaN(date.getTime())) {
      return { text: 'Awaiting device update', isLive: false, isStale: true };
    }
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) {
      return { text: 'LIVE • Just now', isLive: true, isStale: false };
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 5) {
      return { text: `LIVE • ${diffMin}m ago`, isLive: true, isStale: false };
    }
    if (diffMin < 60) {
      return { text: `Active • ${diffMin}m ago`, isLive: false, isStale: true };
    }
    const diffHours = Math.floor(diffMin / 60);
    return { text: `Active • ${diffHours}h ago`, isLive: false, isStale: true };
  };

  const partnerStatus = getPartnerStatus();
  const partnerName = partnerUser.nickname || partnerUser.name || 'Akshu';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 select-none animate-fade-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="micro-label">Presence & Horizon</span>
        <h1 className="font-serif text-3xl sm:text-5xl text-[#5b3a2e] font-normal tracking-tight">
          Real Live <span className="font-serif italic">Location</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#7a5240] font-serif italic max-w-md mx-auto">
          "The geographic thread connecting Ragul (Mama) and Akshya (Akshu)."
        </p>

        {/* Real Live GPS Quick Bar & Manual Fetch Trigger */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <button
            id="fetch-realtime-gps-btn"
            onClick={() => acquireRealLiveLocation(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-[#5b3a2e] text-[#f9efe8] hover:bg-[#4a2e24] transition shadow-md cursor-pointer active:scale-95"
          >
            {isRefreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#ecd0c8]" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-[#ecd0c8]" />
            )}
            <span>{isRefreshing ? 'Acquiring Real Device GPS...' : 'Fetch My Real Live Location Now'}</span>
          </button>

          <button
            id="toggle-live-gps-btn"
            onClick={() => {
              if (!currentUser.isSharingLocation && permissionState === 'prompt') {
                setShowPermissionExplainer(true);
              } else {
                toggleLocationSharing(!currentUser.isSharingLocation);
              }
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition cursor-pointer shadow-xs ${
              currentUser.isSharingLocation
                ? 'bg-[#ecd0c8]/80 text-[#5b3a2e] border-[#b06a5e]/40'
                : 'bg-[#f4eae3] text-[#7a5240] border-[#7a5240]/20'
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                currentUser.isSharingLocation ? 'text-[#b06a5e] animate-pulse' : 'text-[#7a5240]'
              }`}
            />
            <span>
              {currentUser.isSharingLocation
                ? 'Live Sharing: ON'
                : 'Live Sharing: OFF'}
            </span>
          </button>
        </div>

        {detectedAddress && (
          <div className="text-xs text-[#5b3a2e] font-sans flex items-center justify-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
            <span>Detected Live Area: <strong>{detectedAddress}</strong></span>
          </div>
        )}
      </div>

      {/* Permission Explainer Modal */}
      {showPermissionExplainer && (
        <div className="relative p-6 sm:p-7 rounded-[32px] glass-cream border-2 border-[#b06a5e]/40 shadow-xl overflow-hidden animate-fade-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-xs font-serif font-semibold text-[#b06a5e]">
                <MapPin className="w-4 h-4 text-[#b06a5e]" />
                <span>Device GPS Permission</span>
              </div>
              <h3 className="font-serif text-lg text-[#5b3a2e] font-normal">
                Share your live presence with {partnerName}
              </h3>
              <p className="text-xs text-[#7a5240] leading-relaxed">
                AKRA uses high-accuracy device GPS to show your true live location on the OpenStreetMap. Coordinates are synced privately in your Supabase table with Row Level Security.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                id="enable-gps-permission-btn"
                onClick={() => acquireRealLiveLocation(true)}
                className="px-5 py-2.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Radio className="w-3.5 h-3.5 text-[#ecd0c8] animate-pulse" />
                <span>Enable Real Live GPS</span>
              </button>
              <button
                onClick={() => setShowPermissionExplainer(false)}
                className="px-4 py-2.5 rounded-full bg-[#ecd0c8]/50 text-[#7a5240] text-xs font-medium hover:bg-[#ecd0c8] transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error or Warning Banner */}
      {geoError && (
        <div className="p-3.5 rounded-2xl bg-[#ecd0c8]/70 border border-[#b06a5e]/30 text-xs text-[#5b3a2e] text-center flex items-center justify-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-[#b06a5e] shrink-0" />
          <span className="font-sans">{geoError}</span>
        </div>
      )}

      {/* Main Distance Presence Hero Card */}
      <div className="glass-cream rounded-[36px] p-6 sm:p-9 border border-[#7a5240]/20 shadow-xl relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center">
          {/* Current User */}
          <div className="flex flex-col items-center space-y-2">
            <span className="micro-label text-[9px]">{currentUser.city}</span>
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[#7a5240]/30 shadow-md"
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-[#f9efe8] ${
                  currentUser.isSharingLocation
                    ? 'bg-green-500 animate-pulse'
                    : 'bg-stone-400'
                }`}
              />
            </div>
            <h3 className="font-serif text-xl text-[#5b3a2e] font-normal">
              {currentUser.name}{' '}
              <span className="font-serif italic text-sm text-[#7a5240]">
                ({currentUser.nickname || 'Mama'})
              </span>
            </h3>
            <p className="text-xs text-[#7a5240] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-[#b06a5e]" />
              <span>{timeClock}</span>
            </p>
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`text-[10px] font-mono flex items-center gap-1 ${
                  myLocationRecord?.is_real_device
                    ? 'text-green-700 font-semibold'
                    : 'text-[#7a5240]/80'
                }`}
              >
                {myLocationRecord?.is_real_device && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
                {myLocationRecord?.is_real_device
                  ? 'LIVE GPS • Real Device Active'
                  : 'Acquiring GPS fix...'}
              </span>
              {accuracyMeters && (
                <span className="text-[10px] text-[#7a5240]/70 font-mono">
                  Accuracy: ±{Math.round(accuracyMeters)}m
                </span>
              )}
            </div>
          </div>

          {/* Center Distance & Connecting Thread */}
          <div className="flex flex-col items-center space-y-3 py-4 md:py-0 border-y md:border-y-0 md:border-x border-[#7a5240]/15 px-4">
            <span className="micro-label text-[8px] bg-[#ecd0c8]/60 px-2.5 py-0.5 rounded-full border border-[#7a5240]/15">
              Distance apart
            </span>
            <div className="font-serif text-4xl sm:text-5xl text-[#5b3a2e] tracking-tight font-normal">
              {distanceKm}{' '}
              <span className="text-xl sm:text-2xl font-serif italic text-[#7a5240]">km</span>
            </div>

            {/* Connecting line */}
            <div className="w-full flex items-center gap-2 max-w-[180px]">
              <span className="w-2 h-2 rounded-full bg-[#b06a5e]" />
              <div className="flex-1 h-[1.5px] bg-gradient-to-r from-[#b06a5e] via-[#d9a89e] to-[#b06a5e] relative">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#f9efe8] border border-[#b06a5e] animate-pulse" />
              </div>
              <span className="w-2 h-2 rounded-full bg-[#b06a5e]" />
            </div>

            <button
              onClick={handleSendTouch}
              className="mt-1 px-4 py-1.5 rounded-full bg-[#5b3a2e] text-[#f9efe8] text-xs font-semibold hover:bg-[#4a2e24] transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{isSendingTouch ? 'Touch delivered...' : 'Send live touch'}</span>
            </button>
          </div>

          {/* Partner User */}
          <div className="flex flex-col items-center space-y-2">
            <span className="micro-label text-[9px]">{partnerUser.city}</span>
            <div className="relative">
              <img
                src={partnerUser.avatar}
                alt={partnerUser.name}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-[#7a5240]/30 shadow-md"
              />
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full ring-2 ring-[#f9efe8] ${
                  partnerStatus.isLive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            </div>
            <h3 className="font-serif text-xl text-[#5b3a2e] font-normal">
              {partnerUser.name}{' '}
              <span className="font-serif italic text-sm text-[#7a5240]">
                ({partnerUser.nickname || 'Akshu'})
              </span>
            </h3>
            <p className="text-xs text-[#7a5240] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-[#b06a5e]" />
              <span>{timeClock}</span>
            </p>
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={`text-[10px] font-mono flex items-center gap-1 ${
                  partnerStatus.isLive ? 'text-green-700 font-semibold' : 'text-amber-800 font-medium'
                }`}
              >
                {partnerStatus.isLive && (
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                )}
                {partnerStatus.text}
              </span>
            </div>
          </div>
        </div>

        {/* Real Coordinates Footer Toggle */}
        <div className="mt-6 pt-4 border-t border-[#7a5240]/10 flex items-center justify-between text-[11px] text-[#7a5240]">
          <button
            onClick={() => setShowCoordinates(!showCoordinates)}
            className="flex items-center gap-1 text-[#7a5240] hover:text-[#5b3a2e] font-mono cursor-pointer"
          >
            {showCoordinates ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span>{showCoordinates ? 'Hide Device Coordinates' : 'Show Device Coordinates'}</span>
          </button>
          <span className="font-mono flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'SUBSCRIBED' ? 'bg-green-500' : 'bg-amber-400'
              }`}
            />
            <span>Supabase Realtime: {realtimeStatus === 'SUBSCRIBED' ? 'Connected' : 'Syncing'}</span>
          </span>
        </div>

        {showCoordinates && (
          <div className="mt-3 p-3 rounded-xl bg-[#ecd0c8]/30 font-mono text-[11px] text-[#5b3a2e] space-y-1">
            <div>
              {currentUser.name} ({myUserId}):{' '}
              {currentUser.lat ? currentUser.lat.toFixed(5) : '—'}°,{' '}
              {currentUser.lng ? currentUser.lng.toFixed(5) : '—'}° • {currentUser.city}
            </div>
            <div>
              {partnerUser.name} ({partnerUserId}):{' '}
              {partnerLocationRecord?.lat
                ? `${partnerLocationRecord.lat.toFixed(5)}°, ${partnerLocationRecord.lng.toFixed(5)}°`
                : partnerUser.lat
                ? `${partnerUser.lat.toFixed(5)}°, ${partnerUser.lng.toFixed(5)}°`
                : 'Awaiting device fix'}
            </div>
          </div>
        )}
      </div>

      {/* Visual Perspective Switcher: Leaflet OpenStreetMap (Default), Satellite, or 3D Globe */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="micro-label">Map Mode</span>
            <div className="flex items-center p-1 rounded-full bg-[#ecd0c8]/60 border border-[#7a5240]/15">
              <button
                id="view-leaflet-btn"
                onClick={() => setMapPerspective('leaflet')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  mapPerspective === 'leaflet'
                    ? 'bg-[#5b3a2e] text-[#f9efe8] shadow-xs'
                    : 'text-[#7a5240] hover:text-[#5b3a2e]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Leaflet OSM (Live)</span>
              </button>
              <button
                id="view-satellite-btn"
                onClick={() => setMapPerspective('satellite')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  mapPerspective === 'satellite'
                    ? 'bg-[#5b3a2e] text-[#f9efe8] shadow-xs'
                    : 'text-[#7a5240] hover:text-[#5b3a2e]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Satellite Map</span>
              </button>
              <button
                id="view-globe-btn"
                onClick={() => setMapPerspective('globe')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  mapPerspective === 'globe'
                    ? 'bg-[#5b3a2e] text-[#f9efe8] shadow-xs'
                    : 'text-[#7a5240] hover:text-[#5b3a2e]'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>3D Earth</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => acquireRealLiveLocation(true)}
            disabled={isRefreshing}
            className="text-xs text-[#7a5240] hover:text-[#5b3a2e] flex items-center gap-1.5 font-mono cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Poll Real Device GPS</span>
          </button>
        </div>

        {/* Selected Map View */}
        {mapPerspective === 'leaflet' ? (
          <LeafletMap
            currentUser={currentUser}
            partnerUser={partnerUser}
            myUserId={myUserId}
            partnerUserId={partnerUserId}
            myLocationRecord={myLocationRecord}
            partnerLocationRecord={partnerLocationRecord}
            isRealtimeConnected={realtimeStatus === 'SUBSCRIBED'}
            distanceKm={distanceKm}
            onRefreshGPS={() => acquireRealLiveLocation(true)}
            isRefreshingGPS={isRefreshing}
          />
        ) : mapPerspective === 'satellite' ? (
          <SatelliteMap
            currentUser={currentUser}
            partnerUser={partnerUser}
            distanceKm={distanceKm}
            onToggleSharing={toggleLocationSharing}
          />
        ) : (
          <Globe3D
            userLocationName={currentUser.city}
            partnerLocationName={partnerUser.city}
            distanceKm={distanceKm}
            isPartnerSharing={partnerUser.isSharingLocation}
          />
        )}
      </div>

      {/* Supabase Postgres Architecture Note */}
      <div className="p-4 rounded-2xl glass-cream border border-[#7a5240]/15 flex items-center gap-3 text-xs text-[#7a5240]">
        <Shield className="w-4 h-4 text-[#b06a5e] shrink-0" />
        <span>
          <strong>OpenStreetMap & Supabase Realtime:</strong> Real live GPS coordinates from your device are upserted into the Postgres <code>locations</code> table and broadcasted securely to each other.
        </span>
      </div>
    </div>
  );
};
