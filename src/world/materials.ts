import * as THREE from 'three';

/**
 * Shared per-frame state. <DayNight/> writes night/time (0 = noon, 1 = midnight),
 * <Avatar/> writes the player's position, <CameraRig/> writes the camera heading (read by the radar).
 */
export const world = {
  night: 0,
  time: 0,
  avatar: { x: -14, z: 7, heading: 0, moving: false, driving: false },
  cam: { yaw: 0 },
  /** Bumped by the HUD to snap the camera back to the player. */
  recenter: 0,
};

/** Materials whose emissive glow follows the day/night cycle. */
const glowing = new Set<{ mat: THREE.MeshStandardMaterial; day: number; night: number }>();
export function glow(mat: THREE.MeshStandardMaterial, day: number, night: number) {
  glowing.add({ mat, day, night });
  return mat;
}
export function updateGlow(n: number) {
  glowing.forEach((g) => (g.mat.emissiveIntensity = g.day + (g.night - g.day) * n));
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Facade texture: a grid of windows, some lit. Returned as {map, emissive}. */
export function facade(opts: { cols: number; rows: number; wall: string; glass: string; lit?: number; seed?: number; frame?: string }) {
  const { cols, rows, wall, glass, lit = 0.55, seed = 7, frame } = opts;
  const cw = 32;
  const ch = 40;
  const W = cols * cw;
  const H = rows * ch;
  const rand = seeded(seed);
  const base = document.createElement('canvas');
  const emis = document.createElement('canvas');
  base.width = emis.width = W;
  base.height = emis.height = H;
  const b = base.getContext('2d')!;
  const e = emis.getContext('2d')!;
  b.fillStyle = wall;
  b.fillRect(0, 0, W, H);
  e.fillStyle = '#000';
  e.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 6;
      const y = r * ch + 7;
      const w = cw - 12;
      const h = ch - 14;
      if (frame) { b.fillStyle = frame; b.fillRect(x - 2, y - 2, w + 4, h + 4); }
      b.fillStyle = glass;
      b.fillRect(x, y, w, h);
      if (rand() < lit) {
        const warm = rand();
        e.fillStyle = warm < 0.75 ? '#ffd58a' : warm < 0.92 ? '#fff1cf' : '#9fd3ff';
        e.fillRect(x, y, w, h);
      }
    }
  const map = new THREE.CanvasTexture(base);
  const emissiveMap = new THREE.CanvasTexture(emis);
  map.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

const cache = new Map<string, THREE.MeshStandardMaterial>();
/** A building material with glowing windows at night (cached by key). */
export function facadeMat(key: string, opts: Parameters<typeof facade>[0] & { metal?: number; rough?: number }) {
  const hit = cache.get(key);
  if (hit) return hit;
  const { map, emissiveMap } = facade(opts);
  const m = new THREE.MeshStandardMaterial({
    map, emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0,
    metalness: opts.metal ?? 0.2, roughness: opts.rough ?? 0.6,
  });
  glow(m, 0.05, 1.6);
  cache.set(key, m);
  return m;
}

/** Stripe texture (awnings). */
export function stripes(a: string, b: string, n = 8) {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 16;
  const x = c.getContext('2d')!;
  for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect((i * 128) / n, 0, 128 / n, 16); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function canvasTex(size: number, draw: (x: CanvasRenderingContext2D, s: number) => void, repeat: [number, number], srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Speckled asphalt with faint tyre wear. */
export function asphaltTex(repeat: [number, number]) {
  return canvasTex(256, (x, s) => {
    x.fillStyle = '#3a3a3d';
    x.fillRect(0, 0, s, s);
    const r = seeded(11);
    for (let i = 0; i < 9000; i++) {
      const v = 40 + r() * 40;
      x.fillStyle = `rgba(${v},${v},${v + 3},${0.25 + r() * 0.35})`;
      x.fillRect(r() * s, r() * s, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    x.fillStyle = 'rgba(15,15,18,0.18)';
    x.fillRect(0, s * 0.28, s, s * 0.08);
    x.fillRect(0, s * 0.64, s, s * 0.08);
  }, repeat);
}

/** Paving slabs for the pavements and plazas. */
export function pavingTex(repeat: [number, number]) {
  return canvasTex(256, (x, s) => {
    const r = seeded(5);
    const n = 4;
    const t = s / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const v = 150 + r() * 22;
        x.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
        x.fillRect(i * t, j * t, t, t);
      }
    x.strokeStyle = 'rgba(70,64,56,0.55)';
    x.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, s); x.stroke();
      x.beginPath(); x.moveTo(0, i * t); x.lineTo(s, i * t); x.stroke();
    }
    for (let i = 0; i < 2500; i++) {
      x.fillStyle = `rgba(0,0,0,${r() * 0.08})`;
      x.fillRect(r() * s, r() * s, 2, 2);
    }
  }, repeat);
}

/** Tileable normal map of overlapping ripples, for the sea. */
export function waterNormals(repeat: [number, number]) {
  const s = 256;
  const h = new Float32Array(s * s);
  const r = seeded(3);
  const waves = Array.from({ length: 14 }, () => ({
    kx: Math.round(1 + r() * 6) * (r() < 0.5 ? -1 : 1), ky: Math.round(1 + r() * 6), a: 0.3 + r(), p: r() * 6.28,
  }));
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      let v = 0;
      for (const w of waves) v += Math.sin(((w.kx * x + w.ky * y) / s) * Math.PI * 2 + w.p) * w.a / Math.hypot(w.kx, w.ky);
      h[y * s + x] = v;
    }
  return canvasTex(s, (x) => {
    const img = x.createImageData(s, s);
    for (let y = 0; y < s; y++)
      for (let xx = 0; xx < s; xx++) {
        const dx = h[y * s + ((xx + 1) % s)] - h[y * s + ((xx - 1 + s) % s)];
        const dy = h[((y + 1) % s) * s + xx] - h[((y - 1 + s) % s) * s + xx];
        const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize();
        const i = (y * s + xx) * 4;
        img.data[i] = (n.x * 0.5 + 0.5) * 255;
        img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
        img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
        img.data[i + 3] = 255;
      }
    x.putImageData(img, 0, 0);
  }, repeat, false);
}

/** A sign painted onto a canvas (big letters on hills, shop fronts). */
export function textTex(text: string, opts: { w?: number; h?: number; color?: string; bg?: string; font?: string } = {}) {
  const { w = 1024, h = 160, color = '#ffffff', bg = 'transparent', font = "bold 120px 'Playfair Display', Georgia, serif" } = opts;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  if (bg !== 'transparent') { x.fillStyle = bg; x.fillRect(0, 0, w, h); }
  x.font = font;
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Skyline tower material: a dense window grid, repeated to fit each tower's size. */
const towerBase = new Map<string, ReturnType<typeof facade>>();
export function towerMat(style: number, w: number, h: number) {
  const STY = [
    { wall: '#22303a', glass: '#56788c', frame: '#2c3a46', metal: 0.7, rough: 0.25 },
    { wall: '#c9c0ae', glass: '#2f3a40', frame: '#9d9483', metal: 0.1, rough: 0.7 },
    { wall: '#141a20', glass: '#3e5a6b', frame: '#1c242c', metal: 0.85, rough: 0.15 },
    { wall: '#8a6e4e', glass: '#2a2724', frame: '#6c553c', metal: 0.1, rough: 0.8 },
  ][style % 4];
  const key = String(style % 4);
  let base = towerBase.get(key);
  if (!base) {
    base = facade({ cols: 8, rows: 16, wall: STY.wall, glass: STY.glass, frame: STY.frame, lit: 0.3, seed: 19 + style });
    towerBase.set(key, base);
  }
  const map = base.map.clone();
  const emissiveMap = base.emissiveMap.clone();
  for (const t of [map, emissiveMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(Math.max(1, w / 9), Math.max(1, h / 22));
    t.needsUpdate = true;
  }
  return glow(new THREE.MeshStandardMaterial({
    map, emissiveMap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0, metalness: STY.metal, roughness: STY.rough,
  }), 0.03, 1.1);
}

export const M = {
  gold: new THREE.MeshStandardMaterial({ color: '#D4AF37', metalness: 0.95, roughness: 0.25 }),
  goldGlow: glow(new THREE.MeshStandardMaterial({ color: '#D4AF37', emissive: '#E8B93A', emissiveIntensity: 0.3, metalness: 0.8, roughness: 0.3 }), 0.15, 1.3),
  bulb: glow(new THREE.MeshStandardMaterial({ color: '#fff3d0', emissive: '#ffd27a', emissiveIntensity: 0.1 }), 0.05, 4),
  neon: glow(new THREE.MeshStandardMaterial({ color: '#2a2210', emissive: '#ffcc55', emissiveIntensity: 1.2 }), 1.2, 5),
  neonPink: glow(new THREE.MeshStandardMaterial({ color: '#2a1020', emissive: '#ff4fa3', emissiveIntensity: 0.8 }), 0.8, 4),
  water: new THREE.MeshStandardMaterial({ color: '#1f5f7a', metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.92 }),
  pool: glow(new THREE.MeshStandardMaterial({ color: '#4fd1e0', emissive: '#22b8cc', emissiveIntensity: 0.2, metalness: 0.3, roughness: 0.1 }), 0.15, 1.6),
  asphalt: new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.95 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: '#8a8378', roughness: 0.9 }),
  lawn: new THREE.MeshStandardMaterial({ color: '#4d6b3a', roughness: 1 }),
  marble: new THREE.MeshStandardMaterial({ color: '#efe9dd', roughness: 0.35, metalness: 0.05 }),
  stone: new THREE.MeshStandardMaterial({ color: '#cfc6b4', roughness: 0.7 }),
  charcoal: new THREE.MeshStandardMaterial({ color: '#1d1c1b', roughness: 0.5, metalness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: '#7fa3b8', metalness: 0.9, roughness: 0.08, transparent: true, opacity: 0.55 }),
  sand: new THREE.MeshStandardMaterial({ color: '#e3cf9c', roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#3f6b3c', roughness: 0.9, flatShading: true }),
  palm: new THREE.MeshStandardMaterial({ color: '#4c8a3f', roughness: 0.9, flatShading: true, side: THREE.DoubleSide }),
  white: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 }),
  brick: new THREE.MeshStandardMaterial({ color: '#7a4434', roughness: 0.9 }),
  lot: new THREE.MeshStandardMaterial({ color: '#5b5346', roughness: 1 }),
  sign: new THREE.MeshStandardMaterial({ color: '#f5f1e8', roughness: 0.6 }),
  paint: new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.7 }),
  yellowPaint: new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.4, roughness: 0.45 }),
  tyre: new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.9 }),
  rim: new THREE.MeshStandardMaterial({ color: '#c9ccd1', metalness: 1, roughness: 0.25 }),
  tint: new THREE.MeshStandardMaterial({ color: '#0b0f14', metalness: 0.9, roughness: 0.05 }),
  chrome: new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.12 }),
  headlight: glow(new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6dc', emissiveIntensity: 0.3 }), 0.3, 6),
  taillight: glow(new THREE.MeshStandardMaterial({ color: '#5a0a0a', emissive: '#ff2a1a', emissiveIntensity: 0.4 }), 0.4, 3.5),
  aviation: new THREE.MeshStandardMaterial({ color: '#400', emissive: '#ff1a1a', emissiveIntensity: 0 }),
  hill: new THREE.MeshStandardMaterial({ color: '#6b7351', roughness: 1, flatShading: true }),
  rock: new THREE.MeshStandardMaterial({ color: '#8b7d68', roughness: 1, flatShading: true }),
  umbrella: new THREE.MeshStandardMaterial({ color: '#e94f37', roughness: 0.8, side: THREE.DoubleSide }),
  hull: new THREE.MeshStandardMaterial({ color: '#fbfbf8', roughness: 0.25, metalness: 0.1 }),
  teak: new THREE.MeshStandardMaterial({ color: '#a8743f', roughness: 0.7 }),
};
