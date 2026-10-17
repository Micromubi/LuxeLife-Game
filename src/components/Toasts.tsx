import { useGame } from '../game/store';

const STYLE = {
  good: 'border-jade/40 text-[#bfe6d2]',
  bad: 'border-ruby/50 text-[#f3b1ad]',
  info: 'border-white/15 text-cream',
  gold: 'border-gold/60 text-gold-light shadow-[0_0_24px_-6px_rgba(212,175,55,0.6)]',
};

export default function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-32 left-1/2 z-[70] -translate-x-1/2 flex w-[min(92vw,360px)] flex-col gap-2">
      {toasts.map((t) => (
        <button key={t.id} onClick={() => dismiss(t.id)}
          className={`pointer-events-auto animate-rise rounded-xl border bg-[#1b1a18]/95 px-4 py-3 text-left text-sm backdrop-blur ${STYLE[t.kind]}`}>
          {t.text}
        </button>
      ))}
    </div>
  );
}
