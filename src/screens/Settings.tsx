import { useGame } from '../store/game.ts';
import { useSettings, prefersReducedMotion } from '../store/settings.ts';
import { Button } from '../ui/Button.tsx';
import { Card, ScreenTitle } from '../ui/bits.tsx';
import { play } from '../audio/audio.ts';

function Slider({ id, label, value, onChange }: { id: string; label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex justify-between font-bold">
        <span>{label}</span>
        <span className="font-mono">{Math.round(value * 100)}%</span>
      </label>
      <input id={id} type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={() => play('ui_click')} className="h-3 w-full" />
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl bg-space/60 p-3">
      <span>
        <span className="block font-bold">{label}</span>
        {desc && <span className="text-sm text-muted">{desc}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => { onChange(e.target.checked); play('ui_click'); }} className="mt-1 h-6 w-6 accent-orange" />
    </label>
  );
}

export function SettingsScreen() {
  const s = useSettings();
  const { back, resetAll } = useGame();
  const sysCalm = prefersReducedMotion();
  return (
    <div className="mx-auto max-w-3xl">
      <ScreenTitle kicker="Mission settings" title="Settings" />
      <div className="flex flex-col gap-6">
        <Card tiltKey="audio" className="flex flex-col gap-4 p-5">
          <h2 className="font-display text-2xl text-cyan">Sound</h2>
          <Slider id="vol-master" label="Master volume" value={s.master} onChange={(v) => s.set({ master: v })} />
          <Slider id="vol-music" label="Music" value={s.music} onChange={(v) => s.set({ music: v })} />
          <Slider id="vol-sfx" label="Sound effects & cutscenes" value={s.sfx} onChange={(v) => s.set({ sfx: v })} />
          <Toggle label="Mute everything" desc="Shortcut: press M anywhere." checked={s.muted} onChange={(v) => s.set({ muted: v })} />
        </Card>
        <Card tiltKey="comfort" className="flex flex-col gap-3 p-5">
          <h2 className="font-display text-2xl text-cyan">Comfort & accessibility</h2>
          <div className="rounded-xl bg-space/60 p-3">
            <p className="font-bold">Calm mode</p>
            <p className="mb-2 text-sm text-muted">Cutscenes without camera shake, no parallax or UI wobble, fewer particles. {sysCalm && 'Your device asks for reduced motion.'}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Calm mode">
              {(['auto', 'on', 'off'] as const).map((v) => (
                <button key={v} role="radio" aria-checked={s.calm === v} onClick={() => { s.set({ calm: v }); play('ui_click'); }} className={`rounded-xl border-2 border-ink px-3 py-1 font-bold ${s.calm === v ? 'bg-orange text-cream' : 'bg-panel-2'}`}>
                  {v === 'auto' ? 'Follow my device' : v === 'on' ? 'On' : 'Off'}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="Haptics" desc="Vibration on supported phones (most Android browsers; not iPhone Safari)." checked={s.haptics} onChange={(v) => s.set({ haptics: v })} />
          <Toggle label="Auto-explain stats" desc="Hover or focus a stat in the workshop for a quick explainer." checked={s.autoExplain} onChange={(v) => s.set({ autoExplain: v })} />
          <div className="rounded-xl bg-space/60 p-3">
            <p className="mb-2 font-bold">Text size</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Text size">
              {([1, 1.15, 1.3] as const).map((v) => (
                <button key={v} role="radio" aria-checked={s.textScale === v} onClick={() => { s.set({ textScale: v }); play('ui_click'); }} className={`rounded-xl border-2 border-ink px-3 py-1 font-bold ${s.textScale === v ? 'bg-orange text-cream' : 'bg-panel-2'}`} style={{ fontSize: `${v}rem` }}>
                  {v === 1 ? 'Normal' : v === 1.15 ? 'Large' : 'Extra large'}
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card tiltKey="reset" className="flex flex-col gap-3 p-5">
          <h2 className="font-display text-2xl text-danger">Reset</h2>
          <p className="text-muted">Clears your run, name and settings on this device. Leaderboard entries stay.</p>
          <div>
            <Button
              variant="danger"
              onClick={() => {
                if (window.confirm('Reset all progress on this device?')) {
                  resetAll();
                  s.reset();
                }
              }}
            >
              Reset progress
            </Button>
          </div>
        </Card>
        <div>
          <Button onClick={back}>← Back</Button>
        </div>
      </div>
    </div>
  );
}
