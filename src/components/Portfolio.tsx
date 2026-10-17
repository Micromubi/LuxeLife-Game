import { useGame } from '../game/store';
import * as E from '../game/engine';
import { CATEGORY_LABEL, itemById } from '../game/config';
import { money } from '../lib/format';

export default function Portfolio() {
  const g = useGame((s) => s.game)!;
  const sell = useGame((s) => s.sell);
  const mods = E.modifiers(g);
  const rentalIds = new Set(mods.rentals.map((r) => r.uid));
  const total = g.assets.reduce((s, a) => s + a.currentValue, 0);

  if (!g.assets.length)
    return (
      <div className="panel py-14 text-center">
        <p className="font-serif text-2xl italic text-cream-dim">Your collection is empty.</p>
        <p className="mt-2 text-sm text-cream-dim/70">Visit the Boutique. Everything you own works for you — or costs you.</p>
      </div>
    );

  const groups = Object.entries(
    g.assets.reduce<Record<string, typeof g.assets>>((m, a) => ((m[a.category] ||= []).push(a), m), {}),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="panel grid grid-cols-2 gap-4">
        <Kpi label="Asset value" value={money(total, true)} />
        <Kpi label="Daily upkeep" value={money(mods.upkeep + (mods.ownsHome ? 0 : 40))} />
        <Kpi label="Rent income" value={`${money(mods.rentIncome)}/day`} />
        <Kpi label="Commute fatigue" value={`−${Math.round(mods.commute * 100)}%`} />
        <Kpi label="Sleep quality" value={`×${mods.sleepQuality.toFixed(2)}`} />
        <Kpi label="Ventures" value={String(mods.businesses.length)} />
      </div>
      {groups.map(([cat, list]) => (
        <div key={cat} className="panel">
          <h2 className="mb-3 font-serif text-xl font-bold">{CATEGORY_LABEL[cat]}</h2>
          <div className="divide-y divide-white/[0.06]">
            {list.map((a) => {
              const it = itemById(a.itemId);
              const change = a.currentValue - a.purchasePrice;
              return (
                <div key={a.uid} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{a.name}</div>
                    <div className="text-xs text-cream-dim">
                      Paid {money(a.purchasePrice)} · Worth <span className="num text-cream">{money(a.currentValue)}</span>
                      <span className={change >= 0 ? ' text-jade' : ' text-ruby/80'}> ({change >= 0 ? '+' : ''}{money(change)})</span>
                      {it?.prestige ? <> · +{it.prestige} prestige</> : null}
                    </div>
                    {a.category === 'RESIDENCE' && (
                      <div className="mt-1 text-xs">
                        {mods.home?.uid === a.uid ? <span className="text-gold-light">Your home</span>
                          : rentalIds.has(a.uid) ? <span className="text-jade">Let out · ~{money(it?.rentPerDay ?? 0)}/day rent</span> : <span className="text-cream-dim">Vacant</span>}
                        {g.loans.some((l) => l.assetUid === a.uid) && <span className="text-cream-dim"> · mortgaged</span>}
                      </div>
                    )}
                    {a.category === 'BUSINESS' && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-cream-dim">
                        Morale
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/40">
                          <div className="h-full bg-jade" style={{ width: `${a.morale ?? 0}%` }} />
                        </div>
                        <span className="num">{Math.round(a.morale ?? 0)}</span>
                        · Today <span className="num text-jade">{money(a.revenueToday ?? 0)}</span>
                        · Costs {money(it?.upkeepPerDay ?? 0)}/day
                      </div>
                    )}
                  </div>
                  <button className="btn-ghost text-xs" disabled={a.currentValue <= 0}
                    onClick={() => sell(a.uid, 'normal')}>
                    {a.currentValue > 0 ? `Sell ${money(E.saleValue(a))}` : 'No resale'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label !text-[10px]">{label}</div>
      <div className="num mt-0.5 font-serif text-xl font-bold">{value}</div>
    </div>
  );
}
