import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAkra } from '../context/AkraContext';
import {
  Camera,
  RotateCw,
  Sun,
  Timer,
  Grid3x3,
  Sparkles,
  Check,
  Download,
  Upload,
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MapPin,
  Calendar,
  Tag,
  AlertCircle,
  Eye,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { cameraAudio } from '../utils/cameraAudio';
import { uploadToSupabaseStorage, dataURLtoBlob } from '../lib/storage';
import {
  PHOTOBOOTH_FILTERS,
  PhotoboothFilterId,
  captureVideoFrame,
  renderSinglePhoto,
  renderFourCutStrip,
  renderPolaroidPhoto,
  renderFilmFrame,
} from '../utils/photoboothCanvas';
import { savePrivatePhoto } from '../utils/photoStorage';

export type ShootingMode = 'single' | '4cut' | 'polaroid' | 'film' | 'gif';

interface CapturedSession {
  mode: ShootingMode;
  frames: HTMLCanvasElement[];
  compositeUrl: string;
  filterId: PhotoboothFilterId;
  theme: 'ivory' | 'noir';
  caption: string;
  location: string;
  dateStr: string;
  tag: string;
  isSaved: boolean;
}

export const PhotoboothView: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    addMemory,
    calculateDistanceKm,
    showToast,
    setActiveTab,
  } = useAkra();

  const distanceKm = calculateDistanceKm();

  // Camera & Stream refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // Settings & Toggles
  const [shootingMode, setShootingMode] = useState<ShootingMode>('4cut');
  const [selectedFilter, setSelectedFilter] = useState<PhotoboothFilterId>('warm_film');
  const [timerDuration, setTimerDuration] = useState<number>(3); // 0, 3, 5, 10
  const [showGrid, setShowGrid] = useState(false);
  const [screenLight, setScreenLight] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Live Capture State
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState<number>(0); // for 4cut (0..3)

  // Captured Session State (Preview / Edit / Save)
  const [capturedSession, setCapturedSession] = useState<CapturedSession | null>(null);
  const [isReRendering, setIsReRendering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // GIF Burst Playback State
  const [gifFrameIndex, setGifFrameIndex] = useState(0);
  const [isGifPlaying, setIsGifPlaying] = useState(true);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start Real Device Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setIsRequestingPermission(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported on this browser or environment.');
      setIsRequestingPermission(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Camera access failed:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera access in browser settings to use the live booth.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access camera feed. You can still import a photo below.');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  }, [cameraFacing, stopCamera]);

  // Launch camera on mount and when facing mode changes, clean up on unmount
  useEffect(() => {
    if (!capturedSession) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [cameraFacing, capturedSession, startCamera, stopCamera]);

  // GIF Looper
  useEffect(() => {
    if (!capturedSession || capturedSession.mode !== 'gif' || !isGifPlaying) return;
    if (!capturedSession.frames.length) return;

    const interval = setInterval(() => {
      setGifFrameIndex((prev) => (prev + 1) % capturedSession.frames.length);
    }, 220);

    return () => clearInterval(interval);
  }, [capturedSession, isGifPlaying]);

  // Trigger Flash Animation & Sound
  const triggerShutterFlash = () => {
    setFlashActive(true);
    if (soundEnabled) {
      cameraAudio.playShutterSound();
    }
    setTimeout(() => {
      setFlashActive(false);
    }, 240);
  };

  // Sleep utility
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Run a countdown from N to 1
  const runCountdown = async (seconds: number): Promise<void> => {
    if (seconds <= 0) return;
    for (let i = seconds; i > 0; i--) {
      setCountdownNumber(i);
      if (soundEnabled) {
        cameraAudio.playCountdownBeep(i === 1);
      }
      await delay(900);
    }
    setCountdownNumber(null);
  };

  // Core capture workflow
  const handleCaptureStart = async () => {
    if (isCapturing || !videoRef.current || !isStreaming) return;
    setIsCapturing(true);

    const defaultLocation = `${currentUser.city} × ${partnerUser.city}`;
    const defaultDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');

    try {
      if (shootingMode === 'single' || shootingMode === 'polaroid' || shootingMode === 'film') {
        // Run configured timer countdown
        if (timerDuration > 0) {
          await runCountdown(timerDuration);
        }
        triggerShutterFlash();

        const frame = captureVideoFrame(videoRef.current, cameraFacing === 'user');
        await delay(150);

        let compositeUrl = '';
        if (shootingMode === 'single') {
          compositeUrl = await renderSinglePhoto(frame, {
            filterId: selectedFilter,
            dateStr: defaultDate,
            locationStr: defaultLocation,
            theme: 'ivory',
          });
        } else if (shootingMode === 'polaroid') {
          compositeUrl = await renderPolaroidPhoto(frame, {
            filterId: selectedFilter,
            dateStr: defaultDate,
            locationStr: defaultLocation,
          });
        } else {
          compositeUrl = await renderFilmFrame(frame, {
            filterId: selectedFilter,
            dateStr: defaultDate,
          });
        }

        setCapturedSession({
          mode: shootingMode,
          frames: [frame],
          compositeUrl,
          filterId: selectedFilter,
          theme: 'ivory',
          caption: '',
          location: defaultLocation,
          dateStr: defaultDate,
          tag: shootingMode === 'polaroid' ? 'Polaroid' : shootingMode === 'film' ? '35mm Film' : 'Photobooth',
          isSaved: false,
        });
      } else if (shootingMode === '4cut') {
        // 4 sequential shots
        const capturedFrames: HTMLCanvasElement[] = [];

        for (let shot = 0; shot < 4; shot++) {
          setCurrentShotIndex(shot + 1);
          // Initial timer for first shot, shorter 2s for subsequent shots
          const count = shot === 0 ? Math.max(2, timerDuration) : 2;
          await runCountdown(count);

          triggerShutterFlash();
          if (videoRef.current) {
            const frame = captureVideoFrame(videoRef.current, cameraFacing === 'user');
            capturedFrames.push(frame);
          }
          await delay(250);
        }

        setCurrentShotIndex(0);

        // Generate 4-cut vertical strip
        const compositeUrl = await renderFourCutStrip(capturedFrames, {
          filterId: selectedFilter,
          dateStr: defaultDate,
          locationStr: defaultLocation,
          theme: 'ivory',
        });

        setCapturedSession({
          mode: '4cut',
          frames: capturedFrames,
          compositeUrl,
          filterId: selectedFilter,
          theme: 'ivory',
          caption: '',
          location: defaultLocation,
          dateStr: defaultDate,
          tag: '4-Cut Strip',
          isSaved: false,
        });
      } else if (shootingMode === 'gif') {
        // Rapid burst of 6 frames (200ms apart)
        if (timerDuration > 0) {
          await runCountdown(timerDuration);
        }

        const burstFrames: HTMLCanvasElement[] = [];
        for (let i = 0; i < 6; i++) {
          if (soundEnabled && (i === 0 || i === 3)) {
            cameraAudio.playShutterSound();
          }
          if (videoRef.current) {
            burstFrames.push(captureVideoFrame(videoRef.current, cameraFacing === 'user'));
          }
          await delay(180);
        }
        triggerShutterFlash();

        // Render first frame as initial poster / preview
        const compositeUrl = await renderSinglePhoto(burstFrames[0], {
          filterId: selectedFilter,
          dateStr: defaultDate,
          locationStr: defaultLocation,
          caption: 'Burst Memory',
        });

        setCapturedSession({
          mode: 'gif',
          frames: burstFrames,
          compositeUrl,
          filterId: selectedFilter,
          theme: 'ivory',
          caption: 'our little burst moment',
          location: defaultLocation,
          dateStr: defaultDate,
          tag: 'Live Burst',
          isSaved: false,
        });
      }
    } catch (e) {
      console.error('Capture failed:', e);
      showToast('Capture error', 'Failed to render frame. Please try again.', 'info');
    } finally {
      setIsCapturing(false);
      setCountdownNumber(null);
      setCurrentShotIndex(0);
    }
  };

  // Re-render composite when filter, theme, caption, or location changes in preview
  const reRenderComposite = async (updates: Partial<CapturedSession>) => {
    if (!capturedSession) return;
    setIsReRendering(true);

    const merged = { ...capturedSession, ...updates };
    setCapturedSession(merged);

    try {
      let newUrl = merged.compositeUrl;
      const options = {
        filterId: merged.filterId,
        dateStr: merged.dateStr,
        locationStr: merged.location,
        caption: merged.caption,
        theme: merged.theme,
      };

      if (merged.mode === '4cut') {
        newUrl = await renderFourCutStrip(merged.frames, options);
      } else if (merged.mode === 'polaroid') {
        newUrl = await renderPolaroidPhoto(merged.frames[0], options);
      } else if (merged.mode === 'film') {
        newUrl = await renderFilmFrame(merged.frames[0], options);
      } else if (merged.mode === 'single' || merged.mode === 'gif') {
        newUrl = await renderSinglePhoto(merged.frames[0], options);
      }

      setCapturedSession((prev) => (prev ? { ...prev, compositeUrl: newUrl } : null));
    } catch (e) {
      console.error('Re-rendering composite failed:', e);
    } finally {
      setIsReRendering(false);
    }
  };

  // Save to AKRA (Upload to akra-photobooth bucket + Database Integration)
  const handleSaveToAkra = async () => {
    if (!capturedSession || isSaving) return;
    setIsSaving(true);

    try {
      const memoryId = 'mem_photo_' + Date.now();
      const currentYear = new Date().getFullYear();

      showToast('Uploading to Akra Photobooth...', 'Sending real photo to Supabase akra-photobooth bucket.', 'info');

      // 1. Upload real binary file to akra-photobooth bucket and get public URL
      const photoBlob = dataURLtoBlob(capturedSession.compositeUrl);
      const uploadRes = await uploadToSupabaseStorage(photoBlob, {
        bucket: 'akra-photobooth',
        folder: 'photobooth',
        filename: `photobooth-${capturedSession.mode}-${Date.now()}.jpg`,
        caption: capturedSession.caption || `Photobooth session • ${capturedSession.location}`,
        category: 'photobooth',
        saveToMedia: true,
      });

      const realStorageUrl = uploadRes.url;

      // 2. Save to persistent private storage with real Supabase URL
      await savePrivatePhoto({
        id: memoryId,
        coupleId: 'ragul_akshya',
        uploadedBy: currentUser.id,
        uploadedByName: currentUser.name,
        photoType: capturedSession.mode,
        caption: capturedSession.caption || `Photobooth session • ${capturedSession.location}`,
        location: capturedSession.location,
        createdDate: capturedSession.dateStr,
        createdAt: Date.now(),
        imageDataUrl: realStorageUrl,
      });

      // 3. Feed directly into existing AKRA Memories architecture with real Supabase URL
      addMemory({
        title:
          capturedSession.caption ||
          (capturedSession.mode === '4cut'
            ? 'Our 4-Cut Strip'
            : capturedSession.mode === 'polaroid'
            ? 'Polaroid Frame'
            : capturedSession.mode === 'film'
            ? '35mm Film Negative'
            : 'Photobooth Snapshot'),
        year: currentYear,
        date: capturedSession.dateStr || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        imageUrl: realStorageUrl,
        caption:
          capturedSession.caption ||
          `Captured in AKRA Photobooth across ${distanceKm} km between ${currentUser.city} and ${partnerUser.city}.`,
        location: capturedSession.location,
        author: currentUser.nickname || currentUser.name,
        tags: ['photobooth', capturedSession.tag.toLowerCase()],
        photoType: capturedSession.mode,
        coupleId: 'ragul_akshya',
      });

      setCapturedSession((prev) => (prev ? { ...prev, compositeUrl: realStorageUrl, isSaved: true } : null));
      showToast('Saved to Photobooth Bucket ❤️', 'Real photo uploaded to akra-photobooth & saved in database.', 'love');
    } catch (err) {
      console.error('Save to AKRA failed:', err);
      showToast('Save failed', 'Could not save frame to memory vault.', 'info');
    } finally {
      setIsSaving(false);
    }
  };

  // Download high-resolution image to device
  const handleDownload = () => {
    if (!capturedSession) return;
    const a = document.createElement('a');
    a.href = capturedSession.compositeUrl;
    a.download = `AKRA_${capturedSession.mode.toUpperCase()}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Downloaded', 'High-res image saved to device.', 'photo');
  };

  // Retake: discard and return to camera
  const handleRetake = () => {
    setCapturedSession(null);
  };

  // Manual image upload as fallback / creative option
  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);

      const defaultLocation = `${currentUser.city} × ${partnerUser.city}`;
      const defaultDate = new Date().toLocaleDateString('en-GB').replace(/\//g, '.');

      let compositeUrl = '';
      if (shootingMode === '4cut') {
        compositeUrl = await renderFourCutStrip([canvas, canvas, canvas, canvas], {
          filterId: selectedFilter,
          dateStr: defaultDate,
          locationStr: defaultLocation,
          theme: 'ivory',
        });
      } else if (shootingMode === 'polaroid') {
        compositeUrl = await renderPolaroidPhoto(canvas, {
          filterId: selectedFilter,
          dateStr: defaultDate,
          locationStr: defaultLocation,
        });
      } else if (shootingMode === 'film') {
        compositeUrl = await renderFilmFrame(canvas, {
          filterId: selectedFilter,
          dateStr: defaultDate,
        });
      } else {
        compositeUrl = await renderSinglePhoto(canvas, {
          filterId: selectedFilter,
          dateStr: defaultDate,
          locationStr: defaultLocation,
        });
      }

      setCapturedSession({
        mode: shootingMode,
        frames: [canvas],
        compositeUrl,
        filterId: selectedFilter,
        theme: 'ivory',
        caption: file.name.replace(/\.[^/.]+$/, ''),
        location: defaultLocation,
        dateStr: defaultDate,
        tag: 'Imported',
        isSaved: false,
      });
    };
    img.src = objectUrl;
  };

  // Active filter CSS
  const currentFilterObj = PHOTOBOOTH_FILTERS.find((f) => f.id === selectedFilter) || PHOTOBOOTH_FILTERS[0];

  // ==========================================
  // VIEW: AFTER CAPTURE PREVIEW & EDIT SCREEN
  // ==========================================
  if (capturedSession) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 select-none animate-fade-up">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#7a5240]/20">
          <button
            onClick={handleRetake}
            className="flex items-center gap-1.5 text-xs text-[#5b3a2e] hover:text-[#3e2722] font-semibold transition px-3 py-1.5 rounded-full hover:bg-white/60 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retake</span>
          </button>

          <div className="text-center">
            <h2 className="font-serif text-xl sm:text-2xl text-[#5b3a2e] tracking-tight">
              Your memory
            </h2>
            <p className="text-[11px] text-[#7a5240] font-serif italic">
              “A quiet moment, kept forever.”
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-full border border-[#7a5240]/25 text-[#5b3a2e] hover:bg-white/70 transition shadow-2xs cursor-pointer"
              title="Download to device"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Centerpiece Image & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Visual Composite Frame (Left / Center) */}
          <div className="md:col-span-7 flex flex-col items-center">
            <div className="relative w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl border border-[#7a5240]/25 bg-[#FAF7F2] transition-all p-3 sm:p-4">
              {/* GIF Burst Looping View or Static Canvas Composite */}
              {capturedSession.mode === 'gif' && capturedSession.frames.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-[#1E130F] shadow-inner">
                    <img
                      src={capturedSession.frames[gifFrameIndex]?.toDataURL('image/jpeg', 0.85)}
                      alt="Burst loop frame"
                      className="w-full h-full object-cover"
                      style={{ filter: currentFilterObj.cssFilter }}
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-full bg-black/60 text-[9px] text-[#f9efe8] font-mono backdrop-blur-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Frame {gifFrameIndex + 1}/{capturedSession.frames.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#7a5240]">
                    <span className="font-serif italic text-[11px]">Continuous Couple Burst</span>
                    <button
                      onClick={() => setIsGifPlaying(!isGifPlaying)}
                      className="p-1.5 rounded-full hover:bg-black/5 text-[#5b3a2e] cursor-pointer"
                    >
                      {isGifPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden">
                  <img
                    src={capturedSession.compositeUrl}
                    alt="Captured Memory"
                    className={`w-full h-auto object-contain mx-auto rounded-xl transition-opacity duration-300 ${
                      isReRendering ? 'opacity-50' : 'opacity-100'
                    }`}
                  />
                  {isReRendering && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-2xs">
                      <span className="px-3 py-1 rounded-full bg-[#1E130F]/80 text-[#F9EFE8] text-[10px] font-mono">
                        Developing frame...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Strip Theme Toggle (for 4-Cut or Single) */}
            {(capturedSession.mode === '4cut' || capturedSession.mode === 'single') && (
              <div className="mt-4 flex items-center gap-2 p-1 rounded-full bg-white/70 border border-[#7a5240]/20 shadow-2xs">
                <button
                  onClick={() => reRenderComposite({ theme: 'ivory' })}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                    capturedSession.theme === 'ivory'
                      ? 'bg-[#5b3a2e] text-white shadow-xs'
                      : 'text-[#5b3a2e] hover:bg-black/5'
                  }`}
                >
                  Ivory Paper
                </button>
                <button
                  onClick={() => reRenderComposite({ theme: 'noir' })}
                  className={`px-3 py-1 rounded-full text-[10px] font-semibold transition cursor-pointer ${
                    capturedSession.theme === 'noir'
                      ? 'bg-[#18100E] text-[#D9A89E] shadow-xs'
                      : 'text-[#5b3a2e] hover:bg-black/5'
                  }`}
                >
                  Midnight Noir
                </button>
              </div>
            )}
          </div>

          {/* Couple Memory Details & Actions Form (Right) */}
          <div className="md:col-span-5 space-y-5">
            <div className="glass-cream rounded-[28px] p-5 sm:p-6 border border-[#7a5240]/20 shadow-md space-y-4">
              <div className="border-b border-[#7a5240]/15 pb-2">
                <span className="micro-label text-[9px] text-[#7a5240]">Couple Memory Details</span>
                <p className="text-xs text-[#5b3a2e] font-serif italic mt-0.5">
                  “Save this moment into our shared world.”
                </p>
              </div>

              {/* Caption */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5b3a2e] mb-1">
                  Caption
                </label>
                <input
                  type="text"
                  value={capturedSession.caption}
                  onChange={(e) => reRenderComposite({ caption: e.target.value })}
                  placeholder="e.g. our random 1 AM photobooth session"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#7a5240]/25 text-xs text-[#3e2722] focus:outline-none focus:ring-1 focus:ring-[#5b3a2e] placeholder:text-[#a88d84]"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5b3a2e] mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#7a5240]" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  value={capturedSession.location}
                  onChange={(e) => reRenderComposite({ location: e.target.value })}
                  placeholder="Pondicherry × Bangalore"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#7a5240]/25 text-xs text-[#3e2722] focus:outline-none focus:ring-1 focus:ring-[#5b3a2e]"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5b3a2e] mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#7a5240]" />
                  <span>Date</span>
                </label>
                <input
                  type="text"
                  value={capturedSession.dateStr}
                  onChange={(e) => reRenderComposite({ dateStr: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#7a5240]/25 text-xs text-[#3e2722] focus:outline-none focus:ring-1 focus:ring-[#5b3a2e]"
                />
              </div>

              {/* Filter Swatches */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5b3a2e] mb-1.5 flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#7a5240]" />
                  <span>Film Filter</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {PHOTOBOOTH_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => reRenderComposite({ filterId: f.id })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold shrink-0 border transition cursor-pointer ${
                        capturedSession.filterId === f.id
                          ? 'bg-[#5b3a2e] text-white border-[#5b3a2e] shadow-2xs'
                          : 'bg-white/80 text-[#5b3a2e] border-[#7a5240]/20 hover:bg-white'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2.5">
              <button
                onClick={handleSaveToAkra}
                disabled={isSaving || capturedSession.isSaved}
                className={`w-full py-3.5 rounded-full font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 ${
                  capturedSession.isSaved
                    ? 'bg-emerald-600 text-white shadow-inner'
                    : 'bg-[#5b3a2e] text-[#FAF7F2] hover:bg-[#43271d]'
                }`}
              >
                {isSaving ? (
                  <span>Saving to private sanctuary...</span>
                ) : capturedSession.isSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>Memory saved ❤️</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#D9A89E]" />
                    <span>SAVE TO AKRA</span>
                  </>
                )}
              </button>

              {capturedSession.isSaved && (
                <button
                  onClick={() => setActiveTab('memories')}
                  className="w-full py-2.5 rounded-full text-xs font-semibold text-[#5b3a2e] bg-white/70 hover:bg-white border border-[#7a5240]/25 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#5b3a2e]" />
                  <span>View in Memories Gallery</span>
                </button>
              )}

              <button
                onClick={handleRetake}
                className="w-full py-2.5 rounded-full text-xs text-[#7a5240] hover:text-[#3e2722] hover:bg-white/40 transition text-center cursor-pointer"
              >
                Take another photo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW: LIVE CAMERA & PHOTOBOOTH BOOTH
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 select-none animate-fade-up">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleManualUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Screen Fill Light Overlay */}
      {screenLight && (
        <div className="fixed inset-0 z-30 bg-[#FFF7EE]/90 pointer-events-none transition-opacity duration-300" />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-[#7a5240]/15">
        <div>
          <span className="micro-label text-[9px] text-[#7a5240]">Private Couple Booth</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#5b3a2e] tracking-tight font-normal">
            PHOTOBOOTH
          </h1>
          <p className="text-xs sm:text-sm text-[#7a5240] font-serif italic mt-0.5">
            “One more memory?”
          </p>
        </div>

        {/* Top Camera Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Flip Camera */}
          <button
            onClick={() => setCameraFacing((prev) => (prev === 'user' ? 'environment' : 'user'))}
            className="px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white border border-[#7a5240]/20 text-xs text-[#5b3a2e] transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Switch front / back camera"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flip Cam</span>
          </button>

          {/* Warm Screen Light Toggle */}
          <button
            onClick={() => setScreenLight(!screenLight)}
            className={`px-3.5 py-1.5 rounded-full border text-xs transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              screenLight
                ? 'bg-[#ffe9dc] text-[#5b3a2e] border-[#5b3a2e]'
                : 'bg-white/70 hover:bg-white border-[#7a5240]/20 text-[#5b3a2e]'
            }`}
            title="Warm fill light for low light rooms"
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Light</span>
          </button>

          {/* Timer Selector */}
          <button
            onClick={() => {
              const next = timerDuration === 0 ? 3 : timerDuration === 3 ? 5 : timerDuration === 5 ? 10 : 0;
              setTimerDuration(next);
            }}
            className="px-3.5 py-1.5 rounded-full bg-white/70 hover:bg-white border border-[#7a5240]/20 text-xs text-[#5b3a2e] transition shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Toggle timer countdown"
          >
            <Timer className="w-3.5 h-3.5" />
            <span>{timerDuration === 0 ? 'Off' : `${timerDuration}s`}</span>
          </button>

          {/* Rule of thirds grid toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-full border transition cursor-pointer ${
              showGrid
                ? 'bg-[#5b3a2e] text-white border-[#5b3a2e]'
                : 'bg-white/70 text-[#5b3a2e] border-[#7a5240]/20 hover:bg-white'
            }`}
            title="Composition grid"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>

          {/* Audio Shutter Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-full border transition cursor-pointer ${
              soundEnabled
                ? 'bg-white/70 text-[#5b3a2e] border-[#7a5240]/20 hover:bg-white'
                : 'bg-black/10 text-[#7a5240] border-transparent'
            }`}
            title={soundEnabled ? 'Shutter audio ON' : 'Shutter audio OFF'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fallback upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-full bg-white/70 hover:bg-white border border-[#7a5240]/20 text-xs text-[#5b3a2e] transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Import an existing photo into photobooth"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Import</span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center p-1 rounded-full bg-white/70 backdrop-blur-md border border-[#7a5240]/20 shadow-xs max-w-full overflow-x-auto no-scrollbar">
          {[
            { id: '4cut' as ShootingMode, label: '4 CUT', desc: 'Vertical photo strip' },
            { id: 'single' as ShootingMode, label: 'SINGLE', desc: 'Classic photograph' },
            { id: 'polaroid' as ShootingMode, label: 'POLAROID', desc: 'Minimal paper frame' },
            { id: 'film' as ShootingMode, label: 'FILM', desc: '35mm analog negative' },
            { id: 'gif' as ShootingMode, label: 'GIF', desc: 'Looping burst sequence' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setShootingMode(mode.id)}
              disabled={isCapturing}
              className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition cursor-pointer shrink-0 ${
                shootingMode === mode.id
                  ? 'bg-[#5b3a2e] text-[#FAF7F2] shadow-xs'
                  : 'text-[#7a5240] hover:text-[#3e2722] hover:bg-white/40'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewfinder Frame */}
      <div className="relative max-w-2xl mx-auto rounded-[36px] bg-[#1E130F] border border-[#7a5240]/35 overflow-hidden shadow-2xl aspect-4/3 sm:aspect-16/10 flex items-center justify-center">
        {/* Soft Vignette Overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(15, 8, 6, 0.75) 100%)',
          }}
        />

        {/* Shutter Flash Animation */}
        {flashActive && (
          <div className="absolute inset-0 z-40 bg-white pointer-events-none animate-out fade-out duration-200" />
        )}

        {/* Live Countdown Overlay */}
        {countdownNumber !== null && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/45 backdrop-blur-2xs text-[#FAF7F2]">
            <span className="text-8xl sm:text-9xl font-serif text-[#FAF7F2] font-normal tracking-tight animate-ping">
              {countdownNumber}
            </span>
            <span className="text-xs uppercase tracking-[0.25em] font-mono text-[#D9A89E] mt-4">
              {shootingMode === '4cut' && currentShotIndex > 0
                ? `Shot ${currentShotIndex} of 4`
                : 'Smile together'}
            </span>
          </div>
        )}

        {/* 4-Cut Live Progress Indicator */}
        {isCapturing && shootingMode === '4cut' && countdownNumber === null && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-25 px-4 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-mono text-[#FAF7F2] border border-white/20">
            Capturing shot {currentShotIndex} of 4...
          </div>
        )}

        {/* Rule of Thirds Grid Lines */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-15 grid grid-cols-3 grid-rows-3">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>
        )}

        {/* Live Camera Video Feed */}
        {cameraError ? (
          <div className="p-8 text-center max-w-sm space-y-4 z-20">
            <div className="w-12 h-12 rounded-full bg-[#3e2722] text-[#D9A89E] flex items-center justify-center mx-auto border border-[#7a5240]/40">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg text-[#FAF7F2] font-normal">
                Camera Access Needed
              </h3>
              <p className="text-xs text-[#D9A89E]/80 mt-1 font-serif italic leading-relaxed">
                {cameraError}
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={startCamera}
                disabled={isRequestingPermission}
                className="px-4 py-2 rounded-full bg-[#D9A89E] text-[#1E130F] text-xs font-semibold hover:bg-white transition cursor-pointer"
              >
                {isRequestingPermission ? 'Connecting...' : 'Try Again'}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-full bg-[#3e2722] text-[#FAF7F2] border border-[#7a5240]/40 text-xs hover:bg-[#4a2e24] transition cursor-pointer"
              >
                Upload Photo
              </button>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-all duration-300 ${
              cameraFacing === 'user' ? 'scale-x-[-1]' : ''
            }`}
            style={{ filter: currentFilterObj.cssFilter }}
          />
        )}

        {/* Top Bar inside Viewfinder (Couple connection status) */}
        {isStreaming && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            <div className="px-3 py-1 rounded-full bg-[#1E130F]/70 backdrop-blur-md border border-[#7a5240]/30 text-[10px] text-[#FAF7F2] font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUser.name} • {currentUser.city}</span>
            </div>
          </div>
        )}

        {/* Bottom Central Capture Button */}
        {isStreaming && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
            <button
              onClick={handleCaptureStart}
              disabled={isCapturing}
              id="photobooth-capture-shutter-btn"
              className="w-18 h-18 rounded-full p-1.5 border-2 border-[#FAF7F2]/80 hover:border-white transition-all flex items-center justify-center cursor-pointer group active:scale-95 shadow-2xl hover:scale-105"
              title="Capture Memory"
            >
              <div className="w-full h-full rounded-full bg-[#FAF7F2] group-hover:bg-white transition-all flex items-center justify-center shadow-inner">
                <Camera className="w-6 h-6 text-[#5b3a2e] transition-transform group-hover:scale-110" />
              </div>
            </button>
            <span className="text-[9px] text-[#FAF7F2]/80 font-mono tracking-[0.2em] uppercase mt-2">
              {isCapturing ? 'Capturing...' : shootingMode.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Filter Presets Carousel */}
      <div className="max-w-2xl mx-auto space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#7a5240]">
            Photography Presets
          </span>
          <span className="text-[10px] text-[#7a5240] font-serif italic">
            {currentFilterObj.tone}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar px-1">
          {PHOTOBOOTH_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFilter(f.id)}
              disabled={isCapturing}
              className={`px-4 py-2 rounded-2xl border text-xs font-semibold shrink-0 transition-all cursor-pointer flex flex-col items-start ${
                selectedFilter === f.id
                  ? 'bg-[#5b3a2e] text-[#FAF7F2] border-[#5b3a2e] shadow-xs scale-102'
                  : 'bg-white/70 hover:bg-white text-[#5b3a2e] border-[#7a5240]/20'
              }`}
            >
              <span className="text-xs">{f.name}</span>
              <span
                className={`text-[9px] font-normal ${
                  selectedFilter === f.id ? 'text-[#D9A89E]' : 'text-[#7a5240]/80'
                }`}
              >
                {f.tone.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
