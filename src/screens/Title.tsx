import { motion } from 'motion/react';
import { useGame } from '../store/game.ts';
import { startMusic, unlockAudio } from '../audio/audio.ts';
import { Button } from '../ui/Button.tsx';
import { CassFace } from '../ui/Cass.tsx';
import { useCalm } from '../store/settings.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';

function Wordmark() {
  const calm = useCalm();
  const letters = 'STARBOUND'.split('');
  return (
    <h1 tabIndex={-1} className="select-none text-center font-display font-bold leading-none outline-none" aria-label="STARBOUND: Exoplanet Rocket Lab">
      <span className="flex justify-center" aria-hidden="true">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            className="inline-block text-[clamp(3.2rem,12vw,9.5rem)] text-cream"
            style={{ WebkitTextStroke: '3px #05070F', textShadow: '6px 6px 0 #E8642C, 10px 10px 0 #05070F', rotate: ((i * 37) % 7) - 3 }}
            initial={calm ? false : { y: -80, opacity: 0 }}
            animate={calm ? undefined : { y: [0, -6, 0], opacity: 1 }}
            transition={calm ? undefined : { y: { duration: 2.6, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }, opacity: { duration: 0.3, delay: i * 0.05 } }}
          >
            {l}
          </motion.span>
        ))}
      </span>
      <span className="mt-4 inline-block -rotate-1 rounded-2xl border-[3px] border-ink bg-magenta px-5 py-1 text-[clamp(1.1rem,3vw,2rem)] text-cream shadow-[4px_4px_0_#000]" aria-hidden="true">
        Exoplanet Rocket Lab
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
