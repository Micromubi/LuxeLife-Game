import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, Sky, Sparkles, Stars } from '@react-three/drei';
import { Bloom, BrightnessContrast, EffectComposer, HueSaturation, N8AO, SMAA, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { OrbitControls as OrbitImpl, Sky as SkyImpl } from 'three-stdlib';
import { useGame } from '../game/store';
import { itemById } from '../game/config';
import { money } from '../lib/format';
import { BIZ_PLOTS, BIZ_Z, CITY_LOCS, ISLAND_POS, LOCS, type LocId } from './layout';
import { updateGlow, world, M } from './materials';
import { Bank, BoutiqueStore, BusinessBuilding, Club, EmptyLot, Office, Plaza, Residence, Restaurant, Spa } from './Buildings';
import { Boats, Car, Greenery, Ground, Island, Jet, Pedestrians, Skyline, StreetLamps, Traffic } from './Props';
import Avatar from './Avatar';

const RES_ORDER = ['villa', 'penthouse', 'apartment', 'flat'];
const CAR_ORDER = ['hypercar', 'sportscar', 'suv', 'sedan'];
export const LOC_ICON: Record<LocId, string> = {
  bank: '🏦', office: '💼', restaurant: '🍽️', home: '🏠', plaza: '⛲', spa: '💆', boutique: '👜', club: '🍸', ventures: '🏗️', island: '🏝️',
};

export default function World() {
  const gfx = useGame((s) => s.settings.gfx ?? 'high');
  const low = gfx === 'low';
  return (
    <Canvas
      shadows={low ? 'basic' : 'soft'}
      dpr={low ? 1 : [1, 1.75]}
      camera={{ position: [10, 34, 52], fov: 42, near: 0.5, far: 900 }}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.0; }}
    >
      <Suspense fallback={null}>
        <DayNight low={low} />
        <Environment resolution={128} frames={1}>
          <Lightformer form="rect" intensity={2.2} color="#fff4e2" position={[0, 12, -12]} scale={[30, 8, 1]} />
          <Lightformer form="rect" intensity={1.2} color="#b8d4ff" position={[-14, 6, 6]} rotation-y={Math.PI / 2} scale={[24, 5, 1]} />
          <Lightformer form="rect" intensity={1.4} color="#ffd6a3" position={[14, 5, 4]} rotation-y={-Math.PI / 2} scale={[20, 4, 1]} />
          <Lightformer form="ring" intensity={3} color="#ffffff" position={[0, 18, 0]} rotation-x={Math.PI / 2} scale={8} />
          <mesh scale={60}><sphereGeometry args={[1, 24, 12]} /><meshBasicMaterial color="#6b7f93" side={THREE.BackSide} /></mesh>
        </Environment>
        <CameraRig />
        <Ground reflect={gfx === 'ultra'} />
        <StreetLamps />
        <Greenery />
        <Boats />
        <Skyline />
        <City />
        <Traffic />
        {!low && <Pedestrians />}
        <Avatar />
        <Burst />
        {low ? (
          <EffectComposer multisampling={0}>
            <Bloom mipmapBlur luminanceThreshold={0.9} intensity={0.8} />
            <Vignette eskil={false} offset={0.25} darkness={0.55} />
          </EffectComposer>
        ) : (
          <EffectComposer multisampling={0}>
            <N8AO halfRes aoRadius={2.2} intensity={2.2} distanceFalloff={0.8} quality="performance" />
            <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={1.1} radius={0.75} />
            <HueSaturation saturation={0.14} />
            <BrightnessContrast contrast={0.1} />
            <Vignette eskil={false} offset={0.22} darkness={0.62} />
            <SMAA />
          </EffectComposer>
        )}
      </Suspense>
    </Canvas>
  );
}

// ───────────────────────── sky & light ─────────────────────────

const C_DAY = new THREE.Color('#a8c3da');
const C_DUSK = new THREE.Color('#d98a5c');
const C_NIGHT = new THREE.Color('#0a0f1e');
const SUN_DAY = new THREE.Color('#fff1d6');
const SUN_LOW = new THREE.Color('#ff9a55');

function DayNight({ low }: { low: boolean }) {
  const { scene } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sky = useRef<SkyImpl>(null);
  const moonDisc = useRef<THREE.Mesh>(null);
  const [stars, setStars] = useState(false);
  const fogC = useMemo(() => new THREE.Color(), []);
  const sunDir = useMemo(() => new THREE.Vector3(), []);
  useMemo(() => { scene.fog = new THREE.Fog('#b9cad8', 90, 470); }, [scene]);

  useFrame(({ clock }) => {
    const { game, settings } = useGame.getState();
    if (!game) return;
    const frac = settings.paused || game.brokeOpen ? 0 : Math.min(1, Math.max(0, (Date.now() - game.lastTickAt) / settings.tickMs));
    const h = (game.hour % 24) + frac;
    world.time = h;
    const ang = ((h - 6) / 24) * Math.PI * 2;
    const sy = Math.sin(ang);
    const night = THREE.MathUtils.clamp((0.12 - sy) / 0.35, 0, 1);
    world.night = night;
    updateGlow(night);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(sy) / 0.32, 0, 1) * (1 - night * 0.7);

    // Physical sky follows the sun; sun sets in the west over the sea.
    sunDir.set(Math.cos(ang), sy, -0.35).normalize();
    const u = (sky.current?.material as THREE.ShaderMaterial | undefined)?.uniforms;
    if (u) {
      u.sunPosition.value.copy(sunDir);
      u.rayleigh.value = 2 + dusk * 1.6;
      u.turbidity.value = 3.5 + dusk * 7;
    }
    fogC.copy(C_DAY).lerp(C_DUSK, dusk * 0.6).lerp(C_NIGHT, night);
    (scene.fog as THREE.Fog).color.copy(fogC);
    // Deep night: swap the (black) physical sky for a blue-black that matches the fog on the horizon.
    scene.background = fogC;
    if (sky.current) sky.current.visible = night < 0.9;
    scene.environmentIntensity = 0.75 - night * 0.5;

    if (sun.current) {
      sun.current.position.set(sunDir.x * 90, Math.max(6, sunDir.y * 90), sunDir.z * 90 + 30);
      sun.current.intensity = Math.max(0, sy) * 2.3 + dusk * 0.6;
      sun.current.color.copy(SUN_DAY).lerp(SUN_LOW, dusk);
    }
    if (moon.current) moon.current.intensity = night * 0.6;
    if (moonDisc.current) {
      moonDisc.current.position.set(-sunDir.x * 380, Math.max(-40, -sunDir.y * 300), -260);
      moonDisc.current.visible = night > 0.3;
    }
    if (hemi.current) hemi.current.intensity = 0.6 - night * 0.38;
    // Tower warning lights blink once a second-ish, brighter at night.
    M.aviation.emissiveIntensity = (clock.elapsedTime % 1.4) < 0.25 ? 1.5 + night * 5 : 0.05;
    if ((night > 0.5) !== stars) setStars(night > 0.5);
  });

  return (
    <>
      <Sky ref={sky} distance={800} sunPosition={[1, 0.5, -0.35]} mieCoefficient={0.004} mieDirectionalG={0.86} rayleigh={1.2} turbidity={6} />
      <hemisphereLight ref={hemi} args={['#e8f1ff', '#4a3e2c', 0.6]} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={low ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-62}
        shadow-camera-right={62}
        shadow-camera-top={62}
        shadow-camera-bottom={-62}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <directionalLight ref={moon} position={[-40, 60, -30]} color="#8fa6ff" intensity={0} />
      <mesh ref={moonDisc}>
        <sphereGeometry args={[9, 24, 16]} />
        <meshBasicMaterial color="#fdf6e3" fog={false} toneMapped={false} />
      </mesh>
      {stars && <Stars radius={500} depth={80} count={3500} factor={7} fade speed={0.4} />}
    </>
  );
}

// ───────────────────────── camera ─────────────────────────

/** Orbit camera that glides to places you open, and chases the player while they travel. */
function CameraRig() {
  const controls = useRef<OrbitImpl>(null);
  const focus = useGame((s) => s.focus);
  const anim = useRef<{ target: THREE.Vector3; cam: THREE.Vector3; t: number } | null>(null);
  const recenter = useRef(world.recenter);
  const { camera } = useThree();
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    if (!focus || !controls.current) return;
    const L = LOCS[focus.loc];
    const target = new THREE.Vector3(L.pos[0], 2, L.pos[1]);
    const offset = camera.position.clone().sub(controls.current.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length(), 30, 52));
    anim.current = { target, cam: target.clone().add(offset), t: 0 };
  }, [focus, camera]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!c) return;
    world.cam.yaw = Math.atan2(c.target.x - camera.position.x, c.target.z - camera.position.z);

    if (world.recenter !== recenter.current) {
      recenter.current = world.recenter;
      const target = new THREE.Vector3(world.avatar.x, 1.5, world.avatar.z);
      const offset = camera.position.clone().sub(c.target).setLength(26);
      anim.current = { target, cam: target.clone().add(offset), t: 0 };
    }
    const a = anim.current;
    if (a) {
      a.t += dt;
      const k = 1 - Math.exp(-dt * 4);
      c.target.lerp(a.target, k);
      camera.position.lerp(a.cam, k);
      c.update();
      if (a.t > 1.6) anim.current = null;
      return;
    }
    // Chase cam: while the player travels, slide the view along with them.
    if (world.avatar.moving) {
      tmp.set(world.avatar.x, 1.5, world.avatar.z).sub(c.target);
      tmp.multiplyScalar(1 - Math.exp(-dt * 3));
      c.target.add(tmp);
      camera.position.add(tmp);
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[-8, 0, 4]}
      enableDamping
      dampingFactor={0.08}
      minDistance={8}
      maxDistance={150}
      minPolarAngle={0.2}
      maxPolarAngle={1.38}
      onStart={() => { anim.current = null; }}
    />
  );
}

// ───────────────────────── city & interaction ─────────────────────────

function Hotspot({ loc, children, labelY = 7, sub }: { loc: LocId; children: ReactNode; labelY?: number; sub?: string }) {
  const visit = useGame((s) => s.visit);
  const [hover, setHover] = useState(false);
  const L = LOCS[loc];
  const ring = useMemo(() => new THREE.MeshBasicMaterial({ color: '#E8CF77', transparent: true, opacity: 0, depthWrite: false }), []);
  useFrame(() => { ring.opacity += ((hover ? 0.55 : 0) - ring.opacity) * 0.2; });
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    return () => { document.body.style.cursor = ''; };
  }, [hover]);
  return (
    <group position={[L.pos[0], 0, L.pos[1]]}>
      <group
        onClick={(e) => { e.stopPropagation(); visit(loc); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={() => setHover(false)}
      >
        {children}
        {/* invisible hit area so the whole plot is clickable */}
        <mesh position={[0, 0.2, 0]} visible={false}><boxGeometry args={[11, 0.4, 11]} /></mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={ring}>
        <ringGeometry args={[6.3, 6.8, 48]} />
      </mesh>
      <Html position={[0, labelY, 0]} center zIndexRange={[10, 0]}>
        <button
          onClick={() => visit(loc)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          className={`hud-text flex items-center gap-1.5 whitespace-nowrap text-left transition ${hover ? 'scale-110' : 'opacity-90'}`}
        >
          <span className={`grid h-7 w-7 place-items-center rounded-full border text-[14px] shadow-lg ${hover ? 'border-gold bg-black/85' : 'border-white/40 bg-black/60'}`}>{LOC_ICON[loc]}</span>
          <span>
            <span className="block font-hud text-[14px] uppercase leading-none tracking-wide text-white">{L.label}</span>
            <span className={`block text-[10px] font-semibold leading-tight text-gold-light transition-opacity ${hover ? 'opacity-100' : 'opacity-0'}`}>{sub ?? L.hint}</span>
          </span>
        </button>
      </Html>
    </group>
  );
}

/** A car parked at home; it disappears while you're out driving it. */
function ParkedCar({ kind, position, inUse }: { kind: string; position: [number, number, number]; inUse: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => { if (ref.current) ref.current.visible = !(inUse && world.avatar.driving); });
  return <group ref={ref}><Car kind={kind} position={position} rotation={0} /></group>;
}

function City() {
  const assets = useGame((s) => s.game!.assets);
  const owned = useMemo(() => new Set(assets.map((a) => a.itemId)), [assets]);
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach((a) => (m[a.itemId] = (m[a.itemId] ?? 0) + 1));
    return m;
  }, [assets]);
  const home = RES_ORDER.find((r) => owned.has(r)) ?? 'studio';
  const cars = CAR_ORDER.filter((c) => owned.has(c));
  const homeName = { villa: 'Hillside Villa', penthouse: 'Penthouse', apartment: 'City Apartment', flat: 'Starter Flat', studio: 'Rented Studio' }[home];
  const rentals = assets.filter((a) => a.category === 'RESIDENCE').length - (home === 'studio' ? 0 : 1);

  const BUILD: Record<string, ReactNode> = {
    bank: <Bank />, office: <Office />, restaurant: <Restaurant />, plaza: <Plaza />, spa: <Spa />, boutique: <BoutiqueStore />, club: <Club />,
  };
  const LABEL_Y: Record<string, number> = { office: 35, bank: 9, restaurant: 8, plaza: 6, spa: 8, boutique: 7.5, club: 9 };

  return (
    <group>
      {CITY_LOCS.filter((l) => l !== 'home').map((l) => (
        <Hotspot key={l} loc={l} labelY={LABEL_Y[l]}>{BUILD[l]}</Hotspot>
      ))}

      <Hotspot loc="home" labelY={home === 'penthouse' ? 26 : home === 'apartment' ? 14 : 10} sub={`${homeName}${rentals > 0 ? ` · ${rentals} rental${rentals > 1 ? 's' : ''}` : ''} · rest, cook & care`}>
        <Residence kind={home} />
        {cars.map((c, i) => <ParkedCar key={c} kind={c} inUse={i === 0} position={[-3.6 + i * 2.1, 0, 4.2]} />)}
      </Hotspot>

      <VenturesRow owned={owned} counts={counts} />
      {owned.has('island') && (
        <>
          <Island />
          <Hotspot loc="island" labelY={10} sub="Your private island">
            <group />
          </Hotspot>
        </>
      )}
      {owned.has('jet') && <Jet />}
      {/* a hint of what's out there */}
      {!owned.has('island') && (
        <mesh position={[ISLAND_POS[0] + 20, -0.4, -30]} material={M.sand}><cylinderGeometry args={[5, 6, 1, 24]} /></mesh>
      )}
    </group>
  );
}

function VenturesRow({ owned, counts }: { owned: Set<string>; counts: Record<string, number> }) {
  const visit = useGame((s) => s.visit);
  const openTab = useGame((s) => s.openTab);
  return (
    <group>
      {BIZ_PLOTS.map((p, i) => {
        const has = owned.has(p.itemId);
        const it = itemById(p.itemId)!;
        return (
          <group
            key={p.itemId}
            position={[p.x, 0, BIZ_Z]}
            onClick={(e) => { e.stopPropagation(); if (has) openTab('Portfolio'); else visit('ventures'); }}
          >
            {has ? <BusinessBuilding itemId={p.itemId} /> : <EmptyLot />}
            <mesh position={[0, 0.2, 0]} visible={false}><boxGeometry args={[6.5, 0.4, 9]} /></mesh>
            <Html position={[0, has ? (p.itemId === 'holding' ? 30 : p.itemId === 'foodcart' || p.itemId === 'reseller' ? 5 + (i % 2) * 2 : 8.5 + (i % 2) * 2) : 3.2 + (i % 2) * 2.4, 0]} center zIndexRange={[10, 0]}>
              <button
                onClick={() => (has ? openTab('Portfolio') : visit('ventures'))}
                className={`hud-text whitespace-nowrap text-[11px] font-bold uppercase tracking-wide ${has ? 'text-gold-light' : 'text-white/80'}`}
              >
                {has ? `${it.name}${counts[p.itemId] > 1 ? ` ×${counts[p.itemId]}` : ''}` : <>{it.name} <span className="text-[#7ee07e]">{money(it.price, true)}</span></>}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function Burst() {
  const burst = useGame((s) => s.burst);
  const [show, setShow] = useState<{ pos: [number, number, number]; key: number } | null>(null);
  useEffect(() => {
    if (!burst) return;
    const L = LOCS[burst.loc];
    setShow({ pos: [L.pos[0], 3, L.pos[1]], key: burst.n });
    const t = setTimeout(() => setShow(null), 1800);
    return () => clearTimeout(t);
  }, [burst]);
  if (!show) return null;
  return <Sparkles key={show.key} position={show.pos} count={90} scale={[9, 7, 9]} size={9} speed={1.6} color="#F6E7B0" />;
}
