import { useGame } from '../game/store';
import * as E from '../game/engine';
import { ACTIONS, ACTION_GROUPS, SLEEP_GAIN, type ActionGroup } from '../game/config';
import { money } from '../lib/format';
import type { NeedKey } from '../game/types';

const GROUPS = ACTION_GROUPS;
const SHORT: Record<NeedKey, string> = { energy: 'Energy', hunger: 'Fullness', social: 'Social', hygiene: 'Hygiene' };

export default function ActionsPanel({ groups, onShowAll }: { groups?: ActionGroup[]; onShowAll?: () => void }) {
  const g = useGame((s) => s.game)!;
  const act = useGame((s) => s.act);
  const wage = E.hourlyWage(g) * 4 * E.productivity(g).mult * 0.9;

  return (
    <div className="flex flex-col gap-4">
      {(groups?.length ? groups : GROUPS).map((grp) => (
        <div key={grp} className="panel">
          <h2 className="mb-3 font-serif text-xl font-bold">{grp}</h2>
          <div className="flex flex-col gap-2">
            {ACTIONS.filter((a) => a.group === grp).map((a) => {
              const can = E.canDoAction(g, a.id);
              const cost = E.actionCost(g, a);
              const fx = Object.entries(a.effects) as [NeedKey, number][];
              if (a.sleeping) {
                const night = E.inWindow(E.hourOfDay(g), [21, 9]);
                fx.unshift(['energy', Math.min(100 - Math.round(g.needs.energy), Math.round(SLEEP_GAIN * a.hours * E.modifiers(g).sleepQuality * (night ? 1 : 0.7)))]);
              }
              return (
                <button
                  key={a.id}
                  disabled={!can.ok}
                  onClick={() => act(a.id)}
                  className="group flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/20 px-3.5 py-3 text-left transition hover:border-gold/40 hover:bg-gold/[0.05] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-white/[0.07] disabled:hover:bg-black/20"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold">{a.label}</span>
                      <span className="text-xs text-cream-dim">{a.hours}h</span>
                    </div>
                    <div className="mt-0.5 text-xs text-cream-dim">{can.ok ? a.desc : <span className="text-ruby/90">{can.reason}</span>}</div>
                    {(fx.length > 0 || a.health || a.study) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.health ? <span className="rounded-md bg-jade/15 px-1.5 py-0.5 text-[10px] font-semibold text-jade">+{a.health} Health</span> : null}
                        {a.study ? <span className="rounded-md bg-[#4aa3df]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#8cc8f0]">+{a.study} shift{a.study > 1 ? 's' : ''} to promotion</span> : null}
                        {fx.map(([k, v]) => (
                          <span key={k} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${v > 0 ? 'bg-jade/15 text-jade' : 'bg-ruby/15 text-[#e58b86]'}`}>
                            {v > 0 ? '+' : ''}{v} {SHORT[k]}
                          </span>
                        ))}
                        {a.rep ? <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-light">+{a.rep} Rep</span> : null}
                      </div>
                    )}
                    {a.open && can.ok && <div className="mt-1 text-[10px] text-cream-dim/70">Open {String(a.open[0]).padStart(2, '0')}:00–{String(a.open[1]).padStart(2, '0')}:00</div>}
                  </div>
                  <div className="num shrink-0 text-right text-sm font-semibold">
                    {a.special === 'work' && <span className="text-jade">+{money(wage)}</span>}
                    {a.special === 'overtime' && <span className="text-jade">+{money(wage * 2.2)}</span>}
                    {cost > 0 && <span className="text-cream">{money(cost)}</span>}
                    {cost < a.cost && <div className="text-[10px] text-cream-dim line-through">{money(a.cost)}</div>}
                    {cost === 0 && !a.special?.match(/work|overtime/) && <span className="text-cream-dim">Free</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {groups?.length && onShowAll ? (
        <button className="btn-ghost" onClick={onShowAll}>Show all actions</button>
      ) : null}
    </div>
  );
}
