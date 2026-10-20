import type { ActionGroup } from '../game/config';
import type { GameState } from '../game/types';

export type Tab = 'Actions' | 'Boutique' | 'Portfolio' | 'Finance' | 'Ledger';
export type LocId =
  | 'home' | 'office' | 'restaurant' | 'spa' | 'club' | 'boutique' | 'bank' | 'ventures' | 'plaza' | 'island'
  | 'gym' | 'clinic' | 'casino' | 'arena' | 'school' | 'beachclub' | 'airport' | 'motors' | 'realty' | 'jeweller';

export interface Loc {
  id: LocId;
  label: string;
  icon: string;
  /** Building centre. */
  pos: [number, number];
  /** Where the avatar stands (on a road). */
  door: [number, number];
  /** Building faces north (towards a road on its north side) instead of south. */
  facesNorth?: boolean;
  tab: Tab;
  groups?: ActionGroup[];
  shopCat?: string;
  hint: string;
}

/**
 * City grid: spacious 22-unit blocks centred on x ∈ {-66 … 66} and z ∈ {-44, -22, 0, 22},
 * each building on its own landscaped lawn, a business row at z = 46 and a runway along the north shore.
 * Roads run along x = -77 … 77 and z = -55 … 33.
 */
export const BLOCK = 22;
export const ROADS_X = [-77, -55, -33, -11, 11, 33, 55, 77];
export const ROADS_Z = [-55, -33, -11, 11, 33];
export const BOUNDS = { x0: -88, x1: 88, z0: -74, z1: 58 };
/** Vertical roads run between the northern- and southern-most streets. */
export const ROAD_Z_SPAN: [number, number] = [-55, 33];
export const RUNWAY_Z = -66;

const at = (x: number, z: number): { pos: [number, number]; door: [number, number] } => ({ pos: [x, z], door: [x, z + BLOCK / 2] });

export const LOCS: Record<LocId, Loc> = {
  bank: { id: 'bank', label: 'Private Bank', icon: '🏦', ...at(-22, -22), tab: 'Finance', hint: 'Loans & credit' },
  office: { id: 'office', label: 'Sterling & Vane Tower', icon: '💼', ...at(0, -22), tab: 'Actions', groups: ['Work'], hint: 'Work shifts' },
  restaurant: { id: 'restaurant', label: 'Maison Dorée', icon: '🍽️', ...at(22, -22), tab: 'Actions', groups: ['Dine'], hint: 'Dine' },
  home: { id: 'home', label: 'Home', icon: '🏠', ...at(-22, 0), tab: 'Actions', groups: ['Rest', 'Care'], hint: 'Sleep, rest & freshen up' },
  plaza: { id: 'plaza', label: 'Gilded Plaza', icon: '⛲', ...at(0, 0), tab: 'Ledger', hint: 'Your ledger' },
  spa: { id: 'spa', label: 'Aurum Spa', icon: '💆', ...at(22, 0), tab: 'Actions', groups: ['Care'], hint: 'Grooming & spa' },
  boutique: { id: 'boutique', label: 'The Boutique', icon: '👜', ...at(-22, 22), tab: 'Boutique', hint: 'Buy luxury' },
  club: { id: 'club', label: 'Club Noir', icon: '🍸', ...at(0, 22), tab: 'Actions', groups: ['Society'], hint: 'Society & networking' },
  ventures: { id: 'ventures', label: 'Ventures Row', icon: '🏗️', pos: [-5.5, 46], door: [-5.5, 33], tab: 'Boutique', shopCat: 'BUSINESS', hint: 'Buy & run businesses' },
  island: { id: 'island', label: 'Private Island', icon: '🏝️', pos: [130, 0], door: [77, 11], tab: 'Actions', groups: ['Rest', 'Care'], hint: 'Your island' },

  // West end
  school: { id: 'school', label: 'Whitmore Business School', icon: '🎓', ...at(-44, -22), tab: 'Actions', groups: ['Study'], hint: 'Classes count toward promotion' },
  realty: { id: 'realty', label: 'Skyline Realty', icon: '🏘️', ...at(-44, 0), tab: 'Boutique', shopCat: 'RESIDENCE', hint: 'Homes & rentals' },
  motors: { id: 'motors', label: 'Prestige Motors', icon: '🏎️', ...at(-44, 22), tab: 'Boutique', shopCat: 'VEHICLE', hint: 'Cars & jets' },
  // North row
  jeweller: { id: 'jeweller', label: 'Aurelia Jewellers', icon: '💎', ...at(-22, -44), tab: 'Boutique', shopCat: 'ACCESSORY', hint: 'Watches & jewels' },
  airport: { id: 'airport', label: 'Sky Harbour Terminal', icon: '✈️', ...at(44, -44), tab: 'Actions', groups: ['Travel'], hint: 'Trips & getaways' },
  // East end
  clinic: { id: 'clinic', label: 'St. Regis Clinic', icon: '🏥', ...at(44, -22), tab: 'Actions', groups: ['Health'], hint: 'Check-ups & treatment' },
  gym: { id: 'gym', label: 'Iron & Oak Gym', icon: '🏋️', ...at(44, 0), tab: 'Actions', groups: ['Fitness'], hint: 'Train for health' },
  casino: { id: 'casino', label: 'Golden Palace Casino', icon: '🎰', ...at(44, 22), tab: 'Actions', groups: ['Gamble'], hint: 'Try your luck' },
  arena: { id: 'arena', label: 'Crown Arena', icon: '🏟️', ...at(66, -22), tab: 'Actions', groups: ['Events'], hint: 'Matches & concerts' },
  beachclub: { id: 'beachclub', label: 'Azure Beach Club', icon: '🏖️', pos: [66, 46], door: [66, 33], facesNorth: true, tab: 'Actions', groups: ['Leisure'], hint: 'Beach, cabanas & yachts' },
};

/** Clickable buildings shown in the city. */
export const CITY_LOCS: LocId[] = [
  'bank', 'office', 'restaurant', 'home', 'plaza', 'spa', 'boutique', 'club',
  'school', 'realty', 'motors', 'jeweller', 'airport', 'clinic', 'gym', 'casino', 'arena', 'beachclub',
];

/** Non-clickable filler: towers and parks that make the city feel lived-in. */
export const FILLER: { x: number; z: number; kind: 'tower' | 'park'; h?: number; style?: number }[] = [
  { x: -44, z: -44, kind: 'park' },
  { x: 0, z: -44, kind: 'tower', h: 30, style: 2 },
  { x: 22, z: -44, kind: 'park' },
  { x: 66, z: -44, kind: 'tower', h: 16, style: 3 },
  { x: 66, z: 0, kind: 'park' },
  { x: 22, z: 22, kind: 'park' },
  { x: 66, z: 22, kind: 'tower', h: 26, style: 0 },
  // West Gardens: a column of parkland with a couple of residential towers
  { x: -66, z: -44, kind: 'tower', h: 20, style: 1 },
  { x: -66, z: -22, kind: 'park' },
  { x: -66, z: 0, kind: 'park' },
  { x: -66, z: 22, kind: 'tower', h: 14, style: 3 },
];

/** Business plots along Ventures Row, one per business type. */
export const BIZ_PLOTS: { itemId: string; x: number }[] = [
  { itemId: 'foodcart', x: -44 },
  { itemId: 'reseller', x: -33 },
  { itemId: 'carwash', x: -22 },
  { itemId: 'cafe', x: -11 },
  { itemId: 'boutique', x: 0 },
  { itemId: 'nightclub', x: 11 },
  { itemId: 'techfirm', x: 22 },
  { itemId: 'holding', x: 33 },
];
export const BIZ_Z = 46;

export const ACTION_LOC: Record<string, LocId> = {
  work: 'office', overtime: 'office', manage: 'ventures',
  suya: 'restaurant', bistro: 'restaurant', michelin: 'restaurant',
  nap: 'home', sleep: 'home', shower: 'home',
  barber: 'spa', spa: 'spa',
  cook: 'home', relax: 'home', call: 'home', drinks: 'club', club: 'club', gala: 'club', poker: 'club',
  course: 'school', mba: 'school',
  workout: 'gym', yoga: 'gym', trainer: 'gym',
  checkup: 'clinic', treatment: 'clinic',
  beach: 'beachclub', cabana: 'beachclub', yacht: 'beachclub',
  match: 'arena', concert: 'arena', vipbox: 'arena',
  slots: 'casino', blackjack: 'casino', highroller: 'casino',
  getaway: 'airport', monaco: 'airport',
};

export function homeLoc(g: GameState): LocId {
  return g.assets.some((a) => a.itemId === 'island') ? 'island' : 'home';
}

/** Where purchases are "delivered" to (for the gold burst). */
export function purchaseLoc(category: string, g: GameState): LocId {
  if (category === 'BUSINESS') return 'ventures';
  if (category === 'RESIDENCE' || category === 'VEHICLE' || category === 'STAFF') return homeLoc(g);
  if (category === 'ACCESSORY') return 'jeweller';
  return 'boutique';
}

export const ISLAND_POS = LOCS.island.pos;
const ISLAND_PATH: [number, number][] = [[77, 0], [BOUNDS.x1, 0], [ISLAND_POS[0] - 4, 0]];

function dedupe(pts: [number, number][], start: [number, number]) {
  const out: [number, number][] = [];
  let prev = start;
  for (const p of pts) {
    if (Math.abs(p[0] - prev[0]) < 0.01 && Math.abs(p[1] - prev[1]) < 0.01) continue;
    out.push(p);
    prev = p;
  }
  return out;
}

/** L-shaped route along the road grid between two door points (doors sit on horizontal roads). */
function roadRoute(from: [number, number], to: [number, number]): [number, number][] {
  const [fx, fz] = from;
  const [tx, tz] = to;
  if (Math.abs(fz - tz) < 0.01) return [[tx, tz]];
  let best = ROADS_X[0];
  let cost = Infinity;
  for (const r of ROADS_X) {
    const c = Math.abs(fx - r) + Math.abs(tx - r);
    if (c < cost) { cost = c; best = r; }
  }
  return [[best, fz], [best, tz], [tx, tz]];
}

/** Full walking route between two locations, including the island causeway. */
export function routeBetween(a: LocId, b: LocId): [number, number][] {
  if (a === b) return [];
  const start = standPoint(a);
  const pts: [number, number][] = [];
  let cur = start;
  if (a === 'island') { pts.push(...[...ISLAND_PATH].reverse(), LOCS.island.door); cur = LOCS.island.door; }
  pts.push(...roadRoute(cur, LOCS[b].door));
  if (b === 'island') pts.push(...ISLAND_PATH);
  return dedupe(pts, start);
}

export function standPoint(id: LocId): [number, number] {
  return id === 'island' ? ISLAND_PATH[ISLAND_PATH.length - 1] : LOCS[id].door;
}
