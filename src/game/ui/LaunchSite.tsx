// 16-bit launch site at golden hour: the backdrop of the rocket-building screen.
// Original pixel art drawn on a 320 × 180 grid. Everything that moves is skipped with reduced motion.
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';

const W = 320;
const H = 180;
const HORIZON = 150;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Pixel disc as one path of 1-pixel-high rows. */
function disc(cx: number, cy: number, r: number): string {
  let d = '';
  for (let dy = -r; dy <= r; dy++) {
    const h = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    d += `M${cx - h} ${cy + dy}h${2 * h + 1}v1h${-(2 * h + 1)}z`;
  }
  return d;
}

type Blob = [number, number, number];
const blobs = (bs: Blob[], dx = 0, dy = 0, shrink = 0) =>
  bs
    .filter(([, , r]) => r - shrink > 1)
    .map(([x, y, r]) => disc(x + dx, y + dy, r - shrink))
    .join('');

// Sky: classic banded 16-bit gradient, dark indigo overhead to warm gold at the horizon.
const SKY = [
  '#141833',
  '#1b2042',
  '#252a52',
  '#343462',
  '#473e6f',
  '#614977',
  '#7f567c',
  '#a0637d',
  '#c0747b',
  '#dc8b72',
  '#eea672',
  '#f6c487',
  '#fadca3',
];
const BAND = Math.ceil(HORIZON / SKY.length);

const rnd = seeded(7);
const STAR_PIX = Array.from({ length: 46 }, () => ({
  x: Math.floor(rnd() * W),
  y: Math.floor(rnd() * 42),
  big: rnd() > 0.85,
  d: 1.5 + rnd() * 3,
}));

/** Stepped hill silhouette. */
function hills(seed: number, base: number, amp: number, step: number): string {
  const r = seeded(seed);
  let d = `M0 ${H}`;
  let h = base;
  for (let x = 0; x <= W; x += step) {
    h = Math.max(base - amp, Math.min(base + amp, h + Math.round((r() - 0.5) * 4)));
    d += `V${h}H${x + step}`;
  }
  return `${d}V${H}Z`;
}
const FAR_HILLS = hills(3, HORIZON - 8, 6, 4);
const NEAR_HILLS = hills(19, HORIZON - 2, 3, 3);

// Big cumulus bank behind the rocket, plus smaller clouds. Lit from the low sun on the left.
const CLOUDS: { blobs: Blob[]; drift: number; dur: number }[] = [
  {
    blobs: [
      [150, 112, 12],
      [166, 102, 17],
      [188, 94, 22],
      [212, 98, 18],
      [234, 106, 14],
      [200, 110, 16],
      [176, 114, 13],
      [252, 112, 10],
      [134, 118, 9],
    ],
    drift: 6,
    dur: 70,
  },
  {
    blobs: [
      [36, 74, 9],
      [50, 67, 12],
      [66, 71, 10],
      [56, 78, 9],
      [24, 79, 6],
    ],
    drift: 10,
    dur: 55,
  },
  {
    blobs: [
      [276, 58, 8],
      [290, 52, 11],
      [304, 57, 9],
      [292, 63, 8],
    ],
    drift: -8,
    dur: 60,
  },
];
const WISPS = [
  { x: 70, y: 30, w: 70, c: '#6e5280' },
  { x: 200, y: 22, w: 54, c: '#5c4777' },
  { x: 230, y: 40, w: 60, c: '#8c5f84' },
  { x: 20, y: 46, w: 44, c: '#94607f' },
];

const TOWER_X = 192;
const TOWER_W = 18;
const TOWER_TOP = 26;
const DECK = 156;

/** Tiny ground crew: helmet, face, hi-vis vest, legs. */
function Worker({
  x,
  y,
  helmet,
  vest,
  walk,
  dur,
  wave,
  reduced,
  begin = 0,
}: {
  x: number;
  y: number;
  helmet: string;
  vest: string;
  walk?: number;
  dur?: number;
  wave?: boolean;
  reduced: boolean;
  begin?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {walk && !reduced && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values={`${x} ${y};${x + walk} ${y};${x} ${y}`}
          dur={`${dur}s`}
          begin={`${-begin}s`}
          repeatCount="indefinite"
        />
      )}
      <g>
        {walk && !reduced && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -1;0 0"
            dur="0.5s"
            repeatCount="indefinite"
          />
        )}
        <rect x="0" y="0" width="3" height="1" fill={helmet} />
        <rect x="0" y="1" width="3" height="1" fill="#f0bc93" />
        <rect x="0" y="2" width="3" height="3" fill={vest} />
        <rect x="0" y="3" width="3" height="1" fill="#fff3a6" />
        {/* waving arm */}
        <rect x="3" y="2" width="1" height="1" fill={vest}>
          {wave && !reduced && (
            <animate attributeName="y" values="2;0;2" dur="0.7s" repeatCount="indefinite" />
          )}
        </rect>
      </g>
      <rect x="0" y="5" width="1" height="2" fill="#2a3150">
        {walk && !reduced && (
          <animate attributeName="height" values="2;1;2" dur="0.5s" repeatCount="indefinite" />
        )}
      </rect>
      <rect x="2" y="5" width="1" height="2" fill="#2a3150">
        {walk && !reduced && (
          <animate attributeName="height" values="1;2;1" dur="0.5s" repeatCount="indefinite" />
        )}
      </rect>
    </g>
  );
}

/** Fuel tanker truck (22 × 9 px) that drives past. */
function Truck({ reduced }: { reduced: boolean }) {
  return (
    <g transform="translate(40 166)">
      {!reduced && (
        <animateTransform
          attributeName="transform"
          type="translate"
          values="-40 166;350 166"
          dur="26s"
          repeatCount="indefinite"
        />
      )}
      {/* headlight beam */}
      <path d="M23 5 L34 3 L34 8 Z" fill="#fff2b0" opacity="0.35" />
      {/* tank trailer */}
      <rect x="0" y="1" width="14" height="5" fill="#e9e3da" />
      <rect x="0" y="1" width="14" height="1" fill="#ffffff" />
      <rect x="0" y="5" width="14" height="1" fill="#a99f97" />
      <rect x="3" y="3" width="8" height="1" fill="#ff7a1a" />
      {/* cab */}
      <rect x="15" y="1" width="7" height="6" fill="#ff7a1a" />
      <rect x="15" y="1" width="7" height="1" fill="#ffa64d" />
      <rect x="18" y="2" width="3" height="2" fill="#9fdcff" />
      <rect x="22" y="5" width="1" height="1" fill="#fff6c4" />
      <rect x="0" y="6" width="22" height="1" fill="#2a2430" />
      {/* wheels */}
      {[2, 9, 18].map((wx) => (
        <g key={wx}>
          <rect x={wx} y="7" width="3" height="2" fill="#111" />
          <rect x={wx + 1} y="7" width="1" height="1" fill="#777" />
        </g>
      ))}
    </g>
  );
}

function Bird({
  y,
  dur,
  begin,
  reduced,
}: {
  y: number;
  dur: number;
  begin: number;
  reduced: boolean;
}) {
  if (reduced) return null;
  return (
    <g>
      <animateTransform
        attributeName="transform"
        type="translate"
        values={`-20 ${y};110 ${y - 6};220 ${y + 2};340 ${y - 4}`}
        dur={`${dur}s`}
        begin={`${-begin}s`}
        repeatCount="indefinite"
      />
      <path d="M0 0h1v1h1v1h1v-1h1v-1h1v1h-1v1h-1v1h-1v-1h-1v-1h-1z" fill="#2b2238">
        <animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="indefinite" />
      </path>
      <path d="M0 1h5v1h-5z" fill="#2b2238">
        <animate attributeName="opacity" values="0;1;0" dur="0.5s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function Blink({
  x,
  y,
  color = '#ff4a3a',
  dur = 1.6,
  begin = 0,
  reduced,
}: {
  x: number;
  y: number;
  color?: string;
  dur?: number;
  begin?: number;
  reduced: boolean;
}) {
  return (
    <g>
      <rect x={x - 1} y={y - 1} width="3" height="3" fill={color} opacity="0.3">
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.45;0;0.45"
            dur={`${dur}s`}
            begin={`${-begin}s`}
            repeatCount="indefinite"
          />
        )}
      </rect>
      <rect x={x} y={y} width="1" height="1" fill={color}>
        {!reduced && (
          <animate
            attributeName="opacity"
            values="1;0.2;1"
            dur={`${dur}s`}
            begin={`${-begin}s`}
            repeatCount="indefinite"
          />
        )}
      </rect>
    </g>
  );
}

/** Puffs of steam rising from the launch platform. */
function Steam({ x, reduced }: { x: number; reduced: boolean }) {
  if (reduced) return <path d={disc(x, DECK - 2, 3)} fill="#f3e3d6" opacity="0.5" />;
  return (
    <g>
      {[0, 1.3, 2.6].map((b) => (
        <g key={b}>
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0 0;${x > 160 ? 4 : -4} -22`}
            dur="4s"
            begin={`${-b}s`}
            repeatCount="indefinite"
          />
          <path d={disc(x, DECK - 2, 4)} fill="#f6e8dc">
            <animate
              attributeName="opacity"
              values="0.75;0.4;0"
              dur="4s"
              begin={`${-b}s`}
              repeatCount="indefinite"
            />
          </path>
        </g>
      ))}
    </g>
  );
}

function Tower({ reduced }: { reduced: boolean }) {
  const x0 = TOWER_X;
  const x1 = TOWER_X + TOWER_W;
  const cells = Math.floor((DECK - TOWER_TOP) / 8);
  return (
    <g>
      {/* shadowed back face */}
      <rect
        x={x0 + 2}
        y={TOWER_TOP}
        width={TOWER_W - 4}
        height={DECK - TOWER_TOP}
        fill="#2b2230"
        opacity="0.55"
      />
      {/* lattice */}
      <path
        d={Array.from({ length: cells }, (_, i) => {
          const y = TOWER_TOP + i * 8;
          return `M${x0 + 2} ${y}L${x1 - 2} ${y + 8}M${x1 - 2} ${y}L${x0 + 2} ${y + 8}M${x0} ${y}H${x1}`;
        }).join('')}
        stroke="#4e3d4a"
        strokeWidth="1"
        fill="none"
      />
      {/* sunlit left column, shaded right column */}
      <rect x={x0} y={TOWER_TOP} width="2" height={DECK - TOWER_TOP} fill="#b98a6e" />
      <rect x={x0} y={TOWER_TOP} width="1" height={DECK - TOWER_TOP} fill="#e7b48a" />
      <rect x={x1 - 2} y={TOWER_TOP} width="2" height={DECK - TOWER_TOP} fill="#3b2c37" />
      {/* platforms with warm lights underneath */}
      {[40, 64, 88, 112, 136].map((y, i) => (
        <g key={y}>
          <rect x={x0 - 5} y={y} width={TOWER_W + 10} height="2" fill="#5d4a57" />
          <rect x={x0 - 5} y={y} width={TOWER_W + 10} height="1" fill="#8c7080" />
          <rect x={x0 - 4} y={y + 2} width={TOWER_W + 8} height="1" fill="#ffb35a" opacity="0.5" />
          {[0, 6, 12, 18, 24].map((dx) => (
            <Blink
              key={dx}
              x={x0 - 4 + dx}
              y={y + 2}
              color="#ffd27a"
              dur={2 + ((i + dx) % 3)}
              begin={(i * 7 + dx) % 5}
              reduced={reduced}
            />
          ))}
        </g>
      ))}
      {/* access arms reaching to the rocket, with yellow safety rails */}
      {[60, 98, 128].map((y) => (
        <g key={y}>
          <rect x="170" y={y} width={x0 - 170} height="3" fill="#6d5866" />
          <rect x="170" y={y} width={x0 - 170} height="1" fill="#ffd23a" />
          <rect x="170" y={y + 3} width={x0 - 170} height="1" fill="#2b2230" />
        </g>
      ))}
      {/* elevator car riding up and down */}
      <g>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;0 -96;0 -96;0 0;0 0"
            keyTimes="0;0.4;0.5;0.9;1"
            dur="14s"
            repeatCount="indefinite"
          />
        )}
        <rect x={x1} y="138" width="6" height="7" fill="#ffc83a" />
        <rect x={x1} y="138" width="6" height="1" fill="#fff0a0" />
        <rect x={x1 + 1} y="140" width="4" height="2" fill="#8fd0ff" />
      </g>
      <rect x={x1 + 6} y={TOWER_TOP} width="1" height={DECK - TOWER_TOP} fill="#3b2c37" />
      {/* crane on top: mast, jib, counterweight, trolley and swinging hook */}
      <rect x={x0 + 8} y={TOWER_TOP - 12} width="2" height="12" fill="#c48a5a" />
      <path d={`M${x0 - 14} ${TOWER_TOP - 10}H${x1 + 40}`} stroke="#ffb02e" strokeWidth="2" />
      <path
        d={Array.from(
          { length: 13 },
          (_, i) => `M${x0 - 14 + i * 6} ${TOWER_TOP - 9}l3 3l3 -3`,
        ).join('')}
        stroke="#c97d1e"
        strokeWidth="1"
        fill="none"
      />
      <rect x={x0 - 16} y={TOWER_TOP - 9} width="7" height="5" fill="#4a3c46" />
      <path
        d={`M${x0 + 9} ${TOWER_TOP - 12}L${x1 + 38} ${TOWER_TOP - 10}M${x0 + 9} ${TOWER_TOP - 12}L${x0 - 13} ${TOWER_TOP - 10}`}
        stroke="#6b5862"
        strokeWidth="1"
      />
      <g>
        {!reduced && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values="0 0;18 0;18 0;0 0;0 0"
            keyTimes="0;0.35;0.5;0.85;1"
            dur="16s"
            repeatCount="indefinite"
          />
        )}
        <rect x={x1 + 12} y={TOWER_TOP - 8} width="5" height="2" fill="#3b2c37" />
        <g>
          {!reduced && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-5 ${x1 + 14} ${TOWER_TOP - 6};5 ${x1 + 14} ${TOWER_TOP - 6};-5 ${x1 + 14} ${TOWER_TOP - 6}`}
              dur="3.2s"
              repeatCount="indefinite"
            />
          )}
          <rect x={x1 + 14} y={TOWER_TOP - 6} width="1" height="26" fill="#2b2230" />
          <rect x={x1 + 12} y={TOWER_TOP + 20} width="5" height="3" fill="#ffd23a" />
          <rect x={x1 + 13} y={TOWER_TOP + 23} width="3" height="3" fill="#7a6a75" />
        </g>
      </g>
      <Blink x={x0 + 9} y={TOWER_TOP - 14} reduced={reduced} />
      <Blink x={x1 + 39} y={TOWER_TOP - 11} reduced={reduced} begin={0.8} />
    </g>
  );
}

function Floodlight({
  x,
  aimX,
  reduced,
  begin,
}: {
  x: number;
  aimX: number;
  reduced: boolean;
  begin: number;
}) {
  const top = 50;
  return (
    <g>
      {/* light beam */}
      <path d={`M${x} ${top + 3}L${aimX - 16} ${DECK}H${aimX + 16}Z`} fill="#fff1c2" opacity="0.1">
        {!reduced && (
          <animate
            attributeName="opacity"
            values="0.06;0.14;0.06"
            dur="5s"
            begin={`${-begin}s`}
            repeatCount="indefinite"
          />
        )}
      </path>
      <rect x={x - 1} y={top} width="2" height={HORIZON + 10 - top} fill="#3a2e3c" />
      <rect x={x - 1} y={top} width="1" height={HORIZON + 10 - top} fill="#7d6372" />
      <rect x={x - 5} y={top - 3} width="10" height="5" fill="#2b2230" />
      {[0, 3, 6].map((dx) => (
        <rect key={dx} x={x - 4 + dx} y={top - 2} width="2" height="3" fill="#fff6d6" />
      ))}
      <Blink x={x} y={top - 5} reduced={reduced} begin={begin} dur={2.2} />
    </g>
  );
}

export function LaunchPad({ children }: { children?: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <div className="absolute inset-0 overflow-clip bg-[#141833]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          {SKY.slice(0, -1).map((c, i) => (
            <pattern key={c} id={`dither-${i}`} width="2" height="2" patternUnits="userSpaceOnUse">
              <rect width="2" height="2" fill={c} />
              <rect width="1" height="1" fill={SKY[i + 1]} />
              <rect x="1" y="1" width="1" height="1" fill={SKY[i + 1]} />
            </pattern>
          ))}
        </defs>

        {/* sky bands with dithered seams */}
        {SKY.map((c, i) => (
          <rect key={c} x="0" y={i * BAND} width={W} height={BAND + 1} fill={c} />
        ))}
        {SKY.slice(0, -1).map((c, i) => (
          <rect
            key={c}
            x="0"
            y={(i + 1) * BAND - 1}
            width={W}
            height="2"
            fill={`url(#dither-${i})`}
          />
        ))}

        {/* stars */}
        {STAR_PIX.map((s, i) => (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.big ? 2 : 1}
            height={s.big ? 2 : 1}
            fill="#fff8e8"
            opacity={0.85 - s.y / 70}
            className={!reduced && i % 3 === 0 ? 'twinkle' : undefined}
            style={{ animationDuration: `${s.d}s` }}
          />
        ))}

        {/* a plane blinking across the high sky */}
        {!reduced && (
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="340 14;-30 22"
              dur="48s"
              repeatCount="indefinite"
            />
            <rect x="0" y="0" width="4" height="1" fill="#2b2238" />
            <Blink x={0} y={0} reduced={reduced} dur={1} />
            <Blink x={3} y={0} color="#7dff9a" reduced={reduced} dur={1} begin={0.5} />
          </g>
        )}

        {/* high wispy clouds */}
        {WISPS.map((w) => (
          <g key={w.x}>
            {!reduced && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0;10 0;0 0"
                dur="80s"
                repeatCount="indefinite"
              />
            )}
            <rect x={w.x} y={w.y} width={w.w} height="2" fill={w.c} />
            <rect x={w.x + 6} y={w.y - 1} width={w.w - 16} height="1" fill={w.c} />
            <rect
              x={w.x + 10}
              y={w.y + 2}
              width={w.w - 24}
              height="1"
              fill="#c47a86"
              opacity="0.6"
            />
          </g>
        ))}

        {/* low golden sun with banded halo */}
        <path d={disc(100, 100, 30)} fill="#ffd796" opacity="0.18" />
        <path d={disc(100, 100, 22)} fill="#ffe3aa" opacity="0.3" />
        <path d={disc(100, 100, 15)} fill="#fff0c8" />
        <path d={disc(98, 97, 10)} fill="#fffbea" />

        {/* cumulus clouds: shadow, body, sunlit edge */}
        {CLOUDS.map((c, i) => (
          <g key={i}>
            {!reduced && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values={`0 0;${c.drift} 0;0 0`}
                dur={`${c.dur}s`}
                repeatCount="indefinite"
              />
            )}
            <path d={blobs(c.blobs, 0, 3)} fill="#9c6280" />
            <path d={blobs(c.blobs)} fill="#d9958d" />
            <path d={blobs(c.blobs, -2, -2, 3)} fill="#f4b998" />
            <path d={blobs(c.blobs, -4, -4, 7)} fill="#ffdcb4" />
          </g>
        ))}

        {/* distant hills and haze */}
        <path d={FAR_HILLS} fill="#6c4a6c" />
        <rect x="0" y={HORIZON - 14} width={W} height="8" fill="#f2b98a" opacity="0.12" />

        {/* far-off spaceport: hangar, fuel spheres, water tower, masts */}
        <g fill="#3f2f4d">
          <rect x="4" y="116" width="26" height="36" />
          <rect x="4" y="116" width="26" height="2" fill="#5a4466" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <rect
                key={`${r}-${c}`}
                x={7 + c * 5}
                y={121 + r * 7}
                width="2"
                height="2"
                fill="#ffc874"
                opacity={(r + c) % 3 ? 0.9 : 0.35}
              />
            )),
          )}
          <path d={disc(42, 140, 6)} />
          <path d={disc(56, 141, 5)} />
          <rect x="38" y="144" width="1" height="8" />
          <rect x="46" y="144" width="1" height="8" />
          <rect x="53" y="144" width="1" height="8" />
          <rect x="59" y="144" width="1" height="8" />
          <rect x="268" y="118" width="16" height="10" />
          <rect x="268" y="118" width="16" height="2" fill="#5a4466" />
          <path
            d="M270 128L267 150M282 128L285 150M270 128L285 150M282 128L267 150"
            stroke="#3f2f4d"
            strokeWidth="1"
          />
          <rect x="292" y="100" width="6" height="52" />
          <path
            d="M292 104h6M292 112h6M292 120h6M292 128h6M292 136h6M292 144h6"
            stroke="#5a4466"
            strokeWidth="1"
          />
        </g>
        <Blink x={42} y={133} color="#ffd27a" reduced={reduced} dur={3} />
        <Blink x={295} y={98} reduced={reduced} begin={1.1} />
        {/* lightning masts with red warning lights */}
        {[
          [18, 72, 0],
          [120, 38, 0.6],
          [248, 34, 1.2],
          [306, 62, 0.3],
        ].map(([x, top, b]) => (
          <g key={x}>
            <rect x={x} y={top} width="1" height={HORIZON + 4 - top} fill="#2b2238" />
            <Blink x={x} y={top - 1} begin={b} reduced={reduced} />
          </g>
        ))}

        <path d={NEAR_HILLS} fill="#46324f" />

        {/* ground: banded concrete, service road with dashes */}
        {['#55424a', '#4a3a42', '#3e3139', '#33292f', '#2a2228', '#211b21'].map((c, i) => (
          <rect key={c} x="0" y={HORIZON + 2 + i * 5} width={W} height="6" fill={c} />
        ))}
        <rect x="0" y="169" width={W} height="8" fill="#2d262c" />
        <rect x="0" y="169" width={W} height="1" fill="#4a3f46" />
        {Array.from({ length: 27 }, (_, i) => (
          <rect key={i} x={i * 12 + 2} y="173" width="5" height="1" fill="#e8b84a" opacity="0.7" />
        ))}
        {/* pools of floodlight on the deck */}
        <path
          d={disc(160, 160, 34)}
          fill="#ffcf8a"
          opacity="0.08"
          transform="scale(1 0.25) translate(0 480)"
        />

        <Floodlight x={110} aimX={150} reduced={reduced} begin={0} />
        <Floodlight x={252} aimX={176} reduced={reduced} begin={2.4} />

        {/* water tower for the sound-suppression system */}
        <g>
          <rect x="86" y="120" width="14" height="12" fill="#b9a7a2" />
          <rect x="86" y="120" width="14" height="2" fill="#e9d9cf" />
          <rect x="86" y="130" width="14" height="2" fill="#8a7a80" />
          <rect x="89" y="124" width="8" height="3" fill="#3d6bd6" />
          <path
            d="M88 132L85 158M98 132L101 158M88 140L101 152M98 140L85 152"
            stroke="#5c4a56"
            strokeWidth="1"
          />
        </g>

        <Tower reduced={reduced} />

        {/* mobile launch platform under the rocket, with hazard stripes */}
        <rect x="124" y={DECK} width="72" height="8" fill="#4a3d48" />
        <rect x="124" y={DECK} width="72" height="1" fill="#9b8290" />
        <rect x="124" y={DECK + 1} width="72" height="1" fill="#6b5662" />
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i} x={124 + i * 4} y={DECK + 8} width="2" height="2" fill="#ffd23a" />
        ))}
        <rect x="124" y={DECK + 8} width="72" height="2" fill="#1b161c" opacity="0.5" />
        {[128, 150, 168, 188].map((lx) => (
          <rect key={lx} x={lx} y={DECK + 10} width="4" height="4" fill="#2b2230" />
        ))}
        {/* glowing flame trench */}
        <rect x="144" y={DECK + 10} width="32" height="3" fill="#ff8a3a" opacity="0.35">
          {!reduced && (
            <animate
              attributeName="opacity"
              values="0.2;0.45;0.2"
              dur="2.4s"
              repeatCount="indefinite"
            />
          )}
        </rect>
        <Steam x={128} reduced={reduced} />
        <Steam x={192} reduced={reduced} />

        {/* windsock */}
        <g>
          <rect x="266" y="146" width="1" height="18" fill="#7d6372" />
          <g>
            {!reduced && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="0 267 147;10 267 147;-4 267 147;0 267 147"
                dur="2.6s"
                repeatCount="indefinite"
              />
            )}
            <rect x="267" y="146" width="3" height="3" fill="#ff6a2a" />
            <rect x="270" y="146" width="3" height="3" fill="#ffffff" />
            <rect x="273" y="147" width="3" height="2" fill="#ff6a2a" />
          </g>
        </g>

        {/* ground crew */}
        <Worker
          x={70}
          y={161}
          helmet="#ffffff"
          vest="#ff7a1a"
          walk={34}
          dur={14}
          reduced={reduced}
        />
        <Worker
          x={214}
          y={161}
          helmet="#ffd23a"
          vest="#ff7a1a"
          walk={28}
          dur={11}
          begin={4}
          reduced={reduced}
        />
        <Worker x={118} y={160} helmet="#ffffff" vest="#3ddc84" wave reduced={reduced} />
        <Worker x={203} y={150} helmet="#ff4a3a" vest="#ffd23a" reduced={reduced} />
        <Worker
          x={240}
          y={162}
          helmet="#ffffff"
          vest="#5fb0ff"
          walk={-22}
          dur={9}
          begin={2}
          reduced={reduced}
        />

        <Truck reduced={reduced} />

        <Bird y={58} dur={34} begin={0} reduced={reduced} />
        <Bird y={64} dur={34} begin={1.2} reduced={reduced} />
        <Bird y={52} dur={34} begin={2.1} reduced={reduced} />
      </svg>
      {/* drifting low mist */}
      <motion.div
        className="pointer-events-none absolute inset-x-[-20%] bottom-[8%] h-[12%] bg-[radial-gradient(ellipse_at_center,rgba(255,226,200,0.18),transparent_70%)]"
        animate={reduced ? undefined : { x: ['-4%', '4%', '-4%'] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
      {children}
    </div>
  );
}
