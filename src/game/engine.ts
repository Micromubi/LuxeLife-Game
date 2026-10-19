import {
  ACTIONS, BASE_DECAY, BROKE_TICKS, BUSINESS_TAX, CAREERS, CATALOG, CRITICAL, DEFAULT_TICK_MS, FINANCE, FIRE_SALE, FUNDS,
  LIQUIDATION, MAX_LEDGER, PRESTIGE_TIERS, SLEEP_DECAY, SLEEP_GAIN, START_HOUR, START_PROFILES, STUDIO_RENT, WAGE_TAX, itemById,
  type FundId,
} from './config';
import type { GameState, Loan, NeedKey, Needs, Notice, OwnedAsset, StartType, TxnCategory } from './types';

export const SAVE_VERSION = 1;
const NEEDS: NeedKey[] = ['energy', 'hunger', 'social', 'hygiene'];
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));
const uid = () => Math.random().toString(36).slice(2, 10);
const round2 = (v: number) => Math.round(v * 100) / 100;

export type Out = Notice[];

// ───────────────────────────── setup ─────────────────────────────

export function newGame(name: string, startType: StartType): GameState {
  const p = START_PROFILES[startType];
  const s: GameState = {
    version: SAVE_VERSION,
    name: name.trim() || 'Anonymous',
    startType,
    cash: p.cash,
    needs: { energy: 85, hunger: 75, social: p.social, hygiene: 80 },
    health: 100,
    reputation: p.reputation,
    tokens: startType === 'NEPO' ? 1 : 0,
    hour: START_HOUR,
    assets: [],
    loans: [],
    txns: [],
    careerLevel: p.career,
    shiftsAtLevel: 0,
    totalShifts: 0,
    creditScore: p.credit,
    creditLockedUntil: 0,
    negativeTicks: 0,
    negativeNetWorthDays: 0,
    brokeOpen: false,
    liquidationReport: null,
    marketMood: 1,
    dayEvent: null,
    week: { bizProfit: 0 },
    investments: { index: 0, crypto: 0 },
    stats: { lifetimeEarnings: 0, peakNetWorth: p.cash - p.loan, daysSurvived: 0 },
    lastTickAt: Date.now(),
  };
  if (p.loan > 0) {
    s.loans.push(makeLoan('Starter microloan', p.loan, p.loanRate, s.hour, 'personal'));
    ledger(s, p.loan, 'LOAN', 'Starter microloan disbursed');
  }
  ledger(s, startType === 'NEPO' ? p.cash : p.cash - p.loan, 'INCOME', startType === 'NEPO' ? 'Trust fund distribution' : 'Savings');
  return s;
}

export const defaultSettings = () => ({ tickMs: DEFAULT_TICK_MS, paused: false, sound: true });

// ─────────────────────────── derived ────────────────────────────

export const day = (s: GameState) => Math.floor(s.hour / 24) + 1;
export const clock = (s: GameState) => `${String(s.hour % 24).padStart(2, '0')}:00`;

export function assetPrestige(s: GameState) {
  return s.assets.reduce((sum, a) => sum + (itemById(a.itemId)?.prestige ?? 0), 0);
}
export const prestige = (s: GameState) => Math.max(0, Math.round(assetPrestige(s) + s.reputation));
export function prestigeTier(p: number) {
  let idx = 0;
  PRESTIGE_TIERS.forEach((t, i) => { if (p >= t.min) idx = i; });
  const next = PRESTIGE_TIERS[idx + 1];
  return { ...PRESTIGE_TIERS[idx], index: idx, next };
}

export function tags(s: GameState) {
  const t = new Set<string>();
  s.assets.forEach((a) => itemById(a.itemId)?.tags?.forEach((x) => t.add(x)));
  return t;
}

export function modifiers(s: GameState) {
  const decay: Needs = { ...BASE_DECAY };
  let commute = 0;
  let sleepQuality = 1;
  let bestHomePrice = -1;
  let homeMitigate: Partial<Needs> = {};
  for (const a of s.assets) {
    const it = itemById(a.itemId);
    if (!it) continue;
    if (it.commute) commute = Math.max(commute, it.commute);
    if (it.category === 'RESIDENCE') {
      if (it.price > bestHomePrice) {
        bestHomePrice = it.price;
        sleepQuality = it.sleepQuality ?? 1;
        homeMitigate = it.mitigate ?? {};
      }
      continue;
    }
    if (it.mitigate) for (const k of NEEDS) decay[k] *= 1 - (it.mitigate[k] ?? 0);
  }
  for (const k of NEEDS) decay[k] = Math.max(BASE_DECAY[k] * 0.25, decay[k] * (1 - (homeMitigate[k] ?? 0)));
  const businesses = s.assets.filter((a) => a.category === 'BUSINESS');
  const upkeep = s.assets.reduce((sum, a) => sum + (itemById(a.itemId)?.upkeepPerDay ?? 0), 0);
  const home = homeAsset(s);
  const rentals = s.assets.filter((a) => a.category === 'RESIDENCE' && a.uid !== home?.uid && (itemById(a.itemId)?.rentPerDay ?? 0) > 0);
  const rentIncome = rentals.reduce((sum, a) => sum + (itemById(a.itemId)?.rentPerDay ?? 0), 0);
  return { decay, commute, sleepQuality, ownsHome: bestHomePrice >= 0, businesses, upkeep, home, rentals, rentIncome };
}

/** The residence you live in: the most expensive one you own. */
export function homeAsset(s: GameState) {
  let best: OwnedAsset | undefined;
  for (const a of s.assets) if (a.category === 'RESIDENCE' && (!best || (itemById(a.itemId)?.price ?? 0) > (itemById(best.itemId)?.price ?? 0))) best = a;
  return best;
}

export const hourOfDay = (s: GameState) => s.hour % 24;
export function inWindow(h: number, w: [number, number]) {
  const [a, b] = w;
  return a < b ? h >= a && h < b : h >= a || h < b;
}
const hh = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;

/** Overall mood 0–100 from needs and health. Drives productivity. */
export function mood(s: GameState) {
  const n = s.needs;
  const m = 0.3 * n.energy + 0.25 * n.hunger + 0.2 * n.hygiene + 0.25 * n.social - (100 - s.health) * 0.3;
  return clamp(Math.round(m));
}
export function moodLabel(m: number) {
  return m >= 80 ? 'Thriving' : m >= 60 ? 'Content' : m >= 40 ? 'Strained' : m >= 20 ? 'Struggling' : 'Miserable';
}

export function totalDebt(s: GameState) {
  return s.loans.reduce((sum, l) => sum + l.balance, 0);
}
export function netWorth(s: GameState) {
  const inv = (s.investments?.index ?? 0) + (s.investments?.crypto ?? 0);
  return s.cash + inv + s.assets.reduce((sum, a) => sum + a.currentValue, 0) - totalDebt(s);
}

export function loanTerms(s: GameState) {
  const p = prestige(s);
  const c = s.creditScore;
  let rate = c >= 750 ? 0.004 : c >= 680 ? 0.008 : c >= 600 ? 0.015 : c >= 500 ? 0.025 : 0.04;
  rate *= 1 - Math.min(0.3, p / 3000); // prestige lowers your rate
  if (s.startType === 'NEPO') rate *= 0.75;
  const locked = s.hour < s.creditLockedUntil || c < 500;
  const ceiling = locked ? 0 : (c - 450) * 40 + p * 60 + Math.max(0, netWorth(s)) * 0.3;
  const unsecured = s.loans.filter((l) => !l.kind || l.kind === 'personal').reduce((sum, l) => sum + l.balance, 0);
  const available = Math.max(0, Math.floor((ceiling - unsecured) / 100) * 100);
  return { rate: round2(rate * 10000) / 10000, available, locked, lockedDays: Math.ceil(Math.max(0, s.creditLockedUntil - s.hour) / 24) };
}

export function careerInfo(s: GameState) {
  const cur = CAREERS[s.careerLevel];
  const next = CAREERS[s.careerLevel + 1];
  const shiftsNeeded = next ? Math.ceil(next.shifts * (s.startType === 'LAPO' ? 0.8 : 1)) : 0;
  return { cur, next, shiftsNeeded };
}

export function hourlyWage(s: GameState) {
  const { cur } = careerInfo(s);
  const traitMult = s.startType === 'LAPO' ? 1.25 : 1;
  const prestigeMult = 1 + Math.min(0.5, prestige(s) / 2000);
  return cur.rate * traitMult * prestigeMult;
}

export function productivity(s: GameState) {
  const md = mood(s);
  let m = 0.75 + 0.4 * (md / 100); // miserable 0.75× … thriving 1.15×
  const reasons: string[] = [];
  if (s.needs.energy < 20) { m *= 0.5; reasons.push('exhausted'); }
  if (s.needs.hygiene < 20) { m *= 0.8; reasons.push('unkempt'); }
  if (s.health < 40) { m *= 0.8; reasons.push('unwell'); }
  if (md < 40) reasons.push('low mood');
  return { mult: Math.round(m * 100) / 100, reasons };
}

/** Terms for buying an item on finance. */
export function financeTerms(s: GameState, itemId: string) {
  const it = itemById(itemId);
  const f = it ? FINANCE[it.category] : undefined;
  if (!it || !f) return null;
  const c = s.creditScore;
  let rate = c >= 750 ? 0.0005 : c >= 680 ? 0.0008 : c >= 600 ? 0.0012 : 0.0018;
  rate *= f.kind === 'auto' ? 1.5 : f.kind === 'business' ? 2 : 1;
  if (s.startType === 'NEPO') rate *= 0.8;
  const down = Math.ceil(it.price * f.down);
  const principal = it.price - down;
  const weekly = principal / f.weeks + principal * rate * 7;
  const locked = s.hour < s.creditLockedUntil;
  const reason = locked ? 'Credit frozen' : c < 550 ? 'Credit score below 550' : undefined;
  return { ...f, rate, down, principal, weekly, ok: !reason, reason };
}

// ─────────────────────────── helpers ────────────────────────────

function ledger(s: GameState, amount: number, category: TxnCategory, description: string) {
  s.txns.unshift({ id: uid(), hour: s.hour, amount: round2(amount), category, description });
  if (s.txns.length > MAX_LEDGER) s.txns.length = MAX_LEDGER;
}

function makeLoan(label: string, amount: number, rate: number, hour: number, kind: Loan['kind'], weeks?: number, assetUid?: string): Loan {
  return { id: uid(), label, principal: amount, balance: amount, dailyRate: rate, takenAtHour: hour, nextDueHour: hour + 24 * 7, missed: 0, kind, weeksLeft: weeks, assetUid };
}

function applyNeeds(s: GameState, fx: Partial<Needs>) {
  for (const k of NEEDS) if (fx[k]) s.needs[k] = clamp(s.needs[k] + (fx[k] as number));
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// ─────────────────────────── the clock ──────────────────────────

export type HourMode = { sleeping?: boolean; working?: boolean; social?: boolean; relaxing?: boolean };

/** Advance one in-game hour. Mutates `s`. */
export function simulateHour(s: GameState, out: Out, opts: HourMode = {}) {
  if (s.brokeOpen) return;
  const mods = modifiers(s);
  const h = hourOfDay(s);
  s.hour += 1;
  const night = h >= 21 || h < 9;
  const lateNight = h < 5;

  // ── Body clock ──
  if (opts.sleeping) {
    const gain = SLEEP_GAIN * mods.sleepQuality * (night ? 1 : 0.7) * (s.health < 40 ? 0.8 : 1);
    s.needs.energy = clamp(s.needs.energy + gain);
    for (const k of ['hunger', 'hygiene'] as const) s.needs[k] = clamp(s.needs[k] - SLEEP_DECAY[k] * (mods.decay[k] / BASE_DECAY[k]));
  } else {
    let e = mods.decay.energy;
    if (lateNight) e *= 1.5; // up past your bedtime
    if (s.health < 50) e *= 1.3;
    if (opts.working) e *= 1.25;
    if (opts.relaxing) e *= 0.3;
    s.needs.energy = clamp(s.needs.energy - e);
    s.needs.hunger = clamp(s.needs.hunger - mods.decay.hunger * (opts.working ? 1.15 : 1));
    s.needs.hygiene = clamp(s.needs.hygiene - mods.decay.hygiene * (opts.working ? 1.4 : opts.social ? 1.3 : 1));
    if (opts.working) s.needs.social = clamp(s.needs.social + 1.5); // colleagues
    else if (!opts.social) s.needs.social = clamp(s.needs.social - mods.decay.social * (s.needs.hygiene < 20 ? 1.5 : 1));
  }

  // ── Health ──
  if (s.needs.hunger <= 0) s.health -= 3;
  else if (s.needs.hunger < 10) s.health -= 1.5;
  if (!opts.sleeping && s.needs.energy <= 0) s.health -= 2;
  if (s.needs.hygiene < 15 && Math.random() < 0.02) {
    const bill = 150 + Math.round(prestige(s) * 0.5);
    s.health -= 12; s.cash -= bill;
    ledger(s, -bill, 'EXPENSE', 'Clinic visit — infection');
    out.push({ kind: 'bad', text: `Poor hygiene caught up with you: an infection and a ${money(bill)} clinic bill.` });
  }
  if (s.needs.hunger > 30 && s.needs.energy > 20) s.health += opts.sleeping ? 0.8 : 0.3;
  s.health = clamp(s.health);
  if (s.health <= 0) {
    const bill = 2_500 + prestige(s) * 5;
    s.cash -= bill;
    ledger(s, -bill, 'EXPENSE', 'Emergency hospital admission');
    s.health = 45; s.needs.hunger = Math.max(s.needs.hunger, 50); s.needs.energy = Math.max(s.needs.energy, 40);
    out.push({ kind: 'bad', text: `You collapsed and were rushed to hospital. Bill: ${money(bill)}.` });
  }

  // Reputation: passive decay + neglect penalties
  s.reputation *= 0.997;
  if (s.needs.hygiene < 20) s.reputation -= 0.5;
  if (s.needs.social < CRITICAL) s.reputation -= 0.3;
  s.reputation = Math.max(0, s.reputation);

  // Business revenue, hourly
  const p = prestige(s);
  for (const b of mods.businesses) {
    const it = itemById(b.itemId)!;
    b.morale = clamp((b.morale ?? 70) - 0.25);
    if (it.open && !inWindow(h, it.open)) continue;
    const vol = it.volatility ?? 0.3;
    const noise = 1 + (Math.random() * 2 - 1) * vol;
    const rev = Math.max(0, (it.revenuePerHour ?? 0) * (0.5 + b.morale / 100) * (1 + p / 1500) * noise * s.marketMood);
    b.revenueToday = (b.revenueToday ?? 0) + rev;
    s.cash += rev;
  }

  if (s.hour % 24 === 0) endOfDay(s, out);

  // Bankruptcy check
  checkBroke(s, out);
}

function endOfDay(s: GameState, out: Out) {
  const mods = modifiers(s);
  const d = day(s) - 1;
  s.stats.daysSurvived += 1;

  // Business results
  let bizRev = 0;
  let bizCost = 0;
  for (const b of mods.businesses) {
    bizRev += b.revenueToday ?? 0;
    bizCost += itemById(b.itemId)?.upkeepPerDay ?? 0;
    b.revenueToday = 0;
  }
  if (bizRev > 0) { ledger(s, bizRev, 'INCOME', `Business revenue — day ${d}`); s.stats.lifetimeEarnings += bizRev; }
  s.week.bizProfit += bizRev - bizCost;

  // Rent / upkeep
  if (!mods.ownsHome) { s.cash -= STUDIO_RENT; ledger(s, -STUDIO_RENT, 'EXPENSE', 'Studio rent'); }
  if (mods.rentIncome > 0) {
    const occupancy = 0.85 + Math.random() * 0.15;
    const rent = mods.rentIncome * occupancy;
    s.cash += rent; s.week.bizProfit += rent; s.stats.lifetimeEarnings += rent;
    ledger(s, rent, 'INCOME', `Rent from ${mods.rentals.length} propert${mods.rentals.length > 1 ? 'ies' : 'y'}`);
  }
  // Investments move daily
  s.investments ||= { index: 0, crypto: 0 };
  for (const k of Object.keys(FUNDS) as FundId[]) {
    const f = FUNDS[k];
    if (s.investments[k] > 0) s.investments[k] = round2(s.investments[k] * (1 + f.mean + gauss() * f.vol));
  }
  if (mods.upkeep > 0) { s.cash -= mods.upkeep; ledger(s, -mods.upkeep, 'EXPENSE', 'Upkeep, payroll & memberships'); }

  // Weekly business tax
  if (d % 7 === 0) {
    if (s.week.bizProfit > 0) {
      const tax = s.week.bizProfit * BUSINESS_TAX;
      s.cash -= tax;
      ledger(s, -tax, 'TAX', 'Weekly business profit tax (20%)');
      out.push({ kind: 'info', text: `Tax man visited: ${money(tax)} on this week's business profit.` });
    }
    s.week.bizProfit = 0;
  }

  // Loans: compound interest + weekly instalment
  for (const l of s.loans) {
    l.balance = round2(l.balance * (1 + l.dailyRate));
    if (s.hour >= l.nextDueHour) {
      const due = l.weeksLeft
        ? Math.min(l.balance, l.balance / Math.max(1, l.weeksLeft))
        : Math.min(l.balance, Math.max(25, l.balance * 0.12));
      if (s.cash >= due) {
        s.cash -= due; l.balance = round2(l.balance - due); l.missed = 0;
        s.creditScore = Math.min(850, s.creditScore + 6);
        if (l.weeksLeft) l.weeksLeft = Math.max(1, l.weeksLeft - 1);
        ledger(s, -due, 'LOAN', `Instalment — ${l.label}`);
      } else {
        l.missed += 1;
        l.balance = round2(l.balance * 1.05);
        s.creditScore = Math.max(300, s.creditScore - 30);
        out.push({ kind: 'bad', text: `Missed a ${money(due)} payment on "${l.label}". Penalty added, credit score hit.` });
        if (l.missed >= 3) repossess(s, l, out);
      }
      l.nextDueHour += 24 * 7;
    }
  }
  s.loans = s.loans.filter((l) => l.balance > 0.5);

  // Asset value drift
  for (const a of s.assets) {
    const it = itemById(a.itemId);
    if (it?.driftPerDay) a.currentValue = Math.max(0, round2(a.currentValue * (1 + it.driftPerDay)));
  }

  // Health bills
  if (s.health < 30) {
    const bill = 300 + prestige(s);
    s.cash -= bill;
    ledger(s, -bill, 'EXPENSE', 'Medical bills');
    out.push({ kind: 'bad', text: `Your poor health cost ${money(bill)} in medical bills.` });
  }

  // Market & daily event
  s.marketMood = 0.85 + Math.random() * 0.3;
  s.dayEvent = null;
  if (Math.random() < 0.35) randomEvent(s, out);

  // Net-worth watch → liquidation after 3 consecutive negative days
  const nw = netWorth(s);
  s.stats.peakNetWorth = Math.max(s.stats.peakNetWorth, nw);
  if (nw < 0) {
    s.negativeNetWorthDays += 1;
    if (s.negativeNetWorthDays >= 3) { liquidate(s, out, 'Net worth stayed negative for 3 days.'); return; }
    out.push({ kind: 'bad', text: `Net worth is negative (day ${s.negativeNetWorthDays}/3 before liquidation).` });
  } else s.negativeNetWorthDays = 0;
}

function randomEvent(s: GameState, out: Out) {
  const mods = modifiers(s);
  const pool: (() => void)[] = [
    () => { s.marketMood = 0.65; s.dayEvent = 'Market slump'; out.push({ kind: 'bad', text: 'Markets are jittery today — business revenue down.' }); },
    () => { s.marketMood = 1.35; s.dayEvent = 'Consumer boom'; out.push({ kind: 'good', text: 'Consumer boom! Business revenue up today.' }); },
    () => { const amt = 50 + Math.round(Math.random() * 400); s.cash += amt; ledger(s, amt, 'INCOME', 'An old friend repaid a debt'); out.push({ kind: 'good', text: `An old friend repaid you ${money(amt)}.` }); },
    () => { const amt = Math.min(250, Math.max(0, s.cash * 0.03)); if (amt > 1) { s.cash -= amt; ledger(s, -amt, 'EXPENSE', 'Pickpocketed'); out.push({ kind: 'bad', text: `Pickpocketed — lost ${money(amt)}.` }); } },
  ];
  if (prestige(s) > 100) pool.push(() => { s.reputation += 15; out.push({ kind: 'gold', text: 'A society magazine profiled you. +15 reputation.' }); });
  const car = s.assets.find((a) => a.category === 'VEHICLE');
  if (car) pool.push(() => { const amt = Math.round(car.currentValue * 0.02); s.cash -= amt; ledger(s, -amt, 'EXPENSE', `Repairs — ${car.name}`); out.push({ kind: 'bad', text: `Fender bender. ${car.name} repairs: ${money(amt)}.` }); });
  if (mods.businesses.length) pool.push(() => { mods.businesses.forEach((b) => (b.morale = clamp((b.morale ?? 70) + 20))); s.marketMood *= 1.2; s.dayEvent = 'Viral review'; out.push({ kind: 'good', text: 'One of your ventures went viral. Staff morale and sales up.' }); });
  pool[Math.floor(Math.random() * pool.length)]();
}

function repossess(s: GameState, loan: Loan, out: Out) {
  const target = (loan.assetUid && s.assets.find((a) => a.uid === loan.assetUid))
    || [...s.assets].filter((a) => a.category !== 'BUSINESS' && a.currentValue > 0).sort((a, b) => b.currentValue - a.currentValue)[0];
  if (!target) return;
  const proceeds = target.currentValue * FIRE_SALE;
  s.assets = s.assets.filter((a) => a.uid !== target.uid);
  loan.balance = round2(Math.max(0, loan.balance - proceeds));
  loan.missed = 0;
  s.reputation *= 0.85;
  ledger(s, proceeds, 'SALE', `Repossessed: ${target.name} (applied to loan)`);
  out.push({ kind: 'bad', text: `The bank repossessed your ${target.name}.` });
}

function checkBroke(s: GameState, out: Out) {
  if (s.cash < 0) {
    s.negativeTicks += 1;
    if (s.negativeTicks >= BROKE_TICKS && !s.brokeOpen) {
      s.brokeOpen = true;
      out.push({ kind: 'bad', text: "You're broke. Sell an asset or take a loan." });
    }
  } else s.negativeTicks = 0;
}

export function liquidate(s: GameState, out: Out, reason: string) {
  let proceeds = 0;
  const sold: string[] = [];
  for (const a of s.assets) { proceeds += a.currentValue * LIQUIDATION; sold.push(a.name); }
  if (s.investments) { proceeds += s.investments.index + s.investments.crypto; s.investments = { index: 0, crypto: 0 }; }
  s.assets = [];
  const debt = totalDebt(s);
  const pot = s.cash + proceeds;
  s.cash = Math.max(0, round2(pot - debt));
  s.loans = [];
  s.creditScore = 300;
  s.creditLockedUntil = s.hour + 24 * 14;
  s.reputation = Math.floor(s.reputation * 0.4);
  s.careerLevel = Math.max(0, s.careerLevel - 1);
  s.shiftsAtLevel = 0;
  s.negativeTicks = 0;
  s.negativeNetWorthDays = 0;
  s.brokeOpen = false;
  ledger(s, proceeds, 'SALE', `Liquidation — ${sold.length} assets sold at 20%`);
  s.liquidationReport = `${reason}\n\nEverything was sold at 20% of value (${money(proceeds)}), debts of ${money(debt)} were settled or discharged, and you were demoted. Your credit score is now 300 and lenders won't touch you for 14 days.`;
  out.push({ kind: 'bad', text: 'LIQUIDATION. You lost almost everything.' });
}

// ─────────────────────────── player moves ─────────────────────────

export type Result = { ok: boolean; reason?: string };

/** What an activity costs you right now (trips are cheaper if you own the jet). */
export function actionCost(s: GameState, a: (typeof ACTIONS)[number]) {
  if (a.jetDiscount && s.assets.some((x) => x.itemId === 'jet')) return Math.round(a.cost * (1 - a.jetDiscount));
  return a.cost;
}

export function canDoAction(s: GameState, id: string): Result {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a) return { ok: false, reason: 'Unknown' };
  if (s.brokeOpen) return { ok: false, reason: 'Sort out your finances first' };
  if (a.minPrestige && prestige(s) < a.minPrestige) return { ok: false, reason: `Requires ${a.minPrestige} prestige` };
  if (a.open && !inWindow(hourOfDay(s), a.open)) return { ok: false, reason: `Open ${hh(a.open[0])}–${hh(a.open[1])}` };
  if (a.minEnergy && s.needs.energy < a.minEnergy) return { ok: false, reason: `Too tired (needs ${a.minEnergy}+ energy)` };
  if (a.maxNeed?.hunger !== undefined && s.needs.hunger > a.maxNeed.hunger) return { ok: false, reason: "You're not hungry" };
  if (a.maxNeed?.energy !== undefined && s.needs.energy > a.maxNeed.energy) return { ok: false, reason: "You're not tired" };
  if (actionCost(s, a) > s.cash) return { ok: false, reason: 'Not enough cash' };
  if (a.special === 'manage' && !s.assets.some((x) => x.category === 'BUSINESS')) return { ok: false, reason: 'You own no ventures' };
  if (a.special === 'poker' && !tags(s).has('poker')) return { ok: false, reason: 'Needs a Gold Chronograph' };
  return { ok: true };
}

export function doAction(s: GameState, id: string, out: Out): Result {
  const check = canDoAction(s, id);
  if (!check.ok) return check;
  const a = ACTIONS.find((x) => x.id === id)!;

  const cost = actionCost(s, a);
  if (cost) { s.cash -= cost; ledger(s, -cost, 'EXPENSE', a.gamble ? `${a.label} stake` : a.label); }

  if (a.special === 'work' || a.special === 'overtime') {
    const mods = modifiers(s);
    const prod = productivity(s);
    const gross = hourlyWage(s) * 4 * (a.special === 'overtime' ? 2.2 : 1) * prod.mult;
    const tax = gross * WAGE_TAX;
    const shifts = a.special === 'overtime' ? 2 : 1;
    const commute = 4 * (1 - mods.commute);
    applyNeeds(s, { energy: -commute });
    for (let i = 0; i < a.hours; i++) simulateHour(s, out, { working: true });
    s.cash += gross - tax;
    s.stats.lifetimeEarnings += gross;
    ledger(s, gross, 'INCOME', `${careerInfo(s).cur.title} wages${prod.reasons.length ? ` (${prod.reasons.join(', ')})` : ''}`);
    ledger(s, -tax, 'TAX', 'Income tax withheld (10%)');
    s.shiftsAtLevel += shifts; s.totalShifts += shifts;
    out.push({ kind: 'good', text: `Earned ${money(gross - tax)} after tax${prod.mult < 1 ? ` — productivity cut (${prod.reasons.join(', ')})` : ''}.` });
    tryPromote(s, out);
    checkBroke(s, out);
    return { ok: true };
  }

  if (a.special === 'manage') {
    for (let i = 0; i < a.hours; i++) simulateHour(s, out, { working: true });
    s.assets.filter((x) => x.category === 'BUSINESS').forEach((b) => (b.morale = clamp((b.morale ?? 70) + 30)));
    applyNeeds(s, a.effects);
    out.push({ kind: 'good', text: 'Your staff feel seen. Morale up across your ventures.' });
    return { ok: true };
  }

  const mode: HourMode = { sleeping: a.sleeping, social: a.group === 'Society' || !!a.effects.social, relaxing: a.special === 'relax' };
  const before = s.needs.energy;
  for (let i = 0; i < a.hours; i++) simulateHour(s, out, mode);
  applyNeeds(s, a.effects);
  if (a.sleeping) {
    const gained = Math.round(s.needs.energy - before);
    out.push({ kind: 'info', text: `Slept ${a.hours}h: +${gained} energy${!inWindow((s.hour - a.hours) % 24, [21, 9]) ? ' (daytime sleep is less restful)' : ''}.` });
  }
  if (a.rep) s.reputation += a.rep;
  if (a.tokens) { s.tokens += a.tokens; out.push({ kind: 'gold', text: `+${a.tokens} networking token${a.tokens > 1 ? 's' : ''}.` }); }
  if (a.health) {
    s.health = clamp(s.health + a.health);
    out.push({ kind: 'good', text: `${a.label}: health ${a.health > 0 ? '+' : ''}${a.health}.` });
  }
  if (a.study) {
    s.shiftsAtLevel += a.study;
    out.push({ kind: 'good', text: `${a.label} done. Counts as ${a.study} shift${a.study > 1 ? 's' : ''} toward promotion.` });
    tryPromote(s, out);
  }

  if (a.gamble) {
    if (Math.random() < a.gamble.odds) {
      const pot = Math.round(cost * a.gamble.payout);
      s.cash += pot; ledger(s, pot, 'INCOME', `${a.label} winnings`);
      out.push({ kind: 'gold', text: `Winner! ${a.label} paid ${money(pot)}.` });
    } else out.push({ kind: 'bad', text: `${a.label}: the house wins. You lost ${money(cost)}.` });
  } else if (a.special === 'poker') {
    const win = Math.random() < 0.46;
    if (win) {
      const pot = a.cost * 2.15;
      s.cash += pot; ledger(s, pot, 'INCOME', 'Poker winnings');
      s.reputation += 20;
      out.push({ kind: 'gold', text: `You took the table. ${money(pot)} and the room's respect.` });
    } else out.push({ kind: 'bad', text: 'You lost the buy-in. They smiled politely.' });
  } else if ((cost > 0 || a.rep) && !a.health && !a.study) out.push({ kind: 'info', text: `${a.label} — done.` });

  checkBroke(s, out);
  return { ok: true };
}

function tryPromote(s: GameState, out: Out) {
  const { next, shiftsNeeded } = careerInfo(s);
  if (!next) return;
  if (s.shiftsAtLevel < shiftsNeeded) return;
  if (prestige(s) < next.prestige) {
    if (s.shiftsAtLevel === shiftsNeeded) out.push({ kind: 'info', text: `Promotion to ${next.title} needs ${next.prestige} prestige.` });
    return;
  }
  if (next.tag && !tags(s).has(next.tag)) {
    if (s.shiftsAtLevel === shiftsNeeded) out.push({ kind: 'info', text: `Promotion to ${next.title} needs ${next.tagLabel}.` });
    return;
  }
  s.careerLevel += 1;
  s.shiftsAtLevel = 0;
  s.reputation += 10;
  out.push({ kind: 'gold', text: `Promoted to ${next.title}! New wage ${money(next.rate)}/h base.` });
}

export function canBuy(s: GameState, itemId: string, financed = false): Result {
  const it = itemById(itemId);
  if (!it) return { ok: false, reason: 'Unknown' };
  if (s.brokeOpen) return { ok: false, reason: 'Sort out your finances first' };
  if (it.minPrestige && prestige(s) < it.minPrestige) return { ok: false, reason: `Requires ${it.minPrestige} prestige` };
  if (it.tokens && s.tokens < it.tokens) return { ok: false, reason: `Requires ${it.tokens} networking token${it.tokens > 1 ? 's' : ''}` };
  if (it.category !== 'CONSUMABLE' && !it.multi && s.assets.some((a) => a.itemId === it.id)) return { ok: false, reason: 'Already owned' };
  if (financed) {
    const f = financeTerms(s, itemId);
    if (!f) return { ok: false, reason: 'Not financeable' };
    if (!f.ok) return { ok: false, reason: f.reason };
    if (f.down > s.cash) return { ok: false, reason: `Need ${money(f.down)} deposit` };
    return { ok: true };
  }
  if (it.price > s.cash) return { ok: false, reason: 'Not enough cash' };
  return { ok: true };
}

export function buy(s: GameState, itemId: string, out: Out, financed = false): Result {
  const check = canBuy(s, itemId, financed);
  if (!check.ok) return check;
  const it = itemById(itemId)!;
  const terms = financed ? financeTerms(s, itemId)! : null;
  s.cash -= terms ? terms.down : it.price;
  if (it.category === 'CONSUMABLE') {
    applyNeeds(s, it.effects ?? {});
    s.reputation += it.prestige;
    ledger(s, -it.price, 'EXPENSE', it.name);
    out.push({ kind: 'info', text: `${it.name} enjoyed.` });
    return { ok: true };
  }
  if (it.tokens) s.tokens -= it.tokens;
  const asset: OwnedAsset = {
    uid: uid(), itemId: it.id, name: it.name, category: it.category,
    purchasePrice: it.price, currentValue: round2(it.price * it.resale), boughtAtHour: s.hour,
    ...(it.category === 'BUSINESS' ? { morale: 70, revenueToday: 0 } : {}),
  };
  s.assets.push(asset);
  if (terms) {
    s.loans.push(makeLoan(`${terms.label} — ${it.name}`, terms.principal, terms.rate, s.hour, terms.kind, terms.weeks, asset.uid));
    ledger(s, -terms.down, 'PURCHASE', `${it.name} (${Math.round(terms.down / it.price * 100)}% deposit)`);
    out.push({ kind: 'gold', text: `Acquired: ${it.name} with ${money(terms.down)} down. ${terms.label}: ~${money(terms.weekly)}/week for ${terms.weeks} weeks.` });
  } else {
    ledger(s, -it.price, 'PURCHASE', it.name);
    out.push({ kind: 'gold', text: `Acquired: ${it.name}. +${it.prestige} prestige.` });
  }
  return { ok: true };
}

export function saleValue(a: OwnedAsset, mode: 'normal' | 'fire' = 'normal') {
  return round2(a.currentValue * (mode === 'fire' ? FIRE_SALE : 1));
}

export function sell(s: GameState, assetUid: string, mode: 'normal' | 'fire', out: Out): Result {
  const a = s.assets.find((x) => x.uid === assetUid);
  if (!a) return { ok: false, reason: 'Not found' };
  const v = saleValue(a, mode);
  s.assets = s.assets.filter((x) => x.uid !== assetUid);
  s.cash += v;
  const lien = s.loans.find((l) => l.assetUid === assetUid);
  if (lien) {
    s.cash -= lien.balance;
    ledger(s, -lien.balance, 'LOAN', `Settled ${lien.label} on sale`);
    s.loans = s.loans.filter((l) => l !== lien);
  }
  if (mode === 'fire') s.reputation *= 0.95;
  ledger(s, v, 'SALE', `${mode === 'fire' ? 'Fire sale' : 'Sold'}: ${a.name}`);
  out.push({ kind: mode === 'fire' ? 'bad' : 'info', text: `${mode === 'fire' ? 'Fire-sold' : 'Sold'} ${a.name} for ${money(v)}.` });
  resolveBroke(s);
  return { ok: true };
}

export function borrow(s: GameState, amount: number, out: Out, label = 'Personal loan'): Result {
  const t = loanTerms(s);
  if (t.locked) return { ok: false, reason: 'Credit locked' };
  amount = Math.floor(amount);
  if (amount <= 0 || amount > t.available) return { ok: false, reason: 'Over your limit' };
  s.loans.push(makeLoan(label, amount, t.rate, s.hour, 'personal'));
  s.cash += amount;
  s.creditScore = Math.max(300, s.creditScore - 5);
  ledger(s, amount, 'LOAN', `${label} disbursed`);
  out.push({ kind: 'info', text: `Borrowed ${money(amount)} at ${(t.rate * 100).toFixed(2)}%/day.` });
  resolveBroke(s);
  return { ok: true };
}

export function repay(s: GameState, loanId: string, amount: number, out: Out): Result {
  const l = s.loans.find((x) => x.id === loanId);
  if (!l) return { ok: false, reason: 'Not found' };
  const pay = Math.min(amount, l.balance, Math.max(0, s.cash));
  if (pay <= 0) return { ok: false, reason: 'No cash' };
  s.cash -= pay; l.balance = round2(l.balance - pay);
  ledger(s, -pay, 'LOAN', `Repayment — ${l.label}`);
  if (l.balance <= 0.5) {
    s.loans = s.loans.filter((x) => x.id !== loanId);
    s.creditScore = Math.min(850, s.creditScore + 20);
    out.push({ kind: 'good', text: `"${l.label}" paid off. Credit score up.` });
  }
  return { ok: true };
}

export function invest(s: GameState, fund: FundId, amount: number, out: Out): Result {
  amount = Math.floor(amount);
  if (amount <= 0) return { ok: false, reason: 'Enter an amount' };
  if (amount > s.cash) return { ok: false, reason: 'Not enough cash' };
  s.investments ||= { index: 0, crypto: 0 };
  s.cash -= amount; s.investments[fund] += amount;
  ledger(s, -amount, 'PURCHASE', `Invested in ${FUNDS[fund].name}`);
  out.push({ kind: 'info', text: `${money(amount)} into ${FUNDS[fund].name}.` });
  return { ok: true };
}

export function withdraw(s: GameState, fund: FundId, amount: number, out: Out): Result {
  s.investments ||= { index: 0, crypto: 0 };
  amount = Math.min(Math.floor(amount), Math.floor(s.investments[fund]));
  if (amount <= 0) return { ok: false, reason: 'Nothing to withdraw' };
  const fee = amount * FUNDS[fund].fee;
  s.investments[fund] = round2(s.investments[fund] - amount);
  s.cash += amount - fee;
  ledger(s, amount - fee, 'SALE', `Cashed out ${FUNDS[fund].name}${fee ? ' (1% fee)' : ''}`);
  out.push({ kind: 'good', text: `Cashed out ${money(amount - fee)} from ${FUNDS[fund].name}.` });
  resolveBroke(s);
  return { ok: true };
}

function resolveBroke(s: GameState) {
  if (s.cash >= 0) { s.brokeOpen = false; s.negativeTicks = 0; }
}

export function declareBankruptcy(s: GameState, out: Out) {
  liquidate(s, out, 'You declared bankruptcy.');
}

/** Migrate older/foreign saves defensively. */
export function hydrate(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as GameState;
  if (typeof s.cash !== 'number' || !s.needs || !Array.isArray(s.assets)) return null;
  return { ...newGame(s.name ?? 'Anonymous', s.startType ?? 'LAPO'), ...s, version: SAVE_VERSION };
}

export const catalogByCategory = () => {
  const map: Record<string, typeof CATALOG> = {};
  CATALOG.forEach((c) => (map[c.category] ||= []).push(c));
  return map;
};
