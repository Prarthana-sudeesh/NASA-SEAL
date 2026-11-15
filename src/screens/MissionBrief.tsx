import { useGame } from '../store/game.ts';
import { getPlanet, DATA_SOURCE, FALLBACK, ROCKY_RADIUS_LIMIT } from '../data/planets.ts';
import { PLANET_FACTS } from '../data/planet-facts.ts';
import { requirements } from '../engine/mission.ts';
import { ASSUMPTIONS } from '../engine/constants.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { Card, ScreenTitle, ProvBadge, ExtLink, Redirect } from '../ui/bits.tsx';
import { PlanetArt } from '../ui/PlanetArt.tsx';
import { Button } from '../ui/Button.tsx';
import { CassSays } from '../ui/Cass.tsx';
import type { Provenance } from '../data/types.ts';

const nm = 'not measured';
const f = (n: number | null | undefined, d = 2, unit = '') => (n === null || n === undefined ? nm : `${n.toLocaleString('en-US', { maximumFractionDigits: d })}${unit}`);

function Row({ k, v, p, note }: { k: string; v: string; p?: Provenance; note?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-white/10 py-1.5 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">
        <span className={`font-mono font-bold ${v === nm ? 'text-muted italic' : ''}`}>{v}</span> {p && <ProvBadge p={p} short />}
        {note && <span className="block text-xs text-amber">{note}</span>}
      </dd>
    </div>
  );
}

export function MissionBrief() {
  const { planetId, go, difficulty } = useGame();
  const p = planetId ? getPlanet(planetId) : undefined;
  if (!p) return <Redirect to="destinations" />;
  const a = p.archive;
  const req = requirements(p);
  const cfg = DIFFICULTIES[difficulty ?? 'easy'];
  const fact = PLANET_FACTS[p.id];
  const massNote = p.massEarth.note;

  return (
    <div>
      <ScreenTitle kicker={`Step 3 of 3 · Mission brief`} title={p.nickname}>
        <span className="font-mono text-cream">{p.officialName}</span>
        {p.iauName && <span> · IAU name {p.iauName}</span>} · {p.missionType === 'land' ? 'Land and come home' : 'Orbit survey and come home'}
      </ScreenTitle>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr_1fr]">
        <div className="flex flex-col items-center gap-4">
          <PlanetArt planet={p} size={250} />
          {fact?.fact && (
            <p className="sticker-sm bg-panel p-3 text-center">
              💡 {fact.fact}{' '}
              <ExtLink href={fact.source!} className="text-sm">
                NASA source
              </ExtLink>
            </p>
          )}
        </div>

        <Card tiltKey={`${p.id}-nasa`} as="section" className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-display text-2xl text-cyan">🛰️ Real NASA data</h2>
          <p className="mb-3 text-sm text-muted">
            Source: {DATA_SOURCE.name}, table <code>{DATA_SOURCE.table}</code>, retrieved {DATA_SOURCE.retrievedAt}. <ExtLink href={p.overviewUrl}>Archive page</ExtLink>
          </p>
          <dl>
            <Row k="Official name" v={a.pl_name} />
            <Row k="Host star" v={a.hostname ?? nm} />
            <Row k="Distance" v={a.sy_dist === null ? nm : `${f(a.sy_dist, 2)} parsecs`} p="nasa" />
            <Row k="…in light-years (× 3.2616)" v={`${f(p.distanceLy.value, 1)} ly`} p={p.distanceLy.provenance} />
            <Row k="Radius" v={f(a.pl_rade, 2, ' × Earth')} p="nasa" />
            <Row k="Mass" v={f(a.pl_bmasse, 2, ' × Earth')} p="nasa" note={massNote ? `Estimated: ${massNote}` : undefined} />
            <Row k="Temperature (equilibrium)" v={f(a.pl_eqt, 0, ' K')} p="nasa" />
            <Row k="Year length" v={f(a.pl_orbper, 2, ' days')} p="nasa" />
            <Row k="Distance from its star" v={f(a.pl_orbsmax, 4, ' AU')} p="nasa" />
            <Row k="Star type" v={a.st_spectype ?? nm} />
            <Row k="Stars / planets in system" v={`${a.sy_snum ?? '?'} / ${a.sy_pnum ?? '?'}`} />
            <Row k="Discovered" v={`${a.disc_year ?? '?'} · ${a.discoverymethod ?? '?'}`} />
            <Row k="Discovery facility" v={a.disc_facility ?? nm} />
            <Row k="Atmosphere" v={nm} />
          </dl>
          <h3 className="mt-4 font-display text-lg text-plume">Calculated from NASA data</h3>
          <dl>
            <Row k="Surface gravity = M ÷ R²" v={`${f(p.gravityG.value, 2)} g`} p={p.gravityG.provenance} />
            <Row k="Orbital speed ≈ 7.9 × √(M ÷ R)" v={`${f(p.orbitalSpeedKms.value, 1)} km/s`} p={p.orbitalSpeedKms.provenance} />
          </dl>
        </Card>

        <Card tiltKey={`${p.id}-game`} as="section" className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl text-magenta">🎲 Game assumptions</h2>
          <ul className="space-y-2.5 text-[0.97rem]">
            <li>
              <b>Planet type.</b> {p.typeReason} <span className="text-muted">(The {ROCKY_RADIUS_LIMIT} Earth-radius rule is a gameplay simplification.)</span>
            </li>
            {a.pl_eqt === null && <li><b>Temperature</b> not measured: the game assumes {FALLBACK.tempK} K.</li>}
            <li><b>Atmosphere</b> is not measured, so the game doesn’t use it.</li>
            <li>
              <b>Deep-Space Drive.</b> No real spacecraft can reach another star in a human lifetime: Voyager 1 would need tens of thousands of years for even the nearest one. The game uses an imaginary drive with a range of at least {ASSUMPTIONS.driveRoundTrip.value}× the distance (there and back).
            </li>
            {(['earthLaunchKms', 'orbitRefuel', p.missionType === 'land' ? 'surfaceRefuel' : 'orbitBurnFraction', p.missionType === 'land' ? 'landingBurnFraction' : null, p.missionType === 'land' ? 'ascentFactor' : null, 'returnCorrectionKms', 'marginFactor'] as const)
              .filter((k): k is NonNullable<typeof k> => !!k)
              .map((k) => (
                <li key={k}>
                  <b>{ASSUMPTIONS[k].label}.</b> {ASSUMPTIONS[k].why}
                </li>
              ))}
            {!cfg.checks.comms && <li><b>{cfg.label} simplification.</b> Comms, heat, pressure and radiation checks pass automatically at this level.</li>}
          </ul>
        </Card>
      </div>

      <Card tiltKey={`${p.id}-req`} as="section" className="mt-8 p-6">
        <h2 className="mb-3 font-display text-2xl text-plume">What your rocket must do</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Req icon="🚀" title="Climb to Earth orbit" big={`${req.earthLegKms.toFixed(1)} km/s`} small="of rocket power (9.4 km/s + 10% margin)" />
          <Req
            icon={p.missionType === 'land' ? '🛬' : '🛰️'}
            title={p.missionType === 'land' ? 'Land, refuel, take off and fly home' : 'Orbit, survey, and fly home'}
            big={`${req.deepNeededKms.toFixed(1)} km/s`}
            small="of rocket power after refuelling in orbit"
          />
          <Req icon="🌌" title="Deep-Space Drive range" big={`${Math.ceil(req.driveRangeLy).toLocaleString('en-US')} ly`} small={`there and back (${p.distanceLy.value.toFixed(1)} ly each way)`} />
          <Req
            icon="🔥"
            title="Shield and comms"
            big={`${Math.round(req.shieldTempK).toLocaleString('en-US')} K`}
            small={cfg.checks.heat ? `shield rating, plus comms reaching ${p.distanceLy.value.toFixed(1)} ly` : 'checked from Engineer level up'}
          />
        </div>
        <CassSays
          className="mt-6"
          mood="thinking"
          text={`You'll need about ${Math.max(req.earthLegKms, req.deepNeededKms).toFixed(1)} km/s of rocket power for the toughest chemical part of the trip. ${p.missionType === 'land' ? 'Landing and taking off again is the hard bit!' : 'Getting off Earth is the hard bit!'}`}
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => go('workshop')} data-testid="to-workshop">
            🔧 To the rocket workshop
          </Button>
          <Button variant="ghost" onClick={() => go('destinations')}>
            ← Pick another planet
          </Button>
        </div>
      </Card>
    </div>
  );
}

function Req({ icon, title, big, small }: { icon: string; title: string; big: string; small: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-space/70 p-4">
      <p className="text-muted">
        <span aria-hidden="true">{icon}</span> {title}
      </p>
      <p className="font-mono text-3xl font-bold text-cream">{big}</p>
      <p className="text-sm text-muted">{small}</p>
    </div>
  );
}
