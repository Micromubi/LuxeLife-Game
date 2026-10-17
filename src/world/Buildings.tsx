import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { M, facadeMat, stripes, world } from './materials';

type V3 = [number, number, number];

/** Box with a facade on the sides and a plain roof. */
export function Block({ size, position, side, roof = M.charcoal, cast = true }: {
  size: V3; position: V3; side: THREE.Material; roof?: THREE.Material; cast?: boolean;
}) {
  const mats = useMemo(() => [side, side, roof, roof, side, side], [side, roof]);
  return (
    <mesh position={position} material={mats} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function Box({ size, position, material, rotation, cast = true }: { size: V3; position: V3; material: THREE.Material; rotation?: V3; cast?: boolean }) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

export function Cyl({ r, h, position, material, seg = 16, rTop }: { r: number; h: number; position: V3; material: THREE.Material; seg?: number; rTop?: number }) {
  return (
    <mesh position={position} material={material} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
    </mesh>
  );
}

export function Tree({ position, s = 1 }: { position: V3; s?: number }) {
  return (
    <group position={position} scale={s * 1.3}>
      <Cyl r={0.12} rTop={0.08} h={1.3} position={[0, 0.65, 0]} material={M.trunk} seg={6} />
      <mesh position={[0, 1.8, 0]} material={M.leaf} castShadow><icosahedronGeometry args={[0.85, 1]} /></mesh>
      <mesh position={[0.35, 2.35, 0.1]} material={M.leaf} castShadow><icosahedronGeometry args={[0.55, 1]} /></mesh>
      <mesh position={[-0.3, 2.2, -0.2]} material={M.leaf} castShadow><icosahedronGeometry args={[0.5, 1]} /></mesh>
    </group>
  );
}

/** A drooping palm frond, built once: tapers to a tip and arcs up then down. */
const frondGeo = (() => {
  const L = 2.3;
  const g = new THREE.PlaneGeometry(0.62, L, 2, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) + L / 2) / L;
    const x = p.getX(i) * (1 - t * 0.85) * Math.sin(Math.min(1, t * 6) * Math.PI / 2 + 0.3);
    p.setXYZ(i, x, t * 0.55 - t * t * 1.35 + Math.abs(x) * 0.35, t * L);
  }
  g.computeVertexNormals();
  return g;
})();
const trunkGeo = new THREE.CylinderGeometry(0.09, 0.15, 4.2, 7, 6).translate(0, 2.1, 0);

export function Palm({ position, s = 1, lean = 0.15 }: { position: V3; s?: number; lean?: number }) {
  return (
    <group position={position} scale={s} rotation={[lean, 0, lean * 0.5]}>
      <mesh geometry={trunkGeo} material={M.trunk} castShadow />
      <group position={[0, 4.15, 0]}>
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} geometry={frondGeo} rotation={[0.15 * (i % 2), (i * Math.PI * 2) / 9, 0]} material={M.palm} castShadow />
        ))}
        <mesh material={M.trunk}><sphereGeometry args={[0.18, 8, 6]} /></mesh>
      </group>
    </group>
  );
}

/** Blinking red warning light for tall buildings (blink driven by <DayNight/>). */
export function AviationLight({ position }: { position: V3 }) {
  return <mesh position={position} material={M.aviation}><sphereGeometry args={[0.22, 8, 6]} /></mesh>;
}

function Awning({ width, position, a = '#7a1f24', b = '#F5F1E8' }: { width: number; position: V3; a?: string; b?: string }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: stripes(a, b, 12), roughness: 0.8, side: THREE.DoubleSide }), [a, b]);
  return (
    <mesh position={position} rotation={[-0.45, 0, 0]} material={mat} castShadow>
      <planeGeometry args={[width, 1.4]} />
    </mesh>
  );
}

// ───────────────────────── civic buildings ─────────────────────────

export function Bank() {
  const side = facadeMat('bank', { cols: 6, rows: 3, wall: '#d9d0bd', glass: '#3b3a36', lit: 0.35, frame: '#bfb39b', rough: 0.7, metal: 0 });
  return (
    <group>
      <Box size={[10, 0.6, 8]} position={[0, 0.3, 0]} material={M.stone} />
      <Box size={[9.4, 0.3, 7.4]} position={[0, 0.75, 0]} material={M.stone} />
      <Block size={[8, 4.2, 5]} position={[0, 3, -0.8]} side={side} roof={M.stone} />
      {[-3.3, -2, -0.65, 0.65, 2, 3.3].map((x) => <Cyl key={x} r={0.28} h={4} position={[x, 2.9, 2.6]} material={M.marble} seg={12} />)}
      <Box size={[8.6, 0.5, 1.6]} position={[0, 5.15, 2.1]} material={M.stone} />
      <mesh position={[0, 5.9, 2.1]} rotation={[0, 0, 0]} scale={[4.6, 1, 0.8]} material={M.marble} castShadow>
        <cylinderGeometry args={[1, 1, 2, 3, 1]} />
      </mesh>
      <Box size={[2.4, 0.3, 0.05]} position={[0, 4.65, 2.95]} material={M.goldGlow} />
      <Box size={[1.6, 2.6, 0.1]} position={[0, 2.2, 1.71]} material={M.gold} />
    </group>
  );
}

export function Office() {
  const side = facadeMat('office', { cols: 7, rows: 26, wall: '#1d2a33', glass: '#4f6f82', lit: 0.5, frame: '#2b3a44', metal: 0.7, rough: 0.25 });
  return (
    <group>
      <Box size={[8, 0.4, 8]} position={[0, 0.2, 0]} material={M.marble} />
      <Block size={[7, 24, 7]} position={[0, 12.4, -0.4]} side={side} />
      <Block size={[5.4, 4, 5.4]} position={[0, 26.4, -0.4]} side={side} />
      <Box size={[5.8, 0.4, 5.8]} position={[0, 24.6, -0.4]} material={M.goldGlow} />
      <Box size={[4.2, 0.3, 4.2]} position={[0, 28.55, -0.4]} material={M.gold} />
      <mesh position={[0, 31, -0.4]} material={M.goldGlow} castShadow>
        <coneGeometry args={[0.5, 4.6, 4]} />
      </mesh>
      <AviationLight position={[0, 33.4, -0.4]} />
      {[[-2.5, -2.9], [2.5, -2.9], [-2.5, 2.1], [2.5, 2.1]].map(([x, z]) => <AviationLight key={`${x}${z}`} position={[x, 24.9, z]} />)}
      <Box size={[4.5, 0.25, 2]} position={[0, 3.2, 3.9]} material={M.gold} />
      <Box size={[3, 2.8, 0.1]} position={[0, 1.8, 3.12]} material={M.glass} />
    </group>
  );
}

export function Restaurant() {
  const side = facadeMat('resto', { cols: 6, rows: 2, wall: '#efe6d2', glass: '#3a2f25', lit: 0.9, frame: '#c9b48a', metal: 0, rough: 0.8 });
  return (
    <group>
      <Block size={[9, 5, 6]} position={[0, 2.5, -1.5]} side={side} roof={M.stone} />
      <Box size={[9.4, 0.4, 6.4]} position={[0, 5.2, -1.5]} material={M.stone} />
      <Awning width={8.6} position={[0, 3.1, 2]} />
      {[-3, -1, 1, 3].map((x) => (
        <group key={x} position={[x, 0, 4]}>
          <Cyl r={0.45} h={0.08} position={[0, 0.75, 0]} material={M.marble} />
          <Cyl r={0.05} h={0.75} position={[0, 0.37, 0]} material={M.gold} seg={6} />
          <Cyl r={0.04} h={2} position={[0, 1, 0]} material={M.charcoal} seg={6} />
          <mesh position={[0, 2.05, 0]} material={M.white} castShadow>
            <coneGeometry args={[0.9, 0.5, 8]} />
          </mesh>
        </group>
      ))}
      <Box size={[3.4, 0.5, 0.08]} position={[0, 4.3, 1.55]} material={M.neon} />
    </group>
  );
}

export function Spa() {
  const dome = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfe8e6', metalness: 0.4, roughness: 0.05, transparent: true, opacity: 0.45 }), []);
  return (
    <group>
      <Cyl r={4} h={3} position={[0, 1.5, -1]} material={M.white} seg={32} />
      <mesh position={[0, 3, -1]} material={dome} castShadow>
        <sphereGeometry args={[3.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Box size={[8.8, 0.25, 0.25]} position={[0, 3.05, -1]} material={M.goldGlow} />
      <Box size={[6, 0.15, 2.2]} position={[0, 0.08, 4]} material={M.marble} />
      <Box size={[5.4, 0.1, 1.6]} position={[0, 0.16, 4]} material={M.pool} cast={false} />
      <Palm position={[-4.2, 0, 3.4]} s={0.9} />
      <Palm position={[4.2, 0, 3.4]} s={0.9} lean={-0.15} />
    </group>
  );
}

export function BoutiqueStore() {
  return (
    <group>
      <Box size={[9, 4.5, 6]} position={[0, 2.25, -1.5]} material={M.charcoal} />
      <Box size={[7.6, 3.2, 0.1]} position={[0, 1.9, 1.56]} material={M.glass} />
      <Box size={[8, 0.25, 0.3]} position={[0, 3.6, 1.6]} material={M.goldGlow} />
      <Box size={[0.25, 3.6, 0.3]} position={[-3.95, 1.8, 1.6]} material={M.gold} />
      <Box size={[0.25, 3.6, 0.3]} position={[3.95, 1.8, 1.6]} material={M.gold} />
      <Box size={[9.6, 0.3, 2.2]} position={[0, 4.2, 2.2]} material={M.gold} />
      {[-2.4, 0, 2.4].map((x) => (
        <group key={x} position={[x, 0, 0.6]}>
          <Cyl r={0.35} h={0.1} position={[0, 0.05, 0]} material={M.gold} />
          <Cyl r={0.22} rTop={0.3} h={1.3} position={[0, 1.2, 0]} material={M.white} />
          <mesh position={[0, 2.05, 0]} material={M.white}><sphereGeometry args={[0.2, 12, 8]} /></mesh>
        </group>
      ))}
    </group>
  );
}

function SearchLight({ position, phase }: { position: V3; phase: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff2c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.6 + phase;
    ref.current.rotation.set(Math.sin(t) * 0.45, 0, Math.cos(t * 0.8) * 0.45);
    mat.opacity = world.night * 0.18;
    ref.current.visible = world.night > 0.2;
  });
  return (
    <group position={position}>
      <mesh ref={ref} material={mat}>
        <coneGeometry args={[2.2, 30, 16, 1, true]} />
      </mesh>
    </group>
  );
}

export function Club() {
  return (
    <group>
      <Box size={[9, 5.5, 7]} position={[0, 2.75, -1]} material={M.charcoal} />
      {[1.2, 2.6, 4].map((y) => <Box key={y} size={[9.05, 0.08, 7.05]} position={[0, y, -1]} material={M.neon} cast={false} />)}
      <Box size={[4, 0.9, 0.1]} position={[0, 4.6, 2.56]} material={M.neonPink} />
      <Box size={[2, 2.4, 0.1]} position={[0, 1.2, 2.53]} material={M.gold} />
      <Box size={[0.08, 0.9, 3]} position={[-1.6, 0.45, 4]} material={M.gold} />
      <Box size={[0.08, 0.9, 3]} position={[1.6, 0.45, 4]} material={M.gold} />
      <Box size={[2.6, 0.02, 3]} position={[0, 0.03, 4]} material={new THREE.MeshStandardMaterial({ color: '#7a1020' })} cast={false} />
      <SearchLight position={[-3.5, 5.5, -3]} phase={0} />
      <SearchLight position={[3.5, 5.5, -3]} phase={2} />
    </group>
  );
}

export function Plaza() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.3; });
  return (
    <group>
      <Cyl r={5.5} h={0.12} position={[0, 0.06, 0]} material={M.marble} seg={48} />
      <Cyl r={2.6} h={0.6} position={[0, 0.4, 0]} material={M.stone} seg={32} />
      <Cyl r={2.35} h={0.1} position={[0, 0.66, 0]} material={M.pool} seg={32} />
      <Cyl r={0.9} h={1} position={[0, 1.1, 0]} material={M.stone} seg={24} />
      <Cyl r={0.75} h={0.08} position={[0, 1.62, 0]} material={M.pool} seg={24} />
      <mesh ref={ref} position={[0, 3, 0]} material={M.goldGlow} castShadow>
        <torusKnotGeometry args={[0.55, 0.16, 96, 12]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        return <Tree key={i} position={[Math.cos(a) * 4.5, 0, Math.sin(a) * 4.5]} s={1.1} />;
      })}
    </group>
  );
}

// ───────────────────────── residences ─────────────────────────

export function Residence({ kind }: { kind: string }) {
  if (kind === 'apartment') {
    const side = facadeMat('apt', { cols: 5, rows: 8, wall: '#c8bfae', glass: '#2f3a40', lit: 0.5, frame: '#8e8577', metal: 0.1, rough: 0.7 });
    return (
      <group position={[0, 0, -1.5]}>
        <Block size={[7, 11, 6]} position={[0, 5.5, 0]} side={side} roof={M.stone} />
        {[2, 4.6, 7.2, 9.8].map((y) => <Box key={y} size={[7.4, 0.15, 0.9]} position={[0, y, 3.4]} material={M.white} />)}
        <Box size={[2, 2.6, 0.2]} position={[0, 1.3, 3.05]} material={M.gold} />
      </group>
    );
  }
  if (kind === 'penthouse') {
    const side = facadeMat('pent', { cols: 6, rows: 20, wall: '#0f1418', glass: '#5a7d8c', lit: 0.45, frame: '#c9a24a', metal: 0.8, rough: 0.2 });
    return (
      <group position={[0, 0, -1.5]}>
        <Block size={[7, 20, 6.5]} position={[0, 10, 0]} side={side} />
        <Box size={[7.6, 0.4, 7.1]} position={[0, 20.2, 0]} material={M.goldGlow} />
        <AviationLight position={[-3.5, 20.6, -3.3]} />
        <AviationLight position={[3.5, 20.6, -3.3]} />
        <Box size={[4.5, 2.6, 4]} position={[-0.8, 21.7, -0.8]} material={M.glass} />
        <Box size={[2.4, 0.2, 3]} position={[2.4, 20.5, 1.4]} material={M.pool} cast={false} />
        <Palm position={[2.8, 20.4, -1.8]} s={0.5} />
        <Box size={[3, 3, 0.2]} position={[0, 1.5, 3.3]} material={M.gold} />
      </group>
    );
  }
  if (kind === 'villa') return <Villa />;
  if (kind === 'flat') {
    const side = facadeMat('flat', { cols: 3, rows: 2, wall: '#e8dcc4', glass: '#2c3338', lit: 0.6, frame: '#ffffff', metal: 0, rough: 0.8 });
    return (
      <group position={[0, 0, -1]}>
        <Block size={[6, 5, 5]} position={[0, 2.5, 0]} side={side} roof={M.charcoal} />
        <mesh position={[0, 5.6, 0]} rotation={[0, Math.PI / 4, 0]} material={M.brick} castShadow><coneGeometry args={[4.4, 1.6, 4]} /></mesh>
        <Box size={[1.2, 2.1, 0.12]} position={[0, 1.05, 2.53]} material={new THREE.MeshStandardMaterial({ color: '#1f3b63' })} />
        <Box size={[6.4, 0.6, 0.6]} position={[0, 0.3, 3.4]} material={M.lawn} />
      </group>
    );
  }
  // Rented studio: a tired brick walk-up.
  const side = facadeMat('studio', { cols: 4, rows: 4, wall: '#7a4434', glass: '#2a2522', lit: 0.4, frame: '#5e3326', metal: 0, rough: 0.95 });
  return (
    <group position={[0, 0, -1]}>
      <Block size={[6, 7, 5]} position={[0, 3.5, 0]} side={side} roof={M.brick} />
      <Box size={[6.3, 0.3, 5.3]} position={[0, 7.1, 0]} material={M.stone} />
      <Box size={[1.4, 2.2, 0.15]} position={[0, 1.1, 2.55]} material={M.charcoal} />
      {[2.6, 4.9].map((y) => <Box key={y} size={[2.4, 0.08, 0.8]} position={[1.6, y, 2.9]} material={M.charcoal} />)}
    </group>
  );
}

export function Villa({ scale = 1 }: { scale?: number }) {
  return (
    <group scale={scale} position={[0, 0, -1]}>
      <Box size={[10, 0.2, 9]} position={[0, 0.1, 0]} material={M.lawn} cast={false} />
      <Box size={[7.5, 3, 4.5]} position={[-0.8, 1.5, -1.5]} material={M.white} />
      <Box size={[5.5, 2.6, 4]} position={[1.2, 4.3, -1.8]} material={M.white} />
      <Box size={[7, 2.6, 0.08]} position={[-0.8, 1.5, 0.78]} material={M.glass} />
      <Box size={[5, 2.2, 0.08]} position={[1.2, 4.3, 0.23]} material={M.glass} />
      <Box size={[8.2, 0.2, 5.4]} position={[-0.8, 3.05, -1.3]} material={M.charcoal} />
      <Box size={[6.2, 0.2, 4.8]} position={[1.2, 5.7, -1.8]} material={M.goldGlow} />
      <Box size={[6, 0.2, 2.4]} position={[0, 0.2, 2.8]} material={M.marble} />
      <Box size={[5.4, 0.1, 1.9]} position={[0, 0.3, 2.8]} material={M.pool} cast={false} />
      <Palm position={[-4.3, 0, 3]} />
      <Palm position={[4.3, 0, 2.6]} lean={-0.12} />
    </group>
  );
}

// ───────────────────────── businesses ─────────────────────────

export function BusinessBuilding({ itemId }: { itemId: string }) {
  switch (itemId) {
    case 'foodcart':
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Box size={[2.2, 1, 1.2]} position={[0, 0.9, 0]} material={M.white} />
          <Box size={[2.3, 0.1, 1.3]} position={[0, 1.45, 0]} material={M.gold} />
          {[-0.8, 0.8].map((x) => <Cyl key={x} r={0.25} h={0.12} position={[x, 0.25, 0.65]} material={M.charcoal} />)}
          <Cyl r={0.04} h={1.6} position={[0, 2.2, 0]} material={M.charcoal} seg={6} />
          <mesh position={[0, 3, 0]} material={new THREE.MeshStandardMaterial({ color: '#c23b2a', roughness: 0.7 })} castShadow><coneGeometry args={[1.6, 0.6, 10]} /></mesh>
          <Cyl r={0.3} h={0.6} position={[1.6, 0.3, 1.2]} material={M.trunk} seg={8} />
          <Cyl r={0.3} h={0.6} position={[-1.6, 0.3, 1.2]} material={M.trunk} seg={8} />
        </group>
      );
    case 'reseller':
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Box size={[4.5, 2.6, 3.5]} position={[0, 1.3, -0.5]} material={new THREE.MeshStandardMaterial({ color: '#8a7a62', roughness: 0.9 })} />
          <Box size={[2.4, 2, 0.1]} position={[0, 1, 1.26]} material={M.charcoal} />
          {[[-1.6, 0.35, 2], [-1.1, 0.35, 2.3], [-1.35, 0.85, 2.15], [1.5, 0.35, 2.1]].map((p, i) => (
            <Box key={i} size={[0.6, 0.6, 0.6]} position={p as [number, number, number]} material={new THREE.MeshStandardMaterial({ color: '#b98d5a', roughness: 1 })} />
          ))}
          <Box size={[1.8, 0.35, 0.06]} position={[0, 2.3, 1.3]} material={M.neon} cast={false} />
        </group>
      );
    case 'carwash':
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Box size={[5, 0.3, 4]} position={[0, 3, 0]} material={new THREE.MeshStandardMaterial({ color: '#2b6cb0', roughness: 0.5 })} />
          {[[-2.3, -1.8], [2.3, -1.8], [-2.3, 1.8], [2.3, 1.8]].map(([x, z], i) => <Cyl key={i} r={0.12} h={3} position={[x, 1.5, z]} material={M.white} seg={8} />)}
          <Box size={[4, 0.06, 3.6]} position={[0, 0.03, 0]} material={M.pool} cast={false} />
          <Box size={[2.6, 0.4, 0.08]} position={[0, 3.4, 2.02]} material={M.neon} cast={false} />
        </group>
      );
    case 'cafe': {
      const side = facadeMat('cafe', { cols: 3, rows: 1, wall: '#e9dcc3', glass: '#3a2a20', lit: 1, frame: '#6b4a2f', metal: 0, rough: 0.8 });
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Block size={[5, 3, 4]} position={[0, 1.5, -0.5]} side={side} roof={M.trunk} />
          <Awning width={4.8} position={[0, 2.3, 1.9]} a="#1f4d3a" />
          <Cyl r={0.35} h={0.06} position={[1.6, 0.75, 2.8]} material={M.marble} />
          <Cyl r={0.35} h={0.06} position={[-1.6, 0.75, 2.8]} material={M.marble} />
        </group>
      );
    }
    case 'boutique':
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Box size={[6, 4, 5]} position={[0, 2, -0.5]} material={M.marble} />
          <Box size={[5, 2.8, 0.1]} position={[0, 1.6, 2.05]} material={M.glass} />
          <Box size={[6.2, 0.4, 0.3]} position={[0, 3.3, 2.1]} material={M.goldGlow} />
        </group>
      );
    case 'nightclub':
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Box size={[6, 5, 6]} position={[0, 2.5, -0.5]} material={M.charcoal} />
          {[1, 2.4, 3.8].map((y) => <Box key={y} size={[6.05, 0.1, 6.05]} position={[0, y, -0.5]} material={M.neonPink} cast={false} />)}
          <SearchLight position={[0, 5, -1]} phase={1} />
        </group>
      );
    case 'techfirm': {
      const side = facadeMat('tech', { cols: 10, rows: 4, wall: '#d7e3e6', glass: '#5d8c99', lit: 0.65, metal: 0.6, rough: 0.2 });
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Block size={[6, 6, 6]} position={[0, 3, -0.5]} side={side} roof={M.lawn} />
          <Cyl r={1.2} h={7.5} position={[2.2, 3.75, 1.8]} material={M.glass} seg={20} />
        </group>
      );
    }
    case 'holding': {
      const side = facadeMat('hold', { cols: 6, rows: 18, wall: '#2a2214', glass: '#b8923a', lit: 0.55, frame: '#3a2f1a', metal: 0.9, rough: 0.2 });
      return (
        <group rotation={[0, Math.PI, 0]}>
          <Block size={[6, 20, 6]} position={[0, 10, -0.5]} side={side} />
          <Block size={[4, 4, 4]} position={[0, 22, -0.5]} side={side} />
          <mesh position={[0, 26.5, -0.5]} material={M.goldGlow} castShadow><coneGeometry args={[0.4, 5, 4]} /></mesh>
          <AviationLight position={[0, 29.1, -0.5]} />
        </group>
      );
    }
    default:
      return null;
  }
}

/** Empty plot with a For Sale sign. */
export function EmptyLot() {
  return (
    <group>
      <Box size={[6, 0.1, 7]} position={[0, 0.05, 0]} material={M.lot} cast={false} />
      <Cyl r={0.06} h={1.8} position={[-0.8, 0.9, -2.6]} material={M.charcoal} seg={6} />
      <Cyl r={0.06} h={1.8} position={[0.8, 0.9, -2.6]} material={M.charcoal} seg={6} />
      <Box size={[2.2, 1, 0.08]} position={[0, 1.5, -2.6]} material={M.sign} />
      <Box size={[1.8, 0.25, 0.09]} position={[0, 1.6, -2.6]} material={M.goldGlow} cast={false} />
    </group>
  );
}
