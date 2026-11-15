import { useGame, LAUNCHES_PER_RUN } from '../store/game.ts';
import { getPlanet } from '../data/planets.ts';
import { runAverage } from '../engine/score.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { Button } from '../ui/Button.tsx';
import { Card, ScreenTitle, CountUp } from '../ui/bits.tsx';
import { CassSays } from '../ui/Cass.tsx';

export function RunProgress() {
  const { attempts, difficulty, go } = useGame();
  const d = difficulty ?? 'easy';
  const avg = runAverage(attempts.map((a) => a.score));
  const best = attempts.reduce<(typeof attempts)[number] | null>((b, a) => (!b || a.score > b.score ? a : b), null);
  const done = attempts.length >= LAUNCHES_PER_RUN;
  const wins = attempts.filter((a) => a.success).length;
  return (
    <div>
      <ScreenTitle kicker={`${DIFFICULTIES[d].label} run`} title={done ? 'Run complete!' : `Launch ${attempts.length} of ${LAUNCHES_PER_RUN} done`}>
        Your leaderboard score is the average of all {LAUNCHES_PER_RUN} launches.
      </ScreenTitle>
      <div className="mb-8 grid gap-6 sm:grid-cols-3">
        <Card tiltKey="avg" className="p-5 text-center">
          <p className="font-bold text-muted">Running average</p>
          <p className="font-display text-5xl text-plume" data-testid="run-average">
            <CountUp value={avg} decimals={1} />
          </p>
        </Card>
        <Card tiltKey="best" className="p-5 text-center">
          <p className="font-bold text-muted">Best launch</p>
          <p className="font-display text-5xl text-cyan">{best ? best.score.toFixed(1) : '—'}</p>
          {best && <p className="text-sm text-muted">#{best.n} · {getPlanet(best.planetId)?.nickname}</p>}
        </Card>
        <Card tiltKey="wins" className="p-5 text-center">
          <p className="font-bold text-muted">Successful missions</p>
          <p className="font-display text-5xl text-go">
            {wins}/{attempts.length}
          </p>
        </Card>
      </div>
      <ol className="mb-8 grid grid-cols-3 gap-2" aria-label="Launches">
        {Array.from({ length: LAUNCHES_PER_RUN }, (_, i) => {
          const a = attempts[i];
          return (
            <li key={i} className={`sticker-sm flex flex-col items-center p-2 text-center ${!a ? 'bg-space/50 text-muted' : a.success ? 'bg-go text-ink' : 'bg-danger text-ink'}`}>
              <span className="text-xs font-bold">#{i + 1}</span>
              <span className="font-mono font-bold">{a ? a.score.toFixed(0) : '·'}</span>
              <span className="sr-only">{a ? (a.success ? 'success' : 'lost') : 'not flown'}</span>
            </li>
          );
        })}
      </ol>
      {!done && <CassSays className="mb-6 max-w-3xl" text={wins === attempts.length ? 'Keep it up! Try trimming cost or adding crew for a bigger score.' : 'Every launch teaches us something. Read the report, tweak the rocket, and go again!'} />}
      <div className="flex flex-wrap gap-4">
        {done ? (
          <Button size="lg" onClick={() => go('summary')} data-testid="to-summary">
            Run summary & leaderboard 🏁
          </Button>
        ) : (
          <>
            <Button size="lg" onClick={() => go('workshop')} data-testid="next-launch">
              🔧 Next launch: same planet
            </Button>
            <Button size="lg" variant="secondary" onClick={() => go('destinations')}>
              🪐 Next launch: new planet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
