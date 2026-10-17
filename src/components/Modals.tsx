import type { ReactNode } from 'react';
import { useGame } from '../game/store';
import * as E from '../game/engine';
import { money } from '../lib/format';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="panel max-h-[90vh] w-full max-w-lg overflow-y-auto border-ruby/40 animate-rise">{children}</div>
    </div>
  );
}

export function BrokeModal() {
  const g = useGame((s) => s.game)!;
  const sell = useGame((s) => s.sell);
  const borrow = useGame((s) => s.borrow);
  const bankrupt = useGame((s) => s.bankrupt);
  const withdraw = useGame((s) => s.withdraw);
  const invested = (g.investments?.index ?? 0) + (g.investments?.crypto ?? 0);
  const deficit = -g.cash;
  const terms = E.loanTerms(g);
  const loanAmt = Math.ceil((deficit + 500) / 100) * 100;
  const canLoan = !terms.locked && terms.available >= loanAmt;
  const assets = [...g.assets].filter((a) => a.currentValue > 0).sort((a, b) => a.currentValue - b.currentValue);

  return (
    <Shell>
      <p className="label !text-ruby">Fire Sale</p>
      <h2 className="mt-1 font-serif text-3xl font-extrabold">You're broke.</h2>
      <p className="mt-2 text-sm text-cream-dim">
        You're <span className="num font-semibold text-ruby">{money(deficit)}</span> in the red and bills keep coming. The clock is frozen until you fix it.
        Sell an asset (at 50% — buyers smell desperation) or take a loan.
      </p>

      <div className="mt-5">
        <div className="label mb-2">Liquidate an asset</div>
        {!assets.length && <p className="text-sm text-cream-dim">Nothing left to sell.</p>}
        <div className="flex flex-col gap-2">
          {assets.map((a, i) => (
            <button key={a.uid} onClick={() => sell(a.uid, 'fire')}
              className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition hover:border-gold/50 ${i === 0 ? 'border-gold/40 bg-gold/[0.06]' : 'border-white/10 bg-black/20'}`}>
              <span>{a.name}{i === 0 && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-gold">cheapest</span>}</span>
              <span className="num font-semibold text-jade">+{money(E.saleValue(a, 'fire'))}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {invested > 0 && (
          <button className="btn-gold" onClick={() => { if (g.investments.index > 0) withdraw('index', g.investments.index); if (useGame.getState().game!.cash < 0 && g.investments.crypto > 0) withdraw('crypto', g.investments.crypto); }}>
            Cash out investments ({money(invested)})
          </button>
        )}
        <button className="btn-gold" disabled={!canLoan} onClick={() => borrow(loanAmt, 'Emergency loan')}>
          {canLoan ? `Emergency loan ${money(loanAmt)} @ ${(terms.rate * 100).toFixed(2)}%/day` : terms.locked ? 'No lender will take your call' : 'Loan limit too low'}
        </button>
        <button className="btn-danger" onClick={bankrupt}>Declare bankruptcy (liquidate everything at 20%)</button>
      </div>
    </Shell>
  );
}

export function LiquidationModal() {
  const g = useGame((s) => s.game)!;
  const dismiss = useGame((s) => s.dismissLiquidation);
  const reset = useGame((s) => s.reset);
  return (
    <Shell>
      <p className="label !text-ruby">Liquidation</p>
      <h2 className="mt-1 font-serif text-3xl font-extrabold">The fall.</h2>
      <p className="mt-3 whitespace-pre-line text-sm text-cream-dim">{g.liquidationReport}</p>
      <p className="mt-3 text-sm">You walk away with <span className="num font-semibold text-gold-light">{money(g.cash)}</span>.</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <button className="btn-gold" onClick={dismiss}>Rise from the ashes</button>
        <button className="btn-ghost" onClick={reset}>Start a new life</button>
      </div>
    </Shell>
  );
}
