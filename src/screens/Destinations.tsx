import { useMemo, useState } from 'react';
import { useGame } from '../store/game.ts';
import { PLANETS, DATA_SOURCE } from '../data/planets.ts';
import { PLANET_FACTS } from '../data/planet-facts.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { planetChallenge } from '../engine/challenge.ts';
import type { Planet } from '../data/types.ts';
import { Card, ScreenTitle, ExtLink } from '../ui/bits.tsx';
import { PlanetArt } from '../ui/PlanetArt.tsx';
import { Button } from '../ui/Button.tsx';
import { play } from '../audio/audio.ts';

type Range = 'all' | 'near' | 'mid' | 'far';
type Temp = 'all' | 'mild' | 'warm' | 'hot';
type Size = 'all' | 'small' | 'big';

const fmt = (n: number, d = 1) => n.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

function Chip<T extends string>({ value, current, set, children }: { value: T; current: T; set: (v: T) => void; children: React.ReactNode }) {
  const on = value === current;
  return (
    <button
      className={`rounded-full border-2 border-ink px-3 py-1 text-sm font-bold transition ${on ? 'bg-cyan text-ink shadow-[2px_2px_0_#000]' : 'bg-panel-2 text-cream hover:bg-panel'}`}
      aria-pressed={on}
      onClick={() => {
        play('ui_click');
        set(value);
      }}
    >
      {children}
    </button>
  );
}

const LEVEL_CLS = ['', 'bg-go text-ink', 'bg-plume text-ink', 'bg-danger text-ink'];

export function PlanetCard({ p, onPick }: { p: Planet; onPick?: () => void }) {
  const diff = useGame((s) => s.difficulty) ?? 'easy';
  const ch = planetChallenge(p, diff);
  const fact = PLANET_FACTS[p.id];
  return (
    <Card tiltKey={p.id} hover as="article" className="flex flex-col p-4" data-testid={`planet-${p.id}`}>
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full border-2 border-ink px-2 py-0.5 text-xs font-extrabold uppercase ${LEVEL_CLS[ch.level]}`} title={ch.why}>
          {ch.label}
        </span>
        <span className="text-xs text-muted">{p.missionType === 'land' ? '🛬 Land & return' : '🛰️ Orbit survey'}</span>
      </div>
      <div className="my-2 grid place-items-center" style={{ height: 150 }}>
        <PlanetArt planet={p} size={150} label={false} />
      </div>
      <p className="text-[0.7rem] font-bold uppercase tracking-wide text-muted">Mission nickname (made up for this game)</p>
      <h2 className="font-display text-2xl font-bold text-plume">{p.nickname}</h2>
      <p className="font-mono text-base text-cream">
        {p.officialName}
        {p.iauName && <span className="text-muted"> · IAU name: {p.iauName}</span>}
      </p>
      <dl className="my-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-space/70 p-2">
          <dt className="text-xs text-muted">Distance</dt>
          <dd className="font-mono font-bold">{fmt(p.distanceLy.value, p.distanceLy.value < 100 ? 1 : 0)} ly</dd>
        </div>
        <div className="rounded-xl bg-space/70 p-2">
          <dt className="text-xs text-muted">Temperature</dt>
          <dd className="font-mono font-bold">{p.archive.pl_eqt === null ? 'not measured' : `${fmt(p.tempK.value, 0)} K`}</dd>
        </div>
        <div className="rounded-xl bg-space/70 p-2">
          <dt className="text-xs text-muted">Gravity</dt>
          <dd className="font-mono font-bold">{fmt(p.gravityG.value, 2)} g</dd>
        </div>
      </dl>
      {fact?.fact && <p className="mb-3 text-[0.98rem] leading-snug">💡 {fact.fact}</p>}
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <ExtLink href={p.overviewUrl}>Archive page</ExtLink>
        {fact?.catalogUrl ? <ExtLink href={fact.catalogUrl}>NASA catalogue</ExtLink> : <ExtLink href={p.catalogSearchUrl}>NASA catalogue search</ExtLink>}
      </div>
      {onPick && (
        <Button className="mt-3 w-full" onClick={onPick} data-testid={`pick-${p.id}`}>
          Plan this mission →
        </Button>
      )}
    </Card>
  );
}

export function Destinations() {
  const { difficulty, choosePlanet, go } = useGame();
  const d = difficulty ?? 'easy';
  const [range, setRange] = useState<Range>('all');
  const [temp, setTemp] = useState<Temp>('all');
  const [size, setSize] = useState<Size>('all');
  const list = useMemo(
    () =>
      PLANETS.filter((p) => p.tier === d)
        .filter((p) => {
          const ly = p.distanceLy.value;
          if (range === 'near' && ly >= 20) return false;
          if (range === 'mid' && (ly < 20 || ly > 200)) return false;
          if (range === 'far' && ly <= 200) return false;
          const T = p.tempK.value;
          if (temp === 'mild' && T > 350) return false;
          if (temp === 'warm' && (T <= 350 || T > 1500)) return false;
          if (temp === 'hot' && T <= 1500) return false;
          if (size === 'small' && p.radiusEarth.value > 1.6) return false;
          if (size === 'big' && p.radiusEarth.value <= 1.6) return false;
          return true;
        })
        .sort((a, b) => a.distanceLy.value - b.distanceLy.value),
    [d, range, temp, size],
  );
  return (
    <div>
      <ScreenTitle kicker={`Step 2 of 3 · ${DIFFICULTIES[d].label}`} title="Choose your destination">
        Real planets from NASA’s catalogue. Nicknames are made up for the game; the official names and numbers are NASA’s.
      </ScreenTitle>
      <div className="sticker-sm mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 bg-panel p-3" role="group" aria-label="Filters">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-muted">Distance</span>
          <Chip value="all" current={range} set={setRange}>Any</Chip>
          <Chip value="near" current={range} set={setRange}>&lt; 20 ly</Chip>
          <Chip value="mid" current={range} set={setRange}>20–200 ly</Chip>
          <Chip value="far" current={range} set={setRange}>&gt; 200 ly</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-muted">Temperature</span>
          <Chip value="all" current={temp} set={setTemp}>Any</Chip>
          <Chip value="mild" current={temp} set={setTemp}>Mild</Chip>
          <Chip value="warm" current={temp} set={setTemp}>Hot</Chip>
          <Chip value="hot" current={temp} set={setTemp}>Scorching</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-muted">Size</span>
          <Chip value="all" current={size} set={setSize}>Any</Chip>
          <Chip value="small" current={size} set={setSize}>Earth-ish</Chip>
          <Chip value="big" current={size} set={setSize}>Big</Chip>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-lg text-muted">No planets match those filters. Try “Any”.</p>
      ) : (
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => (
            <PlanetCard
              key={p.id}
              p={p}
              onPick={() => {
                choosePlanet(p.id);
                go('brief');
              }}
            />
          ))}
        </div>
      )}
      <p className="mt-8 text-sm text-muted">
        Data: {DATA_SOURCE.name} (<code>{DATA_SOURCE.table}</code>), retrieved {DATA_SOURCE.retrievedAt}. Planet illustrations are generated by the game, not images of the planets.
      </p>
    </div>
  );
}
