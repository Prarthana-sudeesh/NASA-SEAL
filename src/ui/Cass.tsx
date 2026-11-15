import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useCalm } from '../store/settings.ts';

export type CassMood = 'happy' | 'thinking' | 'worried' | 'cheer';

/** CAPCOM Cass: an original small round robot with a headset. */
export function CassFace({ mood = 'happy', size = 96 }: { mood?: CassMood; size?: number }) {
  const calm = useCalm();
  const eyes =
    mood === 'cheer' ? (
      <>
        <path d="M33 47 q6 -8 12 0" stroke="#0B1026" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M55 47 q6 -8 12 0" stroke="#0B1026" strokeWidth="4" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <ellipse cx="39" cy="46" rx="5" ry={mood === 'worried' ? 5 : 6.5} fill="#0B1026" />
        <ellipse cx="61" cy="46" rx="5" ry={mood === 'worried' ? 5 : 6.5} fill="#0B1026" />
        <circle cx="41" cy="43.5" r="1.8" fill="#FFF6E5" />
        <circle cx="63" cy="43.5" r="1.8" fill="#FFF6E5" />
      </>
    );
  const mouth =
    mood === 'worried' ? (
      <path d="M42 63 q8 -5 16 0" stroke="#0B1026" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    ) : mood === 'thinking' ? (
      <path d="M44 62 h12" stroke="#0B1026" strokeWidth="3.5" strokeLinecap="round" />
    ) : (
      <path d="M40 59 q10 10 20 0" stroke="#0B1026" strokeWidth="3.5" fill="#E8642C" strokeLinecap="round" />
    );
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="CAPCOM Cass, a round robot with a headset"
      animate={calm ? undefined : { y: [0, -4, 0], rotate: mood === 'cheer' ? [0, -6, 6, 0] : [0, 1.5, -1.5, 0] }}
      transition={{ duration: mood === 'cheer' ? 0.9 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* antenna */}
      <line x1="50" y1="14" x2="50" y2="4" stroke="#05070F" strokeWidth="3" />
      <circle cx="50" cy="5" r="4" fill="#E040A0" stroke="#05070F" strokeWidth="2.5" />
      {/* headset band */}
      <path d="M16 48 Q16 12 50 12 Q84 12 84 48" fill="none" stroke="#05070F" strokeWidth="7" />
      <path d="M16 48 Q16 12 50 12 Q84 12 84 48" fill="none" stroke="#5CE1FF" strokeWidth="3" />
      {/* body */}
      <circle cx="50" cy="52" r="34" fill="#FFF6E5" stroke="#05070F" strokeWidth="3.5" />
      <ellipse cx="50" cy="50" rx="24" ry="20" fill="#5CE1FF" stroke="#05070F" strokeWidth="3" />
      <ellipse cx="42" cy="42" rx="7" ry="3" fill="#FFFFFF" opacity="0.55" />
      {eyes}
      {mouth}
      {/* cheeks */}
      <circle cx="30" cy="58" r="4" fill="#E040A0" opacity="0.45" />
      <circle cx="70" cy="58" r="4" fill="#E040A0" opacity="0.45" />
      {/* ear cups + mic */}
      <rect x="9" y="40" width="12" height="20" rx="5" fill="#E8642C" stroke="#05070F" strokeWidth="3" />
      <rect x="79" y="40" width="12" height="20" rx="5" fill="#E8642C" stroke="#05070F" strokeWidth="3" />
      <path d="M15 58 Q18 78 38 76" fill="none" stroke="#05070F" strokeWidth="3" />
      <circle cx="40" cy="76" r="4" fill="#FFC94A" stroke="#05070F" strokeWidth="2.5" />
    </motion.svg>
  );
}

/** Typewriter text; finishes instantly on click or in Calm mode. */
export function Typewriter({ text, speed = 22, onDone }: { text: string; speed?: number; onDone?: () => void }) {
  const calm = useCalm();
  const [n, setN] = useState(calm ? text.length : 0);
  useEffect(() => {
    if (calm) {
      setN(text.length);
      onDone?.();
      return;
    }
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, calm]);
  const done = n >= text.length;
  return (
    <span onClick={() => setN(text.length)}>
      <span aria-hidden="true" className={done ? '' : 'caret'}>
        {text.slice(0, n)}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

export function CassSays({
  text,
  mood = 'happy',
  size = 84,
  children,
  className = '',
}: {
  text: string;
  mood?: CassMood;
  size?: number;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <div className="shrink-0">
        <CassFace mood={mood} size={size} />
      </div>
      <div className="sticker relative mb-3 min-w-0 flex-1 bg-cream px-4 py-3 text-ink">
        <span className="absolute -left-[13px] bottom-4 h-0 w-0 border-y-[10px] border-r-[13px] border-y-transparent border-r-ink" />
        <span className="absolute -left-[8px] bottom-[18px] h-0 w-0 border-y-[8px] border-r-[10px] border-y-transparent border-r-cream" />
        <p className="text-[1.05rem] font-semibold leading-snug">
          <span className="mr-1 font-display text-sm font-bold uppercase tracking-wide text-orange-dark">Cass:</span>
          <Typewriter text={text} />
        </p>
        {children}
      </div>
    </div>
  );
}
