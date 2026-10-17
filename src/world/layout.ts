import type { ActionGroup } from '../game/config';
import type { GameState } from '../game/types';

export type Tab = 'Actions' | 'Boutique' | 'Portfolio' | 'Finance' | 'Ledger';
export type LocId = 'home' | 'office' | 'restaurant' | 'spa' | 'club' | 'boutique' | 'bank' | 'ventures' | 'plaza' | 'island';

export interface Loc {
  id: LocId;
  label: string;
  /** Building centre. */
  pos: [number, number];
  /** Where the avatar stands (on a road). */
  door: [number, number];
  tab: Tab;
  groups?: ActionGroup[];
  shopCat?: string;
  hint: string;
}

/**
 * City grid: blocks centred on x ∈ {-14, 0, 14}, rows z ∈ {-14, 0, 14} plus a business row at z = 30.
 * Roads run along x = ±7, ±21 and z = ±7, 21.
 */
export const LOCS: Record<LocId, Loc> = {
  bank: { id: 'bank', label: 'Private Bank', pos: [-14, -14], door: [-14, -7], tab: 'Finance', hint: 'Loans & credit' },
  office: { id: 'office', label: 'Sterling & Vane Tower', pos: [0, -14], door: [0, -7], tab: 'Actions', groups: ['Work'], hint: 'Work shifts' },
  restaurant: { id: 'restaurant', label: 'Maison Dorée', pos: [14, -14], door: [14, -7], tab: 'Actions', groups: ['Dine'], hint: 'Dine' },
  home: { id: 'home', label: 'Home', pos: [-14, 0], door: [-14, 7], tab: 'Actions', groups: ['Rest', 'Care'], hint: 'Sleep, rest & freshen up' },
  plaza: { id: 'plaza', label: 'Gilded Plaza', pos: [0, 0], door: [0, 7], tab: 'Ledger', hint: 'Your ledger' },
  spa: { id: 'spa', label: 'Aurum Spa', pos: [14, 0], door: [14, 7], tab: 'Actions', groups: ['Care'], hint: 'Grooming & spa' },
  boutique: { id: 'boutique', label: 'The Boutique', pos: [-14, 14], door: [-14, 21], tab: 'Boutique', hint: 'Buy luxury' },
  club: { id: 'club', label: 'Club Noir', pos: [0, 14], door: [0, 21], tab: 'Actions', groups: ['Society'], hint: 'Society & networking' },
  ventures: { id: 'ventures', label: 'Ventures Row', pos: [-4, 30], door: [-4, 21], tab: 'Boutique', shopCat: 'BUSINESS', hint: 'Buy & run businesses' },
  island: { id: 'island', label: 'Private Island', pos: [46, 0], door: [21, 7], tab: 'Actions', groups: ['Rest', 'Care'], hint: 'Your island' },
};

/** Clickable buildings shown in the city. */
export const CITY_LOCS: LocId[] = ['bank', 'office', 'restaurant', 'home', 'plaza', 'spa', 'boutique', 'club'];

/** Business plots along Ventures Row, one per business type. */
export const BIZ_PLOTS: { itemId: string; x: number }[] = [
  { itemId: 'foodcart', x: -28 },
  { itemId: 'reseller', x: -21 },
  { itemId: 'carwash', x: -14 },
  { itemId: 'cafe', x: -7 },
  { itemId: 'boutique', x: 0 },
  { itemId: 'nightclub', x: 7 },
  { itemId: 'techfirm', x: 14 },
  { itemId: 'holding', x: 21 },
];
export const BIZ_Z = 30;

export const ACTION_LOC: Record<string, LocId> = {
  work: 'office', overtime: 'office', manage: 'ventures',
  suya: 'restaurant', bistro: 'restaurant', michelin: 'restaurant',
  nap: 'home', sleep: 'home', shower: 'home',
  barber: 'spa', spa: 'spa',
  cook: 'home', relax: 'home', call: 'home', drinks: 'club', club: 'club', gala: 'club', poker: 'club',
};

export function homeLoc(g: GameState): LocId {
  return g.assets.some((a) => a.itemId === 'island') ? 'island' : 'home';
}

/** Where purchases are "delivered" to (for the gold burst). */
export function purchaseLoc(category: string, g: GameState): LocId {
  if (category === 'BUSINESS') return 'ventures';
  if (category === 'RESIDENCE' || category === 'VEHICLE' || category === 'STAFF') return homeLoc(g);
  return 'boutique';
}

const ROADS_X = [-21, -7, 7, 21];
export const ISLAND_POS: [number, number] = [46, 0];
const ISLAND_PATH: [number, number][] = [[21, 0], [30, 0], [ISLAND_POS[0] - 4, 0]];

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
  const start = LOCS[a].door;
  const pts: [number, number][] = [];
  let cur = start;
  if (a === 'island') { pts.push(...[...ISLAND_PATH].reverse(), [21, 7]); cur = [21, 7]; }
  pts.push(...roadRoute(cur, LOCS[b].door));
  if (b === 'island') pts.push(...ISLAND_PATH);
  return dedupe(pts, a === 'island' ? ISLAND_PATH[ISLAND_PATH.length - 1] : start);
}

export function standPoint(id: LocId): [number, number] {
  return id === 'island' ? ISLAND_PATH[ISLAND_PATH.length - 1] : LOCS[id].door;
}
