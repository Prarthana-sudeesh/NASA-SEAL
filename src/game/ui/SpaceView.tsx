// The view out of Mission Control's windows. Each difficulty has its own animated world.
import { AnimatePresence, motion } from 'framer-motion';
import type { Difficulty } from '../../data/types.ts';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

const LOOP = { repeat: Infinity, ease: 'linear' } as const;

function ShootingStars({ reduced }: { reduced: boolean }) {
  if (reduced) return null;
  return (
    <>
      {[
        { top: 8, left: 70, delay: 1, every: 7 },
        { top: 20, left: 30, delay: 4.5, every: 9 },
        { top: 4, left: 45, delay: 8, every: 11 },
      ].map((s, i) => (
        <motion.span
          key={i}
          className="absolute h-[2px] w-[9%] rounded-full bg-[linear-gradient(90deg,transparent,#fff)]"
          style={{ top: `${s.top}%`, left: `${s.left}%`, rotate: '-25deg' }}
          initial={{ opacity: 0 }}
          animate={{ x: ['0%', '-260%'], y: ['0%', '900%'], opacity: [0, 1, 0] }}
          transition={{ duration: 0.9, delay: s.delay, repeat: Infinity, repeatDelay: s.every }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

function Moon({
  reduced,
  size,
  top,
  dur,
  delay = 0,
  color,
}: {
  reduced: boolean;
  size: number;
  top: number;
  dur: number;
  delay?: number;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        top: `${top}%`,
        width: `${size}%`,
        aspectRatio: '1',
        background: `radial-gradient(circle at 35% 30%, #ffffff, ${color} 45%, #1a2033 100%)`,
        left: reduced ? '72%' : undefined,
      }}
      animate={reduced ? undefined : { left: ['-8%', '108%'], y: ['30%', '-40%', '30%'] }}
      transition={{ duration: dur, delay, ...LOOP }}
      aria-hidden="true"
    />
  );
}

function Easy({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Moon reduced={reduced} size={4.5} top={20} dur={38} color="#c9c4bc" />
      <div className="absolute -bottom-[55%] left-[-10%] h-[110%] w-[120%] overflow-hidden rounded-[50%] bg-[radial-gradient(circle_at_50%_10%,#9fe0ff,#2a8fd0_30%,#1d6a4a_48%,#0d2c66_62%,transparent_75%)] opacity-90">
        {/* drifting clouds */}
        {[12, 20, 30].map((t, i) => (
          <motion.div
            key={t}
            className="absolute h-[5%] rounded-full bg-white/45 blur-[2px]"
            style={{ top: `${t}%`, width: `${22 + i * 8}%`, left: `${10 + i * 25}%` }}
            animate={reduced ? undefined : { x: ['-30%', '60%', '-30%'] }}
            transition={{ duration: 40 + i * 12, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      {/* sunrise glow on the edge */}
      <motion.div
        className="absolute bottom-[20%] left-[30%] h-[20%] w-[40%] rounded-full bg-[#bff3ff]/25 blur-2xl"
        animate={reduced ? undefined : { opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
    </>
  );
}

function Medium({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Moon reduced={reduced} size={3.5} top={14} dur={30} color="#d8f1ff" />
      <Moon reduced={reduced} size={2.2} top={30} dur={22} delay={-9} color="#ffd9a8" />
      <div className="absolute -bottom-[60%] left-[5%] h-[115%] w-[90%] rounded-[50%] bg-[radial-gradient(circle_at_50%_12%,#f2fdff,#9fe4f0_25%,#4aa6c8_45%,#163a66_65%,transparent_76%)]" />
      <motion.svg
        className="absolute bottom-[-6%] left-[-10%] h-[60%] w-[120%]"
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        animate={reduced ? undefined : { rotate: [-3, 3, -3] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        {[
          [96, 20, '#e8f6ff', 2.2, 0.75],
          [88, 17, '#a8d8ea', 1.6, 0.55],
          [80, 14, '#ffffff', 0.8, 0.45],
        ].map(([rx, ry, c, w, o]) => (
          <ellipse
            key={rx as number}
            cx="100"
            cy="38"
            rx={rx as number}
            ry={ry as number}
            fill="none"
            stroke={c as string}
            strokeWidth={w as number}
            opacity={o as number}
            strokeDasharray="10 3"
          >
            {!reduced && (
              <animate
                attributeName="stroke-dashoffset"
                values="0;-26"
                dur="4s"
                repeatCount="indefinite"
              />
            )}
          </ellipse>
        ))}
      </motion.svg>
      {!reduced && (
        <motion.div
          className="absolute top-[10%] h-[3px] w-[14%] rounded-full bg-[linear-gradient(90deg,transparent,#bff3ff,#ffffff)] shadow-[0_0_8px_#bff3ff]"
          animate={{ left: ['110%', '-20%'], top: ['6%', '26%'] }}
          transition={{ duration: 5, repeat: Infinity, repeatDelay: 6, ease: 'easeIn' }}
          aria-hidden="true"
        />
      )}
    </>
  );
}

function Hard({ reduced }: { reduced: boolean }) {
  return (
    <>
      <motion.div
        className="absolute -bottom-[55%] left-[-10%] h-[112%] w-[120%] rounded-[50%] bg-[radial-gradient(circle_at_50%_10%,#ffcf7a,#e0551a_22%,#7a1a0a_42%,#2a0806_62%,transparent_75%)]"
        animate={
          reduced ? undefined : { filter: ['brightness(1)', 'brightness(1.25)', 'brightness(1)'] }
        }
        transition={{ duration: 3, repeat: Infinity }}
      />
      <svg
        className="absolute -bottom-[55%] left-[-10%] h-[112%] w-[120%]"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="lava-clip">
            <ellipse cx="100" cy="50" rx="75" ry="37" />
          </clipPath>
        </defs>
        <g clipPath="url(#lava-clip)" fill="none" stroke="#ffd25a" strokeLinecap="round">
          {[
            'M40 20 L60 26 L70 22 L90 30',
            'M110 16 L120 24 L140 20 L156 28',
            'M70 36 L84 34 L96 40 L118 36 L130 42',
            'M30 34 L46 38 L52 46',
            'M150 36 L160 44 L172 40',
          ].map((d, i) => (
            <path key={i} d={d} strokeWidth="1.2">
              {!reduced && (
                <animate
                  attributeName="opacity"
                  values="0.3;1;0.3"
                  dur={`${1.6 + i * 0.4}s`}
                  repeatCount="indefinite"
                />
              )}
            </path>
          ))}
        </g>
      </svg>
      {/* rising embers */}
      {!reduced &&
        Array.from({ length: 14 }, (_, i) => (
          <motion.span
            key={i}
            className="absolute h-[4px] w-[4px] rounded-full bg-[#ffb35a] shadow-[0_0_6px_#ff7a1a]"
            style={{ left: `${8 + ((i * 53) % 84)}%`, bottom: '18%' }}
            animate={{
              y: ['0%', '-1600%'],
              opacity: [0, 1, 0],
              x: ['0%', i % 2 ? '200%' : '-200%'],
            }}
            transition={{
              duration: 4 + (i % 4),
              delay: i * 0.45,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            aria-hidden="true"
          />
        ))}
      {/* tumbling asteroids */}
      {[
        { top: 10, size: 3, dur: 26 },
        { top: 26, size: 2, dur: 18 },
      ].map((a, i) => (
        <motion.div
          key={i}
          className="absolute rounded-[40%_60%_55%_45%] bg-[radial-gradient(circle_at_35%_30%,#b8a090,#5a4038)]"
          style={{
            top: `${a.top}%`,
            width: `${a.size}%`,
            aspectRatio: '1',
            left: reduced ? `${20 + i * 50}%` : undefined,
          }}
          animate={reduced ? undefined : { left: ['108%', '-8%'], rotate: [0, 360 * (i ? -1 : 1)] }}
          transition={{ duration: a.dur, delay: -i * 7, ...LOOP }}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

/** Animated space view for Mission Control, themed by difficulty. */
export function SpaceView({ theme = 'easy' }: { theme?: Difficulty }) {
  const reduced = useReducedMotion();
  return (
    <>
      <ShootingStars reduced={reduced} />
      <AnimatePresence mode="wait">
        <motion.div
          key={theme}
          className="absolute inset-0"
          initial={reduced ? { opacity: 0 } : { y: '45%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={reduced ? { opacity: 0 } : { y: '45%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 70, damping: 16 }}
        >
          {theme === 'easy' && <Easy reduced={reduced} />}
          {theme === 'medium' && <Medium reduced={reduced} />}
          {theme === 'hard' && <Hard reduced={reduced} />}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
