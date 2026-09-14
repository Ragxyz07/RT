import * as THREE from 'three';

// AKRA Romantic Luxury Color Palette
export const AKRA_PALETTE = {
  softPink: 0xF4C7D3,      // #F4C7D3
  softPinkHex: '#F4C7D3',
  lilac: 0xDCCCE8,         // #DCCCE8
  lilacHex: '#DCCCE8',
  deepRose: 0xA85D76,      // #A85D76
  deepRoseHex: '#A85D76',
  cocoaBrown: 0x6B4636,    // #6B4636
  cocoaBrownHex: '#6B4636',
  cream: 0xFFF7F2,         // #FFF7F2
  creamHex: '#FFF7F2',
  deepBrown: 0x241916,     // #241916
  deepBrownHex: '#241916',
  warmGold: 0xD4AF37,      // #D4AF37
  warmGoldHex: '#D4AF37',
  glowPink: 0xFFB6C1,      // #FFB6C1
  blush: 0xFCEBF2,         // #FCEBF2
};

// Procedural Canvas Texture Generators
export function createGradientTexture(color1: string, color2: string, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Particle Texture (Soft Glowing Star/Dot)
export function createGlowParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 245, 240, 1)');
    grad.addColorStop(0.25, 'rgba(244, 199, 211, 0.8)');
    grad.addColorStop(0.6, 'rgba(220, 204, 232, 0.3)');
    grad.addColorStop(1, 'rgba(220, 204, 232, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create Earth Globe Texture
export function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep warm ocean with subtle gradient
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 512);
    oceanGrad.addColorStop(0, '#1c1724');
    oceanGrad.addColorStop(0.5, '#2e1f2b');
    oceanGrad.addColorStop(1, '#1c1724');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Grid lines for latitude/longitude
    ctx.strokeStyle = 'rgba(244, 199, 211, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1024; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    for (let y = 0; y < 512; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    // Stylized continent silhouettes (warm rose/cocoa)
    ctx.fillStyle = '#6B4636';
    ctx.shadowColor = '#F4C7D3';
    ctx.shadowBlur = 8;

    // Stylized India region
    ctx.beginPath();
    ctx.ellipse(710, 260, 45, 60, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Asia & Europe
    ctx.beginPath();
    ctx.ellipse(660, 180, 140, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Africa
    ctx.beginPath();
    ctx.ellipse(540, 300, 70, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // Americas
    ctx.beginPath();
    ctx.ellipse(260, 210, 60, 100, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(320, 360, 50, 90, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Australia
    ctx.beginPath();
    ctx.ellipse(840, 370, 45, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight Puducherry & Bangalore location with glowing dots
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FFD700';
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(710, 275, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Ambient Stardust Particle System
export function createStardustParticles(count = 120, bounds = { x: 10, y: 8, z: 10 }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * bounds.x;
    positions[i * 3 + 1] = Math.random() * bounds.y;
    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z;
    scales[i] = Math.random() * 0.5 + 0.5;
    speeds[i] = Math.random() * 0.005 + 0.002;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  const material = new THREE.PointsMaterial({
    size: 0.12,
    color: AKRA_PALETTE.softPink,
    transparent: true,
    opacity: 0.75,
    map: createGlowParticleTexture(),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);

  return {
    points,
    update: (time: number) => {
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const array = posAttr.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const yIndex = i * 3 + 1;
        array[yIndex] += speeds[i];
        if (array[yIndex] > bounds.y) {
          array[yIndex] = 0;
        }
        // Slight horizontal sway
        array[i * 3] += Math.sin(time * 0.5 + i) * 0.001;
      }
      posAttr.needsUpdate = true;
    },
  };
}

// Standard Cinematic Camera Lerper
export interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

export function lerpCamera(
  camera: THREE.Camera,
  currentLookAt: THREE.Vector3,
  target: CameraTarget,
  alpha = 0.05
) {
  camera.position.lerp(target.position, alpha);
  currentLookAt.lerp(target.lookAt, alpha);
  camera.lookAt(currentLookAt);
}
