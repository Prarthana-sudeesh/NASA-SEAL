// Animated backdrops for flight hazards. Original artwork drawn in code.
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import type { HazardScene as Kind } from '../events.ts';

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const r1 = seeded(11);
/** Irregular rock outlines. */
const ROCKS = Array.from({ length: 16 }, (_, i) => {
  const n = 7 + Math.floor(r1() * 4);
  const pts = Array.from({ length: n }, (_, k) => {
    const a = (k / n) * Math.PI * 2;
    const rr = 0.7 + r1() * 0.3;
    return `${(50 + Math.cos(a) * 45 * rr).toFixed(1)},${(50 + Math.sin(a) * 45 * rr).toFixed(1)}`;
  }).join(' ');
  return {
    pts,
    size: 3 + r1() * (i % 4 === 0 ? 9 : 5),
    top: r1() * 92,
    dur: 3.5 + r1() * 5,
    delay: -r1() * 8,
    spin: (r1() > 0.5 ? 1 : -1) * (180 + r1() * 360),
    craters: Array.from({ length: 3 }, () => [25 + r1() * 50, 25 + r1() * 50, 4 + r1() * 7]),
  };
});

const r2 = seeded(23);
const JUNK = Array.from({ length: 22 }, () => ({
  top: r2() * 70,
  w: 0.4 + r2() * 1.4,
  dur: 0.9 + r2() * 1.6,
  delay: -r2() * 3,
  color: ['#c9d3e6', '#ffb35a', '#8e9bb5', '#ffffff'][Math.floor(r2() * 4)],
}));

function BlackHole({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* stars swirl around the hole */}
      <motion.div
        className="absolute left-[78%] top-[45%] h-[220%] w-[220%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(255,255,255,0.9)_0.6px,transparent_1.4px)] bg-[length:22px_22px] opacity-40"
        animate={reduced ? undefined : { rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
      <svg
        className="absolute right-[2%] top-1/2 h-[90%] -translate-y-1/2"
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="bh-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.3" stopColor="#ffb35a" stopOpacity="0.6" />
            <stop offset="1" stopColor="#ff5a2a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bh-disk" x1="0" x2="1">
            <stop offset="0" stopColor="#ff7a2a" />
            <stop offset="0.35" stopColor="#fff2c4" />
            <stop offset="0.65" stopColor="#ffb35a" />
            <stop offset="1" stopColor="#c0391b" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="95" fill="url(#bh-glow)">
          {!reduced && (
            <animate attributeName="r" values="88;98;88" dur="3s" repeatCount="indefinite" />
          )}
        </circle>
        {/* far side of the disk, bent over the top by gravity (lensing) */}
        <ellipse
          cx="100"
          cy="92"
          rx="44"
          ry="38"
          fill="none"
          stroke="url(#bh-disk)"
          strokeWidth="7"
          strokeDasharray="18 6"
          opacity="0.85"
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;-48"
              dur="1.2s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>
        {/* event horizon shadow */}
        <circle cx="100" cy="100" r="30" fill="#000" />
        <circle
          cx="100"
          cy="100"
          r="31"
          fill="none"
          stroke="#fff2c4"
          strokeWidth="1.5"
          opacity="0.9"
        />
        {/* near side of the disk, in front */}
        <path
          d="M18 104 Q100 140 182 104"
          fill="none"
          stroke="url(#bh-disk)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="22 7"
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;-58"
              dur="0.9s"
              repeatCount="indefinite"
            />
          )}
        </path>
        <path
          d="M18 104 Q100 140 182 104"
          fill="none"
          stroke="#fff8e0"
          strokeWidth="1.5"
          opacity="0.7"
        />
      </svg>
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,transparent_35%,rgba(0,0,0,0.55))]"
        animate={reduced ? undefined : { opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </div>
  );
}

function Asteroids({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {ROCKS.map((r, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 100"
          className="absolute"
          style={{
            top: `${r.top}%`,
            width: `${r.size}%`,
            left: reduced ? `${(i * 37) % 95}%` : undefined,
          }}
          initial={false}
          animate={reduced ? undefined : { left: ['105%', '-15%'], rotate: [0, r.spin] }}
          transition={{ duration: r.dur, delay: r.delay, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        >
          <polygon points={r.pts} fill="#7a6a62" stroke="#3a302c" strokeWidth="4" />
          <polygon
            points={r.pts}
            fill="#a8968a"
            transform="translate(-6 -6) scale(0.92)"
            opacity="0.6"
          />
          {r.craters.map(([cx, cy, cr], k) => (
            <circle key={k} cx={cx} cy={cy} r={cr} fill="#5a4c46" opacity="0.8" />
          ))}
        </motion.svg>
      ))}
    </div>
  );
}

function Gravity({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.svg
        viewBox="0 0 200 200"
        className="absolute -right-[12%] top-1/2 h-[120%] -translate-y-1/2"
        animate={reduced ? undefined : { rotate: [0, 2, 0] }}
        transition={{ duration: 8, repeat: Infinity }}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="gg" cx="0.35" cy="0.35" r="0.75">
            <stop offset="0" stopColor="#ffe2b0" />
            <stop offset="0.6" stopColor="#d8945a" />
            <stop offset="1" stopColor="#6a3a24" />
          </radialGradient>
          <clipPath id="gg-clip">
            <circle cx="100" cy="100" r="70" />
          </clipPath>
        </defs>
        <ellipse
          cx="100"
          cy="100"
          rx="98"
          ry="22"
          fill="none"
          stroke="#e8cfa0"
          strokeWidth="5"
          opacity="0.5"
          transform="rotate(-18 100 100)"
        />
        <circle cx="100" cy="100" r="70" fill="url(#gg)" />
        <g clipPath="url(#gg-clip)">
          {[50, 66, 80, 96, 112, 128, 146].map((y, i) => (
            <rect
              key={y}
              x="0"
              y={y}
              width="200"
              height={5 + (i % 3) * 3}
              fill={i % 2 ? '#8a4a2a' : '#f4c88a'}
              opacity="0.45"
            >
              {!reduced && (
                <animate
                  attributeName="x"
                  values="0;-20;0"
                  dur={`${6 + i}s`}
                  repeatCount="indefinite"
                />
              )}
            </rect>
          ))}
          <ellipse cx="120" cy="120" rx="12" ry="7" fill="#c0391b" opacity="0.7" />
        </g>
        <path
          d="M2 100 Q100 210 198 100"
          fill="none"
          stroke="#e8cfa0"
          strokeWidth="5"
          opacity="0.6"
          transform="rotate(-18 100 100)"
        />
      </motion.svg>
      {/* the slingshot path */}
      <svg
        viewBox="0 0 160 90"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <path
          d="M0 20 Q120 10 128 45 Q120 80 0 75"
          fill="none"
          stroke="#5ff3ff"
          strokeWidth="0.6"
          strokeDasharray="3 2"
          opacity="0.9"
        >
          {!reduced && (
            <animate
              attributeName="stroke-dashoffset"
              values="0;-10"
              dur="0.6s"
              repeatCount="indefinite"
            />
          )}
        </path>
      </svg>
      {!reduced &&
        [0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute right-[24%] text-[clamp(16px,2.4vw,32px)] text-[#5ff3ff]"
            style={{ top: `${30 + i * 18}%` }}
            animate={{ x: [0, 30, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            aria-hidden="true"
          >
            ➜
          </motion.div>
        ))}
    </div>
  );
}

function Aliens({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute right-[6%] top-[14%] w-[22%]"
        animate={
          reduced
            ? undefined
            : { y: [0, -14, 0, 8, 0], x: [0, -10, 4, 10, 0], rotate: [0, -6, 4, -3, 0] }
        }
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 200 170">
          {/* tractor beam */}
          <path d="M80 92 L40 170 H160 L120 92 Z" fill="#7dff9a" opacity="0.18">
            {!reduced && (
              <animate
                attributeName="opacity"
                values="0.08;0.3;0.08"
                dur="1.4s"
                repeatCount="indefinite"
              />
            )}
          </path>
          {/* dome with a friendly pilot */}
          <ellipse cx="100" cy="58" rx="40" ry="34" fill="#9fdfff" opacity="0.55" />
          <ellipse cx="100" cy="64" rx="15" ry="17" fill="#7dff9a" />
          <ellipse cx="94" cy="60" rx="4" ry="6" fill="#0b0f1e" />
          <ellipse cx="106" cy="60" rx="4" ry="6" fill="#0b0f1e" />
          <path d="M94 72 Q100 77 106 72" stroke="#0b0f1e" strokeWidth="2" fill="none" />
          <line x1="94" y1="47" x2="88" y2="36" stroke="#7dff9a" strokeWidth="2" />
          <line x1="106" y1="47" x2="112" y2="36" stroke="#7dff9a" strokeWidth="2" />
          <circle cx="88" cy="35" r="3" fill="#ffe24a" />
          <circle cx="112" cy="35" r="3" fill="#ffe24a" />
          <ellipse
            cx="100"
            cy="58"
            rx="40"
            ry="34"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            opacity="0.6"
          />
          {/* saucer */}
          <ellipse cx="100" cy="86" rx="92" ry="22" fill="#8e9bb5" />
          <ellipse cx="100" cy="80" rx="92" ry="14" fill="#c9d3e6" />
          <ellipse cx="100" cy="94" rx="40" ry="8" fill="#5a6680" />
          {Array.from({ length: 8 }, (_, i) => (
            <circle
              key={i}
              cx={22 + i * 22}
              cy={88 + Math.sin((i / 7) * Math.PI) * 6}
              r="5"
              fill={['#ff5a4a', '#ffe24a', '#5ff3ff', '#7dff9a'][i % 4]}
            >
              {!reduced && (
                <animate
                  attributeName="opacity"
                  values="1;0.2;1"
                  dur="0.8s"
                  begin={`${i * 0.1}s`}
                  repeatCount="indefinite"
                />
              )}
            </circle>
          ))}
        </svg>
      </motion.div>
      <p className="outlined absolute bottom-[3%] right-[3%] text-[clamp(9px,1vw,13px)] font-bold text-[#7dff9a]">
        👽 Pretend aliens, just for fun!
      </p>
    </div>
  );
}

function Debris({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Earth's curve below */}
      <div className="absolute -bottom-[70%] left-[-20%] h-[100%] w-[140%] rounded-[50%] bg-[radial-gradient(circle_at_50%_8%,#9fdcff,#2a6fd0_20%,#1a4a8a_38%,#0d2c66_55%)] shadow-[0_-10px_40px_rgba(140,210,255,0.6)]" />
      {/* tumbling dead satellites */}
      {[
        { top: 18, size: 12, dur: 9, delay: 0 },
        { top: 48, size: 8, dur: 6.5, delay: -3 },
      ].map((s, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 100 60"
          className="absolute"
          style={{
            top: `${s.top}%`,
            width: `${s.size}%`,
            left: reduced ? `${20 + i * 50}%` : undefined,
          }}
          animate={reduced ? undefined : { left: ['110%', '-20%'], rotate: [0, i ? -540 : 400] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        >
          <rect
            x="0"
            y="20"
            width="34"
            height="20"
            fill="#2a6fd0"
            stroke="#9fdcff"
            strokeWidth="1.5"
          />
          <path d="M0 30h34M11 20v20M22 20v20" stroke="#9fdcff" strokeWidth="1" />
          <rect
            x="38"
            y="16"
            width="24"
            height="28"
            fill="#c9a24a"
            stroke="#6b5420"
            strokeWidth="2"
          />
          <rect
            x="66"
            y="20"
            width="34"
            height="20"
            fill="#2a6fd0"
            stroke="#9fdcff"
            strokeWidth="1.5"
          />
          <path d="M66 30h34M77 20v20M88 20v20" stroke="#9fdcff" strokeWidth="1" />
          <line x1="50" y1="16" x2="50" y2="2" stroke="#c9d3e6" strokeWidth="2" />
        </motion.svg>
      ))}
      {/* fast fragments */}
      {JUNK.map((j, i) => (
        <motion.span
          key={i}
          className="absolute h-[3px] rounded-full"
          style={{
            top: `${j.top}%`,
            width: `${j.w}%`,
            background: j.color,
            left: reduced ? `${(i * 41) % 95}%` : undefined,
          }}
          animate={reduced ? undefined : { left: ['110%', '-10%'] }}
          transition={{ duration: j.dur, delay: j.delay, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Full-screen hazard backdrop shown behind the hazard panel. */
export function HazardScene({ kind }: { kind: Kind }) {
  const reduced = useReducedMotion();
  if (kind === 'alarm') return null;
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[15]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      aria-hidden="true"
    >
      {kind === 'blackhole' && <BlackHole reduced={reduced} />}
      {kind === 'asteroids' && <Asteroids reduced={reduced} />}
      {kind === 'gravity' && <Gravity reduced={reduced} />}
      {kind === 'aliens' && <Aliens reduced={reduced} />}
      {kind === 'debris' && <Debris reduced={reduced} />}
    </motion.div>
  );
}
