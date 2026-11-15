// Splashdown: only the crew capsule comes home. It drifts down under three parachutes, splashes into
// the ocean, bobs on the waves, the crew pops out to wave and a recovery boat arrives.
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { sfx } from '../sound.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { Astronaut } from './Pixel.tsx';

const FALL = 3.2; // seconds until the capsule touches the water

function Parachutes() {
  return (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden="true">
      {[
        [22, 30, -12],
        [60, 22, 0],
        [98, 30, 12],
      ].map(([cx, cy, rot]) => (
        <g key={cx} transform={`rotate(${rot} ${cx} ${cy + 20})`}>
          <path
            d={`M${cx - 20} ${cy} Q${cx} ${cy - 26} ${cx + 20} ${cy} Z`}
            fill="#ff7a1a"
            stroke="#b84a0a"
            strokeWidth="1"
          />
          <path d={`M${cx - 7} ${cy - 1} Q${cx} ${cy - 25} ${cx + 7} ${cy - 1} Z`} fill="#ffffff" />
          {/* suspension lines down to the capsule */}
          <path
            d={`M${cx - 20} ${cy} L60 70 M${cx + 20} ${cy} L60 70 M${cx} ${cy} L60 70`}
            stroke="#e8e2da"
            strokeWidth="0.6"
          />
        </g>
      ))}
    </svg>
  );
}

function Capsule() {
  return (
    <svg viewBox="0 0 60 46" className="w-full" aria-hidden="true">
      {/* gumdrop-shaped crew capsule with a scorched heat shield */}
      <path d="M18 4 H42 L56 38 H4 Z" fill="#e9edf3" stroke="#8e9bb5" strokeWidth="1.2" />
      <path d="M18 4 H30 L22 38 H4 Z" fill="#ffffff" opacity="0.6" />
      <rect x="25" y="0" width="10" height="5" rx="1" fill="#8e9bb5" />
      <circle cx="35" cy="18" r="4" fill="#2a3f6a" stroke="#8e9bb5" strokeWidth="1" />
      <circle cx="34" cy="17" r="1.3" fill="#9fdfff" />
      <path d="M4 38 H56 Q54 46 30 46 Q6 46 4 38 Z" fill="#5a3a2a" />
      <path d="M8 40 H52" stroke="#2a1a12" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

export function Splashdown({ crew, onSplash }: { crew: number; onSplash?: () => void }) {
  const reduced = useReducedMotion();
  // Sound track of the splashdown: chutes open, splash, hatch, boat horn, seagulls.
  useEffect(() => {
    const at = (s: number, fn: () => void) => window.setTimeout(fn, s * 1000);
    const timers = [
      at(0.25, () => sfx('parachute')),
      at(FALL, () => {
        sfx('splash');
        onSplash?.();
      }),
      ...(crew > 0 ? [at(FALL + 1.1, () => sfx('hatch'))] : []),
      at(FALL + 1.9, () => sfx('horn')),
      at(FALL + 2.8, () => sfx('seagull')),
    ];
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const t = (s: number) => (reduced ? 0 : s);
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* daytime sky and sun */}
      <div className="absolute inset-0 bg-[linear-gradient(#4aa8f0,#9fd8ff_55%,#d8f1ff_68%)]" />
      <div className="absolute right-[12%] top-[8%] h-[16%] w-[9%] rounded-full bg-[radial-gradient(circle,#fffbe0,#ffe27a_50%,rgba(255,226,122,0)_72%)]" />
      {[
        { top: 10, left: 8, w: 18, dur: 60 },
        { top: 22, left: 55, w: 14, dur: 75 },
        { top: 6, left: 34, w: 10, dur: 90 },
      ].map((c, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 40"
          className="absolute"
          style={{ top: `${c.top}%`, left: `${c.left}%`, width: `${c.w}%` }}
          animate={reduced ? undefined : { x: ['0%', '40%', '0%'] }}
          transition={{ duration: c.dur, repeat: Infinity, ease: 'easeInOut' }}
        >
          <g fill="#ffffff" opacity="0.92">
            <circle cx="28" cy="26" r="13" />
            <circle cx="48" cy="18" r="17" />
            <circle cx="70" cy="24" r="14" />
            <rect x="16" y="24" width="68" height="14" rx="7" />
          </g>
          <rect x="16" y="32" width="68" height="6" rx="3" fill="#d8ecff" />
        </motion.svg>
      ))}
      {/* seagulls */}
      {!reduced &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute text-[clamp(10px,1.4vw,18px)] text-[#2a3a5a]"
            style={{ top: `${18 + i * 6}%` }}
            animate={{ left: ['-5%', '105%'] }}
            transition={{ duration: 14 + i * 4, delay: i * 2, repeat: Infinity, ease: 'linear' }}
          >
            ︶
          </motion.span>
        ))}

      {/* ocean with rolling waves */}
      <div className="absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(#2f8fd8,#0d4a8a)]" />
      <div className="absolute inset-x-0 bottom-[33%] h-[1.5%] bg-[#bfe8ff]/60" />
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute h-[3%] w-[220%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,255,255,0.55)_0_18%,transparent_19%)] bg-[length:6%_100%]"
          style={{ bottom: `${26 - i * 9}%`, left: '-60%' }}
          animate={reduced ? undefined : { x: i % 2 ? ['0%', '6%'] : ['6%', '0%'] }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* capsule under parachutes: falls, then bobs on the water */}
      <motion.div
        className="absolute left-[34%] w-[14%]"
        initial={{ top: reduced ? '44%' : '-45%' }}
        animate={{ top: '44%' }}
        transition={{ duration: t(FALL), ease: [0.25, 0.6, 0.4, 1] }}
      >
        <motion.div
          animate={
            reduced
              ? { opacity: 0 }
              : { rotate: [-4, 4, -4], opacity: [1, 1, 0], y: ['0%', '0%', '30%'] }
          }
          transition={{
            rotate: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
            opacity: { times: [0, 0.97, 1], duration: FALL + 0.7 },
            y: { times: [0, 0.97, 1], duration: FALL + 0.7 },
          }}
        >
          <Parachutes />
        </motion.div>
        <motion.div
          className="relative mx-auto w-[56%]"
          animate={reduced ? undefined : { y: [0, 0, -4, 0], rotate: [0, 0, -3, 3, 0] }}
          transition={{ delay: FALL, duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Capsule />
          {/* the crew pops out to wave */}
          {crew > 0 && (
            <motion.div
              className="absolute -top-[70%] left-[30%] w-[40%]"
              initial={{ y: '60%', opacity: 0 }}
              animate={{ y: '0%', opacity: 1 }}
              transition={{ delay: t(FALL + 1.2), type: 'spring', stiffness: 200, damping: 12 }}
            >
              <Astronaut enter={false} />
            </motion.div>
          )}
        </motion.div>
      </motion.div>

      {/* a strip of sea in front, so the capsule floats IN the water */}
      <motion.div
        className="absolute inset-x-0 bottom-[27%] h-[5.5%] bg-[linear-gradient(rgba(64,160,230,0.85),#2a86cc)]"
        style={{
          clipPath:
            'polygon(0 30%,5% 0,10% 30%,15% 0,20% 30%,25% 0,30% 30%,35% 0,40% 30%,45% 0,50% 30%,55% 0,60% 30%,65% 0,70% 30%,75% 0,80% 30%,85% 0,90% 30%,95% 0,100% 30%,100% 100%,0 100%)',
        }}
        animate={reduced ? undefined : { x: ['-2%', '2%', '-2%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* recovery boat */}
      <motion.div
        className="absolute bottom-[25%] z-[1] w-[14%]"
        initial={{ left: '105%' }}
        animate={{ left: '64%', y: reduced ? 0 : [0, -3, 0] }}
        transition={{
          left: { delay: t(FALL + 0.6), duration: t(2.4), ease: 'easeOut' },
          y: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
        }}
      >
        {/* white foam where the hull meets the water */}
        <motion.div
          className="absolute -bottom-[6%] left-[-8%] h-[22%] w-[116%] rounded-[50%] bg-white/70 blur-[1px]"
          animate={reduced ? undefined : { scaleX: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
        <svg viewBox="0 0 120 50" className="relative w-full">
          <path d="M4 30 H116 L104 48 H16 Z" fill="#f2f2f2" stroke="#3a4c80" strokeWidth="2" />
          <rect x="4" y="34" width="112" height="4" fill="#ff5a4a" />
          <rect
            x="40"
            y="12"
            width="40"
            height="18"
            fill="#ffffff"
            stroke="#3a4c80"
            strokeWidth="2"
          />
          <rect x="46" y="16" width="8" height="6" fill="#9fdfff" />
          <rect x="58" y="16" width="8" height="6" fill="#9fdfff" />
          <rect x="70" y="16" width="6" height="6" fill="#9fdfff" />
          <rect x="58" y="2" width="3" height="10" fill="#3a4c80" />
          <path d="M61 2 L74 6 L61 9 Z" fill="#ffb35a" />
        </svg>
      </motion.div>

      {/* splash: spray drops and spreading ripples at touchdown */}
      {!reduced && (
        <div className="absolute bottom-[30%] left-[41%] h-0 w-0">
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 11) * Math.PI;
            return (
              <motion.span
                key={i}
                className="absolute h-[10px] w-[10px] rounded-full bg-white"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                animate={{
                  x: [0, -Math.cos(a) * 90],
                  y: [0, -Math.sin(a) * 80 - 20, 30],
                  opacity: [0, 1, 0],
                  scale: [0.4, 1, 0.6],
                }}
                transition={{ delay: FALL - 0.05, duration: 1.1, ease: 'easeOut' }}
              />
            );
          })}
          {[0, 0.35, 0.7].map((d) => (
            <motion.span
              key={d}
              className="absolute left-0 top-0 h-[24px] w-[90px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-white/80"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0.2, 3], opacity: [0.9, 0] }}
              transition={{ delay: FALL + d, duration: 1.8, ease: 'easeOut' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
