import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Move, Sparkles } from 'lucide-react';

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

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset when a new image source arrives
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  }, [imageSrc]);

  // Handle pointer drag (mouse & touch unified)
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Safe ignore
      }
    }
  };

  // Perform canvas crop to 400x400 high resolution circular/square avatar
  const handleCrop = async () => {
    const img = imageRef.current;
    if (!img) return;

    // Size 320x320 is ideal for avatars: crisp on retina displays, yet ultra-compact (<30KB) for permanent persistence
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    // Translate to center of canvas
    ctx.translate(size / 2, size / 2);
    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Compute dimensions
    const viewportSize = 260; // Size of the on-screen preview circle in px
    const scaleFactor = size / viewportSize;

    // Apply translation from user drag
    // Note: Adjust translation based on rotation
    const rad = (-rotation * Math.PI) / 180;
    const rotatedX = offset.x * Math.cos(rad) - offset.y * Math.sin(rad);
    const rotatedY = offset.x * Math.sin(rad) + offset.y * Math.cos(rad);

    ctx.translate(rotatedX * scaleFactor, rotatedY * scaleFactor);

    // Draw the image scaled
    const naturalWidth = img.naturalWidth || 320;
    const naturalHeight = img.naturalHeight || 320;
    const imgAspect = naturalWidth / naturalHeight;
    let drawW: number;
    let drawH: number;

    if (imgAspect >= 1) {
      drawH = size * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = size * zoom;
      drawH = drawW / imgAspect;
    }

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    try {
      canvas.toBlob(
        async (blob) => {
          if (!blob) return;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
          await onSave(blob, dataUrl);
        },
        'image/jpeg',
        0.88
      );
    } catch (exportErr) {
      console.warn('Canvas export tainted or failed, falling back to direct source:', exportErr);
      // If tainted, fetch original or pass existing
      const fallbackBlob = await fetch(imageSrc).then(r => r.blob()).catch(() => new Blob());
      await onSave(fallbackBlob, imageSrc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#140c09]/85 backdrop-blur-md animate-fade-up">
      <div className="relative max-w-sm w-full rounded-[32px] bg-[#FFF0F5] border border-[#F0C9D8] p-6 shadow-2xl overflow-hidden flex flex-col items-center">
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

        <p className="text-xs text-[#795548] text-center my-3">
          Drag to reposition and use the slider to zoom your display picture.
        </p>

        {/* Viewport / Crop Frame */}
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-[260px] h-[260px] rounded-full overflow-hidden bg-[#2d1b15] shadow-inner ring-4 ring-[#5D4037]/20 border-2 border-[#5D4037] cursor-grab active:cursor-grabbing select-none touch-none flex items-center justify-center"
        >
          <img
            ref={imageRef}
            src={imageSrc}
            crossOrigin="anonymous"
            alt="Crop target"
            draggable={false}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.08s ease-out',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            className="w-full h-full object-cover pointer-events-none"
          />

          {/* Drag Overlay Hint */}
          <div className="absolute inset-0 rounded-full pointer-events-none flex items-center justify-center opacity-0 hover:opacity-10 transition-opacity bg-black">
            <Move className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Controls */}
        <div className="w-full mt-4 space-y-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.1).toFixed(2))))}
              className="p-1.5 rounded-full bg-[#FCEBF2] text-[#5D4037] hover:bg-[#EFE5E0] transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <input
              type="range"
              min="0.8"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-[#5D4037] cursor-pointer h-1.5 bg-[#FCEBF2] rounded-lg"
            />

            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}
              className="p-1.5 rounded-full bg-[#FCEBF2] text-[#5D4037] hover:bg-[#EFE5E0] transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            {/* Rotate Button */}
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-1.5 rounded-full bg-[#FCEBF2] text-[#5D4037] hover:bg-[#EFE5E0] transition ml-1"
              title="Rotate 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
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
