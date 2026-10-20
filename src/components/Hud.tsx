import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { CRITICAL } from '../game/config';
import { money } from '../lib/format';
import { BOUNDS, CITY_LOCS, ISLAND_POS, LOCS, ROADS_X, ROADS_Z, ROAD_Z_SPAN, RUNWAY_Z, type LocId } from '../world/layout';
import { world } from '../world/materials';

// ───────────────────────── money ─────────────────────────

/** Cash and net worth, top right, with a quiet note whenever cash changes. */
export function MoneyHud() {
  const cash = useGame((s) => s.game!.cash);
  const nw = useGame((s) => E.netWorth(s.game!));
  const prev = useRef(cash);
  const [pops, setPops] = useState<{ id: number; d: number }[]>([]);
  const id = useRef(0);

  useEffect(() => {
    const d = cash - prev.current;
    prev.current = cash;
    if (Math.abs(d) < 1) return;
    const n = ++id.current;
    setPops((p) => [...p.slice(-2), { id: n, d }]);
    const t = setTimeout(() => setPops((p) => p.filter((x) => x.id !== n)), 2400);
    return () => clearTimeout(t);
  }, [cash]);

  return (
    <div className="pointer-events-none absolute right-3 top-3 z-40 flex flex-col items-end">
      <div className="lux-card px-4 py-2.5 text-right">
        <div className="label !text-[9px]">Cash</div>
        <div className={`num font-serif text-[26px] font-bold leading-tight sm:text-[30px] ${cash < 0 ? 'text-ruby' : ''}`}>
          {cash < 0 ? money(cash) : <span className="gold-text">{money(cash)}</span>}
        </div>
        <div className="mt-0.5 flex items-baseline justify-end gap-1.5 text-xs text-cream-dim">
          <span className="label !text-[9px]">Net worth</span>
          <span className="num font-semibold text-cream">{money(nw, true)}</span>
        </div>
      </div>
      <div className="mt-1.5 flex flex-col items-end gap-1">
        {pops.map((p) => (
          <div key={p.id} className={`lux-card animate-cashpop px-2.5 py-0.5 font-serif text-sm font-bold num ${p.d < 0 ? 'text-[#e58b86]' : 'text-jade'}`}>
            {p.d < 0 ? '−' : '+'}{money(Math.abs(p.d))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── city map ─────────────────────────

/** North-up city map that follows you. Tap a venue to go there. */
export function Radar() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const blips = useRef<{ loc: LocId; x: number; y: number }[]>([]);
  const visit = useGame((s) => s.visit);
  const [size, setSize] = useState(() => (window.innerWidth < 640 ? 132 : 184));

  useEffect(() => {
    const onR = () => setSize(window.innerWidth < 640 ? 132 : 184);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const x = cv.getContext('2d')!;
    const S = size / 110; // pixels per world unit
    const R = size / 2;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const g = useGame.getState().game;
      if (!g) return;
      const ax = world.avatar.x, az = world.avatar.z;
      const toScreen = (wx: number, wz: number) => [R + (wx - ax) * S, R + (wz - az) * S] as const;

      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, size, size);
      x.save();
      x.beginPath();
      x.roundRect(1, 1, size - 2, size - 2, 18);
      x.clip();
      x.fillStyle = '#16232c';
      x.fillRect(0, 0, size, size);

      x.save();
      x.translate(R, R);
      x.scale(S, S);
      x.translate(-ax, -az);
      const { x0, x1, z0, z1 } = BOUNDS;
      x.fillStyle = '#2a2724';
      x.fillRect(-240, -360, 520, 220); // mainland
      x.fillStyle = '#5b5040';
      x.fillRect(x0 - 5, z1, x1 - x0 + 10, 9); // beach
      x.fillStyle = '#26231f';
      x.fillRect(x0, z0, x1 - x0, z1 - z0); // city
      x.fillStyle = '#1b1917';
      x.fillRect(x0 + 6, RUNWAY_Z - 3.5, x1 - x0 - 12, 7);
      if (g.assets.some((a) => a.itemId === 'island')) {
        const [ix, iz] = ISLAND_POS;
        x.fillStyle = '#5b5040';
        x.beginPath(); x.arc(ix, iz, 11, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#3d4a32';
        x.beginPath(); x.arc(ix, iz, 8, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#9C7F22';
        x.fillRect(x1, iz - 1, ix - 9 - x1, 2);
      }
      x.fillStyle = 'rgba(212,175,55,0.55)';
      for (const z of ROADS_Z) x.fillRect(x0, z - 1.2, x1 - x0, 2.4);
      for (const rx of ROADS_X) x.fillRect(rx - 1.2, ROAD_Z_SPAN[0] - 1.2, 2.4, ROAD_Z_SPAN[1] - ROAD_Z_SPAN[0] + 2.4);
      x.restore();

      // venues, pinned to the edge when off-map
      const locs: LocId[] = [...CITY_LOCS, 'ventures'];
      if (g.assets.some((a) => a.itemId === 'island')) locs.push('island');
      blips.current = [];
      const br = size / 15;
      x.font = `${Math.round(size / 15)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (const l of locs) {
        let [sx, sy] = toScreen(LOCS[l].pos[0], LOCS[l].pos[1]);
        const m = br + 3;
        sx = Math.max(m, Math.min(size - m, sx));
        sy = Math.max(m, Math.min(size - m, sy));
        x.fillStyle = 'rgba(17,17,17,0.85)';
        x.strokeStyle = 'rgba(212,175,55,0.7)';
        x.lineWidth = 1;
        x.beginPath(); x.arc(sx, sy, br, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillText(LOCS[l].icon, sx, sy + 1);
        blips.current.push({ loc: l, x: sx, y: sy });
      }

      // you
      x.save();
      x.translate(R, R);
      x.rotate(Math.PI - world.avatar.heading);
      x.fillStyle = '#F6E7B0';
      x.shadowColor = 'rgba(232,207,119,0.9)';
      x.shadowBlur = 8;
      x.beginPath();
      x.moveTo(0, -size / 20);
      x.lineTo(size / 32, size / 30);
      x.lineTo(-size / 32, size / 30);
      x.closePath();
      x.fill();
      x.restore();
      x.restore();

      x.strokeStyle = 'rgba(212,175,55,0.45)';
      x.lineWidth = 1.5;
      x.beginPath(); x.roundRect(1, 1, size - 2, size - 2, 18); x.stroke();
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best: LocId | null = null, bd = size / 10;
    for (const b of blips.current) {
      const d = Math.hypot(b.x - px, b.y - py);
      if (d < bd) { bd = d; best = b.loc; }
    }
    if (best) visit(best);
  };

  return (
    <div className="lux-card p-2" style={{ width: size + 16 }}>
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="label !text-[9px]">City map · N ↑</span>
        <button onClick={() => world.recenter++} title="Find me" className="text-[11px] font-semibold text-gold-light hover:text-gold">◎ Me</button>
      </div>
      <canvas ref={canvas} onClick={onClick} style={{ width: size, height: size }} className="cursor-pointer" title="Click a venue to go there" />
      <NeedBars />
    </div>
  );
}

function NeedBars() {
  const g = useGame((s) => s.game)!;
  const rows: [string, number][] = [
    ['Health', g.health], ['Energy', g.needs.energy], ['Fullness', g.needs.hunger], ['Hygiene', g.needs.hygiene], ['Social', g.needs.social],
  ];
  return (
    <div className="mt-2 space-y-1 px-1 pb-0.5">
      {rows.map(([l, v]) => {
        const crit = v < CRITICAL;
        return (
          <div key={l} className="flex items-center gap-2" title={`${l} ${Math.round(v)}`}>
            <span className={`w-12 text-[10px] ${crit ? 'font-semibold text-ruby' : 'text-cream-dim'}`}>{l}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/50">
              <div className={`h-full rounded-full transition-[width] duration-500 ${crit ? 'bg-ruby' : 'bg-gradient-to-r from-gold-dark via-gold to-gold-light'}`}
                style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── time passing at home ─────────────────────────

const TASK_MS = 2800;
const TASK_WORDS: Record<string, string> = {
  sleep: 'Sleeping…', nap: 'Napping…', cook: 'Cooking…', shower: 'Showering…', relax: 'Unwinding…', call: 'On the phone…',
};

/** While an activity plays out indoors, the clock visibly runs forward, then the result lands. */
export function HomeTaskOverlay() {
  const task = useGame((s) => s.homeTask);
  const finish = useGame((s) => s.finishHomeTask);
  const doing = task?.phase === 'doing';
  useEffect(() => {
    if (!doing) return;
    const t = setTimeout(finish, TASK_MS);
    return () => clearTimeout(t);
  }, [doing, finish]);
  if (!task || !doing) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-[18%] z-40 -translate-x-1/2 animate-rise">
      <div className="lux-card min-w-[260px] px-6 py-4 text-center">
        <div className="font-serif text-2xl font-bold italic text-cream">{TASK_WORDS[task.id] ?? task.label}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.3em] text-gold-light">{task.label} · {task.hours}h pass</div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/50">
          <div className="h-full rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-light" style={{ animation: `taskfill ${TASK_MS}ms linear forwards` }} />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── place title ─────────────────────────

/** The venue's name, set in serif between gold rules, when you go somewhere. */
export function LocationBanner() {
  const focus = useGame((s) => s.focus);
  const [shown, setShown] = useState<{ loc: LocId; n: number } | null>(null);
  useEffect(() => {
    if (!focus) return;
    setShown({ loc: focus.loc, n: focus.n });
    const t = setTimeout(() => setShown(null), 3200);
    return () => clearTimeout(t);
  }, [focus]);
  if (!shown) return null;
  const L = LOCS[shown.loc];
  return (
    <div key={shown.n} className="pointer-events-none absolute bottom-28 left-1/2 z-20 -translate-x-1/2 animate-banner text-center">
      <div className="mx-auto mb-2 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
      <div className="lux-shadow font-serif text-3xl font-bold italic leading-tight text-cream sm:text-[40px]">{L.label}</div>
      <div className="lux-shadow mt-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-gold-light">{L.hint}</div>
      <div className="mx-auto mt-2 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
    </div>
  );
}
