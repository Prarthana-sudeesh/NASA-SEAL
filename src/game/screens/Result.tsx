import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getLeaderboardService } from '../../services/leaderboard/index.ts';
import { useSettings } from '../../store/settingsStore.ts';
import { getPlanet } from '../../data/planets.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { currentAttempt, useGame } from '../../store/gameStore.ts';
import { DIFFICULTIES } from '../config.ts';
import { useShake } from '../ui/useShake.ts';
import { STAGE_LABELS } from '../engine.ts';
import { BigButton, TopMenu } from '../ui/Hud.tsx';
import { Astronaut, Scientist, SpeechBubble } from '../ui/Pixel.tsx';
import { CommandCenter, Hologram, Stage, WallScreen } from '../ui/Scenery.tsx';
import { sfx } from '../sound.ts';
import { useCollections } from '../../store/collectionStore.ts';
import { BADGES } from '../collection.ts';
import { crewLine } from '../crew.ts';
import { handled } from '../events.ts';

function CountUp({ to }: { to: number }) {
  const reduced = useReducedMotion();
  const v = useMotionValue(reduced ? to : 0);
  const rounded = useTransform(v, (x) => Math.round(x));
  useEffect(() => {
    if (reduced) return;
    let last = 0;
    const c = animate(v, to, {
      duration: 1.4,
      ease: 'easeOut',
      onUpdate: (x) => {
        if (x - last >= Math.max(25, to / 18)) {
          last = x;
          sfx('coin', 60);
        }
      },
    });
    return () => c.stop();
  }, [to, v, reduced]);
  return <motion.span>{rounded}</motion.span>;
}

export function Result() {
  const { run, player, next, go, markPosted, missionsFlown } = useGame();
  const addMyEntry = useSettings((s) => s.addMyEntry);
  const [post, setPost] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [postError, setPostError] = useState('');
  const posting = useRef<string | null>(null);
  const { controls: cam, shake } = useShake();
  const attempt = currentAttempt(run);
  const success = attempt?.result.success;
  useEffect(() => {
    if (success === undefined) return;
    if (!success) {
      sfx('sad');
      sfx('impact');
      shake(12, 0.7);
      return;
    }
    sfx('fanfare');
    const pops = Array.from({ length: 8 }, (_, i) =>
      window.setTimeout(() => sfx('pop', 0), 300 + i * 140 + Math.random() * 80),
    );
    return () => pops.forEach((t) => window.clearTimeout(t));
  }, [success, attempt?.n, shake]);
  const planet = getPlanet(attempt?.planetId);
  const addFlight = useCollections((s) => s.addFlight);
  const unlocks = useCollections((s) => s.lastUnlocks);
  const key = run && attempt ? `${run.id}:${attempt.n}` : null;
  useEffect(() => {
    if (!run || !attempt || !planet || !key) return;
    addFlight(player?.username ?? '', {
      key,
      planet,
      difficulty: run.difficulty,
      crew: attempt.build.crew,
      result: attempt.result,
      quizCorrect: !!attempt.quiz?.correct,
      hazards: (attempt.events ?? []).map((e) => ({ id: e.id, handled: handled(e) })),
      teamSize: attempt.team?.length ?? 1,
    });
  }, [key, run, attempt, planet, addFlight, player]);

  // Every mission goes on the leaderboard, labelled with its planet and difficulty.
  const postScore = useCallback(async () => {
    if (!run || !attempt || !planet || !player) return;
    setPost('saving');
    try {
      const svc = await getLeaderboardService();
      const e = await svc.submit({
        name: player.username,
        difficulty: run.difficulty,
        average: attempt.result.total,
        best: attempt.result.total,
        planetsVisited: [planet.name],
        planet: planet.name,
        success: attempt.result.success,
        date: new Date().toISOString(),
      });
      markPosted(attempt.n, e.id);
      addMyEntry(e.id);
      setPost('saved');
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Couldn’t post the score.');
      setPost('error');
    }
  }, [run, attempt, planet, player, markPosted, addMyEntry]);
  useEffect(() => {
    if (!key || !attempt || posting.current === key) return;
    posting.current = key;
    if (attempt.postedEntryId) setPost('saved');
    else void postScore();
  }, [key, attempt, postScore]);
  if (!run || !attempt || !planet) {
    return (
      <div className="p-6 text-center">
        <button type="button" className="big-btn" onClick={() => go('mission')}>
          Mission control
        </button>
      </div>
    );
  }
  const r = attempt.result;
  const mine = unlocks && unlocks.key === key ? unlocks : null;
  const failId = r.checks.find((c) => !c.ok)?.id ?? null;
  const reaction = crewLine(
    attempt.build.crew,
    r.success ? 'home' : 'return',
    r.success ? null : failId,
  );
  const chips = [
    ...(mine?.postcard ? [`💌 New postcard from ${planet.name}!`] : []),
    ...(mine?.photo ? ['📸 Crew photo added to your album'] : []),
    ...(mine?.badges ?? []).map((b) => {
      const info = BADGES.find((x) => x.id === b);
      return `${info?.icon} Badge: ${info?.name}`;
    }),
  ];
  return (
    <Stage>
      <motion.div className="absolute inset-0" animate={cam}>
        <CommandCenter theme={run.difficulty}>
          <Hologram planet={planet} size="16%" />
          <TopMenu />
          {r.success && (
            <div
              className="pointer-events-none absolute inset-0 overflow-hidden"
              aria-hidden="true"
            >
              {Array.from({ length: 40 }, (_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-2 w-1.5"
                  style={{
                    left: `${(i * 23) % 100}%`,
                    background: ['#ffb35a', '#5ff3ff', '#3ddc84', '#ffe24a', '#ff6b6b'][i % 5],
                  }}
                  initial={{ top: '-5%', rotate: 0 }}
                  animate={{ top: '105%', rotate: 720 }}
                  transition={{
                    duration: 3 + (i % 5) * 0.5,
                    delay: (i % 10) * 0.15,
                    ease: 'easeIn',
                  }}
                />
              ))}
            </div>
          )}
          <motion.h1
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 160, damping: 12 }}
            className={`title-font outlined absolute left-1/2 top-[3%] -translate-x-1/2 whitespace-nowrap text-[clamp(22px,4vw,56px)] ${r.success ? 'text-ok' : 'text-[#ff8a8a]'}`}
          >
            {r.success ? 'MISSION SUCCESS!' : 'MISSION FAILED'}
          </motion.h1>
          <p className="outlined absolute left-1/2 top-[14%] -translate-x-1/2 whitespace-nowrap text-[clamp(10px,1.2vw,16px)] font-bold">
            {planet.name} · Mission #{attempt.total ?? attempt.n} ·{' '}
            {DIFFICULTIES[run.difficulty].label}
            {!r.success && ` · Failed at: ${STAGE_LABELS[r.failedAt!]}`}
          </p>

          <div className="absolute left-1/2 top-[19%] z-10 flex w-[34%] -translate-x-1/2 flex-col items-center gap-1">
            <p className="outlined text-center text-[clamp(9px,1vw,14px)] italic">
              {reaction.probe ? '🤖' : '👩‍🚀'} {reaction.speaker}: “{reaction.text}”
            </p>
            <p
              aria-live="polite"
              className={`outlined text-center text-[clamp(9px,1vw,13px)] font-bold ${post === 'error' ? 'text-[#ff8a8a]' : 'text-[#ffe24a]'}`}
            >
              {post === 'saving' && 'Posting to the leaderboard…'}
              {post === 'saved' && (
                <button type="button" className="underline" onClick={() => go('leaderboard')}>
                  🏆 Posted to the leaderboard: {r.total} on {planet.name} (
                  {DIFFICULTIES[run.difficulty].label})
                </button>
              )}
              {post === 'error' && (
                <>
                  ✕ {postError}{' '}
                  <button type="button" className="underline" onClick={() => void postScore()}>
                    Retry
                  </button>
                </>
              )}
            </p>
            {chips.map((c, i) => (
              <motion.button
                key={c}
                type="button"
                onClick={() => go('collection')}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.25, type: 'spring', stiffness: 260, damping: 14 }}
                onAnimationStart={() =>
                  sfx(c.startsWith('💌') ? 'stamp' : c.includes('Badge') ? 'badge' : 'pop', 0)
                }
                className="rounded-full border-2 border-[#0b0f1e] bg-[#ffe24a] px-3 py-0.5 text-[clamp(9px,1vw,13px)] font-bold text-[#0b0f1e] shadow-[0_3px_0_#0b0f1e]"
              >
                {c}
              </motion.button>
            ))}
          </div>

          <WallScreen title="Score report" className="right-[2%] top-[20%] h-[56%] w-[30%]">
            <div className="flex h-full flex-col gap-[2%] text-[clamp(8px,0.95vw,13px)]">
              {r.breakdown.map((b, i) => (
                <div key={b.label}>
                  <div className="flex justify-between">
                    <span>{b.label}</span>
                    <span className="font-bold tabular-nums">
                      {b.points}/{b.max}
                    </span>
                  </div>
                  <div className="h-[0.6vw] min-h-1.5 overflow-hidden rounded bg-[#0b2f4d]">
                    <motion.div
                      className={`h-full ${b.points / b.max >= 0.75 ? 'bg-ok' : b.points / b.max >= 0.35 ? 'bg-warn' : 'bg-bad'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(b.points / b.max) * 100}%` }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-auto border-t border-[#5ff3ff]/30 pt-[2%]">
                <div className="flex justify-between">
                  <span>Base score</span>
                  <span className="tabular-nums">{r.base}</span>
                </div>
                {attempt.build.crew > 0 && (
                  <div
                    className={`flex justify-between ${r.crewAdjustment >= 0 ? 'text-ok' : 'text-bad'}`}
                  >
                    <span>Astronauts ({attempt.build.crew})</span>
                    <span className="tabular-nums">
                      {r.crewAdjustment >= 0 ? '+' : ''}
                      {r.crewAdjustment}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">Total</span>
                  <span className="title-font text-[clamp(18px,2.6vw,36px)] text-[#ffb35a] tabular-nums">
                    <CountUp to={r.total} />
                  </span>
                </div>
                <div className="text-right text-[#9fd8e6] tabular-nums">
                  Missions flown: {missionsFlown}
                </div>
              </div>
            </div>
          </WallScreen>

          <WallScreen title="Flight checks" className="left-[2%] top-[20%] h-[40%] w-[28%]">
            <ul className="flex flex-col gap-[3%] text-[clamp(8px,0.9vw,12px)]">
              {r.checks.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <span
                    className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${c.ok ? 'bg-ok text-[#0b0f1e]' : 'bg-bad text-white'}`}
                    aria-hidden="true"
                  >
                    {c.ok ? '✓' : '✕'}
                  </span>
                  <span className="flex-1">
                    {c.label}
                    <span className="sr-only">{c.ok ? ': pass' : ': fail'}</span>
                  </span>
                  <span className="tabular-nums text-[#9fd8e6]">
                    {c.actual} <span className="opacity-70">({c.needed})</span>
                  </span>
                </li>
              ))}
            </ul>
          </WallScreen>

          <div className="absolute bottom-[5%] left-[2%] w-[7%]">
            <Astronaut name={player?.username} enter={false} />
          </div>
          <div className="absolute bottom-[5%] left-[10%] w-[6.5%]">
            <Scientist name="Dr. Hart" enter={false} />
          </div>
          <div className="absolute bottom-[32%] left-[8%] z-10 max-w-[44%]">
            <SpeechBubble speaker="Dr. Hart · Debrief" text={r.explanation.join(' ')} />
          </div>

          <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2">
            <BigButton onClick={next} className="text-[clamp(16px,2.6vw,36px)]">
              NEXT MISSION ▸
            </BigButton>
          </div>
        </CommandCenter>
      </motion.div>
    </Stage>
  );
}
