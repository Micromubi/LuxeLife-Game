import { useEffect, useRef, useState } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { CRITICAL } from '../game/config';
import { money } from '../lib/format';
import { BOUNDS, CITY_LOCS, ISLAND_POS, LOCS, ROADS_X, ROADS_Z, ROAD_Z_SPAN, RUNWAY_Z, type LocId } from '../world/layout';
import { world } from '../world/materials';


// ───────────────────────── money ─────────────────────────

/** Big green cash readout, top right, with +/− pops whenever it changes. */
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
    <div className="pointer-events-none absolute right-4 top-3 z-40 flex flex-col items-end">
      <div className={`hud-money font-hud text-[34px] leading-none sm:text-[42px] ${cash < 0 ? 'text-[#e0453c]' : 'text-[#7ee07e]'}`}>{money(cash)}</div>
      <div className="hud-text mt-1 font-hud text-[15px] leading-none tracking-wide text-white/90">
        <span className="text-white/60">NET</span> {money(nw, true)}
      </div>
      <div className="mt-1 flex flex-col items-end">
        {pops.map((p) => (
          <div key={p.id} className={`hud-money animate-cashpop font-hud text-[22px] leading-tight ${p.d < 0 ? 'text-[#e0453c]' : 'text-[#7ee07e]'}`}>
            {p.d < 0 ? '−' : '+'}{money(Math.abs(p.d))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── radar ─────────────────────────


/** A GTA-style radar: rotates with the camera, follows the player, tap a blip to go there. */
export function Radar() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const blips = useRef<{ loc: LocId; x: number; y: number }[]>([]);
  const visit = useGame((s) => s.visit);
  const [size, setSize] = useState(() => (window.innerWidth < 640 ? 132 : 188));

  useEffect(() => {
    const onR = () => setSize(window.innerWidth < 640 ? 132 : 188);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  useEffect(() => {
    const cv = canvas.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    const x = cv.getContext('2d')!;
    const S = size / 100; // pixels per world unit
    const R = size / 2;
    let raf = 0;

    const draw = () => {
      raf = requestAnimationFrame(draw);
      const g = useGame.getState().game;
      if (!g) return;
      const { x: ax, z: az, heading } = world.avatar;
      const rot = world.cam.yaw - Math.PI;
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const toScreen = (wx: number, wz: number) => {
        const dx = (wx - ax) * S, dz = (wz - az) * S;
        return [R + dx * cos - dz * sin, R + dx * sin + dz * cos] as const;
      };

      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.clearRect(0, 0, size, size);
      x.save();
      x.beginPath();
      x.arc(R, R, R - 2, 0, Math.PI * 2);
      x.clip();
      x.fillStyle = '#1b3f57';
      x.fillRect(0, 0, size, size);

      // world layer
      x.save();
      x.translate(R, R);
      x.rotate(rot);
      x.scale(S, S);
      x.translate(-ax, -az);
      x.fillStyle = '#4b4e52';
      x.fillRect(-240, -360, 520, 220); // mainland
      const { x0, x1, z0, z1 } = BOUNDS;
      x.fillStyle = '#c9b27a';
      x.fillRect(x0 - 5, z1, x1 - x0 + 10, 9); // beach
      x.fillStyle = '#5a5d61';
      x.fillRect(x0, z0, x1 - x0, z1 - z0); // city
      x.fillStyle = '#34373b';
      x.fillRect(x0 + 6, RUNWAY_Z - 3.5, x1 - x0 - 12, 7); // runway
      if (g.assets.some((a) => a.itemId === 'island')) {
        const [ix, iz] = ISLAND_POS;
        x.fillStyle = '#c9b27a';
        x.beginPath(); x.arc(ix, iz, 11, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#5b7a45';
        x.beginPath(); x.arc(ix, iz, 8, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#9a9a9a';
        x.fillRect(x1, iz - 1.2, ix - 9 - x1, 2.4);
      }
      x.fillStyle = '#e9e9e9';
      for (const z of ROADS_Z) x.fillRect(x0, z - 1.5, x1 - x0, 3);
      for (const rx of ROADS_X) x.fillRect(rx - 1.5, ROAD_Z_SPAN[0] - 1.5, 3, ROAD_Z_SPAN[1] - ROAD_Z_SPAN[0] + 3);
      x.restore();

      // blips (kept upright, pinned to the rim when off-radar)
      const locs: LocId[] = [...CITY_LOCS, 'ventures'];
      if (g.assets.some((a) => a.itemId === 'island')) locs.push('island');
      blips.current = [];
      x.font = `${Math.round(size / 13)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (const l of locs) {
        let [sx, sy] = toScreen(LOCS[l].pos[0], LOCS[l].pos[1]);
        const dx = sx - R, dy = sy - R, d = Math.hypot(dx, dy), max = R - 12;
        if (d > max) { sx = R + (dx / d) * max; sy = R + (dy / d) * max; }
        x.fillStyle = 'rgba(0,0,0,0.65)';
        x.beginPath(); x.arc(sx, sy, size / 17, 0, Math.PI * 2); x.fill();
        x.fillText(LOCS[l].icon, sx, sy + 1);
        blips.current.push({ loc: l, x: sx, y: sy });
      }

      // player arrow
      x.save();
      x.translate(R, R);
      x.rotate(Math.PI - heading + rot);
      x.fillStyle = '#ffffff';
      x.strokeStyle = '#000';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(0, -size / 18);
      x.lineTo(size / 28, size / 26);
      x.lineTo(0, size / 50);
      x.lineTo(-size / 28, size / 26);
      x.closePath();
      x.fill();
      x.stroke();
      x.restore();
      x.restore();

      // rim + north marker
      x.strokeStyle = 'rgba(0,0,0,0.85)';
      x.lineWidth = 4;
      x.beginPath(); x.arc(R, R, R - 2, 0, Math.PI * 2); x.stroke();
      const na = rot - Math.PI / 2;
      const px = R + Math.cos(na) * (R - 9), py = R + Math.sin(na) * (R - 9);
      x.fillStyle = '#111';
      x.beginPath(); x.arc(px, py, 8, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#fff';
      x.font = 'bold 10px Anton, Impact, sans-serif';
      x.fillText('N', px, py + 0.5);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let best: LocId | null = null, bd = size / 9;
    for (const b of blips.current) {
      const d = Math.hypot(b.x - px, b.y - py);
      if (d < bd) { bd = d; best = b.loc; }
    }
    if (best) visit(best);
  };

  return (
    <div className="relative" style={{ width: size }}>
      <canvas ref={canvas} onClick={onClick} style={{ width: size, height: size }}
        className="cursor-pointer rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.6)]" title="Radar — click an icon to go there" />
      <button onClick={() => world.recenter++} title="Find me"
        className="absolute -right-1 top-0 grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-black/75 text-sm text-white shadow-lg hover:border-gold">◎</button>
      <NeedBars />
    </div>
  );
}

function NeedBars() {
  const g = useGame((s) => s.game)!;
  const big: [string, number, string][] = [['Health', g.health, '#5cc05c'], ['Energy', g.needs.energy, '#4aa3df']];
  const small: [string, number, string][] = [['🍔', g.needs.hunger, '#e8a23a'], ['🚿', g.needs.hygiene, '#7fd4e0'], ['💬', g.needs.social, '#c58af0']];
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {big.map(([l, v, c]) => <Seg key={l} label={l} v={v} c={c} />)}
      </div>
      <div className="flex gap-1">
        {small.map(([l, v, c]) => <Seg key={l} label={l} v={v} c={c} small />)}
      </div>
    </div>
  );
}

function Seg({ label, v, c, small }: { label: string; v: number; c: string; small?: boolean }) {
  const crit = v < CRITICAL;
  return (
    <div className="flex-1" title={`${label} ${Math.round(v)}`}>
      <div className={`overflow-hidden rounded-sm border border-black/80 bg-black/70 ${small ? 'h-2' : 'h-2.5'} ${crit ? 'animate-pulse' : ''}`}>
        <div className="h-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: crit ? '#e0453c' : c }} />
      </div>
      {small && <div className="hud-text mt-0.5 text-center text-[10px] leading-none">{label}</div>}
    </div>
  );
}

// ───────────────────────── location banner ─────────────────────────

/** GTA-style place name that fades in when you go somewhere. */
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
    <div key={shown.n} className="pointer-events-none absolute bottom-24 left-1/2 z-20 -translate-x-1/2 animate-banner text-center">
      <div className="hud-text font-hud text-[34px] uppercase italic leading-none tracking-wide text-white sm:text-[46px]">{L.label}</div>
      <div className="hud-text mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-gold-light">{L.hint}</div>
    </div>
  );
}
