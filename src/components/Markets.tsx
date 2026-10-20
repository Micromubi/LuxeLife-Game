import { useState } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { STOCKS, TRADE_FEE, itemById } from '../game/config';
import { money } from '../lib/format';

/** Stock exchange, the deals board for cars & property, and your fixer-uppers. */
export default function Markets() {
  const g = useGame((s) => s.game)!;
  const [open, setOpen] = useState<string | null>(STOCKS[0].id);
  const holdings = g.holdings ?? {};
  const value = E.portfolioValue(g);
  const basis = Object.values(holdings).reduce((s, h) => s + h.cost, 0);
  const fixers = g.assets.filter((a) => a.fixer);

  return (
    <div className="flex flex-col gap-4">
      <section className="panel">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl font-bold">Stock exchange</h2>
          <span className="text-xs text-cream-dim">Prices move every hour</span>
        </div>
        {basis > 0 && (
          <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-black/25 p-3 text-xs">
            <div><div className="label !text-[9px]">Portfolio</div><div className="num font-serif text-lg font-bold">{money(value)}</div></div>
            <div className="text-right"><div className="label !text-[9px]">Gain / loss</div>
              <div className={`num font-serif text-lg font-bold ${value - basis >= 0 ? 'text-jade' : 'text-ruby'}`}>{value - basis >= 0 ? '+' : '−'}{money(Math.abs(value - basis))}</div>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          {STOCKS.map((c) => {
            const st = g.stocks?.[c.id];
            if (!st) return null;
            const h = st.history;
            const ago = h[Math.max(0, h.length - 25)] ?? st.price;
            const chg = (st.price - ago) / ago;
            const held = holdings[c.id];
            return (
              <div key={c.id} className={`rounded-xl border transition ${open === c.id ? 'border-gold/40 bg-gold/[0.04]' : 'border-white/[0.06] bg-black/20'}`}>
                <button onClick={() => setOpen(open === c.id ? null : c.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left">
                  <div className="w-14">
                    <div className="font-mono text-sm font-bold text-gold-light">{c.id}</div>
                    <div className="truncate text-[10px] text-cream-dim">{c.sector}</div>
                  </div>
                  <Spark data={h.slice(-48)} up={chg >= 0} />
                  <div className="ml-auto text-right">
                    <div className="num text-sm font-semibold">{money(st.price)}</div>
                    <div className={`num text-[11px] ${chg >= 0 ? 'text-jade' : 'text-ruby'}`}>{chg >= 0 ? '▲' : '▼'} {(Math.abs(chg) * 100).toFixed(1)}% 24h</div>
                  </div>
                </button>
                {held && open !== c.id && (
                  <div className="-mt-1 px-3 pb-2 text-[11px] text-cream-dim">You own {held.shares.toLocaleString()} · {money(held.shares * st.price)}</div>
                )}
                {open === c.id && <StockDetail id={c.id} />}
              </div>
            );
          })}
        </div>
      </section>

      <DealsBoard />

      {fixers.length > 0 && (
        <section className="panel">
          <h2 className="mb-1 font-serif text-xl font-bold">Your fixer-uppers</h2>
          <p className="mb-3 text-xs text-cream-dim">Restore them to unlock their full value, then keep or sell from Portfolio.</p>
          <div className="flex flex-col gap-2">
            {fixers.map((a) => <FixerRow key={a.uid} uid={a.uid} />)}
          </div>
        </section>
      )}

      <section className="panel text-xs text-cream-dim">
        <span className="font-semibold text-cream">Creator audience:</span> {(g.followers ?? 0).toLocaleString()} followers · grow it with “Create Content” at home.
      </section>
    </div>
  );
}

function StockDetail({ id }: { id: string }) {
  const g = useGame((s) => s.game)!;
  const buy = useGame((s) => s.buyStock);
  const sell = useGame((s) => s.sellStock);
  const [qty, setQty] = useState(10);
  const c = STOCKS.find((x) => x.id === id)!;
  const st = g.stocks[id];
  const held = g.holdings?.[id];
  const cost = qty * st.price;
  const fee = Math.max(1, cost * TRADE_FEE);
  const maxBuy = Math.max(0, Math.floor((g.cash - 1) / (st.price * (1 + TRADE_FEE))));
  const avg = held ? held.cost / held.shares : 0;
  const pnl = held ? held.shares * st.price - held.cost : 0;

  return (
    <div className="border-t border-white/[0.06] px-3 pb-3 pt-2">
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-serif text-sm font-bold text-cream">{c.name}</span>
        <span className="text-cream-dim">last {st.history.length}h</span>
      </div>
      <Chart data={st.history} />
      {held && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div><div className="text-cream-dim">Shares</div><div className="num font-semibold">{held.shares.toLocaleString()}</div></div>
          <div><div className="text-cream-dim">Avg cost</div><div className="num font-semibold">{money(avg)}</div></div>
          <div><div className="text-cream-dim">Gain / loss</div><div className={`num font-semibold ${pnl >= 0 ? 'text-jade' : 'text-ruby'}`}>{pnl >= 0 ? '+' : '−'}{money(Math.abs(pnl))}</div></div>
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5">
        <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="w-24 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-cream outline-none focus:border-gold/60" />
        {[10, 100, 1000].map((n) => <button key={n} className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setQty(n)}>{n}</button>)}
        <button className="btn-ghost px-2 py-1 text-[11px]" onClick={() => setQty(Math.max(1, maxBuy))}>Max</button>
      </div>
      <div className="mt-1 text-[11px] text-cream-dim">{qty.toLocaleString()} × {money(st.price)} = {money(cost)} + {money(fee)} fee</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button className="btn-gold" disabled={cost + fee > g.cash} onClick={() => buy(id, qty)}>Buy</button>
        <button className="btn-ghost" disabled={!held} onClick={() => sell(id, Math.min(qty, held?.shares ?? 0))}>Sell {held ? Math.min(qty, held.shares).toLocaleString() : ''}</button>
      </div>
    </div>
  );
}

function DealsBoard() {
  const g = useGame((s) => s.game)!;
  const buyDeal = useGame((s) => s.buyDeal);
  const deals = g.deals ?? [];
  return (
    <section className="panel">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="font-serif text-xl font-bold">Deals board</h2>
        <span className="text-xs text-cream-dim">New listings every morning</span>
      </div>
      <p className="mb-3 text-xs text-cream-dim">Cars and property below market. Fixer-uppers are cheaper but need restoring before they're worth full price — buy low, restore, sell high.</p>
      <div className="grid gap-2">
        {deals.map((d) => {
          const it = itemById(d.itemId)!;
          const restore = Math.round(it.price * E.RESTORE_COST);
          const worth = d.fixer ? Math.round(it.price * Math.min(1, it.resale + 0.04)) : Math.round(it.price * it.resale);
          const profit = worth - d.price - (d.fixer ? restore : 0);
          const hoursLeft = Math.max(0, d.expiresHour - g.hour);
          return (
            <div key={d.id} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif text-base font-bold">{it.category === 'VEHICLE' ? '🚗' : '🏠'} {it.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px]">
                    {d.fixer ? <span className="rounded bg-[#b9852b]/20 px-1.5 py-0.5 font-semibold text-[#e0b25c]">Fixer-upper · restore {money(restore, true)}</span>
                      : <span className="rounded bg-jade/15 px-1.5 py-0.5 font-semibold text-jade">Ready to go</span>}
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-cream-dim">{hoursLeft}h left</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-[11px] text-cream-dim line-through">{money(it.price, true)}</div>
                  <div className="num font-serif text-lg font-bold text-gold-light">{money(d.price, true)}</div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-[11px] ${profit >= 0 ? 'text-jade' : 'text-ruby'}`}>Est. flip {profit >= 0 ? 'profit' : 'loss'}: {money(Math.abs(profit), true)}</span>
                <button className="btn-gold px-3 py-1.5 text-xs" disabled={d.price > g.cash} onClick={() => buyDeal(d.id)}>{d.price > g.cash ? 'Not enough cash' : 'Buy'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function FixerRow({ uid }: { uid: string }) {
  const g = useGame((s) => s.game)!;
  const restore = useGame((s) => s.restore);
  const a = g.assets.find((x) => x.uid === uid)!;
  const it = itemById(a.itemId)!;
  const cost = Math.round(it.price * E.RESTORE_COST);
  const after = Math.round(it.price * Math.min(1, it.resale + 0.04));
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.07] bg-black/20 p-3">
      <div>
        <div className="font-semibold">{it.name}</div>
        <div className="text-[11px] text-cream-dim">Worth {money(a.currentValue, true)} now → {money(after, true)} restored</div>
      </div>
      <button className="btn-gold px-3 py-1.5 text-xs" disabled={cost > g.cash} onClick={() => restore(uid)}>Restore {money(cost, true)}</button>
    </div>
  );
}

function path(data: number[], w: number, h: number) {
  const lo = Math.min(...data), hi = Math.max(...data);
  const span = hi - lo || 1;
  return data.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, data.length - 1)) * w).toFixed(1)},${(h - ((v - lo) / span) * h).toFixed(1)}`).join(' ');
}

function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return <div className="h-7 w-24" />;
  return (
    <svg viewBox="0 0 96 28" className="h-7 w-24 shrink-0" preserveAspectRatio="none">
      <path d={path(data, 96, 26)} transform="translate(0,1)" fill="none" stroke={up ? '#4E9F78' : '#C2413B'} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Chart({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 400, H = 120;
  const lo = Math.min(...data), hi = Math.max(...data);
  const line = path(data, W, H);
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="stockfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#D4AF37" stopOpacity="0.35" />
            <stop offset="1" stopColor="#D4AF37" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,0.06)" vectorEffect="non-scaling-stroke" />)}
        <path d={`${line} L${W},${H} L0,${H} Z`} fill="url(#stockfill)" />
        <path d={line} fill="none" stroke="#E8CF77" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="pointer-events-none absolute right-1 top-0 text-[10px] text-cream-dim">{money(hi)}</div>
      <div className="pointer-events-none absolute bottom-0 right-1 text-[10px] text-cream-dim">{money(lo)}</div>
    </div>
  );
}
