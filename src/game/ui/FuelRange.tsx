import { motion } from 'framer-motion';
import { Badge } from '../../components/Badge.tsx';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import type { Planet } from '../../data/types.ts';
import { fuelLoad, fuelNeeded, parts, type Build, type Dials } from '../engine.ts';

/** How far the loaded fuel gets the rocket: Earth → planet → home. */
export function FuelRange({
  build,
  dials,
  planet,
}: {
  build: Build;
  dials: Dials;
  planet: Planet;
}) {
  const p = parts(build);
  if (!p) return null;
  const need = fuelNeeded(p, build.crew, dials, planet);
  const have = fuelLoad(p, dials);
  const frac = need > 0 ? have / need : 0;
  const shown = Math.min(1, frac);
  const roundTrip = planet.distanceLy.value * 2;
  const reachLy = Math.min(roundTrip, frac * roundTrip);
  const fmt = (n: number) => (n >= 10 ? Math.round(n).toLocaleString() : n.toFixed(1));
  const status =
    frac >= 1
      ? {
          text: `Enough for the whole round trip, with ${Math.round((frac - 1) * 100)}% to spare.`,
          color: 'text-ok',
        }
      : frac >= 0.5
        ? {
            text: `Reaches ${planet.name}, but runs dry about ${fmt(reachLy)} of ${fmt(roundTrip)} light-years into the trip.`,
            color: 'text-warn',
          }
        : {
            text: `Runs dry before ${planet.name}: about ${fmt(reachLy)} of ${fmt(roundTrip)} light-years.`,
            color: 'text-[#ff8a8a]',
          };
  return (
    <section
      aria-label="Fuel range"
      className="rounded-lg border-2 border-white/30 bg-[#0b2a52]/80 p-[0.8vw] text-[clamp(8px,0.85vw,12px)] text-white backdrop-blur"
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <h2 className="font-pixel text-[clamp(7px,0.75vw,10px)] uppercase tracking-wider text-[#ffe24a]">
          ⛽ Fuel range
        </h2>
        <Badge source="model" />
      </div>
      <div className="relative mx-[6%] mb-1 mt-[clamp(14px,1.6vw,22px)] h-[clamp(8px,0.9vw,12px)]">
        <div className="absolute inset-0 rounded-full bg-white/15" />
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${frac >= 1 ? 'bg-[linear-gradient(90deg,#ffb35a,#3ddc84)]' : 'bg-[linear-gradient(90deg,#ffb35a,#ff6b4a)]'}`}
          animate={{ width: `${shown * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        />
        {/* Earth, the planet (halfway) and home again */}
        <span
          className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(12px,1.4vw,18px)]"
          aria-hidden="true"
        >
          🌍
        </span>
        <span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <PlanetVisual planet={planet} size={22} decorative />
        </span>
        <span
          className="absolute left-full top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(12px,1.4vw,18px)]"
          aria-hidden="true"
        >
          🏠
        </span>
        <motion.span
          className="absolute -top-[clamp(14px,1.6vw,22px)] -translate-x-1/2 text-[clamp(12px,1.3vw,18px)]"
          animate={{ left: `${shown * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          aria-hidden="true"
        >
          {frac >= 1 ? '🚀' : '🪫'}
        </motion.span>
      </div>
      <p className={`mt-2 font-semibold ${status.color}`} role="status">
        {status.text}
      </p>
      <p className="text-[#b9d8ff]">
        Loaded {have.toFixed(1)} t · trip needs {need.toFixed(1)} t. More thrust burns more fuel.
      </p>
    </section>
  );
}
