import { useState } from 'react';
import { useGame, LAUNCHES_PER_RUN } from '../store/game.ts';
import { CassSays } from '../ui/Cass.tsx';
import { Button } from '../ui/Button.tsx';
import { cleanName } from '../services/names.ts';
import { play } from '../audio/audio.ts';

const LINES = [
  'Congratulations, engineer! You’ve just been promoted to aerospace engineer at NASA. 🎉',
  'Your job: pick a real planet from NASA’s exoplanet catalogue and design a rocket that flies there AND comes home.',
  'Every part costs money, so stay inside your budget. Heavier rockets need stronger engines.',
  `Each run is ${LAUNCHES_PER_RUN} launches. Your average score goes on the leaderboard, so every launch counts!`,
  'First things first: what should Mission Control call you?',
];

export function Briefing() {
  const { engineerName, setName, finishBriefing, go } = useGame();
  const [i, setI] = useState(0);
  const [name, setLocal] = useState(engineerName);
  const [err, setErr] = useState('');
  const last = i === LINES.length - 1;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = cleanName(name);
    if (!r.ok) {
      setErr(r.error!);
      play('error');
      return;
    }
    setName(r.value);
    finishBriefing();
    go('difficulty');
  };

  return (
    <div className="mx-auto flex min-h-[75dvh] max-w-3xl flex-col justify-center gap-6">
      <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan">
        Promotion briefing · {i + 1}/{LINES.length}
      </p>
      <h1 tabIndex={-1} className="sr-only">
        Promotion briefing
      </h1>
      <CassSays key={i} text={LINES[i]} mood={i === 0 ? 'cheer' : 'happy'} size={120} />
      {last ? (
        <form onSubmit={submit} className="sticker flex flex-col gap-3 bg-panel p-5">
          <label htmlFor="engineer-name" className="font-display text-xl font-bold">
            Engineer name <span className="text-base font-normal text-muted">(shown on the leaderboard, max 20 characters)</span>
          </label>
          <input
            id="engineer-name"
            autoFocus
            maxLength={20}
            value={name}
            onChange={(e) => {
              setLocal(e.target.value);
              setErr('');
            }}
            className="sticker-sm bg-cream px-4 py-3 text-xl font-bold text-ink"
            placeholder="e.g. Rocket Riley"
            aria-invalid={!!err}
            aria-describedby={err ? 'name-err' : undefined}
            data-testid="name-input"
          />
          {err && (
            <p id="name-err" className="font-bold text-danger" role="alert">
              {err}
            </p>
          )}
          <div className="flex gap-3">
            <Button type="submit" data-testid="name-submit">
              That’s me! →
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          <Button onClick={() => setI(i + 1)} data-testid="briefing-next">
            Next →
          </Button>
          <Button variant="ghost" onClick={() => setI(LINES.length - 1)}>
            Skip briefing
          </Button>
        </div>
      )}
    </div>
  );
}
