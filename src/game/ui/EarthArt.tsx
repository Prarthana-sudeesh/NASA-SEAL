// A recognisable, slowly turning Earth: oceans, continents, clouds, ice caps and a glowing
// atmosphere. Original stylised artwork.
import { useId } from 'react';

// Continents on a 200-wide strip (drawn twice so the planet can turn seamlessly).
const LAND = [
  // a long north–south continent with a narrow middle
  'M18 22 C24 14 38 14 44 20 C48 26 40 30 42 36 C44 40 36 42 34 46 C40 50 46 56 44 66 C42 76 36 84 30 86 C28 78 30 70 26 62 C22 54 18 48 22 40 C16 34 14 28 18 22 Z',
  // a big northern landmass
  'M78 16 C92 10 120 12 138 18 C150 22 156 30 148 34 C140 38 130 34 122 40 C116 44 108 40 100 42 C92 44 86 38 80 34 C74 30 72 22 78 16 Z',
  // a wide southern continent below it
  'M88 46 C98 42 108 46 112 54 C116 62 110 72 104 78 C98 84 92 80 90 72 C88 64 82 58 88 46 Z',
  // islands and a small southern continent
  'M140 60 C148 56 160 58 162 66 C164 72 154 76 146 74 C140 72 136 66 140 60 Z',
  'M60 52 C63 50 66 52 65 56 C63 58 59 56 60 52 Z',
  'M166 40 C170 38 174 41 172 45 C169 47 165 44 166 40 Z',
];
const CLOUDS = [
  'M10 30 Q30 26 50 31 Q35 34 10 30 Z',
  'M60 58 Q85 52 110 59 Q84 63 60 58 Z',
  'M120 26 Q140 22 165 28 Q142 31 120 26 Z',
  'M150 70 Q170 66 195 72 Q172 75 150 70 Z',
  'M30 74 Q46 70 64 75 Q46 78 30 74 Z',
  'M84 18 Q100 14 118 19 Q100 22 84 18 Z',
];

export function EarthArt({
  className = '',
  spinSeconds,
}: {
  className?: string;
  /** Seconds for one full turn; omit for a still Earth. */
  spinSeconds?: number;
}) {
  const id = useId().replace(/:/g, '');
  const tile = (dx: number, paths: string[], fill: string, extra?: string) => (
    <g transform={`translate(${dx} 0)`}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill={fill} stroke={extra} strokeWidth={extra ? 1.2 : 0} />
      ))}
    </g>
  );
  const spin = (seconds: number | undefined) =>
    seconds ? (
      <animateTransform
        attributeName="transform"
        type="translate"
        from="0 0"
        to="-200 0"
        dur={`${seconds}s`}
        repeatCount="indefinite"
      />
    ) : null;
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <radialGradient id={`ocean${id}`} cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#5cc2ff" />
          <stop offset="0.55" stopColor="#1f6fd0" />
          <stop offset="1" stopColor="#0b2f78" />
        </radialGradient>
        <radialGradient id={`air${id}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.86" stopColor="#7fd0ff" stopOpacity="0" />
          <stop offset="0.93" stopColor="#7fd0ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7fd0ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`night${id}`} cx="0.28" cy="0.28" r="0.95">
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#020616" stopOpacity="0.75" />
        </radialGradient>
        <clipPath id={`clip${id}`}>
          <circle cx="50" cy="50" r="44" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#air${id})`} />
      <circle cx="50" cy="50" r="44" fill={`url(#ocean${id})`} />
      <g clipPath={`url(#clip${id})`}>
        <g transform="translate(6 6) scale(0.88)">
          <g>
            {spin(spinSeconds)}
            {tile(0, LAND, '#3f9a4a', '#2c7a38')}
            {tile(200, LAND, '#3f9a4a', '#2c7a38')}
            {/* deserts and mountains */}
            {[0, 200].map((dx) => (
              <g key={dx} transform={`translate(${dx} 0)`} fill="#c9a865" opacity="0.85">
                <ellipse cx="104" cy="56" rx="7" ry="5" />
                <ellipse cx="120" cy="28" rx="9" ry="3.5" />
                <ellipse cx="34" cy="68" rx="3" ry="6" />
              </g>
            ))}
          </g>
          <g>
            {spin(spinSeconds ? spinSeconds * 0.75 : undefined)}
            {tile(0, CLOUDS, '#ffffff')}
            {tile(200, CLOUDS, '#ffffff')}
          </g>
        </g>
        {/* ice caps */}
        <ellipse cx="50" cy="7" rx="26" ry="7" fill="#f4fbff" />
        <ellipse cx="50" cy="94" rx="30" ry="8" fill="#f4fbff" />
        <circle cx="50" cy="50" r="44" fill={`url(#night${id})`} />
      </g>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#bfe8ff" strokeWidth="0.8" opacity="0.7" />
    </svg>
  );
}
