/**
 * AKRA Photobooth Canvas Engine
 * High-resolution canvas rendering for Single, 4-Cut Strip, Polaroid, and Film modes.
 * Applies authentic photographic presets and subtle film branding.
 */

export type PhotoboothFilterId =
  | 'original'
  | 'warm_film'
  | 'cool_film'
  | 'bw'
  | 'vintage'
  | 'soft'
  | 'cinematic';

export interface PhotoboothFilter {
  id: PhotoboothFilterId;
  name: string;
  cssFilter: string;
  tone: string;
}

export const PHOTOBOOTH_FILTERS: PhotoboothFilter[] = [
  {
    id: 'original',
    name: 'Original',
    cssFilter: 'none',
    tone: 'Authentic & True',
  },
  {
    id: 'warm_film',
    name: 'Warm Film',
    cssFilter: 'sepia(0.2) contrast(1.06) brightness(1.02) saturate(1.16) hue-rotate(-4deg)',
    tone: 'Golden hour warmth',
  },
  {
    id: 'cool_film',
    name: 'Cool Film',
    cssFilter: 'contrast(1.1) brightness(1.02) saturate(0.92) hue-rotate(14deg)',
    tone: 'Crisp slate & teal shadows',
  },
  {
    id: 'bw',
    name: 'B & W',
    cssFilter: 'grayscale(1) contrast(1.24) brightness(0.98)',
    tone: 'Rich Leica monochrome',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    cssFilter: 'sepia(0.42) contrast(1.08) brightness(0.96) saturate(1.12)',
    tone: '70s analog warmth',
  },
  {
    id: 'soft',
    name: 'Soft',
    cssFilter: 'contrast(0.96) brightness(1.08) saturate(1.04)',
    tone: 'Gentle romantic glow',
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    cssFilter: 'contrast(1.2) brightness(0.92) saturate(1.22) hue-rotate(-10deg)',
    tone: 'Moody 35mm tone',
  },
];

export interface RenderOptions {
  filterId?: PhotoboothFilterId;
  dateStr?: string;
  locationStr?: string;
  caption?: string;
  theme?: 'ivory' | 'noir';
  coupleTitle?: string;
}

/**
 * Helper to capture a frame from an active video element
 */
export function captureVideoFrame(
  video: HTMLVideoElement,
  mirror = true
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const w = video.videoWidth || 1280;
  const h = video.videoHeight || 720;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, 0, 0, w, h);
  return canvas;
}

/**
 * Add very subtle analog film grain to a canvas context
 */
function applySubtleGrain(ctx: CanvasRenderingContext2D, width: number, height: number, intensity = 0.04) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;
    // Step by 4 (every pixel) or every 2nd pixel for performance
    for (let i = 0; i < len; i += 4) {
      const noise = (Math.random() - 0.5) * (intensity * 255);
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Graceful fallback if tainted
  }
}

/**
 * Render SINGLE photo
 */
export async function renderSinglePhoto(
  source: HTMLCanvasElement | HTMLImageElement,
  options: RenderOptions = {}
): Promise<string> {
  const filter = PHOTOBOOTH_FILTERS.find((f) => f.id === (options.filterId || 'original')) || PHOTOBOOTH_FILTERS[0];
  const theme = options.theme || 'ivory';
  const isNoir = theme === 'noir';

  const srcW = 'videoWidth' in source ? (source as any).videoWidth : source.width;
  const srcH = 'videoHeight' in source ? (source as any).videoHeight : source.height;

  // Render at crisp 1600 width (3:2 or 4:3 based on source)
  const targetPhotoW = 1440;
  const targetPhotoH = Math.round((targetPhotoW * srcH) / srcW);

  const border = 48;
  const bottomExtra = options.caption || options.locationStr ? 120 : 64;

  const canvas = document.createElement('canvas');
  canvas.width = targetPhotoW + border * 2;
  canvas.height = targetPhotoH + border + bottomExtra;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = isNoir ? '#1C1412' : '#FAF7F2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle border outline
  ctx.strokeStyle = isNoir ? 'rgba(217, 168, 158, 0.2)' : 'rgba(122, 82, 64, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, canvas.width - 32, canvas.height - 32);

  // Draw Photo with filter
  ctx.save();
  ctx.filter = filter.cssFilter;
  ctx.drawImage(source, border, border, targetPhotoW, targetPhotoH);
  ctx.restore();

  // Subtle grain
  if (filter.id === 'warm_film' || filter.id === 'vintage' || filter.id === 'cinematic') {
    applySubtleGrain(ctx, canvas.width, canvas.height, 0.035);
  }

  // Bottom subtle caption & date
  const textY = targetPhotoH + border + 46;
  ctx.fillStyle = isNoir ? '#F9EFE8' : '#5B3A2E';
  ctx.textAlign = 'left';
  ctx.font = '600 24px "Playfair Display", Georgia, serif';

  if (options.caption) {
    ctx.fillText(`“${options.caption}”`, border, textY);
  } else {
    ctx.fillText('AKRA', border, textY);
  }

  // Right side date/location
  ctx.textAlign = 'right';
  ctx.font = '400 18px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = isNoir ? 'rgba(217, 168, 158, 0.85)' : 'rgba(122, 82, 64, 0.85)';
  const metaStr = [options.locationStr, options.dateStr].filter(Boolean).join('  •  ');
  ctx.fillText(metaStr, canvas.width - border, textY);

  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Render 4-CUT VERTICAL PHOTO STRIP
 * Iconic Korean/Japanese photobooth layout with luxury typography
 */
export async function renderFourCutStrip(
  sources: (HTMLCanvasElement | HTMLImageElement)[],
  options: RenderOptions = {}
): Promise<string> {
  const filter = PHOTOBOOTH_FILTERS.find((f) => f.id === (options.filterId || 'original')) || PHOTOBOOTH_FILTERS[0];
  const theme = options.theme || 'ivory';
  const isNoir = theme === 'noir';

  // Strip Dimensions
  const frameW = 860;
  const frameH = 580; // 4:3 or 3:2 landscape frame per cut
  const padX = 54;
  const padTop = 56;
  const gap = 32;
  const brandingHeight = 240;

  const totalW = frameW + padX * 2;
  const totalH = padTop + (frameH * 4) + (gap * 3) + brandingHeight;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = isNoir ? '#18100E' : '#FAF7F2';
  ctx.fillRect(0, 0, totalW, totalH);

  // Subtle outer edge stroke
  ctx.strokeStyle = isNoir ? 'rgba(217, 168, 158, 0.18)' : 'rgba(122, 82, 64, 0.16)';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, totalW - 36, totalH - 36);

  // Draw each of the 4 frames
  for (let i = 0; i < 4; i++) {
    const src = sources[i] || sources[0];
    const yPos = padTop + i * (frameH + gap);

    // Frame backdrop
    ctx.fillStyle = isNoir ? '#251714' : '#EFE8DF';
    ctx.fillRect(padX, yPos, frameW, frameH);

    // Draw image with photographic filter
    ctx.save();
    ctx.filter = filter.cssFilter;

    // Center-crop source into frame
    const sW = 'videoWidth' in src ? (src as any).videoWidth : src.width;
    const sH = 'videoHeight' in sourceVideoOrImg(src) ? (src as any).videoHeight : src.height;

    const targetRatio = frameW / frameH;
    const srcRatio = sW / sH;

    let sx = 0, sy = 0, sw = sW, sh = sH;
    if (srcRatio > targetRatio) {
      sw = sH * targetRatio;
      sx = (sW - sw) / 2;
    } else {
      sh = sW / targetRatio;
      sy = (sH - sh) / 2;
    }

    ctx.drawImage(src, sx, sy, sw, sh, padX, yPos, frameW, frameH);
    ctx.restore();

    // Subtle hairline inner border around each cut
    ctx.strokeStyle = isNoir ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padX, yPos, frameW, frameH);
  }

  // Branding Section at the Bottom
  const brandY = padTop + 4 * frameH + 3 * gap + 48;

  // 1. Monogram / Brand Name
  ctx.textAlign = 'center';
  ctx.fillStyle = isNoir ? '#F9EFE8' : '#4A2E24';
  ctx.font = '700 38px "Playfair Display", Georgia, serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('A K R A', totalW / 2, brandY);

  // 2. City connection & subtitle
  ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
  ctx.fillStyle = isNoir ? '#D9A89E' : '#7A5240';
  const locationText = options.locationStr || 'Pondicherry × Bangalore';
  ctx.fillText(locationText, totalW / 2, brandY + 40);

  // 3. Optional small caption or quote
  if (options.caption) {
    ctx.font = 'italic 17px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = isNoir ? 'rgba(249, 239, 232, 0.75)' : 'rgba(91, 58, 46, 0.75)';
    ctx.fillText(`“${options.caption}”`, totalW / 2, brandY + 76);
  }

  // 4. Date stamp
  ctx.font = '500 15px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = isNoir ? 'rgba(217, 168, 158, 0.65)' : 'rgba(122, 82, 64, 0.65)';
  const dateFormatted = options.dateStr || new Date().toLocaleDateString('en-GB').replace(/\//g, '.');
  ctx.fillText(dateFormatted, totalW / 2, brandY + (options.caption ? 116 : 90));

  // Subtle film grain
  if (filter.id === 'warm_film' || filter.id === 'vintage' || filter.id === 'cinematic') {
    applySubtleGrain(ctx, totalW, totalH, 0.03);
  }

  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Render POLAROID photo
 */
export async function renderPolaroidPhoto(
  source: HTMLCanvasElement | HTMLImageElement,
  options: RenderOptions = {}
): Promise<string> {
  const filter = PHOTOBOOTH_FILTERS.find((f) => f.id === (options.filterId || 'original')) || PHOTOBOOTH_FILTERS[0];

  const photoSize = 1000;
  const padSide = 70;
  const padTop = 70;
  const padBottom = 260; // Generous iconic Polaroid bottom margin

  const totalW = photoSize + padSide * 2;
  const totalH = photoSize + padTop + padBottom;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Polaroid Paper background (authentic warm off-white cream)
  ctx.fillStyle = '#FAF6F0';
  ctx.fillRect(0, 0, totalW, totalH);

  // Realistic paper drop shadow line
  ctx.strokeStyle = 'rgba(122, 82, 64, 0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, totalW - 20, totalH - 20);

  // Square photo area backdrop
  ctx.fillStyle = '#1A1412';
  ctx.fillRect(padSide, padTop, photoSize, photoSize);

  // Crop & draw source into square
  const sW = 'videoWidth' in source ? (source as any).videoWidth : source.width;
  const sH = 'videoHeight' in sourceVideoOrImg(source) ? (source as any).videoHeight : source.height;
  const minDim = Math.min(sW, sH);
  const sx = (sW - minDim) / 2;
  const sy = (sH - minDim) / 2;

  ctx.save();
  ctx.filter = filter.cssFilter;
  ctx.drawImage(source, sx, sy, minDim, minDim, padSide, padTop, photoSize, photoSize);
  ctx.restore();

  // Subtle vignette / inner shadow on the photo
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(padSide, padTop, photoSize, photoSize);

  // Handwritten / Serif caption on the bottom
  const textCenter = padTop + photoSize + (padBottom / 2) - 15;
  ctx.textAlign = 'center';

  if (options.caption) {
    ctx.font = 'italic 34px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = '#3E2621';
    ctx.fillText(`“${options.caption}”`, totalW / 2, textCenter);
  } else {
    ctx.font = '600 32px "Playfair Display", Georgia, serif';
    ctx.fillStyle = '#3E2621';
    ctx.fillText('Mama & Akshu', totalW / 2, textCenter);
  }

  // Date and place below caption
  ctx.font = '400 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#7A5240';
  const bottomMeta = [options.locationStr || 'Pondicherry × Bangalore', options.dateStr].filter(Boolean).join('  •  ');
  ctx.fillText(bottomMeta, totalW / 2, textCenter + 52);

  applySubtleGrain(ctx, totalW, totalH, 0.03);

  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Render FILM 35mm frame
 */
export async function renderFilmFrame(
  source: HTMLCanvasElement | HTMLImageElement,
  options: RenderOptions = {}
): Promise<string> {
  const filter = PHOTOBOOTH_FILTERS.find((f) => f.id === (options.filterId || 'warm_film')) || PHOTOBOOTH_FILTERS[1];

  const photoW = 1200;
  const photoH = 800; // Classic 3:2 35mm ratio
  const sprocketHeight = 84;
  const padSide = 80;

  const totalW = photoW + padSide * 2;
  const totalH = photoH + sprocketHeight * 2;

  const canvas = document.createElement('canvas');
  canvas.width = totalW;
  canvas.height = totalH;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Dark 35mm negative film border
  ctx.fillStyle = '#140D0B';
  ctx.fillRect(0, 0, totalW, totalH);

  // Draw Sprocket holes (top & bottom)
  const holeW = 28;
  const holeH = 44;
  const holeGap = 52;
  const holeRadius = 6;
  const numHoles = Math.floor(totalW / holeGap);

  const drawSprockets = (y: number) => {
    ctx.fillStyle = '#050303';
    for (let i = 0; i < numHoles; i++) {
      const x = i * holeGap + (holeGap - holeW) / 2;
      roundRect(ctx, x, y, holeW, holeH, holeRadius);
      ctx.fill();
    }
  };

  drawSprockets(20);
  drawSprockets(totalH - sprocketHeight + 20);

  // Film typography stamps on edge
  ctx.font = '700 14px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = '#D9A89E';
  ctx.textAlign = 'left';
  ctx.fillText('AKRA 400 • COLOR NEGATIVE', padSide, sprocketHeight - 12);

  ctx.textAlign = 'right';
  ctx.fillText('▶ 36A  •  DX 24×36', totalW - padSide, sprocketHeight - 12);

  // Draw Photo
  ctx.save();
  ctx.filter = filter.cssFilter;
  ctx.drawImage(source, padSide, sprocketHeight, photoW, photoH);
  ctx.restore();

  // Bottom edge metadata
  ctx.font = '500 13px "Plus Jakarta Sans", monospace';
  ctx.fillStyle = '#C2988E';
  ctx.textAlign = 'left';
  ctx.fillText(`PONDICHERRY × BANGALORE  [${options.dateStr || '2026'}]`, padSide, totalH - 18);

  ctx.textAlign = 'right';
  ctx.fillText('SAFETY FILM  •  36', totalW - padSide, totalH - 18);

  applySubtleGrain(ctx, totalW, totalH, 0.045);

  return canvas.toDataURL('image/jpeg', 0.94);
}

function sourceVideoOrImg(src: any) {
  return src;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
