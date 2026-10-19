import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { M, facadeMat, glow, stripes, towerMat } from './materials';
import { AviationLight, Block, Box, Cyl, Palm, SearchLight, Tree } from './Buildings';
import { Car } from './Props';

type V3 = [number, number, number];

// ───────────────────────── signage ─────────────────────────

const signCache = new Map<string, THREE.MeshStandardMaterial>();
/** Lettering that glows after dark. Text is shrunk to fit the board. */
function signMat(text: string, color: string, bg: string, font: string) {
  const key = [text, color, bg, font].join('|');
  let m = signCache.get(key);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 192;
  const x = c.getContext('2d')!;
  if (bg !== 'transparent') { x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height); }
  let size = 140;
  x.font = `${size}px ${font}`;
  const w = x.measureText(text).width;
  if (w > 960) { size = Math.floor((size * 960) / w); x.font = `${size}px ${font}`; }
  x.fillStyle = color;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(text, 512, 100);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  m = glow(new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', transparent: bg === 'transparent', roughness: 0.5 }), 0.35, 2.2);
  signCache.set(key, m);
  return m;
}

export function Sign({ text, position, w, rotation, color = '#ffffff', bg = 'transparent', font = 'bold Impact, Anton, sans-serif' }: {
  text: string; position: V3; w: number; rotation?: V3; color?: string; bg?: string; font?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} material={signMat(text, color, bg, font)}>
      <planeGeometry args={[w, w * 0.1875]} />
    </mesh>
  );
}

const mat = (color: string, o: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
const V = {
  brick: mat('#8a4b38', { roughness: 0.9 }),
  red: glow(mat('#7a0d12', { emissive: '#ff2a2a', emissiveIntensity: 0.6 }), 0.6, 2.5),
  orange: glow(mat('#3a1a05', { emissive: '#ff8a1f', emissiveIntensity: 0.8 }), 0.8, 3),
  pitch: mat('#3f8a3a', { roughness: 0.95 }),
  seats: mat('#2f3a4a', { roughness: 0.8 }),
  concrete: mat('#b9b4aa', { roughness: 0.85 }),
  helipad: mat('#2d2f33', { roughness: 0.7 }),
  flood: glow(mat('#fffbe8', { emissive: '#ffffff', emissiveIntensity: 0.2 }), 0.2, 5),
  diamond: glow(new THREE.MeshPhysicalMaterial({ color: '#dff4ff', metalness: 0.1, roughness: 0.02, transmission: 0.2, emissive: '#bfe8ff', emissiveIntensity: 0.4, clearcoat: 1 }), 0.4, 2.5),
  canopy: new THREE.MeshStandardMaterial({ map: stripes('#1f6fb2', '#f5f1e8', 10), roughness: 0.8, side: THREE.DoubleSide }),
};

// ───────────────────────── west end ─────────────────────────

export function School() {
  const side = facadeMat('school', { cols: 8, rows: 3, wall: '#8a4b38', glass: '#2a2f33', lit: 0.6, frame: '#efe6d2', rough: 0.9, metal: 0 });
  const tower = facadeMat('school-t', { cols: 2, rows: 5, wall: '#8a4b38', glass: '#2a2f33', lit: 0.5, frame: '#efe6d2', rough: 0.9, metal: 0 });
  return (
    <group>
      <Box size={[10, 0.12, 10]} position={[0, 0.06, 0]} material={M.lawn} cast={false} />
      <Block size={[9, 5.5, 5]} position={[0, 2.75, -1.8]} side={side} roof={M.charcoal} />
      <Box size={[9.4, 0.4, 5.4]} position={[0, 5.7, -1.8]} material={M.white} />
      {[-2.4, -0.8, 0.8, 2.4].map((x) => <Cyl key={x} r={0.25} h={4} position={[x, 2, 1.2]} material={M.marble} seg={12} />)}
      <Box size={[6, 0.4, 1.6]} position={[0, 4.2, 1.1]} material={M.white} />
      <mesh position={[0, 5, 1.1]} scale={[3.3, 0.8, 0.8]} material={M.white} castShadow><cylinderGeometry args={[1, 1, 2, 3, 1]} /></mesh>
      <Block size={[2.4, 9, 2.4]} position={[0, 4.5 + 5.5, -1.8]} side={tower} roof={M.charcoal} />
      <mesh position={[0, 12.6, -0.58]} rotation={[0, 0, 0]} material={M.white}><circleGeometry args={[0.8, 24]} /></mesh>
      <mesh position={[0, 12.6, -0.57]} rotation={[0, 0, 0.6]} material={M.charcoal}><planeGeometry args={[0.08, 0.6]} /></mesh>
      <mesh position={[0, 16.4, -1.8]} rotation={[0, Math.PI / 4, 0]} material={M.goldGlow} castShadow><coneGeometry args={[1.8, 3, 4]} /></mesh>
      <Sign text="WHITMORE SCHOOL" position={[0, 3.55, 2.2]} w={5} color="#e8cf77" />
      <Tree position={[-4, 0, 3.5]} />
      <Tree position={[4, 0, 3.5]} />
    </group>
  );
}

export function Realty() {
  const side = facadeMat('realty', { cols: 6, rows: 4, wall: '#d7dde2', glass: '#3c6378', lit: 0.5, metal: 0.6, rough: 0.2 });
  return (
    <group>
      <Block size={[7, 7, 6]} position={[-0.8, 3.5, -1.6]} side={side} roof={M.charcoal} />
      <Box size={[5, 0.35, 7.5]} position={[1.6, 7.2, -1]} material={M.white} />
      <Box size={[0.3, 7, 0.3]} position={[3.9, 3.5, 2.6]} material={M.white} />
      <Sign text="SKYLINE REALTY" position={[-0.8, 5.6, 1.42]} w={6} color="#ffffff" bg="#1d2b4a" />
      {/* show-home on a plinth */}
      <Box size={[2.6, 0.5, 2.6]} position={[2.4, 0.25, 3.2]} material={M.marble} />
      <Box size={[1.6, 1.1, 1.4]} position={[2.4, 1.05, 3.2]} material={M.white} />
      <mesh position={[2.4, 1.95, 3.2]} rotation={[0, Math.PI / 4, 0]} material={M.brick}><coneGeometry args={[1.25, 0.7, 4]} /></mesh>
    </group>
  );
}

export function Motors() {
  return (
    <group>
      <Box size={[10, 0.2, 9]} position={[0, 0.1, -0.5]} material={M.marble} cast={false} />
      <Box size={[9, 0.4, 6.6]} position={[0, 4.4, -1.4]} material={M.charcoal} />
      <Box size={[8.6, 4.1, 6.2]} position={[0, 2.25, -1.4]} material={M.glass} cast={false} />
      {[-4.3, 4.3].map((x) => <Box key={x} size={[0.25, 4.2, 0.25]} position={[x, 2.2, 1.7]} material={M.chrome} />)}
      <Box size={[9.2, 0.3, 0.3]} position={[0, 4.7, 1.8]} material={M.goldGlow} />
      <Sign text="PRESTIGE MOTORS" position={[0, 5.4, 1.95]} w={6.5} color="#ffffff" />
      <Car kind="sportscar" position={[-2, 0.2, -1.6]} rotation={0.6} />
      <Car kind="hypercar" position={[2, 0.2, -1.6]} rotation={-0.6} />
      <Car kind="suv" position={[3, 0, 3.4]} rotation={Math.PI / 2} />
      {[-4, -2.6].map((x) => (
        <group key={x} position={[x, 0, 3.6]}>
          <Cyl r={0.04} h={4} position={[0, 2, 0]} material={M.chrome} seg={6} />
          <Box size={[0.9, 1.4, 0.02]} position={[0.47, 3.2, 0]} material={x < -3 ? M.goldGlow : M.charcoal} cast={false} />
        </group>
      ))}
    </group>
  );
}

// ───────────────────────── north row ─────────────────────────

export function Jeweller() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) { ref.current.rotation.y = clock.elapsedTime * 0.6; ref.current.position.y = 7.6 + Math.sin(clock.elapsedTime * 1.4) * 0.15; } });
  return (
    <group>
      <Box size={[8, 0.3, 7]} position={[0, 0.15, -0.5]} material={M.marble} cast={false} />
      <Box size={[7, 5, 5]} position={[0, 2.8, -1.5]} material={M.charcoal} />
      <Box size={[7.3, 0.25, 5.3]} position={[0, 5.4, -1.5]} material={M.gold} />
      <Box size={[7.3, 0.18, 5.3]} position={[0, 0.5, -1.5]} material={M.gold} />
      <Box size={[2.4, 3, 0.1]} position={[-1.8, 2, 1.02]} material={M.glass} />
      <Box size={[2.4, 3, 0.1]} position={[1.8, 2, 1.02]} material={M.glass} />
      <Box size={[1.1, 2.8, 0.12]} position={[0, 1.9, 1.04]} material={M.gold} />
      <Sign text="AURELIA" position={[0, 4.4, 1.06]} w={4.4} color="#e8cf77" font="bold Georgia, 'Playfair Display', serif" />
      <mesh ref={ref} position={[0, 7.6, -1.5]} material={V.diamond} castShadow><octahedronGeometry args={[1.1, 0]} /></mesh>
      <Cyl r={0.5} rTop={0.2} h={1.6} position={[0, 6.3, -1.5]} material={M.gold} seg={6} />
    </group>
  );
}

export function Airport() {
  const side = facadeMat('terminal', { cols: 12, rows: 2, wall: '#e9edf0', glass: '#4d7a90', lit: 0.7, metal: 0.6, rough: 0.2 });
  return (
    <group>
      <Block size={[10, 3.6, 5.5]} position={[0, 1.8, -1.6]} side={side} roof={M.white} />
      <mesh position={[0, 3.9, -1.6]} rotation={[0, 0, Math.PI / 2]} scale={[0.6, 1, 1.6]} material={M.white} castShadow>
        <cylinderGeometry args={[2, 2, 11, 24, 1, false, 0, Math.PI]} />
      </mesh>
      <Box size={[11, 0.2, 1.8]} position={[0, 3.4, 1.8]} material={M.white} />
      <Sign text="SKY HARBOUR" position={[0, 2.85, 1.19]} w={5.6} color="#1d2b4a" bg="#f4f1ea" />
      {/* control tower */}
      <Cyl r={0.7} rTop={0.55} h={11} position={[3.8, 5.5, -3.6]} material={M.white} seg={14} />
      <Cyl r={1.5} rTop={1.8} h={1.4} position={[3.8, 11.6, -3.6]} material={M.tint} seg={14} />
      <Cyl r={1.9} h={0.25} position={[3.8, 12.4, -3.6]} material={M.white} seg={14} />
      <AviationLight position={[3.8, 13, -3.6]} />
      <Box size={[1.2, 0.08, 6]} position={[-3.5, 0.05, -6.5]} material={M.yellowPaint} cast={false} />
    </group>
  );
}

// ───────────────────────── east end ─────────────────────────

export function Clinic() {
  const side = facadeMat('clinic', { cols: 6, rows: 8, wall: '#f2f4f5', glass: '#6c93a8', lit: 0.65, frame: '#d7dde2', metal: 0.2, rough: 0.5 });
  return (
    <group>
      <Box size={[9, 0.2, 9]} position={[0, 0.1, -0.5]} material={M.marble} cast={false} />
      <Block size={[8, 11, 6]} position={[0, 5.5, -1.6]} side={side} roof={M.white} />
      <Box size={[6, 0.3, 2.2]} position={[0, 3, 2.3]} material={M.white} />
      {/* red cross */}
      <Box size={[0.6, 2, 0.12]} position={[0, 8.6, 1.47]} material={V.red} cast={false} />
      <Box size={[2, 0.6, 0.12]} position={[0, 8.6, 1.47]} material={V.red} cast={false} />
      <Sign text="ST. REGIS CLINIC" position={[0, 3.6, 1.42]} w={5.4} color="#c0201f" bg="#ffffff" />
      {/* helipad */}
      <Cyl r={2.6} h={0.25} position={[0, 11.2, -1.6]} material={V.helipad} seg={28} />
      <Sign text="H" position={[0, 11.34, -1.6]} rotation={[-Math.PI / 2, 0, 0]} w={10} color="#ffffff" />
      {[[-3.6, -4.2], [3.6, -4.2], [-3.6, 1], [3.6, 1]].map(([x, z]) => <AviationLight key={`${x}${z}`} position={[x, 11.3, z]} />)}
      <Car kind="van" position={[3.2, 0, 3.6]} rotation={Math.PI / 2} color="#f7f7f5" />
    </group>
  );
}

export function Gym() {
  const side = facadeMat('gym', { cols: 6, rows: 3, wall: '#2a2c30', glass: '#3a4a55', lit: 0.8, metal: 0.4, rough: 0.4 });
  return (
    <group>
      <Block size={[9, 6, 6.5]} position={[0, 3, -1.5]} side={side} roof={M.charcoal} />
      <Box size={[8, 3.6, 0.1]} position={[0, 1.9, 1.8]} material={M.glass} />
      <Box size={[9.2, 0.6, 0.4]} position={[0, 4.3, 1.85]} material={M.charcoal} />
      <Sign text="IRON & OAK GYM" position={[0, 4.3, 2.07]} w={5.6} color="#ff9a3c" />
      <Box size={[9.4, 0.12, 0.12]} position={[0, 5.9, 1.8]} material={V.orange} cast={false} />
      {/* dumbbell sculpture */}
      <group position={[-3.2, 0.6, 3.6]} rotation={[0, 0.4, 0]}>
        <Cyl r={0.12} h={2} position={[0, 0.3, 0]} material={M.chrome} seg={8} />
        {[-0.85, 0.85].map((y) => <Cyl key={y} r={0.55} h={0.35} position={[0, 0.3 + y, 0]} material={M.charcoal} seg={16} />)}
      </group>
      {/* rooftop running track */}
      <mesh position={[0, 6.05, -1.5]} rotation={[-Math.PI / 2, 0, 0]} material={V.orange}><ringGeometry args={[2.2, 2.6, 32]} /></mesh>
    </group>
  );
}

export function Casino() {
  const side = facadeMat('casino', { cols: 8, rows: 4, wall: '#2a2214', glass: '#c9a24a', lit: 0.85, frame: '#3a2f1a', metal: 0.85, rough: 0.2 });
  return (
    <group>
      <Box size={[10.5, 0.3, 10]} position={[0, 0.15, -0.3]} material={M.marble} cast={false} />
      <Block size={[10, 7, 6.5]} position={[0, 3.6, -1.8]} side={side} roof={M.gold} />
      <mesh position={[0, 7.1, -1.8]} material={M.goldGlow} castShadow><sphereGeometry args={[2.6, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <mesh position={[0, 9.9, -1.8]} material={M.goldGlow}><coneGeometry args={[0.35, 1.4, 8]} /></mesh>
      {/* neon arch over the entrance */}
      <mesh position={[0, 1.2, 1.9]} material={M.neonPink}><torusGeometry args={[2, 0.12, 8, 32, Math.PI]} /></mesh>
      <Box size={[10.3, 0.15, 0.15]} position={[0, 5.4, 1.5]} material={M.neon} cast={false} />
      <Box size={[10.3, 0.15, 0.15]} position={[0, 6.9, 1.5]} material={M.neon} cast={false} />
      <Sign text="GOLDEN PALACE" position={[0, 6.15, 1.62]} w={7} color="#ffd36a" />
      <Sign text="CASINO" position={[0, 3.9, 1.62]} w={3.4} color="#ff5fb0" />
      {/* fountain */}
      <Cyl r={1.4} h={0.5} position={[0, 0.4, 3.9]} material={M.stone} seg={24} />
      <Cyl r={1.25} h={0.08} position={[0, 0.66, 3.9]} material={M.pool} seg={24} />
      <Palm position={[-4.4, 0, 3.6]} s={1.1} />
      <Palm position={[4.4, 0, 3.6]} s={1.1} lean={-0.12} />
      <SearchLight position={[-4.2, 7.2, -4]} phase={0.5} />
      <SearchLight position={[4.2, 7.2, -4]} phase={2.5} />
    </group>
  );
}

export function Arena() {
  const wall = useMemo(() => {
    const m = facadeMat('arena', { cols: 24, rows: 2, wall: '#e9e6df', glass: '#2f3a4a', lit: 0.6, metal: 0.1, rough: 0.7 });
    const c = m.clone();
    c.side = THREE.DoubleSide;
    return c;
  }, []);
  return (
    <group>
      <mesh position={[0, 2.4, -0.4]} scale={[1, 1, 0.82]} material={wall} castShadow receiveShadow>
        <cylinderGeometry args={[5.3, 5.1, 4.8, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 2.2, -0.4]} scale={[1, 1, 0.82]} material={V.seats}>
        <cylinderGeometry args={[5.1, 2.8, 4, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.25, -0.4]} scale={[1, 1, 0.82]} rotation={[-Math.PI / 2, 0, 0]} material={V.pitch}><circleGeometry args={[2.85, 32]} /></mesh>
      <mesh position={[0, 0.27, -0.4]} rotation={[-Math.PI / 2, 0, 0]} material={M.paint}><ringGeometry args={[0.6, 0.7, 24]} /></mesh>
      <mesh position={[0, 4.85, -0.4]} scale={[1, 1, 0.82]} rotation={[-Math.PI / 2, 0, 0]} material={M.goldGlow}><ringGeometry args={[5.05, 5.4, 40]} /></mesh>
      {[[-4.6, -4.2], [4.6, -4.2], [-4.6, 3.4], [4.6, 3.4]].map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <Cyl r={0.12} h={8} position={[0, 4, 0]} material={M.charcoal} seg={6} />
          <Box size={[1.4, 0.8, 0.2]} position={[0, 8.1, 0]} rotation={[0.5 * Math.sign(-z), 0, 0]} material={V.flood} cast={false} />
        </group>
      ))}
      <Sign text="CROWN ARENA" position={[0, 3.6, 4.0]} w={5} color="#ffffff" bg="#7a1020" />
    </group>
  );
}

/** Faces +z by default; Hotspot turns it to face the road to the north. */
export function BeachClub() {
  return (
    <group>
      <Box size={[10, 0.25, 10]} position={[0, 0.12, 0]} material={M.teak} cast={false} />
      <RoundedBox args={[8, 3.2, 3.6]} radius={0.25} position={[0, 1.85, 2]} material={M.white} castShadow />
      <Box size={[8.8, 0.25, 4.6]} position={[0, 3.55, 2]} material={M.teak} />
      <Box size={[6.4, 2.2, 0.08]} position={[0, 1.7, 3.83]} material={M.glass} />
      <Sign text="AZURE BEACH CLUB" position={[0, 4.3, 3.9]} w={6} color="#3fc3ff" />
      {/* pool deck facing the sea */}
      <Box size={[6, 0.1, 2.6]} position={[0, 0.28, -1.6]} material={M.pool} cast={false} />
      {[-3.2, -1.1, 1.1, 3.2].map((x) => (
        <group key={x} position={[x, 0, -4]}>
          <Box size={[1.6, 0.1, 1.4]} position={[0, 2.1, 0]} material={V.canopy} />
          {[[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]].map(([a, b]) => <Cyl key={`${a}${b}`} r={0.04} h={2} position={[a, 1.1, b]} material={M.white} seg={5} />)}
          <Box size={[1.2, 0.3, 1]} position={[0, 0.42, 0]} material={M.white} />
        </group>
      ))}
      <Palm position={[-4.6, 0, -0.5]} s={1.15} />
      <Palm position={[4.6, 0, -0.8]} s={1.05} lean={-0.15} />
    </group>
  );
}

// ───────────────────────── filler ─────────────────────────

export function FillerTower({ h = 20, style = 0 }: { h?: number; style?: number }) {
  const m = useMemo(() => towerMat(style, 8, h), [style, h]);
  return (
    <group>
      <mesh position={[0, h / 2, -0.8]} material={m} castShadow receiveShadow><boxGeometry args={[8, h, 7.5]} /></mesh>
      <Box size={[6, 1.2, 5]} position={[0, h + 0.6, -0.8]} material={M.charcoal} />
      {[[-2, -2], [1.6, 0.6]].map(([x, z]) => <Box key={`${x}${z}`} size={[1, 0.7, 1]} position={[x, h + 1.55, z - 0.8]} material={M.stone} />)}
      {h > 24 && <AviationLight position={[0, h + 1.4, -0.8]} />}
    </group>
  );
}

export function Park() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => { if (ref.current) ref.current.scale.y = 1 + Math.sin(clock.elapsedTime * 3) * 0.12; });
  return (
    <group>
      <Box size={[10.5, 0.15, 10.5]} position={[0, 0.07, 0]} material={M.lawn} cast={false} />
      <Box size={[1.4, 0.16, 10.5]} position={[0, 0.08, 0]} material={M.sand} cast={false} />
      <Box size={[10.5, 0.16, 1.4]} position={[0, 0.08, 0]} material={M.sand} cast={false} />
      <Cyl r={1.6} h={0.5} position={[0, 0.35, 0]} material={M.stone} seg={24} />
      <Cyl r={1.4} h={0.1} position={[0, 0.62, 0]} material={M.pool} seg={24} />
      <mesh ref={ref} position={[0, 1.3, 0]} material={M.pool}><cylinderGeometry args={[0.06, 0.25, 1.6, 8]} /></mesh>
      {[[-3.5, -3.5], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [-4, 0.9], [4, -0.9]].map(([x, z], i) => <Tree key={i} position={[x, 0, z]} s={1 + (i % 3) * 0.12} />)}
      {[[-1.9, 2.2], [1.9, -2.2]].map(([x, z]) => <Box key={`${x}${z}`} size={[1.2, 0.35, 0.4]} position={[x, 0.3, z]} material={M.teak} />)}
    </group>
  );
}
