import { useRef, useState } from 'react';
import { useGame } from '../game/store';
import { hydrate } from '../game/engine';
import { cloudEnabled, cloudLoad, cloudSave } from '../lib/cloud';

export default function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const settings = useGame((s) => s.settings);
  const setSettings = useGame((s) => s.setSettings);
  const notify = useGame((s) => s.notify);
  const load = useGame((s) => s.load);
  const reset = useGame((s) => s.reset);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportSave = () => {
    const g = useGame.getState().game;
    const blob = new Blob([JSON.stringify(g, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `luxe-life-${g?.name.replace(/\W+/g, '-').toLowerCase()}-day${Math.floor((g?.hour ?? 0) / 24) + 1}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importSave = async (f: File) => {
    try {
      const g = hydrate(JSON.parse(await f.text()));
      if (!g) throw new Error();
      load(g);
      notify({ kind: 'good', text: 'Save loaded.' });
      setOpen(false);
    } catch {
      notify({ kind: 'bad', text: "That file isn't a Luxe Life save." });
    }
  };

  const cloud = async (dir: 'save' | 'load') => {
    setBusy(true);
    try {
      if (dir === 'save') {
        await cloudSave(useGame.getState().game!);
        notify({ kind: 'good', text: 'Saved to the cloud.' });
      } else {
        const g = hydrate(await cloudLoad());
        if (!g) notify({ kind: 'info', text: 'No cloud save yet.' });
        else { load(g); notify({ kind: 'good', text: 'Cloud save loaded.' }); }
      }
    } catch (e) {
      notify({ kind: 'bad', text: `Cloud ${dir} failed: ${(e as Error).message}` });
    } finally { setBusy(false); }
  };

  return (
    <div className="relative">
      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => { setOpen(!open); setConfirmReset(false); }} aria-label="Menu">☰</button>
      {open && (
        <div className="panel absolute left-0 top-10 z-40 w-64 !p-3">
          <div className="flex flex-col gap-1.5 text-sm">
            <button className="btn-ghost justify-start" onClick={() => setSettings({ sound: !settings.sound })}>
              Sound: {settings.sound ? 'On' : 'Off'}
            </button>
            <div className="flex items-center gap-1 px-1 py-0.5">
              <span className="mr-auto text-xs text-cream-dim">Graphics</span>
              {(['low', 'high', 'ultra'] as const).map((q) => (
                <button key={q} onClick={() => setSettings({ gfx: q })}
                  className={`rounded-md px-2 py-1 text-xs font-semibold capitalize ${(settings.gfx ?? 'high') === q ? 'bg-gold/20 text-gold-light' : 'text-cream-dim hover:text-cream'}`}>
                  {q}
                </button>
              ))}
            </div>
            <button className="btn-ghost justify-start" onClick={exportSave}>Export save file</button>
            <button className="btn-ghost justify-start" onClick={() => fileRef.current?.click()}>Import save file</button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void importSave(f); e.target.value = ''; }} />
            {cloudEnabled ? (
              <>
                <button className="btn-ghost justify-start" disabled={busy} onClick={() => cloud('save')}>Cloud save (Supabase)</button>
                <button className="btn-ghost justify-start" disabled={busy} onClick={() => cloud('load')}>Cloud load</button>
              </>
            ) : (
              <p className="px-1 py-1 text-[11px] text-cream-dim/70">Cloud save: add Supabase keys to .env to enable.</p>
            )}
            <div className="my-1 border-t border-white/10" />
            {confirmReset ? (
              <button className="btn-danger" onClick={() => { reset(); setOpen(false); }}>Really abandon this life?</button>
            ) : (
              <button className="btn-ghost justify-start text-ruby" onClick={() => setConfirmReset(true)}>New game…</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
