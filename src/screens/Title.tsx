import { useGame } from '../store/game.ts';
import { startMusic, unlockAudio } from '../audio/audio.ts';
import { Button } from '../ui/Button.tsx';
import { CassFace } from '../ui/Cass.tsx';
import { DIFFICULTIES } from '../engine/difficulty.ts';

function Word({ text, delay, fill, shadow }: { text: string; delay: number; fill: string; shadow: string }) {
  return (
    <span className="flex justify-center" aria-hidden="true">
      {text.split('').map((l, i) => (
        <span
          key={i}
          className="letter text-[clamp(2.6rem,10.5vw,8.5rem)]"
          style={
            {
              color: fill,
              WebkitTextStroke: '3px #05070F',
              textShadow: `5px 5px 0 ${shadow}, 9px 9px 0 #05070F`,
              '--r': `${((i * 37 + delay * 11) % 7) - 3}deg`,
              animationDelay: `${(delay + i) * 0.05}s, ${(delay + i) * 0.12}s`,
            } as React.CSSProperties
          }
        >
          {l}
        </span>
      ))}
    </span>
  );
}

function Wordmark() {
  return (
    <h1 tabIndex={-1} className="select-none text-center font-display font-bold leading-[0.95] outline-none" aria-label="Orbital Uprise">
      <Word text="ORBITAL" delay={0} fill="#FFF6E5" shadow="#E8642C" />
      <Word text="UPRISE" delay={7} fill="#FFC94A" shadow="#E040A0" />
      <span className="mt-5 inline-block -rotate-1 rounded-2xl border-[3px] border-ink bg-magenta px-5 py-1 text-[clamp(1rem,2.6vw,1.7rem)] text-cream shadow-[4px_4px_0_#000]" aria-hidden="true">
        An exoplanet rocket lab
      </span>
    </h1>
  );
}

export function Title() {
  const { go, briefingDone, difficulty, attempts, open } = useGame();
  const resume = difficulty && attempts.length > 0 && attempts.length < 10;
  const start = () => {
    unlockAudio();
    startMusic();
    go(briefingDone ? 'difficulty' : 'briefing');
  };
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-10 text-center">
      <Wordmark />
      <p className="max-w-2xl text-xl text-muted">
        You’ve just been promoted to aerospace engineer. Design a rocket, fly it to a real planet from NASA’s catalogue, and bring it home.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button size="lg" onClick={start} data-testid="start">
          🚀 Start mission
        </Button>
        {resume && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              unlockAudio();
              startMusic();
              go('progress');
            }}
          >
            Resume run ({DIFFICULTIES[difficulty].label}, {attempts.length}/10)
          </Button>
        )}
        <Button size="lg" variant="magenta" onClick={() => open('leaderboard')}>
          🏆 Leaderboard
        </Button>
      </div>
      <div className="flex items-center gap-3 text-muted">
        <CassFace size={56} />
        <span>CAPCOM Cass is standing by.</span>
      </div>
      <p className="max-w-xl text-sm text-muted">
        Planet data: NASA Exoplanet Archive. A NASA Space Apps Challenge entry; not an official NASA product.
      </p>
    </div>
  );
}
