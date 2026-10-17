import type { NoticeKind } from '../game/types';

let ctx: AudioContext | null = null;
function ac() {
  try {
    ctx ||= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

/** Soft chimes and clicks, synthesised — no audio files needed. */
export function sfx(kind: NoticeKind) {
  switch (kind) {
    case 'gold': // purchase / promotion chime
      tone(1046.5, 0, 0.6); tone(1318.5, 0.08, 0.6); tone(1568, 0.16, 0.9, 'sine', 0.09);
      break;
    case 'good': // register click
      tone(2200, 0, 0.05, 'square', 0.04); tone(1500, 0.06, 0.25, 'triangle', 0.08);
      break;
    case 'bad':
      tone(196, 0, 0.35, 'triangle', 0.14); tone(155.6, 0.12, 0.5, 'triangle', 0.12);
      break;
    default:
      tone(880, 0, 0.18, 'sine', 0.06);
  }
}
