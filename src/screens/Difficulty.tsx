import { useGame, LAUNCHES_PER_RUN } from '../store/game.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { PLANETS } from '../data/planets.ts';
import type { Difficulty } from '../data/types.ts';
import { Card, ScreenTitle, Pill } from '../ui/bits.tsx';
import { PlanetArt } from '../ui/PlanetArt.tsx';
import { Button } from '../ui/Button.tsx';
import { CassSays } from '../ui/Cass.tsx';

const ACCENT: Record<Difficulty, string> = { easy: 'bg-go', medium: 'bg-plume', hard: 'bg-danger' };
const SAMPLE: Record<Difficulty, string> = { easy: 'proxima-cen-b', medium: 'k2-18-b', hard: 'kelt-9-b' };
const STARS: Record<Difficulty, string> = { easy: '★', medium: '★★', hard: '★★★' };

export function DifficultyScreen() {
  const { chooseDifficulty, go, difficulty, attempts, engineerName } = useGame();
  const pick = (d: Difficulty) => {
    if (difficulty && difficulty !== d && attempts.length > 0 && attempts.length < 10) {
      if (!window.confirm(`Switching difficulty starts a new run. Your current ${DIFFICULTIES[difficulty].label} run (${attempts.length}/${LAUNCHES_PER_RUN}) will be lost. Continue?`)) return;
    }
    chooseDifficulty(d);
    go('destinations');
  };
  return (
    <div>
      <ScreenTitle kicker="Step 1 of 3" title="Choose your difficulty">
        Each run is {LAUNCHES_PER_RUN} launches on one difficulty. Your average score goes on the leaderboard.
      </ScreenTitle>
      <CassSays className="mb-8 max-w-3xl" text={`Pick your challenge, ${engineerName || 'engineer'}. Cadet is a great place to learn the ropes!`} />
      <div className="grid gap-8 lg:grid-cols-3">
        {(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => {
          const cfg = DIFFICULTIES[d];
          const sample = PLANETS.find((p) => p.id === SAMPLE[d])!;
          return (
            <Card key={d} tiltKey={d} hover className="flex flex-col overflow-hidden" as="article">
              <div className={`${ACCENT[d]} flex items-center justify-between border-b-[3px] border-ink px-5 py-3 text-ink`}>
                <h2 className="font-display text-3xl font-bold">{cfg.label}</h2>
                <span className="font-display text-2xl" aria-label={`${STARS[d].length} of 3 stars`}>
                  {STARS[d]}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <p className="text-lg">{cfg.tagline}</p>
                <Pill className="self-start bg-plume text-ink">
                  Budget <span className="font-mono">${cfg.budget}M</span>
                </Pill>
                <div>
                  <h3 className="mb-1 font-display text-lg text-cyan">What’s new here</h3>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {cfg.newHere.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-auto flex items-center gap-3 rounded-2xl bg-space/60 p-3">
                  <PlanetArt planet={sample} size={84} label={false} />
                  <div>
                    <p className="text-sm text-muted">Sample destination</p>
                    <p className="font-display text-lg font-bold">{sample.nickname}</p>
                    <p className="text-sm text-muted">{sample.officialName}</p>
                  </div>
                </div>
                <Button onClick={() => pick(d)} data-testid={`difficulty-${d}`} className="w-full">
                  Fly as {cfg.label} →
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
