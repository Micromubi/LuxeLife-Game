import { useGame } from '../game/store';
import * as E from '../game/engine';
import { CRITICAL, NEED_META, START_PROFILES } from '../game/config';
import type { NeedKey } from '../game/types';
import { money } from '../lib/format';

export default function StatusColumn() {
  const g = useGame((s) => s.game)!;
  const p = E.prestige(g);
  const tier = E.prestigeTier(p);
  const lo = tier.min;
  const hi = tier.next?.min ?? Math.max(p, lo + 1);
  const frac = tier.next ? (p - lo) / (hi - lo) : 1;
  const mods = E.modifiers(g);
  const { cur, next, shiftsNeeded } = E.careerInfo(g);
  const prod = E.productivity(g);
  const md = E.mood(g);
  const h = E.hourOfDay(g);
  const sleepHint = h >= 21 || h < 5 ? 'Bedtime' : h < 9 ? 'Morning' : h < 17 ? 'Office hours' : 'Evening';
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <aside className="flex flex-col gap-5">
      {/* Prestige */}
      <div className="panel">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 128 128" className="h-28 w-28 shrink-0 -rotate-90">
            <defs>
              <linearGradient id="pg" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="#F6E7B0" /><stop offset="0.5" stopColor="#D4AF37" /><stop offset="1" stopColor="#9C7F22" />
              </linearGradient>
            </defs>
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <circle cx="64" cy="64" r={R} fill="none" stroke="url(#pg)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
            <text x="64" y="64" transform="rotate(90 64 64)" textAnchor="middle" dominantBaseline="central"
              className="fill-cream font-serif" fontSize="30" fontWeight="800">{p}</text>
          </svg>
          <div className="min-w-0">
            <div className="label">Prestige</div>
            <div className="font-serif text-3xl font-extrabold"><span className="gold-text">{tier.name}</span></div>
            <div className="mt-1 text-xs text-cream-dim">
              {tier.next ? <>{tier.next.min - p} to <span className="text-cream">{tier.next.name}</span></> : 'The summit.'}
            </div>
            <div className="mt-2 text-xs text-cream-dim">
              Assets {Math.round(E.assetPrestige(g))} · Reputation {Math.round(g.reputation)}
            </div>
          </div>
        </div>
      </div>

      {/* Needs */}
      <div className="panel">
        <div className="mb-1 flex items-center justify-between">
          <span className="label">Wellbeing</span>
          <span className={`text-xs ${prod.mult < 1 ? 'text-ruby' : 'text-jade'}`} title="Work pay multiplier from your mood and condition">Work ×{prod.mult.toFixed(2)}</span>
        </div>
        <div className="mb-3 flex items-baseline justify-between text-xs">
          <span className="text-cream-dim">Mood <span className="font-semibold text-cream">{E.moodLabel(md)}</span> <span className="num text-cream-dim">({md})</span></span>
          <span className="text-cream-dim/70">{sleepHint}</span>
        </div>
        <div className="flex flex-col gap-3">
          {(Object.keys(NEED_META) as NeedKey[]).map((k) => (
            <Bar key={k} label={NEED_META[k].label} value={g.needs[k]} hint={NEED_META[k].hint} decay={mods.decay[k]} />
          ))}
          <Bar label="Health" value={g.health} hint="Falls when you starve or burn out." />
        </div>
      </div>

      {/* Career */}
      <div className="panel">
        <div className="label">Career</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-serif text-2xl font-bold">{cur.title}</span>
          <span className="num text-sm text-gold-light">{money(E.hourlyWage(g))}/h</span>
        </div>
        {next ? (
          <div className="mt-3 space-y-1.5 text-xs">
            <div className="text-cream-dim">Next: <span className="text-cream">{next.title}</span></div>
            <Req ok={g.shiftsAtLevel >= shiftsNeeded} text={`Shifts ${Math.min(g.shiftsAtLevel, shiftsNeeded)}/${shiftsNeeded}`} />
            {next.prestige > 0 && <Req ok={p >= next.prestige} text={`Prestige ${next.prestige}`} />}
            {next.tag && <Req ok={E.tags(g).has(next.tag)} text={`Own ${next.tagLabel}`} />}
          </div>
        ) : <p className="mt-2 text-xs text-cream-dim">You run the place.</p>}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-center">
          <Mini label="Credit" value={String(g.creditScore)} />
          <Mini label="Tokens" value={String(g.tokens)} />
          <Mini label="Trait" value={START_PROFILES[g.startType].trait} small />
        </div>
      </div>
    </aside>
  );
}

function Bar({ label, value, hint, decay }: { label: string; value: number; hint: string; decay?: number }) {
  const crit = value < CRITICAL;
  const low = value < 35;
  const color = crit ? 'from-ruby to-[#e0605a]' : low ? 'from-[#b9852b] to-[#d9a94a]' : 'from-gold-dark via-gold to-gold-light';
  return (
    <div title={hint}>
      <div className="mb-1 flex justify-between text-xs">
        <span className={crit ? 'font-semibold text-ruby' : 'text-cream'}>{label}{crit && ' — critical'}</span>
        <span className="num text-cream-dim">{Math.round(value)}{decay !== undefined && <span className="ml-1.5 text-cream-dim/60">−{decay.toFixed(1)}/h awake</span>}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-[width] duration-500`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Req({ ok, text }: { ok: boolean; text: string }) {
  return <div className={ok ? 'text-jade' : 'text-cream-dim'}>{ok ? '✓' : '○'} {text}</div>;
}

function Mini({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="label !text-[9px]">{label}</div>
      <div className={`num font-semibold ${small ? 'text-xs leading-5' : 'text-base'}`}>{value}</div>
    </div>
  );
}
