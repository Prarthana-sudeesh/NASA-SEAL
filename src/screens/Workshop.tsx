import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/game.ts';
import { useCalm, useSettings } from '../store/settings.ts';
import { getPlanet } from '../data/planets.ts';
import {
  ALL_PARTS,
  CATEGORY_LABEL,
  PROPELLANT_LABEL,
  SLOTS,
  getPart,
  type Category,
  type Part,
  type SlotDef,
  type SlotId,
} from '../data/components.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { telemetry, cassHint, type Stat, type Level } from '../engine/telemetry.ts';
import { rocketStats, resolveParts } from '../engine/rocket.ts';
import { suggestedBuild } from '../engine/suggest.ts';
import { RocketArt } from '../workshop/RocketArt.tsx';
import { CassSays } from '../ui/Cass.tsx';
import { Button } from '../ui/Button.tsx';
import { ImaginaryBadge, Redirect, announce, LiveNumber } from '../ui/bits.tsx';
import { play } from '../audio/audio.ts';
import { crewMultiplier } from '../engine/score.ts';

const TABS: { id: Category; icon: string }[] = [
  { id: 'payload', icon: '🧑‍🚀' },
  { id: 'thrusters', icon: '🔥' },
  { id: 'tanks', icon: '🛢️' },
  { id: 'comms', icon: '📡' },
  { id: 'pressure', icon: '🎈' },
  { id: 'shield', icon: '🛡️' },
];

const LEVEL_CLS: Record<Level, string> = {
  good: 'bg-go text-ink',
  warn: 'bg-amber text-ink',
  bad: 'bg-danger text-ink',
  auto: 'bg-panel-2 text-muted',
  empty: 'bg-panel-2 text-muted',
};
const LEVEL_LABEL: Record<Level, string> = { good: 'OK', warn: 'Check', bad: 'Problem', auto: 'Auto', empty: '—' };

function partStats(p: Part): string[] {
  switch (p.kind) {
    case 'pod':
      return [`${p.seats} seat${p.seats === 1 ? '' : 's'}`, p.lifeSupport ? 'life support' : 'robotic'];
    case 'engine':
      return [`${p.thrustKN.toLocaleString('en-US')} kN`, `Isp ${p.ispS}/${p.ispVacS} s`, PROPELLANT_LABEL[p.propellant]];
    case 'drive':
      return [`${p.rangeLy.toLocaleString('en-US')} ly range`];
    case 'tank':
      return [`${p.propellantKg / 1000} t fuel`, `${p.massKg / 1000} t empty`, PROPELLANT_LABEL[p.propellant]];
    case 'comms':
      return [`${p.rangeLy.toLocaleString('en-US')} ly`];
    case 'pressure':
      return [`holds ${p.capacityKg / 1000} t`, p.suits.map((s) => PROPELLANT_LABEL[s].split(' ')[0]).join(' / ')];
    case 'shield':
      return [`${p.maxTempK.toLocaleString('en-US')} K`, p.reentryRated ? 're-entry ✓' : 'no re-entry', `radiation ${p.radiation}`];
  }
}

function fitsSlot(part: Part, slot: SlotDef, engineProp?: string) {
  if (part.kind !== slot.kind) return false;
  if (part.kind === 'tank' && engineProp && part.propellant !== engineProp) return false;
  return true;
}

function PartCard({ part, selected, onSelect, onAdd }: { part: Part; selected: boolean; onSelect: () => void; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `part:${part.id}`, data: { partId: part.id } });
  return (
    <div
      ref={setNodeRef}
      className={`sticker-sm relative cursor-grab touch-none select-none bg-panel-2 p-3 transition ${isDragging ? 'opacity-40' : ''} ${selected ? 'ring-4 ring-cyan' : ''}`}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      aria-label={`${part.name}, $${part.cost}M. Press space to pick up, or use the Add button.`}
      aria-pressed={selected}
      data-testid={`part-${part.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-display text-lg leading-tight text-cream">{part.name}</h4>
        <span className="shrink-0 rounded-lg border-2 border-ink bg-plume px-1.5 font-mono text-sm font-bold text-ink">${part.cost}M</span>
      </div>
      {part.fictional && <ImaginaryBadge />}
      <p className="mt-1 text-sm text-muted">{part.funDescription}</p>
      <p className="mt-1 flex flex-wrap gap-1">
        <span className="rounded bg-space px-1.5 font-mono text-xs">{(part.massKg / 1000).toLocaleString('en-US')} t</span>
        {partStats(part).map((s) => (
          <span key={s} className="rounded bg-space px-1.5 font-mono text-xs">
            {s}
          </span>
        ))}
      </p>
      <button
        className="btn mt-2 bg-cyan px-2 py-0.5 text-sm text-ink"
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onAdd();
        }}
        aria-label={`Add ${part.name} to the rocket`}
        data-testid={`add-${part.id}`}
      >
        + Add
      </button>
    </div>
  );
}

function InstalledChip({ slotId, part, onRemove }: { slotId: SlotId; part: Part; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `slotpart:${slotId}`, data: { partId: part.id, fromSlot: slotId } });
  const calm = useCalm();
  return (
    <motion.div
      key={part.id}
      initial={calm ? false : { scaleX: 1.25, scaleY: 0.7 }}
      animate={{ scaleX: 1, scaleY: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 14 }}
      className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border-2 border-ink bg-cream px-2.5 py-1 text-ink ${isDragging ? 'opacity-40' : ''}`}
    >
      <span ref={setNodeRef} {...listeners} {...attributes} className="min-w-0 flex-1 cursor-grab touch-none truncate font-display font-bold" aria-label={`${part.name} fitted. Drag out to remove.`}>
        {part.name}
      </span>
      <span className="font-mono text-sm">${part.cost}M</span>
      <button
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-danger font-bold text-ink"
        aria-label={`Remove ${part.name}`}
        onClick={onRemove}
        data-testid={`remove-${slotId}`}
      >
        ✕
      </button>
    </motion.div>
  );
}

function SlotBox({ slot, part, valid, dim, onTap, onRemove }: { slot: SlotDef; part?: Part; valid: boolean; dim: boolean; onTap: () => void; onRemove: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot:${slot.id}`, data: { slot: slot.id } });
  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      className={`relative flex min-h-[3.1rem] items-center gap-2 rounded-2xl border-[3px] border-dashed px-2 py-1 transition ${part ? 'border-solid border-ink bg-panel' : 'border-cyan/60 bg-space/50'} ${valid ? 'slot-valid' : ''} ${dim ? 'opacity-35' : ''} ${isOver && valid ? 'scale-[1.03] bg-cyan/20' : ''}`}
      data-testid={`slot-${slot.id}`}
      role="group"
      aria-label={`${slot.label} slot${slot.required ? ' (required)' : ''}: ${part ? part.name : 'empty'}`}
    >
      <p className="w-[5.6rem] shrink-0 text-[0.66rem] font-extrabold uppercase leading-tight tracking-wide text-cyan">
        {slot.label}
        {slot.required && !part && <span className="block text-amber">required</span>}
      </p>
      {part ? <InstalledChip slotId={slot.id} part={part} onRemove={onRemove} /> : <p className="text-sm text-muted">{valid ? 'Drop or tap to fit here' : 'Empty'}</p>}
    </div>
  );
}

function StatRow({ s, explain }: { s: Stat; explain: boolean }) {
  const [open, setOpen] = useState(false);
  const pct = Math.max(0, Math.min(1, s.ratio / 1.6));
  return (
    <li
      className="relative rounded-xl bg-space/60 px-3 py-2"
      tabIndex={0}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      data-testid={`stat-${s.id}`}
      data-level={s.level}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{s.friendly}</span>
        <span className={`rounded-full border-2 border-ink px-2 text-xs font-extrabold uppercase ${LEVEL_CLS[s.level]}`}>{LEVEL_LABEL[s.level]}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2 font-mono">
        <span className="text-lg font-bold text-cream">{s.value}</span>
        <span className="text-sm text-muted">{s.target}</span>
      </div>
      {!['crew', 'cost', 'mass', 'pressure', 'radiation'].includes(s.id) && s.level !== 'auto' && s.level !== 'empty' && (
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-black/50" aria-hidden="true">
          <div className="relative h-full" style={{ width: `${pct * 100}%`, background: s.level === 'good' ? '#5BD982' : s.level === 'warn' ? '#FFB547' : '#FF5A5F', transition: 'width .4s' }} />
          <div className="relative -mt-2 h-2 w-0.5 bg-cream" style={{ marginLeft: `${(1 / 1.6) * 100}%` }} />
        </div>
      )}
      {explain && open && (
        <div className="sticker absolute right-full top-0 z-30 mr-3 hidden w-72 bg-cream p-3 text-sm text-ink lg:block" role="tooltip">
          <p className="font-display text-base font-bold">{s.label}</p>
          <p>{s.explain.what}</p>
          <p className="mt-1 text-[0.85rem]"><b>Why it matters:</b> {s.explain.why}</p>
          <p className="mt-1 rounded bg-space px-2 py-1 font-mono text-xs text-cyan">{s.explain.formula}</p>
        </div>
      )}
      {explain && open && <p className="mt-1 text-xs text-muted lg:hidden">{s.explain.what} <span className="font-mono text-cyan">{s.explain.formula}</span></p>}
    </li>
  );
}

function CrewStepper({ crew, seats, setCrew }: { crew: number; seats: number; setCrew: (n: number) => void }) {
  return (
    <div className="sticker-sm bg-panel p-3">
      <p className="font-display text-lg">Astronauts</p>
      <div className="flex items-center gap-3">
        <Button size="sm" variant="ghost" aria-label="One fewer astronaut" disabled={crew <= 0} onClick={() => setCrew(crew - 1)}>
          −
        </Button>
        <div className="flex min-w-[8.5rem] gap-1" aria-live="polite" aria-label={`${crew} astronauts`}>
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i} className={`grid h-8 w-8 place-items-center rounded-full border-2 border-ink text-lg ${i < crew ? 'bg-plume' : i < seats ? 'bg-space' : 'bg-space opacity-30'}`} aria-hidden="true">
              {i < crew ? '🧑‍🚀' : ''}
            </span>
          ))}
        </div>
        <Button size="sm" variant="ghost" aria-label="One more astronaut" disabled={crew >= seats} onClick={() => setCrew(crew + 1)} data-testid="crew-plus">
          +
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted">
        {seats === 0 ? 'This pod has no seats.' : `Win: score × ${crewMultiplier(true, crew).toFixed(1)} · Lose: × ${crewMultiplier(false, crew).toFixed(2)}`}
      </p>
    </div>
  );
}

export function Workshop() {
  const { planetId, difficulty, design, crew, placePart, setDesign, setCrew, go } = useGame();
  const calm = useCalm();
  const autoExplain = useSettings((s) => s.autoExplain);
  const setSettings = useSettings((s) => s.set);
  const [tab, setTab] = useState<Category>('payload');
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<{ partId: string; fromSlot?: SlotId } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const planet = planetId ? getPlanet(planetId) : undefined;
  const d = difficulty ?? 'easy';
  const cfg = DIFFICULTIES[d];


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const parts = resolveParts(design);
  const stats = useMemo(() => (planet ? telemetry(design, planet, d, crew) : []), [design, planet, d, crew]);
  const cost = rocketStats(design, crew).cost;
  const seats = parts.pod?.seats ?? 0;
  useEffect(() => {
    if (crew > seats) setCrew(seats);
  }, [crew, seats, setCrew]);

  if (!planet) return <Redirect to="destinations" />;

  const engineProp = parts.engine?.propellant;
  const activePart = getPart(active?.partId ?? selected);

  const place = (slotId: SlotId, partId: string, from?: SlotId) => {
    const part = getPart(partId)!;
    const slot = SLOTS.find((s) => s.id === slotId)!;
    if (!fitsSlot(part, slot, slotId.startsWith('tank') ? engineProp : undefined)) {
      play('error');
      announce(part.kind === 'tank' && engineProp ? `${part.name} holds a different propellant from your engine.` : `${part.name} doesn’t fit the ${slot.label} slot.`);
      return;
    }
    const replaced = design[slotId];
    const next = { ...design, [slotId]: partId };
    if (from && from !== slotId) next[from] = replaced ?? null; // move / swap between tank slots
    // A new engine with a different propellant empties mismatched tanks.
    if (part.kind === 'engine') {
      for (const t of ['tank0', 'tank1', 'tank2'] as const) {
        const tp = getPart(next[t]);
        if (tp && tp.kind === 'tank' && tp.propellant !== part.propellant) next[t] = null;
      }
    }
    setDesign(next);
    play('part_snap');
    announce(`${part.name} fitted in ${slot.label}.${replaced && replaced !== partId ? ` Replaced ${getPart(replaced)?.name}.` : ''}`);
    setSelected(null);
  };

  const remove = (slotId: SlotId) => {
    const p = getPart(design[slotId]);
    placePart(slotId, null);
    play('part_remove');
    if (p) announce(`${p.name} removed.`);
  };

  /** "+ Add": first empty fitting slot, else replace the first fitting one. */
  const quickAdd = (partId: string) => {
    const part = getPart(partId)!;
    const fitting = SLOTS.filter((s) => fitsSlot(part, s, s.id.startsWith('tank') ? engineProp : undefined));
    if (!fitting.length) {
      play('error');
      announce(part.kind === 'tank' ? `${part.name} doesn’t match your engine’s propellant.` : `No slot for ${part.name}.`);
      return;
    }
    const order = part.kind === 'tank' ? ['tank0', 'tank1', 'tank2'] : fitting.map((s) => s.id);
    const empty = order.find((id) => fitting.some((f) => f.id === id) && !design[id as SlotId]);
    place((empty ?? order[0]) as SlotId, partId);
  };

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { partId: string; fromSlot?: SlotId };
    setActive(data);
    play('part_pickup');
  };
  const onDragEnd = (e: DragEndEvent) => {
    const data = e.active.data.current as { partId: string; fromSlot?: SlotId };
    setActive(null);
    const over = e.over?.data.current as { slot?: SlotId } | undefined;
    if (over?.slot) place(over.slot, data.partId, data.fromSlot);
    else if (data.fromSlot) remove(data.fromSlot);
  };

  const hint = cassHint(stats);
  const showCass = cfg.hints === 'strong' || (cfg.hints === 'on-request' && showHint);
  const drawer = ALL_PARTS.filter((p) => p.category === tab);
  const over = cost > cfg.budget;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-cyan [text-shadow:2px_2px_0_#05070F]">Rocket workshop · {cfg.label}</p>
          <h1 tabIndex={-1} className="font-display text-4xl font-bold outline-none [text-shadow:3px_3px_0_#05070F]">
            Build for {planet.nickname} <span className="font-mono text-xl text-muted">{planet.officialName}</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.suggestedBuild && (
            <Button
              variant="secondary"
              onClick={() => {
                setDesign({ ...design, ...suggestedBuild(planet) });
                play('part_snap');
                announce('Suggested engine, first tank and drive fitted.');
              }}
              data-testid="suggest"
            >
              ✨ Suggested build (3 parts)
            </Button>
          )}
          <Button variant="ghost" onClick={() => go('brief')}>
            ← Mission brief
          </Button>
          <Button variant="go" onClick={() => go('prelaunch')} data-testid="to-prelaunch">
            Pre-launch check →
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr_minmax(280px,340px)]">
        {/* Drawer */}
        <section className="sticker flex min-w-0 flex-col bg-panel" aria-label="Component drawer">
          <div className="flex flex-wrap gap-1 border-b-[3px] border-ink p-2" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`rounded-xl border-2 border-ink px-2 py-1 text-sm font-bold ${tab === t.id ? 'bg-orange text-cream shadow-[2px_2px_0_#000]' : 'bg-panel-2 text-cream'}`}
                onClick={() => {
                  play('ui_click');
                  setTab(t.id);
                }}
                data-testid={`tab-${t.id}`}
              >
                <span aria-hidden="true">{t.icon}</span> {CATEGORY_LABEL[t.id]}
              </button>
            ))}
          </div>
          <div className="flex max-h-[68vh] flex-col gap-3 overflow-y-auto p-3" role="tabpanel">
            {tab === 'thrusters' && (
              <p className="rounded-xl bg-space/70 p-2 text-sm text-muted">
                <b className="text-cream">Why an imaginary drive?</b> No real spacecraft can reach another star in a lifetime. Even the nearest exoplanet would take Voyager 1 tens of thousands of years.
              </p>
            )}
            {tab === 'tanks' && engineProp && <p className="rounded-xl bg-space/70 p-2 text-sm text-muted">Your engine burns <b className="text-cream">{PROPELLANT_LABEL[engineProp]}</b>. Tanks must match.</p>}
            {drawer.map((p) => (
              <PartCard key={p.id} part={p} selected={selected === p.id} onSelect={() => { setSelected(selected === p.id ? null : p.id); play('part_pickup'); }} onAdd={() => quickAdd(p.id)} />
            ))}
          </div>
        </section>

        {/* Blueprint */}
        <section className="relative flex min-w-0 flex-col gap-4 rounded-2xl p-4 md:flex-row" aria-label="Rocket blueprint">
          <div className="flex min-w-0 flex-1 items-start justify-center py-2">
            <div className="md:sticky md:top-24">
              <div className="drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]">
                <RocketArt design={design} crew={crew} height={600} />
              </div>
            </div>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-[60%]">
            {SLOTS.map((slot) => {
              const part = getPart(design[slot.id]);
              const valid = !!activePart && fitsSlot(activePart, slot, slot.id.startsWith('tank') ? engineProp : undefined);
              return (
                <SlotBox
                  key={slot.id}
                  slot={slot}
                  part={part}
                  valid={valid}
                  dim={!!activePart && !valid}
                  onTap={() => selected && place(slot.id, selected)}
                  onRemove={() => remove(slot.id)}
                />
              );
            })}
            <CrewStepper crew={crew} seats={seats} setCrew={(n) => { setCrew(n); play('ui_click'); announce(`${n} astronauts.`); }} />
          </div>
        </section>

        {/* Telemetry */}
        <section className="sticker flex min-w-0 flex-col gap-3 bg-panel p-3" aria-label="Live telemetry">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-cyan">Telemetry</h2>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={autoExplain} onChange={(e) => setSettings({ autoExplain: e.target.checked })} className="h-4 w-4 accent-cyan" />
              Auto-explain
            </label>
          </div>
          {showCass ? (
            <CassSays key={hint.text} text={hint.text} mood={hint.mood} size={60} />
          ) : cfg.hints === 'on-request' ? (
            <Button variant="ghost" size="sm" onClick={() => setShowHint(true)}>
              💬 Ask Cass for a hint
            </Button>
          ) : (
            <p className="text-sm text-muted">Flight Directors fly without hints. Read the gauges!</p>
          )}
          <ul className="flex flex-col gap-2">
            {stats.map((s) => (
              <StatRow key={s.id} s={s} explain={autoExplain} />
            ))}
          </ul>
        </section>
      </div>

      {/* Budget bar */}
      <div className="sticker z-20 mt-6 bg-panel p-3 lg:sticky lg:bottom-3" aria-label="Budget">
        <div className="mb-1 flex justify-between font-bold">
          <span>Budget</span>
          <span className={`font-mono ${over ? 'text-danger' : 'text-plume'}`}>
            $<LiveNumber value={cost} decimals={0} />M / ${cfg.budget}M
          </span>
        </div>
        <div className="h-5 overflow-hidden rounded-full border-2 border-ink bg-space">
          <motion.div className="h-full" style={{ background: over ? '#FF5A5F' : cost > cfg.budget * 0.9 ? '#FFB547' : '#FFC94A' }} animate={{ width: `${Math.min(100, (cost / cfg.budget) * 100)}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {active && getPart(active.partId) ? (
          <motion.div
            className="sticker w-64 bg-cream p-3 text-ink"
            animate={calm ? undefined : { rotate: [-4, 4, -4] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <p className="font-display text-lg font-bold">{getPart(active.partId)!.name}</p>
            <p className="text-sm">Drop on a glowing slot</p>
          </motion.div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
