import { useEffect, useState } from 'react';
import { useGame, LAUNCHES_PER_RUN, runKey } from '../store/game.ts';
import { runAverage } from '../engine/score.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { getPlanet } from '../data/planets.ts';
import { getLeaderboard } from '../services/leaderboard.ts';
import { cleanName } from '../services/names.ts';
import { Button } from '../ui/Button.tsx';
import { Card, ScreenTitle, CountUp, Redirect } from '../ui/bits.tsx';
import { CassSays } from '../ui/Cass.tsx';
import { celebrate } from '../ui/confetti.ts';
import { play } from '../audio/audio.ts';

export default function RunSummary() {
  const { attempts, difficulty, engineerName, setName, markSubmitted, submittedRunKey, newRun, open } = useGame();
  const [name, setLocal] = useState(engineerName);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const d = difficulty ?? 'easy';
  const key = runKey(attempts, difficulty);
  const submitted = submittedRunKey === key;
  const avg = runAverage(attempts.map((a) => a.score));
  const svc = getLeaderboard();

  useEffect(() => {
    void celebrate('success');
  }, []);

  if (attempts.length < LAUNCHES_PER_RUN) return <Redirect to="progress" />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = cleanName(name);
    if (!n.ok) {
      setErr(n.error!);
      play('error');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const entry = await svc.submit({ name: n.value, difficulty: d, avg_score: avg, attempts: attempts.length });
      setName(n.value);
      markSubmitted(entry.id, key);
      play('leaderboard_chime');
      void celebrate('leaderboard');
      open('leaderboard');
    } catch (ex) {
      setErr((ex as Error).message || 'Could not submit. Try again.');
      play('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <ScreenTitle kicker={`${DIFFICULTIES[d].label} run complete`} title="Run summary">
        All {LAUNCHES_PER_RUN} launches flown. Here’s how the whole run went.
      </ScreenTitle>
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <Card tiltKey="final" className="p-6 text-center">
          <p className="font-bold text-muted">Average of {LAUNCHES_PER_RUN} launches</p>
          <p className="font-display text-8xl font-bold text-plume" data-testid="final-average">
            <CountUp value={avg} decimals={1} onTick={() => play('score_tick')} />
          </p>
          <p className="text-muted">out of a possible 1,400</p>
          <ol className="mt-5 grid grid-cols-3 gap-2">
            {attempts.map((a) => (
              <li key={a.n} className={`rounded-xl border-2 border-ink p-1 text-sm ${a.success ? 'bg-go text-ink' : 'bg-danger text-ink'}`} title={getPlanet(a.planetId)?.nickname}>
                <b>#{a.n}</b>
                <br />
                <span className="font-mono">{a.score.toFixed(0)}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card tiltKey="submit" className="p-6">
          {submitted ? (
            <>
              <CassSays mood="cheer" text="You’re on the board! Fancy another run?" />
              <div className="mt-5 flex flex-wrap gap-3">
                <Button onClick={() => open('leaderboard')}>🏆 View leaderboard</Button>
                <Button variant="secondary" onClick={newRun} data-testid="new-run">
                  🚀 New run
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <h2 className="font-display text-2xl text-magenta">Post to the leaderboard</h2>
              {svc.kind === 'local' && <p className="rounded-xl bg-amber/20 p-2 text-sm font-bold text-amber">Offline: scores saved on this device only.</p>}
              <label htmlFor="lb-name" className="font-bold">
                Engineer name (max 20 characters)
              </label>
              <input id="lb-name" maxLength={20} value={name} onChange={(e) => setLocal(e.target.value)} className="sticker-sm bg-cream px-4 py-3 text-xl font-bold text-ink" data-testid="lb-name" aria-invalid={!!err} />
              {err && (
                <p className="font-bold text-danger" role="alert">
                  {err}
                </p>
              )}
              <p className="text-sm text-muted">
                Posts your name, average score ({avg.toFixed(1)}) and difficulty ({DIFFICULTIES[d].label}).
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" variant="magenta" disabled={busy} data-testid="submit-score">
                  {busy ? 'Sending…' : '🏆 Submit score'}
                </Button>
                <Button type="button" variant="ghost" onClick={newRun}>
                  Skip, new run
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
