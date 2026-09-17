import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles, Maximize2, Crosshair } from 'lucide-react';

interface AvatarCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onSave: (blob: Blob, dataUrl: string) => Promise<void> | void;
  isSaving?: boolean;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  imageSrc,
  onCancel,
  onSave,
  isSaving = false,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 300, height: 300 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const VIEWPORT_SIZE = 280; // Diameter of preview circle on screen in px

  // Read natural image dimensions on load
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.naturalWidth && target.naturalHeight) {
      setNaturalDimensions({
        width: target.naturalWidth,
        height: target.naturalHeight,
      });

      // If tall portrait image (aspect < 1), start with a comfortable zoom so head isn't cropped
      const aspect = target.naturalWidth / target.naturalHeight;
      if (aspect < 0.8) {
        setZoom(0.85);
        // Slightly nudge down so the face/head at the top is centered
        setOffset({ x: 0, y: 20 });
      } else {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  };

  // Calculate base dimensions fitting the viewport
  const aspect = naturalDimensions.width / naturalDimensions.height;
  let baseW: number;
  let baseH: number;
  if (aspect >= 1) {
    baseH = VIEWPORT_SIZE;
    baseW = VIEWPORT_SIZE * aspect;
  } else {
    baseW = VIEWPORT_SIZE;
    baseH = VIEWPORT_SIZE / aspect;
  }

  // Handle pointer drag (mouse & touch unified)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: Math.round(e.clientX - dragStart.x),
      y: Math.round(e.clientY - dragStart.y),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Fit entire photo inside circle (zoom out so full height & width are visible)
  const handleFitPhoto = () => {
    const minZoom = Math.min(
      VIEWPORT_SIZE / baseW,
      VIEWPORT_SIZE / baseH
    );
    setZoom(Math.max(0.2, Number((minZoom * 0.95).toFixed(2))));
    setOffset({ x: 0, y: 0 });
  };

  // Center photo
  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
  };

  // Perform canvas crop to 360x360 high resolution avatar
  const handleCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    try {
      const canvas = document.createElement('canvas');
      const size = 360;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      const scaleFactor = size / VIEWPORT_SIZE;

      ctx.save();
      // Translate to center of canvas + user drag offset scaled
      ctx.translate(
        size / 2 + offset.x * scaleFactor,
        size / 2 + offset.y * scaleFactor
      );

      // Rotate around image center
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom
      ctx.scale(zoom, zoom);

      // Draw image centered
      const drawW = baseW * scaleFactor;
      const drawH = baseH * scaleFactor;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
          await onSave(blob, dataUrl);
        },
        'image/jpeg',
        0.90
      );
    } catch (exportErr) {
      console.warn('Canvas export tainted or failed, falling back to direct source:', exportErr);
      const fallbackBlob = await fetch(imageSrc).then((r) => r.blob()).catch(() => new Blob());
      await onSave(fallbackBlob, imageSrc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/85 backdrop-blur-md animate-fade-up">
      <div className="relative max-w-sm w-full rounded-[32px] bg-[#FFF0F5] border border-[#F0C9D8] p-5 sm:p-6 shadow-2xl overflow-hidden flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-[#F0C9D8]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#5D4037]" />
            <h3 className="font-serif font-bold text-base text-[#3E2723]">Adjust & Crop DP</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="p-1.5 rounded-full hover:bg-[#FCEBF2] text-[#795548] hover:text-[#3E2723] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#795548] text-center my-2.5">
          Drag to position your head & face inside the circle. Zoom out if needed.
        </p>

        {/* Viewport / Crop Frame (280x280 Circle) */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          className="relative rounded-full overflow-hidden bg-[#2d1b15] shadow-inner ring-4 ring-[#5D4037]/20 border-2 border-[#5D4037] cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            crossOrigin="anonymous"
            alt="Crop target"
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              width: `${baseW}px`,
              height: `${baseH}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.05s ease-out',
            }}
            className="pointer-events-none select-none"
          />

          {/* Drag Overlay Hint */}
          <div className="absolute inset-0 rounded-full pointer-events-none flex items-center justify-center opacity-0 hover:opacity-10 transition-opacity bg-black">
            <Move className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Quick Helper Tools */}
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={handleFitPhoto}
            className="px-2.5 py-1 rounded-full bg-[#FCEBF2] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1 border border-[#F0C9D8]"
            title="Fit full photo inside circle"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fit Photo</span>
          </button>

          <button
            type="button"
            onClick={handleCenter}
            className="px-2.5 py-1 rounded-full bg-[#FCEBF2] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1 border border-[#F0C9D8]"
            title="Center position"
          >
            <Crosshair className="w-3 h-3" />
            <span>Center</span>
          </button>

          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="px-2.5 py-1 rounded-full bg-[#FCEBF2] text-[11px] font-semibold text-[#5D4037] hover:bg-[#EFE5E0] transition flex items-center gap-1 border border-[#F0C9D8]"
            title="Rotate 90 degrees"
          >
            <RotateCw className="w-3 h-3" />
            <span>Rotate</span>
          </button>
        </div>

        {/* Controls */}
        <div className="w-full mt-3 space-y-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
              className="p-1.5 rounded-full bg-[#FCEBF2] text-[#5D4037] hover:bg-[#EFE5E0] transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.02"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#5D4037] cursor-pointer h-1.5 bg-[#FCEBF2] rounded-lg"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.1).toFixed(2))))}
              className="p-1.5 rounded-full bg-[#FCEBF2] text-[#5D4037] hover:bg-[#EFE5E0] transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] text-[#795548] font-mono w-9 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0C9D8]/60">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-full border border-[#F0C9D8] text-xs font-semibold text-[#795548] hover:bg-[#FCEBF2] transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleCrop}
              className="px-5 py-2 rounded-full bg-[#5D4037] text-white text-xs font-semibold hover:bg-[#4E342E] transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving DP...' : 'Crop & Save DP'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
