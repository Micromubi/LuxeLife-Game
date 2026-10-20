import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls, RoundedBox, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { ACTIONS } from '../game/config';
import { money } from '../lib/format';
import { M, glow, world } from './materials';
import { Box, Cyl } from './Buildings';
import { Person, type Pose } from './Avatar';

type V3 = [number, number, number];

/** Room: x ∈ [-8, 8], z ∈ [-6, 6], floor at y = 0. The front wall is cut away so we can look in. */
const W = 8, D = 6, H = 4.2;
const SCALE = 1.25;
const HIP = 0.8 * SCALE;

type Tier = 'studio' | 'flat' | 'apartment' | 'penthouse' | 'villa' | 'island';
const TIERS: Record<Tier, {
  name: string; wall: string; floor: 'planks' | 'marble' | 'teak'; trim: string; duvet: string; sofa: string;
  window: 'small' | 'medium' | 'full'; view: 'city' | 'sea'; luxe: boolean;
}> = {
  studio: { name: 'Rented Studio', wall: '#7a4a3a', floor: 'planks', trim: '#3a2a20', duvet: '#5b6a7a', sofa: '#6b5a48', window: 'small', view: 'city', luxe: false },
  flat: { name: 'Starter Flat', wall: '#e3d6bd', floor: 'planks', trim: '#f7f3ea', duvet: '#8a9a7b', sofa: '#7d8b94', window: 'medium', view: 'city', luxe: false },
  apartment: { name: 'City Apartment', wall: '#d6d0c4', floor: 'teak', trim: '#ffffff', duvet: '#2f4a6b', sofa: '#3d4650', window: 'medium', view: 'city', luxe: false },
  penthouse: { name: 'Penthouse', wall: '#1d1c1f', floor: 'marble', trim: '#D4AF37', duvet: '#efe6d2', sofa: '#1a1a1c', window: 'full', view: 'city', luxe: true },
  villa: { name: 'Hillside Villa', wall: '#f4f1ea', floor: 'teak', trim: '#c9a24a', duvet: '#f7f3ea', sofa: '#e9e1d0', window: 'full', view: 'sea', luxe: true },
  island: { name: 'Island Villa', wall: '#f4f1ea', floor: 'teak', trim: '#c9a24a', duvet: '#f7f3ea', sofa: '#e9e1d0', window: 'full', view: 'sea', luxe: true },
};

export function homeTier(itemIds: Set<string>): Tier {
  if (itemIds.has('island')) return 'island';
  return (['villa', 'penthouse', 'apartment', 'flat'] as const).find((t) => itemIds.has(t)) ?? 'studio';
}

/** Interactive spots: where you stand to start, and where your body goes while doing it. */
interface Spot {
  key: string; icon: string; label: string; actions: string[];
  label3d: V3; stand: [number, number]; standYaw: number;
  pose: Pose; body: V3; bodyRot: V3;
}
function spotsFor(t: Tier): Spot[] {
  const bedW = t === 'studio' ? 1.7 : 2.6;
  const s: Spot[] = [
    { key: 'bed', icon: '🛏️', label: 'Bed', actions: ['sleep', 'nap'], label3d: [-5, 2.4, -3], stand: [-5 + bedW / 2 + 0.7, -2], standYaw: -Math.PI / 2,
      pose: 'lie', body: [-5, 0.8, -1.55], bodyRot: [-Math.PI / 2, 0, 0] },
    { key: 'kitchen', icon: '🍳', label: 'Kitchen', actions: ['cook'], label3d: [2.6, 2.9, -5.2], stand: [3, -4.25], standYaw: Math.PI,
      pose: 'cook', body: [3, 0, -4.25], bodyRot: [0, Math.PI, 0] },
    { key: 'shower', icon: '🚿', label: 'Shower', actions: ['shower'], label3d: [6.5, 3.2, -4.5], stand: [6.5, -2.6], standYaw: Math.PI,
      pose: 'stand', body: [6.5, 0.12, -4.5], bodyRot: [0, 0, 0] },
    { key: 'sofa', icon: '🛋️', label: 'Sofa & TV', actions: ['relax'], label3d: [4.2, 2.3, 2.6], stand: [5.6, 1], standYaw: 0,
      pose: 'sit', body: [4.15, 0.62 - HIP, 2.6], bodyRot: [0, Math.PI / 2, 0] },
    { key: 'desk', icon: '📞', label: 'Desk & phone', actions: ['call'], label3d: [-7, 2.4, 3.6], stand: [-5, 3.6], standYaw: -Math.PI / 2,
      pose: 'phone', body: [-6.1, 0.55 - HIP, 3.6], bodyRot: [0, -Math.PI / 2, 0] },
  ];
  if (TIERS[t].luxe) s.push({ key: 'tub', icon: '♨️', label: 'Hot tub', actions: ['relax'], label3d: [-1.5, 2, 2.8], stand: [-1.5, 1], standYaw: Math.PI,
    pose: 'sit', body: [-1.5, 0.15 - HIP, 2.8], bodyRot: [0, 0, 0] });
  return s;
}
const DOOR: [number, number] = [-7.2, 0.6];

// ───────────────────────── textures ─────────────────────────

function floorTex(kind: 'planks' | 'marble' | 'teak') {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d')!;
  let s = 7;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (kind === 'marble') {
    x.fillStyle = '#efe9dd';
    x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++) {
      x.strokeStyle = `rgba(120,110,95,${0.08 + r() * 0.18})`;
      x.lineWidth = 0.5 + r() * 2;
      x.beginPath();
      let px = r() * 512, py = r() * 512;
      x.moveTo(px, py);
      for (let k = 0; k < 8; k++) { px += (r() - 0.3) * 90; py += (r() - 0.5) * 90; x.lineTo(px, py); }
      x.stroke();
    }
    x.strokeStyle = 'rgba(160,150,130,0.35)';
    x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 512); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(512, i * 128); x.stroke(); }
  } else {
    const base = kind === 'teak' ? [168, 116, 63] : [120, 82, 52];
    for (let row = 0; row < 8; row++) {
      let xx = -r() * 200;
      while (xx < 512) {
        const len = 140 + r() * 160;
        const v = (r() - 0.5) * 30;
        x.fillStyle = `rgb(${base[0] + v},${base[1] + v * 0.8},${base[2] + v * 0.6})`;
        x.fillRect(xx, row * 64, len, 64);
        x.fillStyle = 'rgba(0,0,0,0.25)';
        x.fillRect(xx, row * 64, 2, 64);
        for (let g = 0; g < 6; g++) { x.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`; x.fillRect(xx, row * 64 + r() * 64, len, 1); }
        xx += len;
      }
      x.fillStyle = 'rgba(0,0,0,0.3)';
      x.fillRect(0, row * 64, 512, 2);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(kind === 'marble' ? 4 : 3, kind === 'marble' ? 3 : 2.3);
  t.anisotropy = 8;
  return t;
}

/** What you see through the window: a skyline (lit windows at night) or the sea with palms. */
function viewTex(view: 'city' | 'sea') {
  const mk = () => { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; return c; };
  const base = mk(), lit = mk();
  const b = base.getContext('2d')!, l = lit.getContext('2d')!;
  let s = 3;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  l.fillStyle = '#000';
  l.fillRect(0, 0, 1024, 512);
  if (view === 'city') {
    for (let i = 0; i < 26; i++) {
      const w = 40 + r() * 70, h = 120 + r() * 300, x0 = i * 40 - 20 + r() * 20;
      b.fillStyle = `rgb(${30 + r() * 30},${36 + r() * 30},${48 + r() * 30})`;
      b.fillRect(x0, 512 - h, w, h);
      for (let yy = 512 - h + 10; yy < 500; yy += 16)
        for (let xx = x0 + 6; xx < x0 + w - 8; xx += 12)
          if (r() < 0.45) { l.fillStyle = r() < 0.8 ? '#ffd58a' : '#bfe0ff'; l.fillRect(xx, yy, 6, 9); }
    }
  } else {
    b.fillStyle = '#1f6f8f';
    b.fillRect(0, 300, 1024, 212);
    b.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 40; i++) b.fillRect(r() * 1024, 310 + r() * 190, 30 + r() * 60, 2);
    b.fillStyle = '#2c2418';
    for (const px of [120, 860]) {
      b.fillRect(px, 140, 10, 372);
      for (let k = 0; k < 7; k++) {
        b.save(); b.translate(px + 5, 140); b.rotate((k / 7) * Math.PI * 2);
        b.beginPath(); b.ellipse(50, 0, 55, 9, 0, 0, Math.PI * 2); b.fill(); b.restore();
      }
    }
    l.fillStyle = '#ffd58a';
    for (let i = 0; i < 6; i++) l.fillRect(300 + r() * 400, 296, 4, 3);
  }
  const map = new THREE.CanvasTexture(base);
  const emissiveMap = new THREE.CanvasTexture(lit);
  map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
  return { map, emissiveMap };
}

const SKY_DAY = new THREE.Color('#a9c9e6'), SKY_DUSK = new THREE.Color('#e7a06a'), SKY_NIGHT = new THREE.Color('#0b1224');

// ───────────────────────── scene ─────────────────────────

export default function Interior() {
  const assets = useGame((s) => s.game!.assets);
  const owned = useMemo(() => new Set(assets.map((a) => a.itemId)), [assets]);
  const tier = homeTier(owned);
  const T = TIERS[tier];
  const task = useGame((s) => s.homeTask);
  const spots = useMemo(() => spotsFor(tier), [tier]);
  const lights = useRef<THREE.PointLight[]>([]);
  const sky = useMemo(() => new THREE.MeshBasicMaterial({ color: SKY_DAY.clone(), toneMapped: false }), []);
  const view = useMemo(() => {
    const { map, emissiveMap } = viewTex(T.view);
    return glow(new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: '#ffffff', transparent: true, roughness: 1 }), 0, 1.4);
  }, [T.view]);

  const mats = useMemo(() => ({
    wall: new THREE.MeshStandardMaterial({ color: T.wall, roughness: 0.9 }),
    floor: new THREE.MeshStandardMaterial({ map: floorTex(T.floor), roughness: T.floor === 'marble' ? 0.45 : 0.65, metalness: T.floor === 'marble' ? 0.1 : 0 }),
    trim: new THREE.MeshStandardMaterial({ color: T.trim, roughness: 0.4, metalness: T.luxe ? 0.8 : 0 }),
    duvet: new THREE.MeshStandardMaterial({ color: T.duvet, roughness: 0.95 }),
    sofa: new THREE.MeshStandardMaterial({ color: T.sofa, roughness: 0.85 }),
    linen: new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.9 }),
    wood: new THREE.MeshStandardMaterial({ color: T.luxe ? '#3a2a1c' : '#7a5a3c', roughness: 0.6 }),
    counter: T.luxe ? M.marble : new THREE.MeshStandardMaterial({ color: '#b9b2a4', roughness: 0.5 }),
    cabinet: new THREE.MeshStandardMaterial({ color: T.luxe ? '#1c1c1f' : '#e9e4d8', roughness: 0.5 }),
    rug: new THREE.MeshStandardMaterial({ color: T.luxe ? '#8a7350' : '#7a4f45', roughness: 1 }),
    screen: glow(new THREE.MeshStandardMaterial({ color: '#05070a', emissive: '#6fa8ff', emissiveIntensity: 0 }), 0, 0),
    stove: glow(new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ff4a1a', emissiveIntensity: 0 }), 0, 0),
    water: new THREE.MeshStandardMaterial({ color: '#3fb6cc', emissive: '#1a8fa6', emissiveIntensity: 0.25, roughness: 0.1, metalness: 0.2 }),
  }), [T]);

  useFrame(({ clock }) => {
    const n = world.night;
    const h = world.time;
    const dusk = Math.max(0, 1 - Math.abs(((h - 6 + 24) % 24) - 12.5) / 2.2) * (1 - n);
    sky.color.copy(SKY_DAY).lerp(SKY_DUSK, Math.min(1, dusk)).lerp(SKY_NIGHT, n);
    const sleeping = task?.phase === 'doing' && (task.id === 'sleep' || task.id === 'nap');
    // Lamps switch on as daylight fades; dimmed while you sleep.
    lights.current.forEach((l) => { if (l) l.intensity = sleeping ? 0.4 : 0.6 + n * 22; });
    const watching = task?.phase === 'doing' && task.id === 'relax';
    mats.screen.emissiveIntensity = watching ? 1.2 + Math.sin(clock.elapsedTime * 9) * 0.4 : 0.05;
    mats.stove.emissiveIntensity = task?.phase === 'doing' && task.id === 'cook' ? 1.5 : 0;
  });

  const bedW = tier === 'studio' ? 1.7 : 2.6;
  const doing = task?.phase === 'doing' ? task.id : null;

  return (
    <group>
      <InteriorCamera />
      {/* floor & walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mats.floor}><planeGeometry args={[W * 2, D * 2]} /></mesh>
      <Box size={[W * 2 + 0.4, 0.3, D * 2 + 0.4]} position={[0, -0.16, 0]} material={mats.trim} cast={false} />
      <Box size={[0.2, H, D * 2]} position={[-W - 0.1, H / 2, 0]} material={mats.wall} cast={false} />
      <Box size={[0.2, H, D * 2]} position={[W + 0.1, H / 2, 0]} material={mats.wall} cast={false} />
      {T.window === 'full' ? (
        <group>
          {/* floor-to-ceiling glass with gold mullions */}
          <mesh position={[0, H / 2, -D - 1.5]} material={sky}><planeGeometry args={[W * 2 + 8, H + 6]} /></mesh>
          <mesh position={[0, 1.6, -D - 1.4]} material={view}><planeGeometry args={[W * 2 + 6, (W * 2 + 6) / 2]} /></mesh>
          <Box size={[W * 2, 0.15, 0.2]} position={[0, H, -D - 0.1]} material={mats.trim} cast={false} />
          {Array.from({ length: 7 }, (_, i) => -W + (i * W * 2) / 6).map((x) => <Box key={x} size={[0.08, H, 0.12]} position={[x, H / 2, -D - 0.1]} material={mats.trim} cast={false} />)}
          <Box size={[W * 2, H, 0.04]} position={[0, H / 2, -D - 0.12]} material={M.glass} cast={false} />
        </group>
      ) : (
        <group>
          <Box size={[W * 2 + 0.4, H, 0.2]} position={[0, H / 2, -D - 0.1]} material={mats.wall} cast={false} />
          <WindowOpening x={-1.6} w={T.window === 'small' ? 2 : 3} h={T.window === 'small' ? 1.4 : 2} sky={sky} view={view} trim={mats.trim} />
        </group>
      )}
      <Box size={[0.08, 0.25, D * 2]} position={[-W + 0.04, 0.12, 0]} material={mats.trim} cast={false} />
      <Box size={[0.08, 0.25, D * 2]} position={[W - 0.04, 0.12, 0]} material={mats.trim} cast={false} />
      {/* front door (left wall) */}
      <DoorMesh trim={mats.trim} wood={mats.wood} />

      {/* ceiling lights */}
      {[[-4.5, -1.5], [2.5, -2.5], [2, 2.5]].map(([x, z], i) => (
        <group key={i} position={[x, H - 0.2, z]}>
          <Cyl r={0.01} h={0.6} position={[0, 0.3, 0]} material={M.charcoal} seg={4} />
          <mesh material={T.luxe ? M.goldGlow : M.bulb}><sphereGeometry args={[0.18, 12, 8]} /></mesh>
          <pointLight ref={(l) => { if (l) lights.current[i] = l; }} color="#ffd9a0" intensity={3} distance={14} decay={1.6} />
        </group>
      ))}

      {/* bedroom */}
      <group position={[-5, 0, -3]}>
        <Box size={[bedW + 0.2, 0.45, 3.6]} position={[0, 0.25, 0.1]} material={mats.wood} />
        <RoundedBox args={[bedW, 0.35, 3.3]} radius={0.12} position={[0, 0.62, 0.1]} material={mats.linen} />
        <RoundedBox args={[bedW + 0.05, 0.12, 2.3]} radius={0.05} position={[0, 0.82, 0.6]} material={mats.duvet} />
        {(tier === 'studio' ? [0] : [-0.6, 0.6]).map((x) => <RoundedBox key={x} args={[0.9, 0.22, 0.55]} radius={0.1} position={[x, 0.88, -1.15]} material={mats.linen} />)}
        <Box size={[bedW + 0.3, 1.6, 0.18]} position={[0, 1, -1.75]} material={T.luxe ? mats.trim : mats.wood} />
        <Box size={[0.8, 0.7, 0.7]} position={[bedW / 2 + 0.7, 0.35, -1.3]} material={mats.wood} />
        <Cyl r={0.12} rTop={0.2} h={0.4} position={[bedW / 2 + 0.7, 0.95, -1.3]} material={M.bulb} />
        {tier !== 'studio' && <Box size={[3.4, 0.02, 4.2]} position={[0, 0.011, 0.4]} material={mats.rug} cast={false} />}
        {doing === 'sleep' || doing === 'nap' ? <Zzz /> : null}
      </group>

      {/* kitchen */}
      <group>
        <Box size={[4, 1, 1.1]} position={[2.6, 0.5, -D + 0.6]} material={mats.cabinet} />
        <Box size={[4.1, 0.08, 1.2]} position={[2.6, 1.04, -D + 0.6]} material={mats.counter} />
        {T.window !== 'full' && <Box size={[3, 0.9, 0.6]} position={[3.1, 2.6, -D + 0.35]} material={mats.cabinet} />}
        <Box size={[0.9, 2.3, 0.9]} position={[0.15, 1.15, -D + 0.55]} material={T.luxe ? M.chrome : M.white} />
        <Box size={[1.1, 0.03, 0.8]} position={[3, 1.09, -D + 0.6]} material={mats.stove} cast={false} />
        <Cyl r={0.26} h={0.12} position={[3, 1.18, -D + 0.55]} material={M.charcoal} />
        {doing === 'cook' && <Sparkles position={[3, 1.8, -D + 0.55]} count={18} scale={[0.6, 1.2, 0.6]} size={6} speed={0.6} color="#ffffff" opacity={0.6} />}
      </group>
      {owned.has('chef') && <Chef />}

      {/* bathroom */}
      <group position={[6.5, 0, -4.5]}>
        <Box size={[2.2, 0.12, 2.2]} position={[0, 0.06, 0]} material={M.marble} cast={false} />
        <Box size={[0.05, 2.6, 2.2]} position={[-1.1, 1.4, 0]} material={M.glass} cast={false} />
        <Box size={[2.2, 2.6, 0.05]} position={[0, 1.4, 1.1]} material={M.glass} cast={false} />
        <Cyl r={0.03} h={1.2} position={[0.6, 2.6, -0.95]} material={M.chrome} seg={6} />
        <Cyl r={0.18} rTop={0.12} h={0.06} position={[0.6, 3.2, -0.75]} material={M.chrome} seg={14} />
        {doing === 'shower' && <Sparkles position={[0, 1.6, 0]} count={60} scale={[1.6, 2.6, 1.6]} size={5} speed={2} color="#cfefff" />}
      </group>

      {/* living */}
      <group position={[4.2, 0, 2.6]}>
        <Box size={[3.2, 0.02, 3.6]} position={[1, 0.011, 0]} material={mats.rug} cast={false} />
        <RoundedBox args={[1.1, 0.5, 3]} radius={0.12} position={[0, 0.35, 0]} material={mats.sofa} />
        <RoundedBox args={[0.35, 0.9, 3]} radius={0.12} position={[-0.5, 0.75, 0]} material={mats.sofa} />
        {[-1.55, 1.55].map((z) => <RoundedBox key={z} args={[1.1, 0.7, 0.3]} radius={0.1} position={[0, 0.5, z]} material={mats.sofa} />)}
        <Box size={[0.9, 0.4, 1.4]} position={[1.9, 0.2, 0]} material={T.luxe ? M.marble : mats.wood} />
        <Box size={[0.5, 0.6, 2.6]} position={[3.45, 0.3, 0]} material={mats.wood} />
        <Box size={[0.08, 1.2, 2.2]} position={[3.75, 1.5, 0]} material={mats.screen} />
      </group>

      {/* study corner */}
      <group position={[-7.2, 0, 3.6]}>
        <Box size={[1.1, 0.08, 2]} position={[0, 1, 0]} material={mats.wood} />
        {[[-0.45, -0.9], [-0.45, 0.9], [0.45, -0.9], [0.45, 0.9]].map(([x, z]) => <Box key={`${x}${z}`} size={[0.06, 1, 0.06]} position={[x, 0.5, z]} material={mats.wood} />)}
        <Box size={[0.5, 0.03, 0.35]} position={[-0.1, 1.06, 0.4]} material={M.charcoal} />
        <Box size={[0.08, 0.02, 0.16]} position={[0.2, 1.05, -0.5]} material={M.tint} />
        <Box size={[0.6, 0.08, 0.6]} position={[1.1, 0.55, 0]} material={mats.sofa} />
        <Box size={[0.08, 0.7, 0.6]} position={[1.4, 0.9, 0]} material={mats.sofa} />
      </group>

      {/* luxe extras: hot tub, plants, art */}
      {T.luxe && (
        <group position={[-1.5, 0, 2.8]}>
          <mesh position={[0, 0.35, 0]} material={M.marble} castShadow receiveShadow><cylinderGeometry args={[1.6, 1.6, 0.7, 32, 1, true]} /></mesh>
          <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} material={M.marble}><ringGeometry args={[1.38, 1.6, 32]} /></mesh>
          <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.water}><circleGeometry args={[1.4, 32]} /></mesh>
          {doing === 'relax' && <Sparkles position={[0, 0.9, 0]} count={30} scale={[2.4, 0.6, 2.4]} size={4} speed={1} color="#ffffff" opacity={0.5} />}
        </group>
      )}
      {tier !== 'studio' && <Plant position={[W - 0.7, 0, -1]} />}
      {tier !== 'studio' && <Plant position={[-W + 0.7, 0, -0.9]} />}
      {(tier === 'apartment' || T.luxe) && <Art position={[W - 0.12, 2.5, -1.8]} rotY={-Math.PI / 2} hue={T.luxe ? '#c9a24a' : '#2f6f8f'} />}
      {(tier === 'apartment' || T.luxe) && <Art position={[-W + 0.12, 2.6, -3]} rotY={Math.PI / 2} hue={T.luxe ? '#7a1020' : '#b8653a'} />}

      <InteriorAvatar spots={spots} />
      {!task && <SpotLabels spots={spots} />}
      <Html position={[0, H + 0.6, -D]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="lux-pill whitespace-nowrap px-3 py-0.5 font-serif text-[13px] font-bold text-gold-light">{T.name}</div>
      </Html>
    </group>
  );
}

function WindowOpening({ x, w, h, sky, view, trim }: { x: number; w: number; h: number; sky: THREE.Material; view: THREE.Material; trim: THREE.Material }) {
  const y = 2.3;
  return (
    <group position={[x, y, -D + 0.01]}>
      <mesh position={[0, 0, 0.005]} material={sky}><planeGeometry args={[w, h]} /></mesh>
      <mesh position={[0, -h * 0.12, 0.01]} material={view}><planeGeometry args={[w, w / 2]} /></mesh>
      <Box size={[w, h, 0.03]} position={[0, 0, 0.04]} material={M.glass} cast={false} />
      <Box size={[w + 0.2, 0.12, 0.15]} position={[0, h / 2, 0.06]} material={trim} cast={false} />
      <Box size={[w + 0.3, 0.12, 0.3]} position={[0, -h / 2, 0.12]} material={trim} cast={false} />
      <Box size={[0.1, h, 0.15]} position={[-w / 2, 0, 0.06]} material={trim} cast={false} />
      <Box size={[0.1, h, 0.15]} position={[w / 2, 0, 0.06]} material={trim} cast={false} />
      <Box size={[0.06, h, 0.1]} position={[0, 0, 0.06]} material={trim} cast={false} />
    </group>
  );
}

function DoorMesh({ trim, wood }: { trim: THREE.Material; wood: THREE.Material }) {
  const exitHome = useGame((s) => s.exitHome);
  const busy = useGame((s) => !!s.homeTask);
  return (
    <group position={[-W + 0.02, 0, DOOR[1]]}>
      <Box size={[0.1, 2.7, 1.5]} position={[0, 1.35, 0]} material={wood} />
      <Box size={[0.14, 2.85, 0.1]} position={[0, 1.42, -0.8]} material={trim} cast={false} />
      <Box size={[0.14, 2.85, 0.1]} position={[0, 1.42, 0.8]} material={trim} cast={false} />
      <Box size={[0.14, 0.1, 1.7]} position={[0, 2.85, 0]} material={trim} cast={false} />
      <mesh position={[0.1, 1.3, 0.5]} material={M.gold}><sphereGeometry args={[0.06, 8, 6]} /></mesh>
      {!busy && (
        <Html position={[0.6, 3.3, 0]} center zIndexRange={[10, 0]}>
          <button onClick={exitHome} className="lux-pill flex items-center gap-1.5 whitespace-nowrap py-0.5 pl-1 pr-3 transition hover:scale-110">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-[12px]">🚪</span>
            <span className="font-serif text-[13px] font-bold text-cream">Go out</span>
          </button>
        </Html>
      )}
    </group>
  );
}

function Plant({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Cyl r={0.3} rTop={0.38} h={0.6} position={[0, 0.3, 0]} material={M.charcoal} seg={12} />
      <mesh position={[0, 1.1, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.55, 1]} /></mesh>
      <mesh position={[0.2, 1.55, 0.1]} material={M.leaf}><icosahedronGeometry args={[0.35, 1]} /></mesh>
    </group>
  );
}

function Art({ position, rotY, hue }: { position: V3; rotY: number; hue: string }) {
  const mat = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 192;
    const x = c.getContext('2d')!;
    x.fillStyle = '#f2ede2';
    x.fillRect(0, 0, 256, 192);
    x.fillStyle = hue;
    x.beginPath(); x.arc(100, 96, 58, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#1d1c1f';
    x.fillRect(150, 30, 60, 130);
    x.strokeStyle = '#c9a24a';
    x.lineWidth = 4;
    x.beginPath(); x.moveTo(20, 170); x.lineTo(236, 40); x.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
  }, [hue]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <Box size={[2.1, 1.6, 0.06]} position={[0, 0, 0]} material={M.gold} cast={false} />
      <mesh position={[0, 0, 0.035]} material={mat}><planeGeometry args={[1.9, 1.4]} /></mesh>
    </group>
  );
}

function Zzz() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.position.y = 1.9 + ((clock.elapsedTime * 0.5) % 1) * 0.8;
  });
  return (
    <group ref={ref} position={[0.4, 1.9, -1]}>
      <Html center style={{ pointerEvents: 'none' }}><div className="lux-shadow font-serif text-2xl italic text-gold-light">z z z</div></Html>
    </group>
  );
}

/** Your private chef, busy at the stove. */
function Chef() {
  const moving = useRef(false);
  const pose = useRef<Pose>('cook');
  return (
    <group position={[1.6, 0, -D + 1.6]} rotation={[0, Math.PI, 0]} scale={SCALE}>
      <Person moving={moving} pose={pose} outfitOverride={{ top: '#f7f7f5', legs: '#2b2b33', accent: '#f7f7f5', shades: false }} />
      <Cyl r={0.15} rTop={0.19} h={0.28} position={[0, 2.02, 0]} material={M.white} seg={12} />
    </group>
  );
}

// ───────────────────────── camera ─────────────────────────

function InteriorCamera() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 10.5, 15);
    camera.lookAt(0, 1, -0.5);
  }, [camera]);
  return (
    <OrbitControls
      makeDefault
      target={[0, 1, -0.5]}
      enableDamping
      enablePan={false}
      minDistance={8}
      maxDistance={24}
      minPolarAngle={0.35}
      maxPolarAngle={1.25}
      minAzimuthAngle={-1}
      maxAzimuthAngle={1}
    />
  );
}

// ───────────────────────── you, indoors ─────────────────────────

function InteriorAvatar({ spots }: { spots: Spot[] }) {
  const task = useGame((s) => s.homeTask);
  const setPhase = useGame((s) => s.setHomeTaskPhase);
  const name = useGame((s) => s.game!.name);
  const group = useRef<THREE.Group>(null);
  const moving = useRef(false);
  const pose = useRef<Pose>('stand');
  const target = useRef<[number, number] | null>(null);
  const placed = useRef<Spot | null>(null);
  const spot = useMemo(() => (task ? spots.find((s) => s.actions.includes(task.id)) ?? null : null), [task, spots]);

  // Walk in through the front door.
  useEffect(() => {
    group.current?.position.set(DOOR[0] - 0.5, 0, DOOR[1]);
    target.current = [DOOR[0] + 1.6, DOOR[1]];
  }, []);

  // A new task: head for its spot (or the hot tub for "relax" in luxe homes? the first matching spot).
  useEffect(() => {
    if (task?.phase === 'walk' && spot) target.current = spot.stand;
    if (!task && placed.current) {
      // Done: get up and stand beside where you were.
      const s = placed.current;
      placed.current = null;
      pose.current = 'stand';
      group.current?.rotation.set(0, s.standYaw, 0);
      group.current?.position.set(s.stand[0], 0, s.stand[1]);
    }
  }, [task, spot]);

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const tgt = target.current;
    moving.current = false;
    if (tgt) {
      const dx = tgt[0] - g.position.x, dz = tgt[1] - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.05) {
        target.current = null;
        if (task?.phase === 'walk' && spot) {
          // Arrived: take up the pose for the activity.
          placed.current = spot;
          pose.current = spot.pose;
          g.position.set(...spot.body);
          g.rotation.set(...spot.bodyRot);
          setPhase('doing');
        }
      } else {
        const step = Math.min(dist, 5 * Math.min(dt, 0.1));
        g.position.x += (dx / dist) * step;
        g.position.z += (dz / dist) * step;
        const want = Math.atan2(dx, dz);
        let diff = want - g.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        g.rotation.y += diff * Math.min(1, dt * 12);
        moving.current = true;
      }
    }
  });

  return (
    <group ref={group}>
      <group scale={SCALE}>
        <Person moving={moving} pose={pose} />
      </group>
      {!task && (
        <Html position={[0, 2.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="lux-pill whitespace-nowrap px-3 py-0.5 font-serif text-[13px] font-bold text-cream">{name}</div>
        </Html>
      )}
    </group>
  );
}

// ───────────────────────── clickable spots ─────────────────────────

function SpotLabels({ spots }: { spots: Spot[] }) {
  const g = useGame((s) => s.game)!;
  const start = useGame((s) => s.startHomeTask);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      {spots.map((s) => (
        <Html key={s.key} position={s.label3d} center zIndexRange={[10, 0]}>
          <div className="flex flex-col items-center">
            <button
              onClick={() => (s.actions.length === 1 && open !== s.key ? start(s.actions[0]) : setOpen(open === s.key ? null : s.key))}
              onMouseEnter={() => setOpen(s.actions.length > 1 ? s.key : open)}
              className={`lux-pill flex items-center gap-1.5 whitespace-nowrap py-0.5 pl-1 pr-3 transition hover:scale-110 ${open === s.key ? '!border-gold' : ''}`}
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-[12px]">{s.icon}</span>
              <span className="font-serif text-[13px] font-bold text-cream">{s.label}</span>
            </button>
            {(open === s.key || s.actions.length === 1) && (
              <div className={`mt-1 flex flex-col gap-1 ${s.actions.length === 1 && open !== s.key ? 'hidden' : ''}`}>
                {s.actions.map((id) => {
                  const a = ACTIONS.find((x) => x.id === id)!;
                  const can = E.canDoAction(g, id);
                  const cost = E.actionCost(g, a);
                  return (
                    <button key={id} disabled={!can.ok} onClick={() => { setOpen(null); start(id); }}
                      className="lux-card px-3 py-1.5 text-left text-xs transition hover:!border-gold disabled:cursor-not-allowed disabled:opacity-50">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-cream">{a.label}</span>
                        <span className="text-cream-dim">{a.hours}h{cost ? ` · ${money(cost)}` : ''}</span>
                      </div>
                      {!can.ok && <div className="text-[10px] text-[#e58b86]">{can.reason}</div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Html>
      ))}
    </>
  );
}
