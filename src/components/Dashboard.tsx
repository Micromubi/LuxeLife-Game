import { lazy, Suspense, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { useGameLoop } from '../hooks/useGameLoop';
import { CRITICAL, SPEEDS, VIP_THRESHOLD } from '../game/config';
import * as E from '../game/engine';
import type { Tab } from '../world/layout';
import { LocationBanner, MoneyHud, Radar } from './Hud';
import StatusColumn from './StatusColumn';
import ActionsPanel from './ActionsPanel';
import Shop from './Shop';
import Portfolio from './Portfolio';
import Finance from './Finance';
import Ledger from './Ledger';
import { BrokeModal, LiquidationModal } from './Modals';
import Toasts from './Toasts';
import SettingsMenu from './SettingsMenu';

const World = lazy(() => import('../world/World'));
const TABS: Tab[] = ['Actions', 'Boutique', 'Portfolio', 'Finance', 'Ledger'];

export default function Dashboard() {
  const game = useGame((s) => s.game)!;
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const flash = useGame((s) => s.flash);
  const drawer = useGame((s) => s.drawer);
  const openTab = useGame((s) => s.openTab);
  const closeDrawer = useGame((s) => s.closeDrawer);
  const progress = useGameLoop();
  const [shimmer, setShimmer] = useState(0);
  const [statsOpen, setStatsOpen] = useState(() => {
    try { return localStorage.getItem('luxe-stats-v2') === '1' && window.innerWidth >= 900; } catch { return false; }
  });

  useEffect(() => { try { localStorage.setItem('luxe-stats-v2', statsOpen ? '1' : '0'); } catch { /* ignore */ } }, [statsOpen]);
  useEffect(() => {
    if (!flash) return;
    setShimmer(flash);
    const t = setTimeout(() => setShimmer(0), 950);
    return () => clearTimeout(t);
  }, [flash]);

  const p = E.prestige(game);
  const vip = p >= VIP_THRESHOLD;
  const critical = Object.values(game.needs).some((v) => v < CRITICAL) || game.health < 25 || game.cash < 0;

  return (
    <div className={`fixed inset-0 overflow-hidden ${vip ? 'vip' : ''}`}>
      {/* 3D city */}
      <div className="absolute inset-0">
        <Suspense fallback={<div className="flex h-full items-center justify-center font-serif text-2xl italic text-cream-dim">Building the city…</div>}>
          <World />
        </Suspense>
      </div>
      {critical && <div className="pointer-events-none absolute inset-0 z-40 animate-pulseRed" />}
      {shimmer ? <div key={shimmer} className="shimmer-overlay" /> : null}

      {/* top left: clock & controls */}
      <header className="absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/55 px-3 py-2 backdrop-blur">
        <h1 className="font-serif text-lg font-extrabold leading-none"><span className={`gold-text ${vip ? 'vip-crest' : ''}`}>Luxe Life</span></h1>
        {vip && <span className="rounded-full border border-gold/60 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-gold">VIP</span>}
        <span className="h-5 w-px bg-white/15" />
        <div>
          <div className="num font-hud text-[17px] leading-none tracking-wide">DAY {E.day(game)} · {E.clock(game)}</div>
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gold transition-[width] duration-200" style={{ width: `${settings.paused ? 0 : progress * 100}%` }} />
          </div>
        </div>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setSettings({ paused: !settings.paused })} aria-label={settings.paused ? 'Resume' : 'Pause'}>
          {settings.paused ? '▶' : '❚❚'}
        </button>
        <select className="rounded-lg border border-white/10 bg-black/40 px-1.5 py-1 text-xs text-cream" value={settings.tickMs}
          onChange={(e) => setSettings({ tickMs: Number(e.target.value) })} title="Game speed">
          {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
        </select>
        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setStatsOpen(!statsOpen)} title="Stats">
          ★ {p}
        </button>
        <SettingsMenu />
      </header>
      {game.dayEvent && (
        <div className="hud-text pointer-events-none absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold-light lg:block">
          Today: {game.dayEvent}
        </div>
      )}
      <MoneyHud />

      {/* left: stats */}
      {statsOpen && (
        <div className="absolute left-3 top-[70px] z-20 max-h-[calc(100%-70px-290px)] w-[300px] overflow-y-auto pr-1 [&_.panel]:!bg-[#1a1918]/85 [&_.panel]:backdrop-blur">
          <StatusColumn />
        </div>
      )}

      {/* bottom left: radar */}
      <div className="absolute bottom-4 left-4 z-20">
        <Radar />
      </div>
      <LocationBanner />

      {/* right: drawer */}
      <aside
        className={`absolute bottom-0 right-0 top-[104px] z-30 flex w-full max-w-[460px] flex-col rounded-tl-2xl border-l border-t border-white/[0.08] bg-[#151413]/92 backdrop-blur-md transition-transform duration-300 ${
          drawer.open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div>
            <p className="label">{drawer.groups || drawer.shopCat ? 'You are visiting' : 'Menu'}</p>
            <h2 className="font-serif text-2xl font-bold">{drawer.title ?? drawer.tab}</h2>
          </div>
          <button className="btn-ghost px-3" onClick={closeDrawer} aria-label="Close">✕</button>
        </div>
        <nav className="mx-4 mb-3 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30 p-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => openTab(t)}
              className={`flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold transition ${drawer.tab === t ? 'bg-gold/15 text-gold-light' : 'text-cream-dim hover:text-cream'}`}>
              {t}
            </button>
          ))}
        </nav>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {drawer.tab === 'Actions' && <ActionsPanel groups={drawer.groups} onShowAll={() => openTab('Actions')} />}
          {drawer.tab === 'Boutique' && <Shop key={drawer.shopCat ?? 'all'} initialCat={drawer.shopCat} />}
          {drawer.tab === 'Portfolio' && <Portfolio />}
          {drawer.tab === 'Finance' && <Finance />}
          {drawer.tab === 'Ledger' && <Ledger />}
        </div>
      </aside>

      {/* bottom dock */}
      {!drawer.open && (
        <div className="absolute bottom-4 left-[150px] right-3 z-20 flex flex-col items-center gap-2 sm:left-[210px]">
          <p className="hud-text hidden text-xs text-white/80 sm:block">Click a building or a radar icon to go there · drag to orbit · scroll to zoom</p>
          <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-white/[0.08] bg-black/65 p-1.5 backdrop-blur">
            {TABS.map((t) => (
              <button key={t} onClick={() => openTab(t)} className="btn-ghost whitespace-nowrap border-transparent px-3 py-2 text-xs">{t}</button>
            ))}
          </div>
        </div>
      )}

      <Toasts />
      {game.brokeOpen && <BrokeModal />}
      {game.liquidationReport && <LiquidationModal />}
    </div>
  );
}

