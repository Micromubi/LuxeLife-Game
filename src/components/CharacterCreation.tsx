import { useState } from 'react';
import { START_PROFILES } from '../game/config';
import { useGame } from '../game/store';
import type { StartType } from '../game/types';
import { money } from '../lib/format';

export default function CharacterCreation() {
  const start = useGame((s) => s.start);
  const [name, setName] = useState('');
  const [pick, setPick] = useState<StartType>('LAPO');

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col justify-center px-4 py-12">
      <div className="mb-10 text-center animate-rise">
        <p className="label mb-3">A life simulation</p>
        <h1 className="font-serif text-5xl font-extrabold tracking-tight sm:text-7xl">
          <span className="gold-text vip-crest">Luxe Life</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg font-serif text-lg italic text-cream-dim">
          Work. Earn. Spend. Survive. Every purchase ripples; every hour counts.
        </p>
      </div>

      <div className="panel animate-rise">
        <label className="label" htmlFor="name">Your name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={28}
          placeholder="e.g. Amara Bello"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-serif text-xl text-cream outline-none placeholder:text-cream-dim/40 focus:border-gold/60"
        />

        <p className="label mt-6">Choose your origin</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {(Object.keys(START_PROFILES) as StartType[]).map((k) => {
            const p = START_PROFILES[k];
            const active = pick === k;
            return (
              <button
                key={k}
                onClick={() => setPick(k)}
                className={`rounded-2xl border p-5 text-left transition ${
                  active ? 'border-gold/70 bg-gold/[0.07] shadow-[0_0_0_1px_rgba(212,175,55,0.4)]' : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-serif text-2xl font-bold">{p.title}</h3>
                  <span className="label">{k === 'NEPO' ? 'Nepo' : 'Lapo'}</span>
                </div>
                <p className="mt-2 text-sm text-cream-dim">{p.tagline}</p>
                <dl className="mt-4 grid grid-cols-2 gap-y-1.5 text-sm">
                  <dt className="text-cream-dim">Cash</dt><dd className="num text-right font-semibold">{money(p.cash)}</dd>
                  <dt className="text-cream-dim">Debt</dt><dd className="num text-right font-semibold">{p.loan ? `${money(p.loan)} @ ${(p.loanRate * 100).toFixed(1)}%/day` : '—'}</dd>
                  <dt className="text-cream-dim">Credit score</dt><dd className="num text-right font-semibold">{p.credit}</dd>
                  <dt className="text-cream-dim">Reputation</dt><dd className="num text-right font-semibold">{p.reputation}</dd>
                </dl>
                <p className="mt-4 rounded-lg bg-black/25 px-3 py-2 text-xs">
                  <span className="font-semibold text-gold">{p.trait}.</span> <span className="text-cream-dim">{p.traitText}</span>
                </p>
              </button>
            );
          })}
        </div>

        <button className="btn-gold mt-6 w-full py-3 text-base" onClick={() => start(name, pick)}>
          Begin your legacy
        </button>
      </div>
      <p className="mt-6 text-center text-xs text-cream-dim/60">Progress saves automatically in this browser.</p>
    </div>
  );
}
