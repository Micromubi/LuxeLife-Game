import { useState } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { fmtHour, money, pct } from '../lib/format';
import { Kpi } from './Portfolio';
import { FUNDS, type FundId } from '../game/config';

export default function Finance() {
  const g = useGame((s) => s.game)!;
  const borrow = useGame((s) => s.borrow);
  const invest = useGame((s) => s.invest);
  const withdraw = useGame((s) => s.withdraw);
  const [inv, setInv] = useState<Record<FundId, string>>({ index: '1000', crypto: '500' });
  const repay = useGame((s) => s.repay);
  const t = E.loanTerms(g);
  const [amt, setAmt] = useState(1000);
  const debt = E.totalDebt(g);
  const mods = E.modifiers(g);
  const dailyBurn = mods.upkeep + (mods.ownsHome ? 0 : 40) + g.loans.reduce((s, l) => s + l.balance * l.dailyRate, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="panel grid grid-cols-2 gap-4">
        <Kpi label="Net worth" value={money(E.netWorth(g), true)} />
        <Kpi label="Total debt" value={money(debt, true)} />
        <Kpi label="Daily burn" value={money(dailyBurn)} />
        <Kpi label="Credit score" value={String(g.creditScore)} />
      </div>

      <div className="panel">
        <h2 className="font-serif text-xl font-bold">Private Bank</h2>
        {t.locked ? (
          <p className="mt-2 text-sm text-ruby">
            {g.creditScore < 500 ? 'Your credit score is too low to borrow.' : `Credit frozen after liquidation — ${t.lockedDays} more day(s).`}
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-cream-dim">
              Offer: up to <span className="num text-cream">{money(t.available)}</span> at <span className="num text-cream">{pct(t.rate, 2)}</span>/day, compounding.
              Instalment of 12% due weekly; three misses and they repossess.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <input type="range" min={100} max={Math.max(100, t.available)} step={100} value={Math.min(amt, t.available)}
                onChange={(e) => setAmt(Number(e.target.value))} className="min-w-[180px] flex-1 accent-[#D4AF37]" disabled={t.available < 100} />
              <span className="num w-28 text-right font-serif text-lg font-bold">{money(Math.min(amt, t.available))}</span>
              <button className="btn-gold" disabled={t.available < 100} onClick={() => borrow(Math.min(amt, t.available))}>Borrow</button>
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <h2 className="font-serif text-xl font-bold">Investments</h2>
        <p className="mt-1 text-sm text-cream-dim">Idle cash earns nothing. Markets move once a day, at midnight.</p>
        <div className="mt-3 flex flex-col gap-3">
          {(Object.keys(FUNDS) as FundId[]).map((k) => (
            <div key={k} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold">{FUNDS[k].name}</div>
                  <div className="text-xs text-cream-dim">{FUNDS[k].blurb}</div>
                </div>
                <div className="num font-serif text-lg font-bold text-gold-light">{money(g.investments?.[k] ?? 0)}</div>
              </div>
              <div className="mt-2 flex gap-2">
                <input inputMode="numeric" value={inv[k]} onChange={(e) => setInv({ ...inv, [k]: e.target.value.replace(/[^0-9]/g, '') })}
                  className="num w-full min-w-0 rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-cream outline-none focus:border-gold/60" />
                <button className="btn-gold text-xs" onClick={() => invest(k, Number(inv[k] || 0))}>Invest</button>
                <button className="btn-ghost text-xs" onClick={() => withdraw(k, Number(inv[k] || 0))}>Cash out</button>
                <button className="btn-ghost text-xs" onClick={() => withdraw(k, g.investments?.[k] ?? 0)}>All</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 className="mb-3 font-serif text-xl font-bold">Outstanding loans</h2>
        {!g.loans.length && <p className="text-sm text-cream-dim">Debt-free. As it should be.</p>}
        <div className="divide-y divide-white/[0.06]">
          {g.loans.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{l.label}</div>
                <div className="text-xs text-cream-dim">
                  Balance <span className="num text-cream">{money(l.balance)}</span> · {pct(l.dailyRate, 2)}/day · next {money(l.weeksLeft ? l.balance / l.weeksLeft : Math.max(25, l.balance * 0.12))} due {fmtHour(l.nextDueHour)}
                  {l.weeksLeft ? <> · {l.weeksLeft} wk left</> : null}
                  {l.missed > 0 && <span className="text-ruby"> · {l.missed} missed</span>}
                </div>
              </div>
              <button className="btn-ghost text-xs" disabled={g.cash <= 0} onClick={() => repay(l.id, Math.min(1000, l.balance))}>Pay {money(Math.min(1000, l.balance))}</button>
              <button className="btn-gold text-xs" disabled={g.cash < l.balance} onClick={() => repay(l.id, l.balance)}>Pay off</button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2 className="mb-2 font-serif text-xl font-bold">Ledger of a life</h2>
        <div className="grid grid-cols-2 gap-4">
          <Kpi label="Lifetime earnings" value={money(g.stats.lifetimeEarnings, true)} />
          <Kpi label="Peak net worth" value={money(g.stats.peakNetWorth, true)} />
          <Kpi label="Days survived" value={String(g.stats.daysSurvived)} />
        </div>
      </div>
    </div>
  );
}
