export type StartType = 'NEPO' | 'LAPO';
export type NeedKey = 'energy' | 'hunger' | 'social' | 'hygiene';
export type Needs = Record<NeedKey, number>;

export type AssetCategory = 'VEHICLE' | 'RESIDENCE' | 'WARDROBE' | 'ACCESSORY' | 'STAFF' | 'BUSINESS';
export type ShopCategory = AssetCategory | 'CONSUMABLE';

export interface CatalogItem {
  id: string;
  name: string;
  category: ShopCategory;
  price: number;
  blurb: string;
  /** Ongoing prestige while owned (assets) or one-off reputation gain (consumables). */
  prestige: number;
  /** Instant need changes (consumables). */
  effects?: Partial<Needs>;
  /** Fractional reduction of a need's hourly decay while owned (0.3 = 30% slower). */
  mitigate?: Partial<Needs>;
  /** Vehicles: fraction of commute fatigue removed. */
  commute?: number;
  /** Residences: multiplier on sleep recovery. */
  sleepQuality?: number;
  upkeepPerDay?: number;
  /** What it is worth the moment you buy it, as a fraction of price. */
  resale: number;
  /** Daily value drift (negative = depreciation). */
  driftPerDay?: number;
  minPrestige?: number;
  /** Networking tokens required (businesses). */
  tokens?: number;
  /** Tags unlock career gates (e.g. 'suit'). */
  tags?: string[];
  /** Business economics. */
  revenuePerHour?: number;
  volatility?: number;
  /** Business opening hours [from, to); revenue only while open. */
  open?: [number, number];
  /** Can own several (rental flats, café chains). */
  multi?: boolean;
  /** Residences: daily rent when let out (i.e. not your home). */
  rentPerDay?: number;
}

export interface OwnedAsset {
  uid: string;
  itemId: string;
  name: string;
  category: AssetCategory;
  purchasePrice: number;
  currentValue: number;
  boughtAtHour: number;
  morale?: number;
  revenueToday?: number;
}

export interface Loan {
  id: string;
  label: string;
  principal: number;
  balance: number;
  dailyRate: number;
  takenAtHour: number;
  nextDueHour: number;
  missed: number;
  kind?: 'personal' | 'mortgage' | 'auto' | 'business';
  /** Collateral for secured loans. */
  assetUid?: string;
  weeksLeft?: number;
}

export type TxnCategory = 'INCOME' | 'EXPENSE' | 'TAX' | 'LOAN' | 'SALE' | 'PURCHASE';
export interface Txn {
  id: string;
  hour: number;
  amount: number;
  category: TxnCategory;
  description: string;
}

export type NoticeKind = 'good' | 'bad' | 'info' | 'gold';
export interface Notice {
  kind: NoticeKind;
  text: string;
}

export interface Settings {
  tickMs: number;
  paused: boolean;
  sound: boolean;
  /** Graphics quality (missing in older saves = 'high'). */
  gfx?: 'low' | 'high' | 'ultra';
}

export interface GameState {
  version: number;
  name: string;
  startType: StartType;
  cash: number;
  needs: Needs;
  health: number;
  reputation: number;
  tokens: number;
  hour: number;
  assets: OwnedAsset[];
  loans: Loan[];
  txns: Txn[];
  careerLevel: number;
  shiftsAtLevel: number;
  totalShifts: number;
  creditScore: number;
  creditLockedUntil: number;
  negativeTicks: number;
  negativeNetWorthDays: number;
  brokeOpen: boolean;
  liquidationReport: string | null;
  marketMood: number;
  dayEvent: string | null;
  week: { bizProfit: number };
  investments: { index: number; crypto: number };
  stats: { lifetimeEarnings: number; peakNetWorth: number; daysSurvived: number };
  lastTickAt: number;
}
