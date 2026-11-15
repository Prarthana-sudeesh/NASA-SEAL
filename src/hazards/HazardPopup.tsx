// The pop-up that appears when the flight cutscene pauses for a space hazard: an alert, then either a
// quiz or a mini-game against the clock, then the result and a button to carry on flying.
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Difficulty } from '../data/types.ts';
import { useCalm } from '../store/settings.ts';
import { announce } from '../ui/bits.tsx';
import { HazardScene } from './HazardScene.tsx';
import { DodgeGame, ShieldGame, ThrustGame } from './MiniGames.tsx';
import { GAME_FOR, HAZARD_CONFIG, HAZARDS, intensity, secondsFor, type HazardResult, type PlannedHazard } from './hazards.ts';
import { gameSfx, hazardAlarm, hazardLoop } from './hazardSound.ts';

const GAMES = { dodge: DodgeGame, thrust: ThrustGame, shield: ShieldGame };

export function HazardPopup({
  hazard,
  difficulty,
  launch,
  index,
  total,
  onDone,
}: {
  hazard: PlannedHazard;
  difficulty: Difficulty;
  launch: number;
  index: number;
  total: number;
  onDone: (r: HazardResult) => void;
}) {
  const calm = useCalm();
  const info = HAZARDS[hazard.id];
  const cfg = HAZARD_CONFIG[difficulty];
  const seconds = secondsFor(difficulty, hazard.mode, launch);
  const [stage, setStage] = useState<'alert' | 'play' | 'result'>('alert');
  const [left, setLeft] = useState(seconds);
  const [won, setWon] = useState<boolean | null>(null);
  const [choice, setChoice] = useState<number | null>(null);
  const q = info.questions[hazard.q] ?? info.questions[0];
  const game = GAME_FOR[hazard.id];
  const Game = GAMES[game];
  const amount = game === 'dodge' ? cfg.lives : cfg.shieldHits;
  const continueRef = useRef<HTMLButtonElement>(null);

  // The hazard's own sound plays the whole time the pop-up is up.
  useEffect(() => {
    hazardAlarm();
    const stop = hazardLoop(hazard.id);
    announce(`${info.title} ${info.alert}`);
    return stop;
  }, [hazard.id, info.title, info.alert]);

  // Short alert, then the challenge starts.
  useEffect(() => {
    if (stage !== 'alert') return;
    const t = setTimeout(() => setStage('play'), calm ? 1200 : 2200);
    return () => clearTimeout(t);
  }, [stage, calm]);

  // Countdown clock.
  useEffect(() => {
    if (stage !== 'play') return;
    if (left <= 0) return;
    const t = setTimeout(() => {
      setLeft((x) => x - 1);
      if (left <= 4) gameSfx('tick');
    }, 1000);
    return () => clearTimeout(t);
  }, [stage, left]);

  const decided = useRef(false);
  const finish = useCallback(
    (w: boolean) => {
      if (decided.current) return;
      decided.current = true;
      gameSfx(w ? 'win' : 'lose');
      announce(w ? info.good : info.bad);
      setWon(w);
      setStage('result');
    },
    [info.good, info.bad],
  );

  // Quiz: running out of time counts as a miss. (Mini-games handle their own end of clock.)
  useEffect(() => {
    if (stage === 'play' && hazard.mode === 'quiz' && left <= 0) finish(false);
  }, [stage, left, hazard.mode, finish]);

  useEffect(() => {
    if (stage === 'result') continueRef.current?.focus();
  }, [stage]);

  const timeUp = left <= 0;
  const pct = Math.max(0, left / seconds);

  return (
    <div className="absolute inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-3" data-testid="hazard" data-hazard={hazard.id} data-mode={hazard.mode}>
      <HazardScene kind={info.scene} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hazard-title"
        className="sticker relative z-20 w-full max-w-2xl bg-panel p-4 md:p-6"
        initial={calm ? { opacity: 0 } : { scale: 0.6, opacity: 0, rotate: -3 }}
        animate={calm ? { opacity: 1 } : { scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      >
        <div className="mb-2 flex items-center justify-between gap-2 text-sm font-bold">
          <span className="rounded-full border-2 border-ink bg-danger px-3 py-0.5 text-ink">⚠ Hazard {index + 1} of {total}</span>
          <span className="rounded-full border-2 border-ink bg-plume px-3 py-0.5 text-ink">{hazard.mode === 'quiz' ? '🧠 QUIZ' : '🕹️ MINI-GAME'}</span>
        </div>
        <h2 id="hazard-title" className="font-display text-3xl font-bold text-plume md:text-4xl">
          <span aria-hidden="true">{info.icon}</span> {info.title}
        </h2>
        <p className="mt-1 text-cream">{info.alert}</p>
        {info.fiction && <p className="mt-1 text-xs font-bold uppercase text-magenta">Just for fun: made-up hazard</p>}

        {stage !== 'alert' && (
          <div className="mt-3 flex items-center gap-2" aria-label={`${Math.max(0, left)} seconds left`}>
            <span className="w-10 font-mono text-xl font-bold text-cream tnum">{Math.max(0, left)}s</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-ink bg-space">
              <div className="h-full transition-[width] duration-1000 ease-linear" style={{ width: `${(stage === 'result' ? (won ? pct : 0) : pct) * 100}%`, background: pct > 0.5 ? '#5BD982' : pct > 0.25 ? '#FFB547' : '#FF5A5F' }} />
            </div>
          </div>
        )}

        <div className="mt-4">
          {stage === 'alert' && (
            <p className="text-center font-display text-2xl text-cyan" role="status">
              Get ready…
            </p>
          )}

          {stage !== 'alert' && hazard.mode === 'quiz' && (
            <div>
              <p className="mb-3 text-lg font-bold text-cream">{q.question}</p>
              <div className="grid gap-2">
                {hazard.order.map((oi, k) => {
                  const picked = choice === oi;
                  const right = oi === q.answer;
                  const reveal = stage === 'result';
                  return (
                    <button
                      key={oi}
                      disabled={stage !== 'play'}
                      onClick={() => {
                        setChoice(oi);
                        finish(oi === q.answer);
                      }}
                      className={`btn px-4 py-2 text-left text-base ${reveal ? (right ? 'bg-go text-ink' : picked ? 'bg-danger text-ink' : 'bg-panel-2 text-muted') : 'bg-cream text-ink'}`}
                      data-testid={`hazard-option-${k}`}
                    >
                      {String.fromCharCode(65 + k)}. {q.options[oi]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {stage !== 'alert' && hazard.mode === 'game' && (
            <Game hazard={hazard.id} power={intensity(difficulty, launch)} active={stage === 'play' && !timeUp} amount={amount} onResult={finish} />
          )}
        </div>

        <AnimatePresence>
          {stage === 'result' && won !== null && (
            <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} role="status" data-testid="hazard-result" data-won={won}>
              <p className={`font-display text-2xl font-bold ${won ? 'text-go' : 'text-danger'}`}>
                {won ? '✅ Hazard cleared!' : timeUp ? '⏰ Out of time!' : '💥 Ouch!'}{' '}
                <span className="font-mono text-lg">{won ? `+${cfg.reward}` : `−${cfg.penalty}`} points</span>
              </p>
              <p className="mt-1 text-cream">{won ? info.good : info.bad}</p>
              {hazard.mode === 'quiz' && (
                <p className="mt-2 rounded-xl bg-space/70 p-2 text-sm text-muted">
                  {q.explain}
                  {q.source && (
                    <>
                      {' '}
                      <a className="text-cyan underline" href={q.source.url} target="_blank" rel="noreferrer">
                        {q.source.name}
                      </a>
                    </>
                  )}
                </p>
              )}
              <div className="mt-3 flex justify-end">
                <button ref={continueRef} className="btn bg-orange px-6 py-2.5 text-lg text-cream" onClick={() => onDone({ id: hazard.id, mode: hazard.mode, won })} data-testid="hazard-continue">
                  Continue flight ▶
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
