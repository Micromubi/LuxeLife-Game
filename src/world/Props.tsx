import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { M, asphaltTex, glow, pavingTex, textTex, towerMat, waterNormals, world } from './materials';
import { Box, Cyl, Palm, Tree, Villa } from './Buildings';
import { BOUNDS, ISLAND_POS, ROADS_X, ROADS_Z, ROAD_Z_SPAN, RUNWAY_Z } from './layout';

type V3 = [number, number, number];

const ROAD_Z = ROADS_Z;
const ROAD_X = ROADS_X;
const { x0: X0, x1: X1, z0: Z0, z1: Z1 } = BOUNDS;
/** Vertical streets run from the north road to the south road. */
const VZ0 = ROAD_Z_SPAN[0] - 1.5, VZ1 = ROAD_Z_SPAN[1] + 1.5;
/** Road width; two lanes, cars drive on the right at ±LANE from the centre line. */
const RW = 3;
const LANE = 0.75;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ───────────────────────── ground, roads, sea ─────────────────────────

/** Many thin boxes (road paint) drawn as one instanced mesh. Items are [x, z, sizeX, sizeZ]. */
function Marks({ items, material, y = 0.03 }: { items: [number, number, number, number][]; material: THREE.Material; y?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    items.forEach(([x, z, sx, sz], i) => {
      m.makeScale(sx, 1, sz);
      m.setPosition(x, y, z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [items, y]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} material={material} receiveShadow>
      <boxGeometry args={[1, 0.01, 1]} />
    </instancedMesh>
  );
}

/** Stretches of road between junctions: [from, to] along the road. */
function spans(bounds: number[], cross: number[]) {
  const cuts = [...cross].sort((a, b) => a - b);
  const out: [number, number][] = [];
  let a = bounds[0];
  for (const c of cuts) {
    if (c - RW / 2 > a) out.push([a, c - RW / 2]);
    a = c + RW / 2;
  }
  if (bounds[1] > a) out.push([a, bounds[1]]);
  return out;
}

function useRoadPaint() {
  return useMemo(() => {
    const white: [number, number, number, number][] = [];
    const yellow: [number, number, number, number][] = [];
    const zebra: [number, number, number, number][] = [];
    for (const z of ROAD_Z)
      for (const [a, b] of spans([X0, X1], ROAD_X)) {
        const mid = (a + b) / 2, len = b - a;
        const inner = len - (a === X0 || b === X1 ? 1.2 : 2.4);
        white.push([mid, z - RW / 2 + 0.12, len, 0.07], [mid, z + RW / 2 - 0.12, len, 0.07]);
        yellow.push([mid, z - 0.07, inner, 0.06], [mid, z + 0.07, inner, 0.06]);
      }
    for (const x of ROAD_X)
      for (const [a, b] of spans([VZ0, VZ1], ROAD_Z)) {
        const mid = (a + b) / 2, len = b - a;
        const inner = len - 2.4;
        if (len < 0.3) continue;
        white.push([x - RW / 2 + 0.12, mid, 0.07, len], [x + RW / 2 - 0.12, mid, 0.07, len]);
        if (inner > 0) yellow.push([x - 0.07, mid, 0.06, inner], [x + 0.07, mid, 0.06, inner]);
      }
    // zebra crossings on every approach to every junction
    for (const x of ROAD_X)
      for (const z of ROAD_Z) {
        const off = RW / 2 + 0.6;
        for (let k = 0; k < 6; k++) {
          const s = -RW / 2 + 0.3 + k * 0.48;
          if (z > ROAD_Z_SPAN[0]) zebra.push([x + s, z - off, 0.26, 0.9]);
          if (z < ROAD_Z_SPAN[1]) zebra.push([x + s, z + off, 0.26, 0.9]);
          zebra.push([x - off, z + s, 0.9, 0.26], [x + off, z + s, 0.9, 0.26]);
        }
      }
    return { white, yellow, zebra };
  }, []);
}

export function Ground({ reflect }: { reflect: boolean }) {
  const paint = useRoadPaint();
  const mats = useMemo(() => {
    const roadH = new THREE.MeshStandardMaterial({ map: asphaltTex([(X1 - X0) / 3, 1]), roughness: 0.85, metalness: 0.05 });
    const vt = asphaltTex([1, (VZ1 - VZ0) / 3]);
    vt.center.set(0.5, 0.5);
    vt.rotation = Math.PI / 2;
    vt.repeat.set((VZ1 - VZ0) / 3, 1);
    const roadV = new THREE.MeshStandardMaterial({ map: vt, roughness: 0.85, metalness: 0.05 });
    const paving = new THREE.MeshStandardMaterial({ map: pavingTex([(X1 - X0) / 4, (Z1 - Z0) / 4]), roughness: 0.8 });
    return { roadH, roadV, paving };
  }, []);
  // Roads look wet and glossy at night, GTA style.
  useFrame(() => {
    const r = 0.85 - world.night * 0.45;
    mats.roadH.roughness = mats.roadV.roughness = r;
  });

  return (
    <group>
      <Sea reflect={reflect} />
      {/* city platform */}
      <Box size={[X1 - X0, 1, Z1 - Z0]} position={[(X0 + X1) / 2, -0.5, (Z0 + Z1) / 2]} material={mats.paving} cast={false} />
      <Box size={[X1 - X0 + 0.6, 0.3, Z1 - Z0 + 0.6]} position={[(X0 + X1) / 2, -0.45, (Z0 + Z1) / 2]} material={M.gold} cast={false} />
      {/* roads */}
      {ROAD_Z.map((z) => <Box key={'z' + z} size={[X1 - X0, 0.02, RW]} position={[(X0 + X1) / 2, 0.01, z]} material={mats.roadH} cast={false} />)}
      {ROAD_X.map((x) => <Box key={'x' + x} size={[RW, 0.021, VZ1 - VZ0]} position={[x, 0.012, (VZ0 + VZ1) / 2]} material={mats.roadV} cast={false} />)}
      <Marks items={paint.white} material={M.paint} />
      <Marks items={paint.yellow} material={M.yellowPaint} />
      <Marks items={paint.zebra} material={M.paint} y={0.032} />
      <Beach />
    </group>
  );
}

function Sea({ reflect }: { reflect: boolean }) {
  const normals = useMemo(() => waterNormals([60, 60]), []);
  useFrame((_, dt) => {
    normals.offset.x += dt * 0.006;
    normals.offset.y += dt * 0.004;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[20, -0.6, 8]} receiveShadow>
      <planeGeometry args={[900, 900]} />
      {reflect ? (
        <MeshReflectorMaterial
          resolution={512}
          blur={[400, 120]}
          mixBlur={1}
          mixStrength={1.8}
          mixContrast={1.1}
          mirror={0.7}
          depthScale={0}
          color="#0c3f57"
          metalness={0.4}
          roughness={0.35}
          normalMap={normals}
          normalScale={new THREE.Vector2(0.18, 0.18)}
        />
      ) : (
        <meshStandardMaterial color="#0f4c66" metalness={0.3} roughness={0.12} normalMap={normals} normalScale={new THREE.Vector2(0.5, 0.5)} transparent opacity={0.96} />
      )}
    </mesh>
  );
}

/** Southern beach and promenade: sand, palms, umbrellas and loungers. */
function Beach() {
  const items = useMemo(() => {
    const r = seeded(21);
    return Array.from({ length: Math.floor((X1 - X0 - 6) / 6) }, (_, i) => ({ x: X0 + 4 + i * 6 + r() * 2, z: 43 + r() * 2.5, c: ['#e94f37', '#2f7de1', '#f5c542', '#f4f1ea'][i % 4] }));
  }, []);
  const umbrellas = useMemo(() => items.map((it) => new THREE.MeshStandardMaterial({ color: it.c, roughness: 0.8, side: THREE.DoubleSide })), [items]);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2 + 0.07, 0, 0]} position={[(X0 + X1) / 2, -0.32, Z1 + 5]} material={M.sand} receiveShadow>
        <planeGeometry args={[X1 - X0 + 10, 11]} />
      </mesh>
      {Array.from({ length: Math.floor((X1 - X0) / 4) }, (_, i) => X0 + 2 + i * 4).map((x, i) => (
        <Palm key={x} position={[x, 0, Z1 - 1.6]} s={1.05 + (i % 3) * 0.12} lean={0.12 * ((i % 3) - 1)} />
      ))}
      {items.map((it, i) => (
        <group key={i} position={[it.x, -0.22, it.z]}>
          <Cyl r={0.04} h={2.2} position={[0, 1.1, 0]} material={M.white} seg={6} />
          <mesh position={[0, 2.2, 0]} material={umbrellas[i]} castShadow><coneGeometry args={[1.3, 0.45, 10, 1, true]} /></mesh>
          <Box size={[0.6, 0.12, 1.6]} position={[0.9, 0.15, 0.4]} rotation={[0.1, 0, 0]} material={M.white} />
          <Box size={[0.6, 0.12, 1.6]} position={[-0.9, 0.15, 0.4]} rotation={[0.1, 0, 0]} material={M.white} />
        </group>
      ))}
    </group>
  );
}

// ───────────────────────── street furniture & greenery ─────────────────────────

const poolTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,214,150,1)');
  g.addColorStop(0.5, 'rgba(255,190,110,0.35)');
  g.addColorStop(1, 'rgba(255,170,90,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

/** Spots along every road at a fixed offset from the centre line, skipping junctions. */
function kerbPoints(offset: number, step: number, phase: number) {
  const out: [number, number, number][] = [];
  for (const z of ROAD_Z)
    for (const [a, b] of spans([X0, X1], ROAD_X))
      for (let x = a + phase; x < b - 0.8; x += step) out.push([x, z + offset, 0]);
  for (const x of ROAD_X)
    for (const [a, b] of spans([VZ0 - 1.5, VZ1 + 1.5], ROAD_Z))
      for (let z = a + phase; z < b - 0.8; z += step) out.push([x + offset, z, 1]);
  return out;
}

export function StreetLamps() {
  const pts = useMemo(() => kerbPoints(-(RW / 2 + 0.35), 9, 2.2), []);
  const pool = useMemo(() => new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }), []);
  useFrame(() => { pool.opacity = world.night * 0.85; });
  return (
    <group>
      {pts.map(([x, z, vert]) => (
        // The arm reaches over the road; vertical roads lamps sit on the -x side.
        <group key={`${x},${z}`} position={[x, 0, z]} rotation={[0, vert ? -Math.PI / 2 : Math.PI, 0]}>
          <Cyl r={0.07} rTop={0.05} h={3.6} position={[0, 1.8, 0]} material={M.charcoal} seg={8} />
          <Box size={[0.06, 0.06, 0.9]} position={[0, 3.55, -0.42]} material={M.charcoal} cast={false} />
          <Box size={[0.26, 0.1, 0.42]} position={[0, 3.5, -0.85]} material={M.charcoal} cast={false} />
          <Box size={[0.2, 0.03, 0.34]} position={[0, 3.44, -0.85]} material={M.bulb} cast={false} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, -0.85]} material={pool}><planeGeometry args={[4.2, 4.2]} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Greenery() {
  const palms = useMemo(() => kerbPoints(RW / 2 + 0.45, 9, 6.5).filter(([, , v]) => v === 1), []);
  // Shade trees along the east and west waterfronts.
  const trees: V3[] = [-44, -22, 0, 22].flatMap((z) => [-5, 5].flatMap((o) => [[X0 + 3, 0, z + o] as V3, [X1 - 3, 0, z + o] as V3]));
  return (
    <group>
      {trees.map((p, i) => <Tree key={i} position={p} s={1 + (i % 3) * 0.15} />)}
      {palms.map(([x, z], i) => <Palm key={i} position={[x, 0, z]} s={1 + (i % 4) * 0.08} lean={0.08 * ((i % 3) - 1)} />)}
    </group>
  );
}

// ───────────────────────── vehicles ─────────────────────────

interface CarStyle { body: string; len: number; h: number; w: number; cabin: number; cabLen: number; cabZ: number; metal?: number; taxi?: boolean }
const CAR_STYLE: Record<string, CarStyle> = {
  sedan: { body: '#7c8288', len: 2.4, h: 0.5, w: 1.08, cabin: 0.42, cabLen: 0.5, cabZ: -0.05 },
  suv: { body: '#151515', len: 2.6, h: 0.72, w: 1.18, cabin: 0.55, cabLen: 0.62, cabZ: -0.12, metal: 0.6 },
  sportscar: { body: '#b3121b', len: 2.5, h: 0.38, w: 1.14, cabin: 0.3, cabLen: 0.36, cabZ: -0.12 },
  hypercar: { body: '#D4AF37', len: 2.7, h: 0.34, w: 1.18, cabin: 0.27, cabLen: 0.32, cabZ: -0.05, metal: 0.95 },
  taxi: { body: '#121212', len: 2.5, h: 0.52, w: 1.1, cabin: 0.44, cabLen: 0.52, cabZ: -0.05, metal: 0.7, taxi: true },
  van: { body: '#e8e8e4', len: 2.8, h: 1.05, w: 1.15, cabin: 0.3, cabLen: 0.2, cabZ: 0.95 },
};

const bodyCache = new Map<string, THREE.MeshPhysicalMaterial>();
function bodyMat(color: string, metal = 0.5) {
  const k = color + metal;
  let m = bodyCache.get(k);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color, metalness: metal, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 });
    bodyCache.set(k, m);
  }
  return m;
}

const taxiSign = glow(new THREE.MeshStandardMaterial({ map: textTex('LUXE', { w: 256, h: 96, color: '#E8CF77', bg: '#111111', font: "bold 62px 'Playfair Display', Georgia, serif" }), emissive: '#E8CF77', emissiveIntensity: 0.3 }), 0.3, 2);

/** A car facing +z. Scaled up a touch so it matches the people. */
export function Car({ kind, position, rotation = 0, color }: { kind: string; position: V3; rotation?: number; color?: string }) {
  const st = CAR_STYLE[kind] ?? CAR_STYLE.sedan;
  const body = bodyMat(color ?? st.body, st.metal ?? 0.5);
  const wy = 0.24;
  const top = wy + st.h;
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={1.25}>
      <RoundedBox args={[st.w, st.h, st.len]} radius={Math.min(st.h / 2.3, 0.16)} smoothness={3} position={[0, wy + st.h / 2 + 0.04, 0]} material={body} castShadow />
      <RoundedBox args={[st.w * 0.84, st.cabin, st.len * st.cabLen]} radius={Math.min(st.cabin / 2.3, 0.12)} smoothness={2} position={[0, top + st.cabin / 2 - 0.02, st.cabZ]} material={M.tint} castShadow />
      {st.taxi && <mesh position={[0, top + st.cabin + 0.08, st.cabZ]} material={taxiSign}><boxGeometry args={[0.45, 0.16, 0.2]} /></mesh>}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <group key={i} position={[(sx * st.w) / 2 - sx * 0.04, wy, (sz * st.len) / 3.1]} rotation={[0, 0, Math.PI / 2]}>
          <mesh material={M.tyre}><cylinderGeometry args={[0.24, 0.24, 0.2, 16]} /></mesh>
          <mesh position={[0, sx * 0.101, 0]} material={M.rim}><cylinderGeometry args={[0.15, 0.15, 0.01, 12]} /></mesh>
        </group>
      ))}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Box size={[0.24, 0.09, 0.03]} position={[sx * st.w * 0.32, wy + st.h * 0.62, st.len / 2 + 0.01]} material={M.headlight} cast={false} />
          <Box size={[0.24, 0.08, 0.03]} position={[sx * st.w * 0.33, wy + st.h * 0.66, -st.len / 2 - 0.01]} material={M.taillight} cast={false} />
        </group>
      ))}
      <Box size={[st.w * 0.5, 0.06, 0.03]} position={[0, wy + st.h * 0.35, st.len / 2 + 0.015]} material={M.chrome} cast={false} />
    </group>
  );
}

/** Closed loops along the road grid (corners at road centres). */
const LOOPS: { pts: [number, number][]; cars: number; ccw?: boolean }[] = (() => {
  const X = ROAD_X, Z = ROAD_Z;
  const rect = (a: number, b: number, c: number, d: number): [number, number][] => [[X[a], Z[c]], [X[b], Z[c]], [X[b], Z[d]], [X[a], Z[d]]];
  const nx = X.length - 1, nz = Z.length - 1;
  return [
    { pts: rect(0, nx, 0, nz), cars: 10 },
    { pts: rect(0, nx, 0, nz), cars: 9, ccw: true },
    { pts: rect(1, nx - 1, 1, nz - 1), cars: 6 },
    { pts: rect(1, nx - 1, 1, nz - 1), cars: 5, ccw: true },
    { pts: rect(0, 3, 1, nz), cars: 4, ccw: true },
    { pts: rect(4, nx, 0, 3), cars: 4, ccw: true },
    { pts: rect(2, 5, 0, 2), cars: 3 },
    { pts: rect(3, 6, 2, nz), cars: 3 },
  ];
})();
const TRAFFIC_KINDS = ['sedan', 'taxi', 'suv', 'sedan', 'van', 'sportscar', 'taxi', 'sedan'];
const TRAFFIC_COLORS = ['#f4f4f2', '#141414', '#9aa0a6', '#7a1015', '#1f3c78', '#2e4a3a', '#c9c3b5', '#3b3f45'];

/** Offset a closed polygon to the right-hand side of travel (right = (-dz, dx)). */
function laneLoop(pts: [number, number][], off: number) {
  const n = pts.length;
  const dirs = pts.map((p, i) => {
    const q = pts[(i + 1) % n];
    const l = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
  });
  return pts.map((p, i) => {
    const a = dirs[(i - 1 + n) % n], b = dirs[i];
    return [p[0] + (-a[1] - b[1]) * off, p[1] + (a[0] + b[0]) * off] as [number, number];
  });
}

/** Cars cruising the streets, two-way, on the right. */
export function Traffic() {
  const cars = useMemo(() => {
    const r = seeded(77);
    const out: { path: [number, number][]; segs: number[]; total: number; d: number; v: number; speed: number; x: number; z: number; hx: number; hz: number; kind: string; color: string }[] = [];
    let k = 0;
    for (const L of LOOPS) {
      const base = L.ccw ? [...L.pts].reverse() : L.pts;
      const path = laneLoop(base, LANE);
      const segs = path.map((p, i) => Math.hypot(path[(i + 1) % path.length][0] - p[0], path[(i + 1) % path.length][1] - p[1]));
      const total = segs.reduce((a, b) => a + b, 0);
      for (let i = 0; i < L.cars; i++, k++)
        out.push({
          path, segs, total, d: (total / L.cars) * (i + r() * 0.4), v: 4.5 + r() * 2.5, speed: 0,
          x: 0, z: 0, hx: 0, hz: 1,
          kind: TRAFFIC_KINDS[k % TRAFFIC_KINDS.length], color: TRAFFIC_COLORS[(k * 3) % TRAFFIC_COLORS.length],
        });
    }
    return out;
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    cars.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      // Brake for a car just ahead in the same lane (routes overlap on shared streets).
      let blocked = false;
      for (const o of cars) {
        if (o === c || c.hx * o.hx + c.hz * o.hz < 0.7) continue;
        const dx = o.x - c.x, dz = o.z - c.z;
        const ahead = dx * c.hx + dz * c.hz;
        if (ahead > 0.1 && ahead < 4.2 && Math.abs(dx * c.hz - dz * c.hx) < 0.9) { blocked = true; break; }
      }
      c.speed += ((blocked ? 0 : c.v) - c.speed) * Math.min(1, step * (blocked ? 8 : 2));
      c.d = (c.d + c.speed * step) % c.total;
      let d = c.d, s = 0;
      while (d > c.segs[s]) { d -= c.segs[s]; s++; }
      const p = c.path[s], q = c.path[(s + 1) % c.path.length];
      const t = d / c.segs[s];
      g.position.set(p[0] + (q[0] - p[0]) * t, 0, p[1] + (q[1] - p[1]) * t);
      c.x = g.position.x; c.z = g.position.z;
      c.hx = (q[0] - p[0]) / c.segs[s]; c.hz = (q[1] - p[1]) / c.segs[s];
      const want = Math.atan2(q[0] - p[0], q[1] - p[1]);
      let diff = want - g.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.rotation.y += diff * Math.min(1, step * 9);
    });
  });

  return (
    <group>
      {cars.map((c, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)}>
          <Car kind={c.kind} position={[0, 0, 0]} color={c.kind === 'taxi' ? undefined : c.color} />
        </group>
      ))}
    </group>
  );
}

// ───────────────────────── pedestrians ─────────────────────────

const SHIRTS = ['#e8e4dc', '#1c1c1f', '#7a1f2b', '#2f5d8a', '#c9a24a', '#3c6e47', '#d76c3a', '#6b5b95'];
const SKIN = ['#7b4a2e', '#c69c74', '#e2bc94', '#5a3622', '#9c6b45'];
const pedLeg = new THREE.BoxGeometry(0.17, 0.72, 0.19).translate(0, -0.36, 0);

/** Locals strolling up and down the pavements. */
export function Pedestrians() {
  const peds = useMemo(() => {
    const r = seeded(31);
    const lanes: { a: [number, number]; b: [number, number] }[] = [];
    for (const z of ROAD_Z)
      for (const [a, b] of spans([X0, X1], ROAD_X))
        for (const side of [-1, 1]) lanes.push({ a: [a + 0.8, z + side * (RW / 2 + 0.7)], b: [b - 0.8, z + side * (RW / 2 + 0.7)] });
    for (const x of ROAD_X)
      for (const [a, b] of spans([VZ0 - 1.5, VZ1 + 1.5], ROAD_Z))
        for (const side of [-1, 1]) lanes.push({ a: [x + side * (RW / 2 + 0.7), a + 0.8], b: [x + side * (RW / 2 + 0.7), b - 0.8] });
    return Array.from({ length: 44 }, (_, i) => {
      const L = lanes[Math.floor(r() * lanes.length)];
      const len = Math.hypot(L.b[0] - L.a[0], L.b[1] - L.a[1]);
      return {
        ...L, len, t: r() * len, dir: r() < 0.5 ? 1 : -1, v: 1 + r() * 0.6, phase: r() * 6,
        shirt: new THREE.MeshStandardMaterial({ color: SHIRTS[i % SHIRTS.length], roughness: 0.7 }),
        pants: new THREE.MeshStandardMaterial({ color: r() < 0.5 ? '#2b2f3a' : '#4a4237', roughness: 0.8 }),
        skin: new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.6 }),
      };
    }).filter((p) => p.len > 2);
  }, []);
  const refs = useRef<(THREE.Group | null)[]>([]);

  useFrame(({ clock }, dt) => {
    const step = Math.min(dt, 0.05);
    peds.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      p.t += p.dir * p.v * step;
      if (p.t > p.len) { p.t = p.len; p.dir = -1; }
      if (p.t < 0) { p.t = 0; p.dir = 1; }
      const f = p.t / p.len;
      g.position.set(p.a[0] + (p.b[0] - p.a[0]) * f, 0, p.a[1] + (p.b[1] - p.a[1]) * f);
      g.rotation.y = Math.atan2((p.b[0] - p.a[0]) * p.dir, (p.b[1] - p.a[1]) * p.dir);
      const sw = Math.sin(clock.elapsedTime * 7 * p.v + p.phase) * 0.55;
      const [legL, legR] = [g.children[0].children[0], g.children[1].children[0]];
      legL.rotation.x = sw;
      legR.rotation.x = -sw;
    });
  });

  return (
    <group>
      {peds.map((p, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} scale={1.2}>
          <group position={[-0.1, 0.72, 0]}><mesh geometry={pedLeg} material={p.pants} castShadow /></group>
          <group position={[0.1, 0.72, 0]}><mesh geometry={pedLeg} material={p.pants} castShadow /></group>
          <mesh position={[0, 1.04, 0]} material={p.shirt} castShadow><capsuleGeometry args={[0.2, 0.32, 4, 8]} /></mesh>
          <mesh position={[0, 1.56, 0]} material={p.skin} castShadow><sphereGeometry args={[0.17, 12, 10]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ───────────────────────── the wider world ─────────────────────────

/** Mainland across the bay: a downtown skyline and hills with a sign. */
export function Skyline() {
  const towers = useMemo(() => {
    const r = seeded(101);
    const out: { x: number; z: number; w: number; d: number; h: number; style: number }[] = [];
    for (let x = -230; x <= 250; x += 13 + r() * 9)
      for (let row = 0; row < 3; row++) {
        const core = Math.exp(-(((x + 10) / 70) ** 2));
        // Dense downtown in the middle, scattered low-rise towards the edges.
        if (r() > 0.25 + core * 0.7) continue;
        const z = -205 - row * 20 - r() * 10;
        const h = 6 + core * (22 + r() * 48) + r() * 8;
        out.push({ x: x + r() * 5, z, w: 7 + r() * 8, d: 7 + r() * 7, h, style: Math.floor(r() * 4) });
      }
    return out.map((t) => ({ ...t, mat: towerMat(t.style, t.w, t.h) }));
  }, []);
  const hills = useMemo(() => {
    const r = seeded(55);
    return Array.from({ length: 18 }, (_, i) => ({ x: -300 + i * 38 + r() * 14, z: -350 - r() * 40, r: 40 + r() * 35, h: 30 + r() * 40 }));
  }, []);
  // The Luxe crest on the hills: a serif monogram inside a gold ring, lit at night.
  const crest = useMemo(() => {
    const map = textTex('L', { w: 256, h: 256, color: '#F6E7B0', font: "bold 200px 'Playfair Display', Georgia, serif" });
    return glow(new THREE.MeshStandardMaterial({ map, transparent: true, emissive: '#E8CF77', emissiveMap: map, emissiveIntensity: 0.2 }), 0.2, 1.6);
  }, []);

  return (
    <group>
      <Box size={[600, 1.4, 220]} position={[0, -0.3, -300]} material={M.stone} cast={false} />
      <Box size={[600, 0.6, 3]} position={[0, 0.1, -190]} material={M.gold} cast={false} />
      {towers.map((t, i) => (
        <group key={i}>
          <mesh position={[t.x, t.h / 2, t.z]} material={t.mat}><boxGeometry args={[t.w, t.h, t.d]} /></mesh>
          {t.h > 40 && <mesh position={[t.x, t.h + 1.5, t.z]} material={M.aviation}><sphereGeometry args={[0.6, 8, 6]} /></mesh>}
          {t.h > 40 && <Cyl r={0.15} h={3} position={[t.x, t.h + 0.5, t.z]} material={M.charcoal} seg={4} />}
        </group>
      ))}
      {hills.map((h, i) => (
        <mesh key={i} position={[h.x, h.h / 2 - 1, h.z]} material={i % 3 ? M.hill : M.rock}>
          <coneGeometry args={[h.r, h.h, 7]} />
        </mesh>
      ))}
      <group position={[-30, 44, -325]} rotation={[-0.15, 0.1, 0]}>
        <mesh material={M.goldGlow}><torusGeometry args={[13, 1.1, 10, 48]} /></mesh>
        <mesh position={[0, 0, 0.3]} material={crest}><planeGeometry args={[22, 22]} /></mesh>
      </group>
    </group>
  );
}

/** Private runway along the north shore, with edge lights that glow at night. */
export function Runway() {
  const a = X0 + 6, b = X1 - 6;
  const dashes = useMemo(() => {
    const out: [number, number, number, number][] = [];
    for (let x = a + 3; x < b - 3; x += 5) out.push([x, RUNWAY_Z, 2.4, 0.18]);
    return out;
  }, [a, b]);
  const lights = useMemo(() => {
    const out: V3[] = [];
    for (let x = a; x <= b; x += 4) out.push([x, 0.1, RUNWAY_Z - 3.2], [x, 0.1, RUNWAY_Z + 3.2]);
    return out;
  }, [a, b]);
  return (
    <group>
      <Box size={[b - a, 0.03, 7]} position={[(a + b) / 2, 0.015, RUNWAY_Z]} material={M.asphalt} cast={false} />
      <Marks items={dashes} material={M.paint} y={0.04} />
      {[RUNWAY_Z - 3.1, RUNWAY_Z + 3.1].map((z) => <Box key={z} size={[b - a, 0.012, 0.12]} position={[(a + b) / 2, 0.035, z]} material={M.paint} cast={false} />)}
      {lights.map((p, i) => <mesh key={i} position={p} material={i % 2 ? M.bulb : M.headlight}><sphereGeometry args={[0.12, 6, 4]} /></mesh>)}
    </group>
  );
}

export function Jet() {
  const body = M.white;
  return (
    <group position={[24, 0, RUNWAY_Z]}>
      <group position={[0, 1.4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={body} castShadow><capsuleGeometry args={[0.7, 7, 6, 16]} /></mesh>
        <Box size={[1.6, 0.12, 9]} position={[0.3, -0.2, 0]} material={body} />
        <Box size={[1, 1.8, 0.12]} position={[-3.6, 1, 0]} material={M.gold} />
        <Box size={[1, 0.1, 3]} position={[-3.6, 0.3, 0]} material={body} />
        <Box size={[6, 0.08, 0.05]} position={[0, 0.25, 0.71]} material={M.gold} cast={false} />
      </group>
    </group>
  );
}

// ───────────────────────── island ─────────────────────────

export function Island() {
  const [ix, iz] = ISLAND_POS;
  return (
    <group>
      {/* causeway */}
      <Box size={[ix - 9 - X1, 0.4, 2.4]} position={[(X1 + ix - 9) / 2, -0.25, 0]} material={M.stone} />
      <Box size={[ix - 9 - X1, 0.3, 0.1]} position={[(X1 + ix - 9) / 2, 0.15, 1.15]} material={M.gold} />
      <Box size={[ix - 9 - X1, 0.3, 0.1]} position={[(X1 + ix - 9) / 2, 0.15, -1.15]} material={M.gold} />
      <group position={[ix, 0, iz]}>
        <Cyl r={11} rTop={10} h={1.2} position={[0, -0.6, 0]} material={M.sand} seg={40} />
        <Cyl r={8} h={0.2} position={[0, 0, 0]} material={M.lawn} seg={40} />
        <group rotation={[0, -Math.PI / 2, 0]}><Villa scale={1.15} /></group>
        {[[-6, 6], [6, 6], [7, -5], [-7, -4], [0, 8.5], [8.5, 1]].map(([x, z], i) => (
          <Palm key={i} position={[x, 0, z]} lean={0.1 * ((i % 3) - 1)} s={1.1} />
        ))}
      </group>
    </group>
  );
}

// ───────────────────────── marina ─────────────────────────

const hullGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.8, -2.3);
  s.lineTo(0.8, -2.3);
  s.lineTo(0.85, 1);
  s.quadraticCurveTo(0.6, 2.3, 0, 2.9);
  s.quadraticCurveTo(-0.6, 2.3, -0.85, 1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
})();

function Yacht({ position, rotation, s = 1 }: { position: V3; rotation: number; s?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={s}>
      <mesh geometry={hullGeo} material={M.hull} castShadow />
      <mesh geometry={hullGeo} position={[0, 0.78, 0.15]} scale={[0.92, 0.12, 0.92]} material={M.teak} />
      <RoundedBox args={[1.3, 0.55, 2.2]} radius={0.12} position={[0, 1.15, -0.4]} material={M.hull} castShadow />
      <RoundedBox args={[1.36, 0.28, 1.9]} radius={0.1} position={[0, 1.2, -0.35]} material={M.tint} />
      <RoundedBox args={[1.0, 0.4, 1.3]} radius={0.1} position={[0, 1.6, -0.6]} material={M.hull} castShadow />
      <Box size={[0.08, 0.7, 0.08]} position={[0, 2.1, -0.8]} material={M.chrome} />
    </group>
  );
}

/** A pier on the east side with yachts gently bobbing. */
export function Boats() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.children.forEach((c, i) => {
      c.position.y = -0.62 + Math.sin(clock.elapsedTime * 1.1 + i) * 0.07;
      c.rotation.z = Math.sin(clock.elapsedTime * 0.8 + i) * 0.03;
    });
  });
  const pier: [number, number] = [X1, -15];
  return (
    <group>
      <Box size={[10, 0.25, 1.6]} position={[pier[0] + 5, -0.05, pier[1]]} material={M.teak} />
      <Box size={[1.4, 0.25, 9]} position={[pier[0] + 9.5, -0.05, pier[1]]} material={M.teak} />
      {[2, 4.5, 7, 9.8].map((x) => <Cyl key={x} r={0.12} h={1.4} position={[pier[0] + x, -0.5, pier[1] + 0.9]} material={M.trunk} seg={6} />)}
      <group ref={ref}>
        {([[X1 + 6, -18.5, Math.PI / 2, 1.2], [X1 + 6, -11.5, Math.PI / 2, 1], [X1 + 13, -15, 0, 1.4], [X1 + 9, 28, 0.6, 1.3], [48, Z1 + 14, -0.4, 1.6], [X0 - 10, 8, 1.3, 1.5], [X0 - 8, -30, 0.2, 1.2]] as [number, number, number, number][]).map(([x, z, r, s], i) => (
          <Yacht key={i} position={[x, -0.62, z]} rotation={r} s={s} />
        ))}
      </group>
    </group>
  );
}
