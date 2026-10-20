import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as E from './engine';
import type { GameState, Notice, Settings, StartType } from './types';
import { sfx } from '../lib/sound';
import { ACTION_LOC, LOCS, homeLoc, purchaseLoc, type LocId, type Tab } from '../world/layout';
import { ACTIONS, itemById } from './config';
import type { ActionGroup, FundId } from './config';

export interface Toast extends Notice { id: number }
let toastId = 0;

interface Store {
  game: GameState | null;
  settings: Settings;
  toasts: Toast[];
  flash: number; // increments on purchases → gold shimmer
  // ── 3D world / UI (not persisted) ──
  avatarTarget: LocId;
  activity: string;
  burst: { loc: LocId; n: number } | null;
  drawer: { open: boolean; tab: Tab; groups?: ActionGroup[]; shopCat?: string; title?: string; loc?: LocId };
  focus: { loc: LocId; n: number } | null;
  /** Inside your home (interior view) instead of the city. */
  inside: boolean;
  /** An activity being acted out indoors: walk to the spot, then show time passing, then apply it. */
  homeTask: { id: string; label: string; hours: number; phase: 'walk' | 'doing' } | null;
  enterHome: () => void;
  exitHome: () => void;
  startHomeTask: (id: string) => void;
  setHomeTaskPhase: (phase: 'walk' | 'doing') => void;
  finishHomeTask: () => void;
  visit: (loc: LocId) => void;
  openTab: (tab: Tab) => void;
  closeDrawer: () => void;
  start: (name: string, type: StartType) => void;
  tick: () => void;
  act: (id: string) => void;
  buy: (id: string, financed?: boolean) => void;
  invest: (fund: FundId, amount: number) => void;
  withdraw: (fund: FundId, amount: number) => void;
  sell: (uid: string, mode: 'normal' | 'fire') => void;
  borrow: (amount: number, label?: string) => void;
  repay: (loanId: string, amount: number) => void;
  bankrupt: () => void;
  dismissLiquidation: () => void;
  load: (g: GameState) => void;
  reset: () => void;
  setSettings: (p: Partial<Settings>) => void;
  dismissToast: (id: number) => void;
  notify: (n: Notice) => void;
}

export const useGame = create<Store>()(
  persist(
    (set, get) => {
      /** Run an engine mutation on a copy of the game, then publish notices. */
      const run = (fn: (g: GameState, out: E.Out) => E.Result | void, opts: { purchase?: boolean } = {}) => {
        const cur = get().game;
        if (!cur) return;
        const g = structuredClone(cur);
        const out: E.Out = [];
        const res = fn(g, out);
        if (res && !res.ok) {
          get().notify({ kind: 'bad', text: res.reason ?? 'Not possible' });
          return;
        }
        g.lastTickAt = Date.now();
        set((st) => ({ game: g, flash: opts.purchase ? st.flash + 1 : st.flash }));
        out.forEach((n) => get().notify(n));
      };

      return {
        game: null,
        settings: E.defaultSettings(),
        toasts: [],
        flash: 0,
        avatarTarget: 'home',
        activity: 'At home',
        burst: null,
        drawer: { open: false, tab: 'Actions' },
        focus: null,
        inside: false,
        homeTask: null,
        enterHome: () => {
          const loc = homeLoc(get().game!);
          set({ inside: true, homeTask: null, avatarTarget: loc, activity: 'At home', drawer: { ...get().drawer, open: false } });
        },
        exitHome: () => set({ inside: false, homeTask: null }),
        startHomeTask: (id) => {
          const g = get().game;
          if (!g || get().homeTask) return;
          const can = E.canDoAction(g, id);
          if (!can.ok) { get().notify({ kind: 'bad', text: can.reason ?? 'Not possible' }); return; }
          const a = ACTIONS.find((x) => x.id === id)!;
          set({ homeTask: { id, label: a.label, hours: a.hours, phase: 'walk' }, drawer: { ...get().drawer, open: false } });
        },
        setHomeTaskPhase: (phase) => set((st) => (st.homeTask ? { homeTask: { ...st.homeTask, phase } } : {})),
        finishHomeTask: () => {
          const t = get().homeTask;
          if (!t) return;
          set({ homeTask: null });
          get().act(t.id);
        },
        visit: (loc) => {
          const L = LOCS[loc];
          set((st) => ({
            drawer: { open: true, tab: L.tab, groups: L.groups, shopCat: L.shopCat, title: L.label, loc },
            focus: { loc, n: (st.focus?.n ?? 0) + 1 },
          }));
        },
        openTab: (tab) => set({ drawer: { open: true, tab } }),
        closeDrawer: () => set((st) => ({ drawer: { ...st.drawer, open: false } })),
        start: (name, type) => set({ game: E.newGame(name, type) }),
        tick: () => run((g, out) => E.simulateHour(g, out)),
        act: (id) => {
          const before = get().game;
          run((g, out) => E.doAction(g, id, out));
          if (get().game !== before) {
            let loc = ACTION_LOC[id] ?? 'home';
            if (loc === 'home') loc = homeLoc(get().game!);
            // Heading out for something you can't do at home takes you back to the city.
            set({ avatarTarget: loc, activity: LOCS[loc].label, ...(loc !== homeLoc(get().game!) ? { inside: false } : {}) });
          }
        },
        invest: (fund, amount) => run((g, out) => E.invest(g, fund, amount, out)),
        withdraw: (fund, amount) => run((g, out) => E.withdraw(g, fund, amount, out)),
        buy: (id, financed) => {
          const before = get().game;
          run((g, out) => E.buy(g, id, out, financed), { purchase: true });
          const g = get().game;
          if (g && g !== before) {
            const it = itemById(id);
            const loc = purchaseLoc(it?.category ?? '', g);
            set((st) => ({ burst: { loc, n: (st.burst?.n ?? 0) + 1 }, ...(it?.category === 'CONSUMABLE' ? {} : { focus: { loc, n: (st.focus?.n ?? 0) + 1 } }) }));
          }
        },
        sell: (uid, mode) => run((g, out) => E.sell(g, uid, mode, out)),
        borrow: (amount, label) => run((g, out) => E.borrow(g, amount, out, label)),
        repay: (loanId, amount) => run((g, out) => E.repay(g, loanId, amount, out)),
        bankrupt: () => run((g, out) => E.declareBankruptcy(g, out)),
        dismissLiquidation: () => run((g) => { g.liquidationReport = null; }),
        load: (g) => set({ game: g }),
        reset: () => set({ game: null, toasts: [], avatarTarget: 'home', inside: false, homeTask: null, drawer: { open: false, tab: 'Actions' } }),
        setSettings: (p) => set((st) => ({ settings: { ...st.settings, ...p } })),
        dismissToast: (id) => set((st) => ({ toasts: st.toasts.filter((t) => t.id !== id) })),
        notify: (n) => {
          const id = ++toastId;
          set((st) => ({ toasts: [...st.toasts.slice(-4), { ...n, id }] }));
          if (get().settings.sound) sfx(n.kind);
          setTimeout(() => get().dismissToast(id), n.kind === 'bad' ? 6000 : 4200);
        },
      };
    },
    {
      name: 'luxe-life-save-v1',
      storage: createJSONStorage(() => {
        try { return localStorage; } catch { return sessionStorage; }
      }),
      partialize: (st) => ({ game: st.game, settings: st.settings }),
    },
  ),
);
