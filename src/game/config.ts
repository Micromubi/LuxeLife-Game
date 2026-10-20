import type { CatalogItem, NeedKey, Needs, StartType } from './types';

/** Tick speeds: one tick = one in-game hour. */
export const SPEEDS = [
  { label: 'Leisurely', ms: 60_000, hint: '1 game hour per real minute' },
  { label: 'Standard', ms: 15_000, hint: '1 game hour per 15s' },
  { label: 'Hustle', ms: 5_000, hint: '1 game hour per 5s' },
];
export const DEFAULT_TICK_MS = 15_000;
export const START_HOUR = 8; // Day 1, 08:00

/**
 * Realistic body clock (per in-game hour).
 * Awake: a full tank of energy lasts ~16–18 waking hours, you get hungry every ~5h,
 * want a shower roughly daily, and feel lonely after a day or two alone.
 */
export const BASE_DECAY: Needs = { energy: 4, hunger: 4, hygiene: 2, social: 1.2 };
/** Asleep: you still get a little hungry and grubby, but you don't get lonely. */
export const SLEEP_DECAY: Needs = { energy: 0, hunger: 1.5, hygiene: 0.8, social: 0 };
/** Energy regained per hour of sleep (×home sleep quality; daytime sleep is less restful). */
export const SLEEP_GAIN = 12.5;
export const CRITICAL = 15;
export const STUDIO_RENT = 40;
export const WAGE_TAX = 0.1;
export const BUSINESS_TAX = 0.2;
export const BROKE_TICKS = 2;
export const FIRE_SALE = 0.5;
export const LIQUIDATION = 0.2;
export const MAX_LEDGER = 250;

export const NEED_META: Record<NeedKey, { label: string; hint: string }> = {
  energy: { label: 'Energy', hint: 'Lasts ~16 waking hours. Drains faster at work and after midnight; restored by a night\'s sleep.' },
  hunger: { label: 'Fullness', hint: 'Full bar = well fed. You\'ll want a meal every ~5 hours. Starving damages your health.' },
  social: { label: 'Social', hint: 'Colleagues, friends and parties top it up. Neglect it and invitations dry up.' },
  hygiene: { label: 'Hygiene', hint: 'A shower a day keeps it up. Work and parties make you sweat.' },
};

export const START_PROFILES: Record<StartType, {
  title: string; tagline: string; cash: number; loan: number; loanRate: number;
  career: number; reputation: number; credit: number; social: number; trait: string; traitText: string;
}> = {
  NEPO: {
    title: 'Old Money', tagline: 'A modest trust fund and a phone full of the right numbers.',
    cash: 50_000, loan: 0, loanRate: 0, career: 1, reputation: 40, credit: 720, social: 75,
    trait: 'Silver Spoon', traitText: 'Starts as Junior Analyst. Loan rates 25% lower.',
  },
  LAPO: {
    title: 'New Blood', tagline: '$500 in your pocket, a $2,000 loan, and nothing to lose.',
    cash: 2_500, loan: 2_000, loanRate: 0.015, career: 0, reputation: 0, credit: 600, social: 50,
    trait: 'Hungry', traitText: 'Earns 25% more per shift. Promotions need fewer shifts.',
  },
};

export interface Career { title: string; rate: number; shifts: number; prestige: number; tag?: string; tagLabel?: string }
/** Requirements on each level are for being promoted INTO it. */
export const CAREERS: Career[] = [
  { title: 'Intern', rate: 25, shifts: 0, prestige: 0 },
  { title: 'Junior Analyst', rate: 60, shifts: 3, prestige: 0 },
  { title: 'Associate', rate: 140, shifts: 5, prestige: 20, tag: 'suit', tagLabel: 'a Business Suit' },
  { title: 'Vice President', rate: 350, shifts: 7, prestige: 70, tag: 'suit', tagLabel: 'a Business Suit' },
  { title: 'Managing Director', rate: 900, shifts: 9, prestige: 180, tag: 'tailored', tagLabel: 'a Tailored Suit' },
  { title: 'Partner', rate: 2_500, shifts: 12, prestige: 400, tag: 'tailored', tagLabel: 'a Tailored Suit' },
  { title: 'Chairman', rate: 6_000, shifts: 15, prestige: 900, tag: 'couture', tagLabel: 'Haute Couture' },
];

export const PRESTIGE_TIERS = [
  { min: 0, name: 'Nobody' },
  { min: 50, name: 'Climber' },
  { min: 150, name: 'Socialite' },
  { min: 350, name: 'Elite' },
  { min: 700, name: 'VIP' },
  { min: 1_500, name: 'Dynasty' },
];
export const VIP_THRESHOLD = 700;

export const CATALOG: CatalogItem[] = [
  // Consumables
  { id: 'espresso', name: 'Espresso', category: 'CONSUMABLE', price: 6, prestige: 0, resale: 0, effects: { energy: 8 }, blurb: 'A quick jolt. +8 Energy (it won\'t replace sleep).' },
  { id: 'smoothie', name: 'Cold-pressed Juice', category: 'CONSUMABLE', price: 18, prestige: 0, resale: 0, effects: { energy: 6, hunger: 12 }, blurb: '+12 Hunger, +6 Energy.' },
  { id: 'cologne', name: 'Niche Fragrance', category: 'CONSUMABLE', price: 240, prestige: 3, resale: 0, effects: { hygiene: 30, social: 5 }, blurb: '+30 Hygiene, +5 Social, +3 reputation.' },
  { id: 'champagne', name: 'Vintage Champagne', category: 'CONSUMABLE', price: 1_200, prestige: 10, resale: 0, effects: { social: 25 }, blurb: 'Pop it for the room. +25 Social, +10 reputation.' },

  // Wardrobe
  { id: 'streetwear', name: 'Designer Streetwear', category: 'WARDROBE', price: 180, prestige: 5, resale: 0.3, driftPerDay: -0.01, blurb: 'Look the part on a budget.' },
  { id: 'suit', name: 'Business Suit', category: 'WARDROBE', price: 900, prestige: 20, resale: 0.35, driftPerDay: -0.005, tags: ['suit'], blurb: 'Required for Associate and above.' },
  { id: 'tailored', name: 'Bespoke Tailored Suit', category: 'WARDROBE', price: 6_500, prestige: 60, resale: 0.4, driftPerDay: -0.003, tags: ['suit', 'tailored'], blurb: 'Hand-cut. Opens the boardroom door.', minPrestige: 60 },
  { id: 'couture', name: 'Haute Couture Wardrobe', category: 'WARDROBE', price: 45_000, prestige: 180, resale: 0.45, driftPerDay: -0.002, tags: ['suit', 'tailored', 'couture'], blurb: 'One of one. Chairman material.', minPrestige: 300 },

  // Vehicles
  { id: 'sedan', name: 'Used Sedan', category: 'VEHICLE', price: 4_500, prestige: 5, resale: 0.8, driftPerDay: -0.003, commute: 0.4, upkeepPerDay: 12, blurb: 'Commute fatigue −40%.' },
  { id: 'suv', name: 'Luxury SUV', category: 'VEHICLE', price: 68_000, prestige: 45, resale: 0.82, driftPerDay: -0.002, commute: 0.6, upkeepPerDay: 60, blurb: 'Commute fatigue −60%.' },
  { id: 'sportscar', name: 'Italian Sports Car', category: 'VEHICLE', price: 210_000, prestige: 120, resale: 0.85, driftPerDay: -0.0015, commute: 0.7, upkeepPerDay: 180, minPrestige: 80, blurb: 'Commute fatigue −70%. Heads turn.' },
  { id: 'hypercar', name: 'Limited Hypercar', category: 'VEHICLE', price: 2_800_000, prestige: 400, resale: 0.9, driftPerDay: 0.0005, commute: 0.8, upkeepPerDay: 1_500, minPrestige: 400, blurb: 'One of 99. Appreciates if you keep it.' },
  { id: 'jet', name: 'Private Jet', category: 'VEHICLE', price: 28_000_000, prestige: 1_200, resale: 0.8, driftPerDay: -0.001, commute: 0.9, upkeepPerDay: 12_000, minPrestige: 900, blurb: 'Commute fatigue −90%. The sky is yours.' },

  // Residences
  { id: 'flat', name: 'Starter Flat', category: 'RESIDENCE', price: 28_000, prestige: 8, resale: 0.92, driftPerDay: 0.0005, sleepQuality: 1.1, upkeepPerDay: 15, rentPerDay: 420, multi: true, blurb: 'Your first rung. Live in it, or let it out for rent.' },
  { id: 'apartment', name: 'City Apartment', category: 'RESIDENCE', price: 85_000, prestige: 25, resale: 0.92, driftPerDay: 0.0005, sleepQuality: 1.2, mitigate: { hygiene: 0.2 }, upkeepPerDay: 45, rentPerDay: 1_200, multi: true, blurb: 'Better sleep. Tenants queue for these.' },
  { id: 'penthouse', name: 'Penthouse with Spa', category: 'RESIDENCE', price: 1_400_000, prestige: 150, resale: 0.93, driftPerDay: 0.0006, sleepQuality: 1.45, mitigate: { hygiene: 0.5, energy: 0.1 }, upkeepPerDay: 600, rentPerDay: 16_000, minPrestige: 120, blurb: 'Private spa: hygiene decay −50%.' },
  { id: 'villa', name: 'Hillside Villa', category: 'RESIDENCE', price: 6_500_000, prestige: 400, resale: 0.93, driftPerDay: 0.0007, sleepQuality: 1.6, mitigate: { hygiene: 0.5, energy: 0.15, social: 0.3 }, upkeepPerDay: 2_200, rentPerDay: 60_000, minPrestige: 350, blurb: 'A base for parties: social decay −30%.' },
  { id: 'island', name: 'Private Island', category: 'RESIDENCE', price: 95_000_000, prestige: 2_000, resale: 0.9, driftPerDay: 0.0008, sleepQuality: 1.8, mitigate: { hygiene: 0.6, energy: 0.25, social: 0.5 }, upkeepPerDay: 25_000, minPrestige: 1_200, blurb: 'Legacy, in acres.' },

  // Accessories (pawnable)
  { id: 'divewatch', name: 'Steel Dive Watch', category: 'ACCESSORY', price: 3_200, prestige: 12, resale: 0.75, driftPerDay: 0, blurb: 'Holds value. Pawn it in a pinch.' },
  { id: 'birkin', name: 'Birkin Bag', category: 'ACCESSORY', price: 25_000, prestige: 70, resale: 0.85, driftPerDay: 0.0004, blurb: 'Appreciates quietly.' },
  { id: 'goldwatch', name: 'Gold Chronograph', category: 'ACCESSORY', price: 48_000, prestige: 90, resale: 0.8, driftPerDay: 0.0002, minPrestige: 40, tags: ['poker'], blurb: 'Low utility. Massive prestige. Gets you into the billionaires\' poker game.' },
  { id: 'necklace', name: 'Diamond Rivière', category: 'ACCESSORY', price: 350_000, prestige: 300, resale: 0.8, driftPerDay: 0.0003, minPrestige: 250, blurb: 'Statement piece.' },

  // Staff & memberships
  { id: 'gym', name: 'Gym & Spa Membership', category: 'STAFF', price: 2_000, prestige: 8, resale: 0, mitigate: { energy: 0.2 }, upkeepPerDay: 20, blurb: 'Energy decay −20%.' },
  { id: 'stylist', name: 'Personal Stylist', category: 'STAFF', price: 3_000, prestige: 15, resale: 0, mitigate: { hygiene: 0.4 }, upkeepPerDay: 150, blurb: 'Hygiene decay −40%.' },
  { id: 'chef', name: 'Private Chef', category: 'STAFF', price: 5_000, prestige: 20, resale: 0, mitigate: { hunger: 0.5 }, upkeepPerDay: 250, minPrestige: 30, blurb: 'Hunger decay −50%.' },
  { id: 'concierge', name: 'Social Concierge', category: 'STAFF', price: 12_000, prestige: 30, resale: 0, mitigate: { social: 0.4 }, upkeepPerDay: 400, minPrestige: 80, blurb: 'Social decay −40%. Always on the list.' },

  // Businesses — `open` hours: revenue only flows while open. Payback ≈ 1–4 game weeks.
  { id: 'foodcart', name: 'Food Cart', category: 'BUSINESS', price: 1_200, prestige: 2, resale: 0.6, revenuePerHour: 15, open: [7, 21], volatility: 0.2, upkeepPerDay: 100, multi: true, blurb: 'Suya and small chops. Your first hustle.' },
  { id: 'reseller', name: 'Online Reseller', category: 'BUSINESS', price: 3_000, prestige: 3, resale: 0.5, revenuePerHour: 17.5, volatility: 0.3, upkeepPerDay: 200, multi: true, blurb: 'Sells while you sleep. Open 24h.' },
  { id: 'carwash', name: 'Car Wash', category: 'BUSINESS', price: 12_000, prestige: 6, resale: 0.65, revenuePerHour: 116, open: [7, 19], volatility: 0.25, upkeepPerDay: 650, multi: true, blurb: 'Busy days, quiet nights.' },
  { id: 'cafe', name: 'Corner Café', category: 'BUSINESS', price: 40_000, prestige: 10, resale: 0.7, revenuePerHour: 264, open: [6, 20], volatility: 0.25, upkeepPerDay: 1_780, multi: true, blurb: 'Steady, humble cash flow.' },
  { id: 'boutique', name: 'Fashion Boutique', category: 'BUSINESS', price: 350_000, prestige: 50, resale: 0.7, revenuePerHour: 2_250, open: [9, 21], volatility: 0.35, upkeepPerDay: 12_960, tokens: 1, blurb: 'Your name on the door.' },
  { id: 'nightclub', name: 'Nightclub', category: 'BUSINESS', price: 1_800_000, prestige: 160, resale: 0.65, revenuePerHour: 17_850, open: [21, 4], volatility: 0.6, upkeepPerDay: 60_000, tokens: 2, minPrestige: 150, blurb: 'Only earns after dark. Famous owners pack it.' },
  { id: 'techfirm', name: 'Tech Startup', category: 'BUSINESS', price: 6_000_000, prestige: 300, resale: 0.6, revenuePerHour: 15_800, volatility: 0.9, upkeepPerDay: 182_000, tokens: 3, minPrestige: 250, blurb: 'Boom or bust, around the clock.' },
  { id: 'holding', name: 'Holding Company', category: 'BUSINESS', price: 40_000_000, prestige: 900, resale: 0.75, revenuePerHour: 92_600, volatility: 0.3, upkeepPerDay: 1_070_000, tokens: 5, minPrestige: 600, blurb: 'Own the owners.' },
];

export const CATEGORY_LABEL: Record<string, string> = {
  CONSUMABLE: 'Indulgences',
  WARDROBE: 'Wardrobe',
  VEHICLE: 'Garage',
  RESIDENCE: 'Real Estate',
  ACCESSORY: 'Jewels & Watches',
  STAFF: 'Staff & Clubs',
  BUSINESS: 'Ventures',
};

export type ActionGroup = 'Work' | 'Hustle' | 'Study' | 'Dine' | 'Rest' | 'Care' | 'Fitness' | 'Health' | 'Society' | 'Leisure' | 'Events' | 'Gamble' | 'Travel';
export const ACTION_GROUPS: ActionGroup[] = ['Work', 'Hustle', 'Study', 'Dine', 'Rest', 'Care', 'Fitness', 'Health', 'Society', 'Leisure', 'Events', 'Gamble', 'Travel'];
export interface ActionDef {
  id: string;
  label: string;
  group: ActionGroup;
  hours: number;
  cost: number;
  /** Applied at the end of the activity. */
  effects: Partial<Needs>;
  rep?: number;
  tokens?: number;
  minPrestige?: number;
  minEnergy?: number;
  sleeping?: boolean;
  /** Start window [from, to) in 24h clock; wraps past midnight when from > to. */
  open?: [number, number];
  /** Can't start if a need is above this ("you're not hungry"). */
  maxNeed?: Partial<Needs>;
  special?: 'work' | 'overtime' | 'manage' | 'sleep' | 'poker' | 'relax';
  /** Health restored (or lost) by the end of the activity. */
  health?: number;
  /** Games of chance: probability of winning and the multiple of the stake paid back. */
  gamble?: { odds: number; payout: number };
  /** Study: counts as this many shifts toward your next promotion. */
  study?: number;
  /** Trips: owning the Private Jet cuts the cost by this fraction. */
  jetDiscount?: number;
  /** Side jobs that pay cash without a career. */
  hustle?: 'delivery' | 'rideshare' | 'freelance' | 'content';
  /** A lottery ticket. */
  lottery?: boolean;
  desc: string;
}

export const ACTIONS: ActionDef[] = [
  { id: 'work', label: 'Work a Shift', group: 'Work', hours: 2, cost: 0, effects: {}, special: 'work', minEnergy: 15, open: [7, 20], desc: '2h. Colleagues keep you social; the commute and desk drain you.' },
  { id: 'overtime', label: 'Double Shift', group: 'Work', hours: 2, cost: 0, effects: { energy: -18, hygiene: -12 }, special: 'overtime', minEnergy: 50, open: [7, 18], desc: '2h flat out. 2.2× pay, counts as 2 shifts. Brutal on the body.' },
  { id: 'manage', label: 'Manage Ventures', group: 'Work', hours: 2, cost: 0, effects: {}, special: 'manage', minEnergy: 15, open: [8, 20], desc: '2h. Staff morale +30 across all businesses.' },

  { id: 'cook', label: 'Cook at Home', group: 'Dine', hours: 1, cost: 12, effects: { hunger: 45 }, maxNeed: { hunger: 85 }, desc: '1h. Groceries. Cheapest proper meal.' },
  { id: 'suya', label: 'Street Food', group: 'Dine', hours: 1, cost: 8, effects: { hunger: 35 }, maxNeed: { hunger: 85 }, open: [6, 23], desc: '1h. Quick and filling.' },
  { id: 'bistro', label: 'Bistro Meal', group: 'Dine', hours: 1, cost: 55, effects: { hunger: 55, social: 8 }, maxNeed: { hunger: 85 }, open: [11, 22], desc: '1h. Good food, good company.' },
  { id: 'michelin', label: 'Michelin Dining', group: 'Dine', hours: 2, cost: 420, effects: { hunger: 80, social: 15 }, rep: 6, maxNeed: { hunger: 85 }, minPrestige: 60, open: [12, 23], desc: '2h. Be seen at the chef\'s table.' },

  { id: 'relax', label: 'Relax at Home', group: 'Rest', hours: 2, cost: 0, effects: {}, special: 'relax', desc: '2h. TV, music, feet up. Energy drains far slower.' },
  { id: 'nap', label: 'Power Nap', group: 'Rest', hours: 1, cost: 0, effects: {}, sleeping: true, maxNeed: { energy: 80 }, desc: '1h of sleep.' },
  { id: 'sleep', label: 'Sleep', group: 'Rest', hours: 8, cost: 0, effects: {}, sleeping: true, special: 'sleep', maxNeed: { energy: 75 }, desc: '8h. Most restful at night; better homes sleep better.' },

  { id: 'shower', label: 'Shower & Dress', group: 'Care', hours: 1, cost: 0, effects: { hygiene: 60 }, desc: '1h. Daily maintenance.' },
  { id: 'barber', label: 'Barber & Grooming', group: 'Care', hours: 1, cost: 60, effects: { hygiene: 70 }, rep: 2, open: [8, 19], desc: '1h. Sharp.' },
  { id: 'spa', label: 'Spa Day', group: 'Care', hours: 3, cost: 650, effects: { hygiene: 80, energy: 20 }, rep: 5, minPrestige: 40, open: [8, 18], desc: '3h. Restore body and standing.' },

  { id: 'call', label: 'Call Old Friends', group: 'Society', hours: 1, cost: 0, effects: { social: 12 }, open: [8, 23], desc: '1h. Free. Keeps you human.' },
  { id: 'drinks', label: 'After-work Drinks', group: 'Society', hours: 3, cost: 70, effects: { social: 30 }, rep: 1, open: [17, 1], desc: '3h. Keep the network warm.' },
  { id: 'club', label: 'VIP Club Table', group: 'Society', hours: 4, cost: 2_500, effects: { social: 45, hygiene: -10 }, rep: 18, tokens: 1, minPrestige: 100, open: [21, 3], desc: '4h. +1 networking token.' },
  { id: 'gala', label: 'Charity Gala', group: 'Society', hours: 4, cost: 25_000, effects: { social: 40 }, rep: 70, tokens: 2, minPrestige: 300, open: [19, 23], desc: '4h. +2 networking tokens, big reputation.' },
  { id: 'poker', label: 'Billionaires\' Poker', group: 'Society', hours: 5, cost: 50_000, effects: { social: 25 }, rep: 10, special: 'poker', minPrestige: 400, open: [20, 3], desc: '5h. $50k buy-in. Needs a Gold Chronograph.' },

  { id: 'delivery', label: 'Food Delivery Run', group: 'Hustle', hours: 2, cost: 0, effects: { energy: -10, hygiene: -8 }, hustle: 'delivery', minEnergy: 20, open: [7, 24], desc: '2h on a bike. ~$70–120 cash, no career needed.' },
  { id: 'rideshare', label: 'Rideshare Driving', group: 'Hustle', hours: 2, cost: 0, effects: { energy: -8, social: 6 }, hustle: 'rideshare', minEnergy: 20, desc: '2h. Needs a car; the nicer the car, the better the fares.' },
  { id: 'freelance', label: 'Freelance Gig', group: 'Hustle', hours: 2, cost: 0, effects: { energy: -14 }, hustle: 'freelance', minEnergy: 30, open: [8, 23], desc: '2h of consulting. Pays more as your career grows.' },
  { id: 'content', label: 'Create Content', group: 'Hustle', hours: 2, cost: 0, effects: { energy: -6, social: 5 }, hustle: 'content', minEnergy: 15, desc: '2h. Grow followers; pay scales with your audience. Posts can go viral.' },

  { id: 'course', label: 'Evening Class', group: 'Study', hours: 3, cost: 350, effects: { energy: -6, social: 6 }, study: 1, minEnergy: 20, open: [17, 22], desc: '3h. Counts as 1 shift toward your next promotion.' },
  { id: 'mba', label: 'Executive MBA Module', group: 'Study', hours: 6, cost: 4_000, effects: { energy: -12, social: 12 }, study: 3, rep: 4, minEnergy: 35, minPrestige: 60, open: [9, 13], desc: '6h. Counts as 3 shifts. Great people in the room.' },

  { id: 'workout', label: 'Gym Workout', group: 'Fitness', hours: 2, cost: 20, effects: { energy: -10, hygiene: -25, social: 4 }, health: 6, minEnergy: 25, open: [5, 23], desc: '2h. Builds health. You\'ll need a shower.' },
  { id: 'yoga', label: 'Yoga & Stretch', group: 'Fitness', hours: 1, cost: 30, effects: { energy: 4, hygiene: -8 }, health: 3, open: [6, 21], desc: '1h. Calm body, clear head.' },
  { id: 'trainer', label: 'Personal Trainer', group: 'Fitness', hours: 2, cost: 250, effects: { energy: -12, hygiene: -25, social: 8 }, health: 12, rep: 1, minEnergy: 30, minPrestige: 30, open: [6, 21], desc: '2h. Serious results.' },

  { id: 'checkup', label: 'Doctor Check-up', group: 'Health', hours: 1, cost: 150, effects: {}, health: 15, open: [8, 18], desc: '1h. Catch problems early.' },
  { id: 'treatment', label: 'Overnight Treatment', group: 'Health', hours: 8, cost: 1_800, effects: { hunger: 20, hygiene: 30 }, health: 50, sleeping: true, desc: '8h ward stay. Big health boost; you sleep through it.' },

  { id: 'beach', label: 'Beach Day', group: 'Leisure', hours: 3, cost: 0, effects: { social: 12, hygiene: -10 }, open: [8, 18], special: 'relax', desc: '3h. Sun, sea, people-watching. Free.' },
  { id: 'cabana', label: 'Beach Club Cabana', group: 'Leisure', hours: 3, cost: 350, effects: { social: 30, hunger: 20 }, rep: 3, open: [11, 20], desc: '3h. Bottle service by the waves.' },
  { id: 'yacht', label: 'Yacht Party', group: 'Leisure', hours: 5, cost: 18_000, effects: { social: 55, hunger: 30 }, rep: 30, tokens: 1, minPrestige: 200, open: [12, 22], desc: '5h. +1 networking token. The right people, offshore.' },

  { id: 'match', label: 'Watch the Match', group: 'Events', hours: 3, cost: 90, effects: { social: 28, hunger: 10 }, open: [16, 22], desc: '3h. Hot dogs and a roaring crowd.' },
  { id: 'concert', label: 'Stadium Concert', group: 'Events', hours: 4, cost: 400, effects: { social: 40, hygiene: -12, energy: -8 }, rep: 3, open: [19, 23], desc: '4h. Front-row energy.' },
  { id: 'vipbox', label: 'VIP Box', group: 'Events', hours: 3, cost: 9_000, effects: { social: 40, hunger: 25 }, rep: 25, tokens: 1, minPrestige: 180, open: [16, 22], desc: '3h. +1 networking token. Deals over canapés.' },

  { id: 'lottery', label: 'Lottery Ticket', group: 'Gamble', hours: 0, cost: 20, effects: {}, lottery: true, desc: 'Instant. Jackpot $2.5M at 1 in 250,000. Smaller prizes more often.' },
  { id: 'slots', label: 'Slot Machines', group: 'Gamble', hours: 1, cost: 100, effects: { social: 5 }, gamble: { odds: 0.4, payout: 2.3 }, desc: '1h. $100 stake. 40% chance to win $230.' },
  { id: 'blackjack', label: 'Blackjack Table', group: 'Gamble', hours: 2, cost: 2_000, effects: { social: 12 }, gamble: { odds: 0.47, payout: 2 }, minPrestige: 30, open: [18, 6], desc: '2h. $2,000 stake. 47% to double it.' },
  { id: 'highroller', label: 'High Roller Room', group: 'Gamble', hours: 3, cost: 100_000, effects: { social: 20 }, gamble: { odds: 0.46, payout: 2.1 }, rep: 15, minPrestige: 300, open: [20, 6], desc: '3h. $100k stake. 46% to win $210k.' },

  { id: 'getaway', label: 'Weekend Getaway', group: 'Travel', hours: 12, cost: 6_000, effects: { energy: 35, social: 30, hygiene: 20, hunger: 30 }, rep: 10, health: 10, minPrestige: 80, jetDiscount: 0.6, desc: '12h. Fly out, come back new. 60% cheaper with your own jet.' },
  { id: 'monaco', label: 'Monaco Grand Prix', group: 'Travel', hours: 24, cost: 60_000, effects: { energy: 20, social: 60, hunger: 40, hygiene: 20 }, rep: 70, tokens: 2, minPrestige: 400, jetDiscount: 0.6, desc: '24h. +2 networking tokens. 60% cheaper with your own jet.' },
];

/** Financing: deposit share and loan term per category. */
export const FINANCE: Record<string, { down: number; weeks: number; kind: 'mortgage' | 'auto' | 'business'; label: string }> = {
  RESIDENCE: { down: 0.2, weeks: 26, kind: 'mortgage', label: 'Mortgage' },
  VEHICLE: { down: 0.15, weeks: 12, kind: 'auto', label: 'Car finance' },
  BUSINESS: { down: 0.3, weeks: 20, kind: 'business', label: 'Business loan' },
};

/** Investment vehicles: mean and volatility of daily return. */
export const FUNDS = {
  index: { name: 'Index Fund', mean: 0.0015, vol: 0.012, fee: 0, blurb: 'Steady growth with gentle swings.' },
  crypto: { name: 'Crypto', mean: 0.0025, vol: 0.07, fee: 0.01, blurb: 'Wild swings. 1% fee to cash out.' },
} as const;
export type FundId = keyof typeof FUNDS;

/** Listed companies. Prices move every game hour: drift + noise, with occasional news jumps. */
export const STOCKS = [
  { id: 'LUXE', name: 'Luxe Holdings', sector: 'Luxury goods', price: 120, drift: 0.0004, vol: 0.012 },
  { id: 'SVBK', name: 'Sterling & Vane', sector: 'Banking', price: 88, drift: 0.0003, vol: 0.009 },
  { id: 'NOVA', name: 'Nova AI', sector: 'Tech', price: 210, drift: 0.0008, vol: 0.028 },
  { id: 'AURM', name: 'Aurum Mining', sector: 'Gold', price: 45, drift: 0.0002, vol: 0.016 },
  { id: 'SKYH', name: 'Sky Harbour Air', sector: 'Travel', price: 32, drift: 0.0003, vol: 0.02 },
  { id: 'PTRD', name: 'Petro Delta', sector: 'Energy', price: 68, drift: 0.0002, vol: 0.015 },
  { id: 'SKRE', name: 'Skyline REIT', sector: 'Property', price: 54, drift: 0.0003, vol: 0.007 },
  { id: 'MOON', name: 'Moonshot Meme Co', sector: 'Speculative', price: 4, drift: 0, vol: 0.07 },
];
export const STOCK_HISTORY = 96;
export const TRADE_FEE = 0.001;

/** Lottery prize table: [odds, prize]. Expected value is a little under the $20 ticket. */
export const LOTTERY: [number, number][] = [[1 / 250_000, 2_500_000], [1 / 5_000, 25_000], [1 / 100, 200], [1 / 12, 20]];

export const itemById = (id: string) => CATALOG.find((c) => c.id === id);
