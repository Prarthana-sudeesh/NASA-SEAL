import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import { getPlanet } from '../../data/planets.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { useCollections, useMyCollection } from '../../store/collectionStore.ts';
import { useGame } from '../../store/gameStore.ts';
import { BADGES, type BadgeId } from '../collection.ts';
import { DIFFICULTIES, SLOT_LABELS, SLOT_ORDER, getPart, type SlotKind } from '../config.ts';
import { outsidePressure } from '../engine.ts';
import {
  PUZZLE_ROUNDS,
  PUZZLE_SECONDS,
  makePuzzle,
  puzzlePoints,
  seededRandom,
  type Puzzle as P,
} from '../puzzles.ts';
import { sfx } from '../sound.ts';
import { BigButton, TopMenu } from '../ui/Hud.tsx';
import { RocketArt } from '../ui/RocketArt.tsx';
import { Blueprint, Stage } from '../ui/Scenery.tsx';

function newSet(planetIds: string[], seed: number): P[] {
  const rand = seededRandom(seed);
  const out: P[] = [];
  for (let i = 0; out.length < PUZZLE_ROUNDS && i < PUZZLE_ROUNDS * 4; i++) {
    const planet = getPlanet(planetIds[Math.floor(rand() * planetIds.length)]);
    const p = planet && makePuzzle(planet, rand);
    if (p) out.push(p);
  }
  return out;
}

interface Answer {
  pick: SlotKind | null;
  points: number;
}

/** Fix my rocket: spot the one wrong part before time runs out. */
export function Puzzle() {
  const { difficulty, go, player } = useGame();
  const addPuzzle = useCollections((s) => s.addPuzzle);
  const best = useMyCollection().puzzleBest;
  const seconds = PUZZLE_SECONDS[difficulty];
  const reduced = useReducedMotion();
  const [seed, setSeed] = useState(() => Date.now());
  const [set, setSet] = useState<P[]>(() => newSet(DIFFICULTIES[difficulty].planets, seed));
  const [round, setRound] = useState(0);
  const [left, setLeft] = useState<number>(seconds);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [earned, setEarned] = useState<BadgeId[] | null>(null);

  const puzzle = set[round];
  const answer = answers[round];
  const finished = round >= set.length;
  const total = answers.reduce((s, a) => s + a.points, 0);
  const correct = answers.filter((a, i) => a.pick === set[i]?.faulty).length;

  const choose = (pick: SlotKind | null) => {
    if (!puzzle || answer) return;
    const ok = pick === puzzle.faulty;
    sfx(ok ? 'correct' : 'wrong');
    const points = puzzlePoints(ok, left);
    setAnswers((a) => [...a, { pick, points }]);
    announce(
      ok
        ? `Correct! The ${SLOT_LABELS[puzzle.faulty].toLowerCase()} was wrong. +${points} points.`
        : `Not quite. It was the ${SLOT_LABELS[puzzle.faulty].toLowerCase()}.`,
    );
  };

  useEffect(() => {
    if (finished || answer) return;
    if (left <= 0) {
      choose(null);
      return;
    }
    const t = window.setTimeout(() => {
      if (left <= 5) sfx('tick');
      setLeft((s) => s - 1);
    }, 1000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, finished, answer]);

  const next = () => {
    const n = round + 1;
    setRound(n);
    setLeft(seconds);
    if (n >= set.length) {
      const all = [...answers];
      const pts = all.reduce((s, a) => s + a.points, 0);
      const right = all.filter((a, i) => a.pick === set[i]?.faulty).length;
      setEarned(addPuzzle(player?.username ?? '', pts, right, set.length));
      sfx(right >= set.length ? 'fanfare' : 'coin');
    }
  };
  const again = () => {
    const s = Date.now();
    setSeed(s);
    setSet(newSet(DIFFICULTIES[difficulty].planets, s + seed));
    setRound(0);
    setLeft(seconds);
    setAnswers([]);
    setEarned(null);
  };

  const planet = puzzle ? getPlanet(puzzle.planetId) : undefined;
  return (
    <Stage>
      <Blueprint>
        <TopMenu />
        <div className="absolute left-[1.5%] top-[2%] z-10 flex items-center gap-3">
          <button
            type="button"
            className="tool-btn px-3 py-1 text-[12px]"
            onClick={() => go('mission')}
          >
            ◂ Mission control
          </button>
          <h1 className="title-font outlined text-[clamp(16px,2.6vw,36px)]">🔧 FIX MY ROCKET</h1>
        </div>

        {set.length === 0 ? (
          <p className="outlined absolute inset-x-0 top-1/2 text-center text-lg">
            No puzzles could be made for this difficulty. Try another one.
          </p>
        ) : finished ? (
          <motion.section
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute left-1/2 top-1/2 flex w-[min(90%,520px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl border-2 border-white/30 bg-[#0b2a52]/90 p-6 text-center text-white"
            aria-labelledby="puzzle-done"
          >
            <h2 id="puzzle-done" className="title-font text-[clamp(18px,2.6vw,34px)]">
              {correct === set.length ? 'PERFECT REPAIR CREW!' : 'WORKSHOP CLOSED'}
            </h2>
            <p className="text-[clamp(12px,1.3vw,18px)]">
              You fixed <strong>{correct}</strong> of {set.length} rockets.
            </p>
            <p className="title-font text-[clamp(22px,3.4vw,46px)] text-[#ffb35a]">{total} pts</p>
            <p className="text-[#9fd8e6]">Your best: {Math.max(best, total)}</p>
            {earned && earned.length > 0 && (
              <p className="rounded-lg bg-ok/20 px-3 py-1 text-ok">
                🏅 Badge unlocked:{' '}
                {earned.map((b) => BADGES.find((x) => x.id === b)?.name).join(', ')}
              </p>
            )}
            <div className="flex gap-2">
              <BigButton onClick={again} className="text-[clamp(14px,1.8vw,24px)]">
                PLAY AGAIN
              </BigButton>
              <button type="button" className="tool-btn px-3 py-1" onClick={() => go('mission')}>
                Mission control
              </button>
            </div>
          </motion.section>
        ) : (
          puzzle &&
          planet && (
            <>
              {/* Status bar */}
              <div className="outlined absolute left-1/2 top-[12%] flex -translate-x-1/2 items-center gap-4 whitespace-nowrap text-[clamp(11px,1.3vw,18px)] font-bold">
                <span>
                  Rocket {round + 1}/{set.length}
                </span>
                <span
                  role="timer"
                  aria-label={`${left} seconds left`}
                  className={`title-font rounded-full border-4 px-3 tabular-nums ${left <= 5 ? 'border-[#ff5a4a] text-[#ff8a7a]' : 'border-[#ffe24a] text-[#ffe24a]'}`}
                >
                  {answer ? '—' : left}
                </span>
                <span>Score {total}</span>
              </div>

              {/* Planet + dials */}
              <motion.section
                key={`card-${round}`}
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                aria-label="Mission"
                className="absolute left-[2%] top-[22%] z-10 flex w-[26%] flex-col gap-2 rounded-lg border-2 border-white/30 bg-[#0b2a52]/85 p-[1.2%] text-[clamp(9px,1vw,14px)] text-white"
              >
                <div className="flex items-center gap-2">
                  <PlanetVisual planet={planet} size={48} decorative />
                  <div className="title-font text-[clamp(12px,1.4vw,20px)]">{planet.name}</div>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-2">
                  <dt className="text-[#b9d8ff]">Distance</dt>
                  <dd className="text-right">{planet.distanceLy.value} ly</dd>
                  <dt className="text-[#b9d8ff]">Temperature</dt>
                  <dd className="text-right">{Math.round(planet.eqTempK.value)} K</dd>
                  <dt className="text-[#b9d8ff]">Gravity</dt>
                  <dd className="text-right">{planet.surfaceGravityG.value} g</dd>
                  <dt className="text-[#b9d8ff]">Outside pressure</dt>
                  <dd className="text-right">{outsidePressure(planet)} atm</dd>
                </dl>
                <p className="border-t border-white/20 pt-1 text-[#9fd8e6]">
                  Dials: fuel {puzzle.dials.fuel}% · thrust {puzzle.dials.thrust}% · seal{' '}
                  {puzzle.dials.pressure} atm
                </p>
                <p className="text-[#ffe24a]">
                  This rocket will fail. ONE part is wrong. Which one?
                </p>
              </motion.section>

              {/* Rocket */}
              <div className="absolute bottom-[6%] left-1/2 h-[66%] -translate-x-1/2">
                <motion.div
                  key={`rocket-${round}-${answer ? 'a' : 'q'}`}
                  className="h-full"
                  initial={answer ? false : { y: -40, opacity: 0 }}
                  animate={
                    !answer
                      ? { y: 0, opacity: 1 }
                      : reduced
                        ? {}
                        : answer.pick === puzzle.faulty
                          ? { y: [0, -24, 0, -10, 0], scale: [1, 1.04, 1] }
                          : { x: [0, -14, 14, -10, 10, -4, 0], rotate: [0, -3, 3, -2, 2, 0] }
                  }
                  transition={
                    answer ? { duration: 0.7 } : { type: 'spring', stiffness: 140, damping: 14 }
                  }
                >
                  <RocketArt
                    build={puzzle.build}
                    height={1000}
                    highlight={answer ? puzzle.faulty : null}
                    className="h-full w-auto"
                  />
                </motion.div>
                {answer?.pick === puzzle.faulty && !reduced && (
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, i) => (
                      <motion.span
                        key={i}
                        className="absolute left-1/2 top-1/2 text-[clamp(14px,1.8vw,26px)]"
                        initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                        animate={{
                          x: Math.cos((i / 10) * Math.PI * 2) * 160,
                          y: Math.sin((i / 10) * Math.PI * 2) * 160,
                          scale: [0, 1.3, 0.8],
                          opacity: [1, 1, 0],
                        }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      >
                        {i % 2 ? '✨' : '⭐'}
                      </motion.span>
                    ))}
                  </div>
                )}
              </div>

              {/* Parts */}
              <section
                aria-label="Rocket parts"
                className="absolute right-[2%] top-[22%] z-10 flex w-[28%] flex-col gap-[0.5vw]"
              >
                {SLOT_ORDER.map((k, i) => {
                  const part = getPart(puzzle.build[k]);
                  const isFault = k === puzzle.faulty;
                  const picked = answer?.pick === k;
                  const cls = !answer
                    ? 'border-white/40 bg-[#14417a] hover:border-[#ffe24a]'
                    : isFault
                      ? 'border-ok bg-ok/25'
                      : picked
                        ? 'border-bad bg-bad/25'
                        : 'border-white/10 bg-[#14417a]/50 opacity-60';
                  return (
                    <motion.button
                      key={`${round}-${k}`}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{
                        delay: 0.15 + i * 0.07,
                        type: 'spring',
                        stiffness: 260,
                        damping: 22,
                      }}
                      type="button"
                      data-sfx="none"
                      disabled={!!answer}
                      whileHover={answer ? undefined : { x: -4 }}
                      whileTap={answer ? undefined : { scale: 0.96 }}
                      onClick={() => choose(k)}
                      className={`flex flex-col rounded-lg border-2 px-3 py-[0.5vw] text-left text-white ${cls}`}
                    >
                      <span className="text-[clamp(8px,0.85vw,11px)] text-[#b9d8ff]">
                        {SLOT_LABELS[k]}
                      </span>
                      <span className="text-[clamp(10px,1.1vw,15px)] font-bold">
                        {answer && isFault ? '✓ ' : answer && picked ? '✕ ' : ''}
                        {part?.name}
                        {k === 'payload' && puzzle.build.crew ? ` + ${puzzle.build.crew} crew` : ''}
                      </span>
                    </motion.button>
                  );
                })}
              </section>

              {answer && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="absolute bottom-[4%] left-[2%] z-20 flex w-[min(44%,520px)] flex-col gap-2 rounded-xl border-2 border-white/30 bg-[#0b0f1e]/90 p-3 text-[clamp(10px,1.05vw,14px)] text-white"
                  role="status"
                >
                  <strong className={answer.pick === puzzle.faulty ? 'text-ok' : 'text-[#ff8a8a]'}>
                    {answer.pick === puzzle.faulty
                      ? `Correct! +${answer.points} points.`
                      : answer.pick === null
                        ? 'Time’s up!'
                        : 'Not that one.'}
                  </strong>
                  <span>
                    The {SLOT_LABELS[puzzle.faulty].toLowerCase()} was wrong:{' '}
                    {puzzle.failed
                      .map((c) => `${c.label.toLowerCase()} is ${c.actual} but needs ${c.needed}`)
                      .join('; ')}
                    . Swap it for the <strong>{getPart(puzzle.fix)?.name}</strong>.
                  </span>
                  <BigButton onClick={next} className="self-end text-[clamp(14px,1.6vw,22px)]">
                    {round + 1 >= set.length ? 'RESULTS ▸' : 'NEXT ROCKET ▸'}
                  </BigButton>
                </motion.div>
              )}
            </>
          )
        )}
      </Blueprint>
    </Stage>
  );
}
