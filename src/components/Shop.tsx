import type { ReactNode } from 'react';
import { useState } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { CATEGORY_LABEL } from '../game/config';
import { money } from '../lib/format';

const ORDER = ['CONSUMABLE', 'WARDROBE', 'VEHICLE', 'RESIDENCE', 'ACCESSORY', 'STAFF', 'BUSINESS'];

export default function Shop({ initialCat }: { initialCat?: string }) {
  const g = useGame((s) => s.game)!;
  const buy = useGame((s) => s.buy);
  const [cat, setCat] = useState(initialCat ?? 'CONSUMABLE');
  const byCat = E.catalogByCategory();
  const owned = new Set(g.assets.map((a) => a.itemId));

  return (
    <div className="panel">
      <div className="mb-4 flex flex-wrap gap-2">
        {ORDER.map((c) => (
          <button key={c} onClick={() => setCat(c)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${cat === c ? 'border-gold/70 bg-gold/15 text-gold-light' : 'border-white/10 text-cream-dim hover:text-cream'}`}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>
      <div className="grid gap-3">
        {byCat[cat]?.map((it) => {
          const can = E.canBuy(g, it.id);
          const fin = E.financeTerms(g, it.id);
          const canFin = fin ? E.canBuy(g, it.id, true) : null;
          const isOwned = owned.has(it.id) && !it.multi;
          const openH = it.open ? ((it.open[1] - it.open[0] + 24) % 24) : 24;
          const count = g.assets.filter((a) => a.itemId === it.id).length;
          return (
            <div key={it.id} className={`flex flex-col rounded-xl border p-4 ${isOwned ? 'border-gold/40 bg-gold/[0.05]' : 'border-white/[0.07] bg-black/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-lg font-bold leading-tight">{it.name}</h3>
                <span className="num shrink-0 font-serif text-lg font-bold text-gold-light">{money(it.price, it.price >= 1e6)}</span>
              </div>
              <p className="mt-1 text-sm text-cream-dim">{it.blurb}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                {it.prestige > 0 && <Chip gold>{it.category === 'CONSUMABLE' ? `+${it.prestige} rep` : `+${it.prestige} prestige`}</Chip>}
                {it.upkeepPerDay ? <Chip>{money(it.upkeepPerDay)}/day upkeep</Chip> : null}
                {it.revenuePerHour ? <Chip good>~{money(it.revenuePerHour * openH * 1.2)}/day revenue</Chip> : null}
                {it.open ? <Chip>open {String(it.open[0]).padStart(2, '0')}:00–{String(it.open[1]).padStart(2, '0')}:00</Chip> : null}
                {it.rentPerDay ? <Chip good>lets for ~{money(it.rentPerDay)}/day</Chip> : null}
                {it.category !== 'CONSUMABLE' && it.resale > 0 && <Chip>resale {Math.round(it.resale * 100)}%</Chip>}
                {it.tokens ? <Chip>{it.tokens} token{it.tokens > 1 ? 's' : ''}</Chip> : null}
                {it.minPrestige ? <Chip>{it.minPrestige}+ prestige</Chip> : null}
                {count > 0 && it.multi && <Chip gold>own {count}</Chip>}
              </div>
              <div className="mt-auto pt-4">
                {isOwned ? (
                  <div className="text-center text-xs font-semibold tracking-wider text-gold">IN YOUR COLLECTION</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button className="btn-gold w-full" disabled={!can.ok} onClick={() => buy(it.id)}>
                      {can.ok ? (it.category === 'CONSUMABLE' ? 'Indulge' : count > 0 ? 'Buy another' : 'Buy outright') : can.reason}
                    </button>
                    {fin && canFin && (
                      <button className="btn-ghost w-full flex-col !gap-0 py-1.5" disabled={!canFin.ok} onClick={() => buy(it.id, true)}
                        title={`${fin.label}: ${Math.round(fin.rate * 10000) / 100}%/day over ${fin.weeks} weeks`}>
                        <span>{canFin.ok ? `${fin.label}: ${money(fin.down)} down` : canFin.reason}</span>
                        <span className="text-[10px] font-normal text-cream-dim">then ~{money(fin.weekly)}/week × {fin.weeks} weeks · {(fin.rate * 100).toFixed(2)}%/day</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ children, gold, good }: { children: ReactNode; gold?: boolean; good?: boolean }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 ${gold ? 'bg-gold/15 text-gold-light' : good ? 'bg-jade/15 text-jade' : 'bg-white/[0.06] text-cream-dim'}`}>
      {children}
    </span>
  );
}
