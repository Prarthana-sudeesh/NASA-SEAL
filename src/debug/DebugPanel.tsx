import { useState } from 'react';
import { useGame, type Screen } from '../store/game.ts';
import { OUTCOMES, type Outcome } from '../engine/cutscenes.ts';
import { OFFLINE_FLAG, supabaseConfigured } from '../services/leaderboard.ts';
import { PLANETS } from '../data/planets.ts';

const SCREENS: Screen[] = ['title', 'briefing', 'difficulty', 'destinations', 'brief', 'workshop', 'prelaunch', 'report', 'progress', 'summary', 'leaderboard', 'settings'];

/** ?debug=1 demo panel: force outcomes, jump screens, fill a run, toggle offline leaderboard. */
export default function DebugPanel() {
  const g = useGame();
  const [open, setOpen] = useState(true);
  const [offline, setOffline] = useState(() => localStorage.getItem(OFFLINE_FLAG) === '1');
  if (!open)
    return (
      <button className="btn fixed bottom-3 left-3 z-[100] bg-magenta px-3 py-1 text-sm text-cream" onClick={() => setOpen(true)}>
        🐞 Debug
      </button>
    );
  const ensurePlanet = () => {
    if (!g.difficulty) g.chooseDifficulty('easy');
    if (!g.planetId) g.choosePlanet(PLANETS.find((p) => p.tier === (useGame.getState().difficulty ?? 'easy'))!.id);
  };
  return (
    <aside className="sticker fixed bottom-3 left-3 z-[100] max-h-[70vh] w-80 overflow-y-auto bg-panel p-3 text-sm" aria-label="Debug panel" data-testid="debug-panel">
      <div className="mb-2 flex items-center justify-between">
        <b className="font-display text-lg text-magenta">🐞 Demo / debug</b>
        <button onClick={() => setOpen(false)} aria-label="Collapse debug panel">
          ✕
        </button>
      </div>
      <p className="mb-1 font-bold">Play a cutscene sequence</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {OUTCOMES.map((o) => (
          <button key={o} className="rounded border-2 border-ink bg-cyan px-1.5 font-bold text-ink" data-testid={`debug-play-${o}`} onClick={() => playOutcome(o)}>
            {o}
          </button>
        ))}
      </div>
      <p className="mb-1 font-bold">Force next launch’s cutscene: {g.forcedOutcome ?? 'none'}</p>
      <select className="mb-2 w-full rounded bg-cream p-1 text-ink" value={g.forcedOutcome ?? ''} onChange={(e) => g.setForcedOutcome((e.target.value || null) as Outcome | null)}>
        <option value="">(engine decides)</option>
        {OUTCOMES.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <p className="mb-1 font-bold">Jump to screen</p>
      <div className="mb-2 flex flex-wrap gap-1">
        {SCREENS.map((s) => (
          <button
            key={s}
            className="rounded border-2 border-ink bg-panel-2 px-1.5"
            onClick={() => {
              if (['brief', 'workshop', 'prelaunch'].includes(s)) ensurePlanet();
              g.go(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded border-2 border-ink bg-plume px-2 font-bold text-ink" data-testid="debug-fill" onClick={() => { g.fillRandomRun(); g.go('summary'); }}>
          Fill run of 10 random scores
        </button>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={offline}
            onChange={(e) => {
              localStorage.setItem(OFFLINE_FLAG, e.target.checked ? '1' : '0');
              setOffline(e.target.checked);
            }}
          />
          Offline leaderboard {supabaseConfigured() ? '' : '(no Supabase env set)'}
        </label>
      </div>
    </aside>
  );
}

/** Stand-alone playback of an outcome's sequence (no attempt recorded). */
function playOutcome(o: Outcome) {
  sessionStorage.setItem('starbound.testOutcome', o);
  useGame.getState().go('cutscene-test');
}
