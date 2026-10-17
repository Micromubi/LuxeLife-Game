import { useEffect, useState } from 'react';
import { useGame } from '../game/store';

/**
 * Real-time loop: every `tickMs` of real time advances the world by one in-game hour
 * (needs decay, passive income, bills, bankruptcy checks). Pauses while you're broke.
 * Returns progress (0–1) toward the next hour for the clock UI.
 */
export function useGameLoop() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let last = performance.now();
    let acc = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      const { game, settings, tick } = useGame.getState();
      if (!game || settings.paused || game.brokeOpen || game.liquidationReport || document.hidden) {
        return;
      }
      acc += dt;
      if (acc >= settings.tickMs) {
        acc = 0;
        tick();
      }
      setProgress(Math.min(1, acc / settings.tickMs));
    }, 250);
    return () => window.clearInterval(id);
  }, []);
  return progress;
}
