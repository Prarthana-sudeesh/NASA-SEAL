import { useId, type ReactNode } from 'react';
import type { Planet } from '../data/types.ts';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Temperature → base colour (cold blue/white → temperate teal/green → hot orange → lava red). */
export function tempColor(T: number): { base: string; dark: string; light: string } {
  if (T < 180) return { base: '#9fd3f5', dark: '#3b6b93', light: '#f2fbff' };
  if (T < 240) return { base: '#6fb7d6', dark: '#2c5a78', light: '#d8f1ff' };
  if (T < 330) return { base: '#4fae8f', dark: '#1f5a59', light: '#bfeedd' };
  if (T < 500) return { base: '#c9a46a', dark: '#6b4a2a', light: '#f3dcae' };
  if (T < 900) return { base: '#e07a3a', dark: '#6e2a12', light: '#ffc08a' };
  return { base: '#ff5a2a', dark: '#4a0d06', light: '#ffd27a' };
}

interface Props {
  planet: Planet;
  size?: number;
  className?: string;
  decorative?: boolean;
  /** Seconds for one full turn of the surface. Omit (or 0) for a still planet. */
  spinSeconds?: number;
}

/** Endless sideways scroll of one 100-unit-wide surface tile (drawn twice, so it wraps seamlessly). */
function Spin({ seconds, children }: { seconds?: number; children: (dx: number) => ReactNode }) {
  return (
    <g>
      {seconds ? (
        <animateTransform
          attributeName="transform"
          type="translate"
          from="0 0"
          to="-100 0"
          dur={`${seconds}s`}
          repeatCount="indefinite"
        />
      ) : null}
      {children(0)}
      {children(100)}
    </g>
  );
}

/**
 * Procedurally generated planet, tinted by equilibrium temperature. With `spinSeconds` the surface
 * (bands, storms, lava, clouds) turns on the planet's axis while the lighting stays fixed, so it
 * reads as a rotating world rather than a spinning disc.
 */
export function PlanetVisual({
  planet,
  size = 96,
  className = '',
  decorative = false,
  spinSeconds,
}: Props) {
  const uid = useId().replace(/:/g, '');
  const T = planet.eqTempK.value;
  const c = tempColor(T);
  const h = hash(planet.id);
  const atmo = planet.atmosphere.value;
  const bands = 3 + (h % 4);
  const tilt = (h % 40) - 20;
  const r = 40 + Math.min(8, planet.radiusEarth.value * 3);
  // Surface features stay inside x 10–90 of each tile so the wrap point never shows a seam.
  const spots = Array.from({ length: 3 + (h % 3) }, (_, i) => ({
    x: 14 + ((h >>> (i * 5)) % 72),
    y: 22 + ((h >>> (i * 3 + 1)) % 56),
    rx: 4 + ((h >>> (i * 2)) % 4),
    ry: 2 + ((h >>> (i * 4)) % 3),
    light: i % 2 === 0,
  }));
  const clouds = Array.from({ length: 4 }, (_, i) => ({
    x: 16 + ((h >>> (i * 6 + 2)) % 68),
    y: 18 + i * 17 + ((h >>> i) % 8),
    rx: 5 + ((h >>> (i * 3)) % 4),
  }));
  const hasClouds = atmo === 'thick' || atmo === 'earthlike';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={
        decorative ? undefined : `Illustration of ${planet.name}, about ${Math.round(T)} K`
      }
    >
      <defs>
        <radialGradient id={`g${uid}`} cx="35%" cy="35%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        <clipPath id={`c${uid}`}>
          <circle cx="50" cy="50" r={r} />
        </clipPath>
        <radialGradient id={`s${uid}`} cx="30%" cy="30%" r="90%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
      </defs>
      {(atmo === 'thick' || atmo === 'earthlike') && (
        <circle
          cx="50"
          cy="50"
          r={r + 4}
          fill="none"
          stroke={c.light}
          strokeOpacity="0.35"
          strokeWidth="4"
        />
      )}
      {atmo === 'scorching' && <circle cx="50" cy="50" r={r + 5} fill="#ff6a2a" opacity="0.18" />}
      <circle cx="50" cy="50" r={r} fill={`url(#g${uid})`} />
      <g clipPath={`url(#c${uid})`}>
        <g transform={`rotate(${tilt} 50 50)`}>
          <Spin seconds={spinSeconds}>
            {(dx) => (
              <g key={dx} transform={`translate(${dx} 0)`}>
                {Array.from({ length: bands }, (_, i) => (
                  <rect
                    key={`b${i}`}
                    x="0"
                    y={14 + i * (72 / bands) + ((h >>> (i * 3)) % 6)}
                    width="100"
                    height={3 + ((h >>> (i * 2)) % 5)}
                    fill={i % 2 ? c.dark : c.light}
                    opacity="0.22"
                  />
                ))}
                {spots.map((p, i) => (
                  <ellipse
                    key={`s${i}`}
                    cx={p.x}
                    cy={p.y}
                    rx={p.rx}
                    ry={p.ry}
                    fill={p.light ? c.light : c.dark}
                    opacity="0.35"
                  />
                ))}
                {atmo === 'scorching' &&
                  [0, 1, 2, 3].map((i) => (
                    <circle
                      key={`l${i}`}
                      cx={25 + ((h >>> (i * 4)) % 50)}
                      cy={25 + ((h >>> (i * 5)) % 50)}
                      r={3 + (i % 3)}
                      fill="#ffe08a"
                      opacity="0.65"
                    />
                  ))}
              </g>
            )}
          </Spin>
          {hasClouds && (
            // Clouds drift a little faster than the ground beneath them.
            <Spin seconds={spinSeconds ? spinSeconds * 0.7 : undefined}>
              {(dx) => (
                <g key={dx} transform={`translate(${dx} 0)`}>
                  {clouds.map((k, i) => (
                    <ellipse
                      key={i}
                      cx={k.x}
                      cy={k.y}
                      rx={k.rx}
                      ry="1.6"
                      fill="#ffffff"
                      opacity="0.4"
                    />
                  ))}
                </g>
              )}
            </Spin>
          )}
        </g>
        {atmo === 'frozen' && (
          <>
            <ellipse cx="50" cy={50 - r + 6} rx={r * 0.7} ry="9" fill="#ffffff" opacity="0.8" />
            <ellipse cx="50" cy={50 + r - 6} rx={r * 0.6} ry="7" fill="#ffffff" opacity="0.7" />
          </>
        )}
      </g>
      <circle cx="50" cy="50" r={r} fill={`url(#s${uid})`} />
    </svg>
  );
}
