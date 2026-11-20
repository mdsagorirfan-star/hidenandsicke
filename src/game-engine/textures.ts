import * as THREE from 'three';

export type SurfaceTextureKind =
  | 'slate_grid'
  | 'wood_plank'
  | 'asphalt'
  | 'grass_moss'
  | 'boardwalk'
  | 'tile_floor';

const cache = new Map<string, THREE.CanvasTexture>();

export function getProceduralTexture(
  kind: SurfaceTextureKind,
  repeatX = 12,
  repeatY = 12,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const key = `${kind}_${repeatX}_${repeatY}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'slate_grid') {
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else if (kind === 'wood_plank') {
    ctx.fillStyle = '#854D0E';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 32) {
      ctx.fillStyle = y % 64 === 0 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(0, y, size, 30);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, y + 30, size, 2);
    }
  } else if (kind === 'asphalt') {
    ctx.fillStyle = '#181E29';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 600; i++) {
      const gx = (i * 73) % size;
      const gy = (i * 137) % size;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(gx, gy, 2, 2);
    }
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.fillRect(124, 0, 8, 96);
    ctx.fillRect(124, 140, 8, 96);
  } else if (kind === 'grass_moss') {
    ctx.fillStyle = '#14532D';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 500; i++) {
      const gx = (i * 53) % size;
      const gy = (i * 97) % size;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(74, 222, 128, 0.14)' : 'rgba(6, 78, 59, 0.35)';
      ctx.fillRect(gx, gy, 4, 4);
    }
  } else if (kind === 'boardwalk') {
    ctx.fillStyle = '#292540';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.18)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.strokeRect(16, 16, size - 32, size - 32);
  } else if (kind === 'tile_floor') {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(0, 0, size / 2, size / 2);
    ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  cache.set(key, tex);
  return tex;
}

export function getContactShadowTexture(): THREE.CanvasTexture {
  const key = 'contact_shadow_radial';
  const existing = cache.get(key);
  if (existing) return existing;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}
