import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { announce } from '../../components/LiveRegion.tsx';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { SCORING } from '../config.ts';
import type { MissionEvent } from '../events.ts';
import { sfx } from '../sound.ts';

interface Props {
  event: MissionEvent;
  seconds: number;
  /** Who must decide, e.g. "📡 Sam (Comms Officer)", in team mode. */
  who: string | null;
  /** The answer already given (null = timed out), or undefined while still deciding. */
  answered: number | null | undefined;
  onAnswer: (choice: number | null) => void;
  onContinue: () => void;
}

/** Mid-flight emergency: pick the right fix before the timer runs out. */
export function EventPanel({ event, seconds, who, answered, onAnswer, onContinue }: Props) {
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(seconds);
  const decided = answered !== undefined;
  const fired = useRef(false);

  useEffect(() => {
    sfx('alarm');
    announce(`Emergency! ${event.title} ${event.alert} You have ${seconds} seconds.`);
  }, [event, seconds]);

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

  const correct = answered === event.answer;
  return (
    <motion.section
      role="alertdialog"
      aria-labelledby="event-title"
      aria-describedby="event-alert"
      initial={{ scale: 0.6, opacity: 0, y: 30 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="absolute left-1/2 top-1/2 z-30 flex w-[min(92%,560px)] -translate-x-1/2 -translate-y-1/2 flex-col gap-[0.8vw] rounded-2xl border-4 border-[#ff5a4a] bg-[#1a0b14]/95 p-[1.4vw] text-white shadow-[0_0_40px_rgba(255,90,74,0.6)]"
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="event-title"
          className="title-font flex items-center gap-2 text-[clamp(16px,2.2vw,30px)] text-[#ff8a7a]"
        >
          <motion.span
            aria-hidden="true"
            animate={reduced || decided ? undefined : { scale: [1, 1.25, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
          >
            {event.icon}
          </motion.span>
          {event.title}
        </h2>
        {!decided && (
          <div
            className={`title-font grid h-[clamp(36px,4vw,56px)] w-[clamp(36px,4vw,56px)] place-items-center rounded-full border-4 text-[clamp(14px,1.8vw,24px)] tabular-nums ${left <= 4 ? 'border-[#ff5a4a] text-[#ff5a4a]' : 'border-[#ffe24a] text-[#ffe24a]'}`}
            aria-label={`${left} seconds left`}
            role="timer"
          >
            {left}
          </div>
        )}
      </div>
      <p id="event-alert" className="text-[clamp(11px,1.2vw,16px)] font-semibold">
        {event.alert}
      </p>
      <p className="text-[clamp(10px,1vw,14px)] text-[#ffe24a]">
        {who ? `${who}, it’s your call!` : 'Quick! What should the crew do?'} (+
        {SCORING.emergency} points)
      </p>
      <ul className="flex flex-col gap-[0.5vw]">
        {event.options.map((opt, i) => {
          const isAnswer = i === event.answer;
          const picked = i === answered;
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
                autoFocus={i === 0}
                whileHover={decided ? undefined : { x: 4 }}
                whileTap={decided ? undefined : { scale: 0.97 }}
                onClick={() => {
                  sfx(i === event.answer ? 'correct' : 'wrong');
                  onAnswer(i);
                }}
                className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-[0.6vw] text-left text-[clamp(10px,1.05vw,15px)] ${cls}`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-black/40 font-bold">
                  {decided && isAnswer
                    ? '✓'
                    : decided && picked
                      ? '✕'
                      : String.fromCharCode(65 + i)}
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
            className={`rounded-lg p-2 text-[clamp(10px,1.05vw,14px)] ${correct ? 'bg-ok/20 text-ok' : 'bg-bad/20 text-[#ffb0b0]'}`}
          >
            <strong>
              {correct
                ? `Great call! +${SCORING.emergency} points. `
                : answered === null
                  ? 'Too slow! '
                  : 'Not the best fix. '}
            </strong>
            {correct ? event.good : event.bad} {event.explain}
          </p>
          <button
            type="button"
            className="big-btn self-center text-[clamp(14px,1.8vw,24px)]"
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
