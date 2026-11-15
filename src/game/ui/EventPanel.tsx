import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { SCORING } from '../config.ts';
import { HAZARDS, questionOf, type FlightEvent } from '../events.ts';
import { sfx } from '../sound.ts';

interface Props {
  event: FlightEvent;
  /** "Hazard 2 of 3" label. */
  counter: string | null;
  seconds: number;
  /** Who must decide, e.g. "📡 Sam (Comms Officer)", in team mode. */
  who: string | null;
  onAnswer: (choice: number | null) => void;
  onContinue: () => void;
}

/** Mid-flight hazard: answer before the timer runs out. */
export function EventPanel({ event, counter, seconds, who, onAnswer, onContinue }: Props) {
  const reduced = useReducedMotion();
  const hazard = HAZARDS[event.id];
  const q = questionOf(event);
  const [left, setLeft] = useState(seconds);
  const decided = event.resolved;
  const fired = useRef(false);

  useEffect(() => {
    announce(`${hazard.title} ${hazard.alert} ${q.question} You have ${seconds} seconds.`);
  }, [hazard, q, seconds]);

  useEffect(() => {
    if (decided) return;
    if (left <= 0) {
      if (!fired.current) {
        fired.current = true;
        sfx('wrong');
        onAnswer(null);
      }
      return;
    }
    const t = window.setTimeout(() => {
      if (left <= 4) sfx('tick');
      setLeft((s) => s - 1);
    }, 1000);
    return () => window.clearTimeout(t);
  }, [left, decided, onAnswer]);

  const correct = event.choice === q.answer;
  return (
    <motion.section
      role="alertdialog"
      aria-labelledby="event-title"
      aria-describedby="event-alert"
      initial={{ scale: 0.6, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="absolute left-1/2 top-1/2 z-30 flex max-h-[92%] w-[min(92%,580px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-[0.6vw] overflow-y-auto rounded-2xl border-4 border-[#ff5a4a] bg-[#1a0b14]/92 p-[1.3vw] text-white shadow-[0_0_40px_rgba(255,90,74,0.6)] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="event-title"
          className="title-font flex items-center gap-2 text-[clamp(15px,2.1vw,28px)] text-[#ff8a7a]"
        >
          <motion.span
            aria-hidden="true"
            animate={
              reduced || decided ? undefined : { scale: [1, 1.25, 1], rotate: [0, -8, 8, 0] }
            }
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            {hazard.icon}
          </motion.span>
          {hazard.title}
        </h2>
        <div className="flex items-center gap-2">
          {counter && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[clamp(8px,0.85vw,11px)] font-bold">
              {counter}
            </span>
          )}
          {!decided && (
            <div
              className={`title-font grid h-[clamp(34px,3.8vw,52px)] w-[clamp(34px,3.8vw,52px)] place-items-center rounded-full border-4 text-[clamp(14px,1.7vw,22px)] tabular-nums ${left <= 4 ? 'border-[#ff5a4a] text-[#ff5a4a]' : 'border-[#ffe24a] text-[#ffe24a]'}`}
              aria-label={`${left} seconds left`}
              role="timer"
            >
              {left}
            </div>
          )}
        </div>
      </div>
      <p id="event-alert" className="text-[clamp(10px,1.1vw,15px)]">
        {hazard.alert}
      </p>
      <p className="text-[clamp(11px,1.2vw,16px)] font-bold">{q.question}</p>
      <p className="text-[clamp(9px,0.95vw,13px)] text-[#ffe24a]">
        {who ? `${who}, it’s your call!` : 'Quick, crew!'} (+{SCORING.emergency} points)
      </p>
      <ul className="flex flex-col gap-[0.45vw]">
        {event.order.map((i, pos) => {
          const opt = q.options[i];
          const isAnswer = i === q.answer;
          const picked = i === event.choice;
          const cls = !decided
            ? 'border-[#ff8a7a]/60 bg-[#3a1424] hover:border-[#ffe24a]'
            : isAnswer
              ? 'border-ok bg-ok/25'
              : picked
                ? 'border-bad bg-bad/25'
                : 'border-white/10 opacity-50';
          return (
            <li key={opt}>
              <motion.button
                type="button"
                data-sfx="none"
                disabled={decided}
                autoFocus={pos === 0}
                initial={{ x: 30, opacity: 0 }}
                animate={
                  decided && picked && !isAnswer && !reduced
                    ? { x: [0, -8, 8, -5, 5, 0], opacity: 1 }
                    : { x: 0, opacity: decided && !isAnswer && !picked ? 0.5 : 1 }
                }
                transition={{ delay: decided ? 0 : 0.15 + pos * 0.06 }}
                whileHover={decided ? undefined : { x: 4 }}
                whileTap={decided ? undefined : { scale: 0.97 }}
                onClick={() => {
                  sfx(i === q.answer ? 'correct' : 'wrong');
                  onAnswer(i);
                }}
                className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-[0.5vw] text-left text-[clamp(10px,1vw,14px)] ${cls}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/40 font-bold">
                  {decided && isAnswer
                    ? '✓'
                    : decided && picked
                      ? '✕'
                      : String.fromCharCode(65 + pos)}
                </span>
                {opt}
              </motion.button>
            </li>
          );
        })}
      </ul>
      {decided && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
          role="status"
        >
          <p
            className={`rounded-lg p-2 text-[clamp(10px,1vw,14px)] ${correct ? 'bg-ok/20 text-ok' : 'bg-bad/20 text-[#ffb0b0]'}`}
          >
            <strong>
              {correct
                ? `Great call! +${SCORING.emergency} points. `
                : event.choice === null
                  ? 'Too slow! '
                  : 'Not quite. '}
            </strong>
            {correct ? hazard.good : hazard.bad}
          </p>
          <p className="rounded-lg bg-[#0b2a52]/70 p-2 text-[clamp(10px,1vw,14px)] text-[#d8f1ff]">
            <strong className="text-[#9fdfff]">🔭 Did you know? </strong>
            {q.explain}
            {q.source && (
              <>
                {' '}
                <a
                  href={q.source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap text-[#ffe24a] underline"
                >
                  Source: {q.source.name} ↗
                </a>
              </>
            )}
          </p>
          <button
            type="button"
            className="big-btn self-center text-[clamp(14px,1.7vw,22px)]"
            onClick={onContinue}
            autoFocus
          >
            CONTINUE FLIGHT ▸
          </button>
        </motion.div>
      )}
    </motion.section>
  );
}
