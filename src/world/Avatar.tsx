import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { M, world } from './materials';
import { routeBetween, standPoint, type LocId } from './layout';
import { Car } from './Props';

const OUTFITS = {
  couture: { top: '#f4f1ea', legs: '#f4f1ea', accent: '#D4AF37', shades: true },
  tailored: { top: '#2a2a2e', legs: '#2a2a2e', accent: '#D4AF37', shades: true },
  suit: { top: '#1d2b4a', legs: '#1d2b4a', accent: '#b0b6c2', shades: false },
  street: { top: '#6e1f2b', legs: '#2b2b33', accent: '#f4f1ea', shades: false },
  basic: { top: '#8a8f94', legs: '#3b4a63', accent: '#8a8f94', shades: false },
};
const CAR_ORDER = ['hypercar', 'sportscar', 'suv', 'sedan'];

/** The player: walks (or drives, once you own a car) the road grid to wherever your last action took place. */
export default function Avatar() {
  const g = useGame((s) => s.game)!;
  const target = useGame((s) => s.avatarTarget);
  const activity = useGame((s) => s.activity);
  const group = useRef<THREE.Group>(null);
  const person = useRef<THREE.Group>(null);
  const car = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Mesh>(null);
  const legR = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const at = useRef<LocId>(target);
  const queue = useRef<[number, number][]>([]);
  const walking = useRef(false);

  const tg = E.tags(g);
  const hasWatch = g.assets.some((a) => a.itemId === 'goldwatch' || a.itemId === 'divewatch');
  const ride = CAR_ORDER.find((c) => g.assets.some((a) => a.itemId === c));
  const outfit = tg.has('couture') ? OUTFITS.couture : tg.has('tailored') ? OUTFITS.tailored : tg.has('suit') ? OUTFITS.suit
    : g.assets.some((a) => a.itemId === 'streetwear') ? OUTFITS.street : OUTFITS.basic;
  const speed = ride ? 9 + E.modifiers(g).commute * 16 : 5.5;

  const mats = useMemo(() => ({
    top: new THREE.MeshStandardMaterial({ color: outfit.top, roughness: 0.6 }),
    legs: new THREE.MeshStandardMaterial({ color: outfit.legs, roughness: 0.7 }),
    accent: new THREE.MeshStandardMaterial({ color: outfit.accent, metalness: 0.6, roughness: 0.3 }),
    skin: new THREE.MeshStandardMaterial({ color: '#7b4a2e', roughness: 0.55 }),
    hair: new THREE.MeshStandardMaterial({ color: '#141110', roughness: 0.9 }),
    shoe: new THREE.MeshStandardMaterial({ color: '#0d0d0d', roughness: 0.3, metalness: 0.2 }),
    ring: new THREE.MeshBasicMaterial({ color: '#E8CF77', transparent: true, opacity: 0.6, depthWrite: false }),
  }), [outfit]);

  // Place at home on first mount.
  useEffect(() => {
    const [x, z] = standPoint(at.current);
    group.current?.position.set(x, 0, z);
  }, []);

  // New destination → plan a route along the roads.
  useEffect(() => {
    if (target === at.current && !walking.current) return;
    queue.current = routeBetween(at.current, target);
    at.current = target;
  }, [target]);

  useFrame(({ clock }, dt) => {
    const grp = group.current;
    if (!grp) return;
    const next = queue.current[0];
    let moving = false;
    if (next) {
      const dx = next[0] - grp.position.x;
      const dz = next[1] - grp.position.z;
      const dist = Math.hypot(dx, dz);
      const step = Math.min(dist, speed * Math.min(dt, 0.05));
      if (dist < 0.05) queue.current.shift();
      else {
        grp.position.x += (dx / dist) * step;
        grp.position.z += (dz / dist) * step;
        const want = Math.atan2(dx, dz);
        let diff = want - grp.rotation.y;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        grp.rotation.y += diff * Math.min(1, dt * (ride ? 7 : 12));
        moving = true;
      }
    }
    walking.current = moving;
    const driving = moving && !!ride;
    world.avatar.x = grp.position.x;
    world.avatar.z = grp.position.z;
    world.avatar.heading = grp.rotation.y;
    world.avatar.moving = moving;
    world.avatar.driving = driving;
    if (person.current) person.current.visible = !driving;
    if (car.current) car.current.visible = driving;

    const t = clock.elapsedTime * (moving ? 10 : 2);
    const swing = moving && !driving ? Math.sin(t) * 0.7 : 0;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) armR.current.rotation.x = swing * 0.8;
    if (person.current) person.current.children[0].position.y = moving ? Math.abs(Math.sin(t)) * 0.05 : Math.sin(t) * 0.012;
    if (ring.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.12;
      ring.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={group}>
      <group ref={person} scale={1.25}>
        <group>
          {/* legs (pivot at hip) */}
          <group position={[-0.12, 0.8, 0]}>
            <mesh ref={legL} material={mats.legs} castShadow geometry={legGeo}>
              <mesh position={[0, -0.78, 0.05]} material={mats.shoe} geometry={shoeGeo} />
            </mesh>
          </group>
          <group position={[0.12, 0.8, 0]}>
            <mesh ref={legR} material={mats.legs} castShadow geometry={legGeo}>
              <mesh position={[0, -0.78, 0.05]} material={mats.shoe} geometry={shoeGeo} />
            </mesh>
          </group>
          {/* torso */}
          <mesh position={[0, 1.13, 0]} material={mats.top} castShadow geometry={torsoGeo} />
          <mesh position={[0, 1.17, 0.15]} material={mats.accent}><boxGeometry args={[0.07, 0.38, 0.02]} /></mesh>
          {/* arms (pivot at shoulder) */}
          <group position={[-0.3, 1.38, 0]}><mesh ref={armL} material={mats.top} castShadow geometry={armGeo} /></group>
          <group position={[0.3, 1.38, 0]}>
            <mesh ref={armR} material={mats.top} castShadow geometry={armGeo}>
              {hasWatch && <mesh position={[0, -0.5, 0]} material={M.gold}><cylinderGeometry args={[0.075, 0.075, 0.06, 10]} /></mesh>}
            </mesh>
          </group>
          {/* head */}
          <mesh position={[0, 1.55, 0]} material={mats.skin}><cylinderGeometry args={[0.07, 0.08, 0.12, 8]} /></mesh>
          <mesh position={[0, 1.72, 0]} material={mats.skin} castShadow><sphereGeometry args={[0.17, 18, 14]} /></mesh>
          <mesh position={[0, 1.79, -0.02]} material={mats.hair}><sphereGeometry args={[0.175, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.3]} /></mesh>
          {outfit.shades && <mesh position={[0, 1.74, 0.15]} material={M.tint}><boxGeometry args={[0.28, 0.06, 0.04]} /></mesh>}
        </group>
      </group>
      {ride && (
        <group ref={car} visible={false}>
          <Car kind={ride} position={[0, 0, 0]} />
        </group>
      )}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} material={mats.ring}>
        <ringGeometry args={[0.6, 0.72, 32]} />
      </mesh>
      <Html position={[0, 2.9, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="hud-text whitespace-nowrap text-center leading-tight">
          <div className="font-hud text-[15px] tracking-wide text-white">{g.name}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold-light">{activity}</div>
        </div>
      </Html>
    </group>
  );
}

const legGeo = new THREE.CapsuleGeometry(0.085, 0.62, 4, 8).translate(0, -0.4, 0);
const armGeo = new THREE.CapsuleGeometry(0.065, 0.5, 4, 8).translate(0, -0.3, 0);
const torsoGeo = new THREE.CapsuleGeometry(0.21, 0.36, 4, 12).scale(1.15, 1, 0.75);
const shoeGeo = new THREE.BoxGeometry(0.15, 0.08, 0.26);
