import { useState } from 'react';
import { useGame } from '../game/store';
import { fmtHour, money } from '../lib/format';
import type { TxnCategory } from '../game/types';

const CATS: (TxnCategory | 'ALL')[] = ['ALL', 'INCOME', 'EXPENSE', 'PURCHASE', 'SALE', 'TAX', 'LOAN'];

export default function Ledger() {
  const txns = useGame((s) => s.game!.txns);
  const [f, setF] = useState<(typeof CATS)[number]>('ALL');
  const rows = f === 'ALL' ? txns : txns.filter((t) => t.category === f);
  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setF(c)}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide ${f === c ? 'border-gold/70 bg-gold/15 text-gold-light' : 'border-white/10 text-cream-dim'}`}>{c}</button>
        ))}
      </div>
      <div className="max-h-[65vh] overflow-y-auto">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="num whitespace-nowrap py-2 pr-3 text-xs text-cream-dim">{fmtHour(t.hour)}</td>
                <td className="py-2 pr-3"><span className="mr-2 rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-cream-dim">{t.category}</span>{t.description}</td>
                <td className={`num whitespace-nowrap py-2 text-right font-semibold ${t.amount >= 0 ? 'text-jade' : 'text-[#e58b86]'}`}>{t.amount >= 0 ? '+' : ''}{money(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-8 text-center text-sm text-cream-dim">Nothing here yet.</p>}
      </div>
    </div>
  );
}
