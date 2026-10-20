import { lazy, Suspense, useEffect, useState } from 'react';
import { useGame } from '../game/store';
import { useGameLoop } from '../hooks/useGameLoop';
import { CRITICAL, SPEEDS, VIP_THRESHOLD } from '../game/config';
import * as E from '../game/engine';
import type { Tab } from '../world/layout';
import { HomeTaskOverlay, LocationBanner, MoneyHud, QuickActions, Radar } from './Hud';
import StatusColumn from './StatusColumn';
import ActionsPanel from './ActionsPanel';
import Shop from './Shop';
import Portfolio from './Portfolio';
import Markets from './Markets';
import Finance from './Finance';
import Ledger from './Ledger';
import { BrokeModal, LiquidationModal } from './Modals';
import Toasts from './Toasts';
import SettingsMenu from './SettingsMenu';

const World = lazy(() => import('../world/World'));
const TABS: Tab[] = ['Actions', 'Boutique', 'Markets', 'Portfolio', 'Finance', 'Ledger'];

export default function Dashboard() {
  const game = useGame((s) => s.game)!;
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const flash = useGame((s) => s.flash);
  const drawer = useGame((s) => s.drawer);
  const openTab = useGame((s) => s.openTab);
  const closeDrawer = useGame((s) => s.closeDrawer);
  const inside = useGame((s) => s.inside);
  const enterHome = useGame((s) => s.enterHome);
  const exitHome = useGame((s) => s.exitHome);
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
      <header className="lux-card absolute left-3 top-3 z-30 flex flex-wrap items-center gap-2 px-3 py-2">
        <h1 className="font-serif text-lg font-extrabold leading-none"><span className={`gold-text ${vip ? 'vip-crest' : ''}`}>Luxe Life</span></h1>
        {vip && <span className="rounded-full border border-gold/60 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.2em] text-gold">VIP</span>}
        <span className="h-5 w-px bg-white/15" />
        <div>
          <div className="num font-serif text-[16px] font-bold leading-none">Day {E.day(game)} · {E.clock(game)}</div>
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
      {game.dayEvent && !inside && (
        <div className="lux-pill pointer-events-none absolute left-1/2 top-3 z-20 hidden -translate-x-1/2 px-4 py-1 text-center font-serif text-xs italic text-gold-light lg:block">
          Today · {game.dayEvent}
        </div>
      )}
      <MoneyHud />

      {/* left: stats */}
      {statsOpen && (
        <div className="absolute left-3 top-[70px] z-20 max-h-[calc(100%-70px-330px)] w-[300px] overflow-y-auto pr-1 [&_.panel]:!bg-[#1a1918]/85 [&_.panel]:backdrop-blur">
          <StatusColumn />
        </div>
      )}

      {/* bottom left: radar */}
      <div className="absolute bottom-4 left-4 z-20">
        <Radar />
      </div>
      <LocationBanner />
      {inside && (
        <button onClick={exitHome} className="lux-pill absolute left-1/2 top-3 z-30 -translate-x-1/2 px-4 py-1.5 font-serif text-sm font-bold text-gold-light transition hover:!border-gold">
          ← Back to the city
        </button>
      )}
      <HomeTaskOverlay />

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
        {!inside && (drawer.loc === 'home' || drawer.loc === 'island') && (
          <button className="btn-gold mx-4 mb-3" onClick={enterHome}>🚪 Go inside</button>
        )}
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
          {drawer.tab === 'Markets' && <Markets />}
          {drawer.tab === 'Portfolio' && <Portfolio />}
          {drawer.tab === 'Finance' && <Finance />}
          {drawer.tab === 'Ledger' && <Ledger />}
        </div>
      </aside>

      {/* bottom dock */}
      {!drawer.open && (
        <div className="absolute bottom-4 left-[150px] right-3 z-20 flex flex-col items-center gap-2 sm:left-[230px]">
          <QuickActions />
          <p className="lux-shadow hidden font-serif text-xs italic text-cream-dim sm:block">{inside ? 'Click the bed, kitchen, shower, sofa or desk to do something · drag to look around' : 'Click a building or the map to go there · drag to look around · scroll to zoom'}</p>
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

