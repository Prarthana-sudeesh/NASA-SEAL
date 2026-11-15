import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion.ts';
import { PlanetVisual } from '../../components/PlanetVisual.tsx';
import { getPlanet } from '../../data/planets.ts';
import { useMyCollection } from '../../store/collectionStore.ts';
import { useGame } from '../../store/gameStore.ts';
import { BADGES, postcardFacts } from '../collection.ts';
import { DIFFICULTIES } from '../config.ts';
import { CREW } from '../crew.ts';
import { sfx } from '../sound.ts';
import { Pill, TopMenu } from '../ui/Hud.tsx';
import { ASTRO_PALETTE, ASTRONAUT, PixelGrid } from '../ui/Pixel.tsx';
import { CommandCenter, Stage, WallScreen } from '../ui/Scenery.tsx';

type Tab = 'postcards' | 'badges' | 'photos';
const ALL_PLANETS = Object.values(DIFFICULTIES).flatMap((d) => d.planets);
const day = (iso: string) => new Date(iso).toLocaleDateString();

export function Collection() {
  const go = useGame((s) => s.go);
  const { postcards, badges, photos, puzzleBest, quizCorrect, emergencies } = useMyCollection();
  const [tab, setTab] = useState<Tab>('postcards');
  const [open, setOpen] = useState<string | null>(null);
  const opened = getPlanet(open);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const cards = Object.keys(postcards).length;
  const earned = Object.keys(badges).length;

  return (
    <Stage>
      <CommandCenter>
        <TopMenu />
        <div className="absolute left-[1.5%] top-[2%] z-10 flex items-center gap-3">
          <button
            type="button"
            className="tool-btn px-3 py-1 text-[12px]"
            onClick={() => go('mission')}
          >
            ◂ Mission control
          </button>
        </div>
        <motion.h1
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="title-font outlined absolute left-1/2 top-[3%] -translate-x-1/2 whitespace-nowrap text-[clamp(20px,3.6vw,50px)]"
        >
          🏅 COLLECTION
        </motion.h1>
        <WallScreen
          title={`Postcards ${cards}/${ALL_PLANETS.length} · Badges ${earned}/${BADGES.length} · Crew photos ${photos.length}`}
          className="left-1/2 top-[15%] h-[78%] w-[86%] -translate-x-1/2"
        >
          <div className="flex h-full flex-col gap-2 text-[clamp(9px,1vw,14px)]">
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Collection type"
            >
              <Pill active={tab === 'postcards'} onClick={() => setTab('postcards')}>
                💌 Postcards
              </Pill>
              <Pill active={tab === 'badges'} onClick={() => setTab('badges')}>
                🏅 Badges
              </Pill>
              <Pill active={tab === 'photos'} onClick={() => setTab('photos')}>
                📸 Crew photos
              </Pill>
              <span className="ml-auto text-[#9fd8e6]">
                Science checks right: {quizCorrect} · Hazards handled: {emergencies} · Fix my rocket
                best: {puzzleBest}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {tab === 'postcards' && (
                <>
                  <p className="mb-2 text-[#9fd8e6]">
                    Land on a planet to get its postcard. Every fact comes from NASA’s Exoplanet
                    Archive.
                  </p>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {ALL_PLANETS.map((id, i) => {
                      const p = getPlanet(id);
                      if (!p) return null;
                      const got = postcards[id];
                      return (
                        <motion.li
                          key={id}
                          initial={{ opacity: 0, scale: 0.8, y: 12 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{
                            delay: i * 0.035,
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                          }}
                          whileHover={
                            got && !reduced ? { y: -4, rotate: i % 2 ? 1.5 : -1.5 } : undefined
                          }
                        >
                          <button
                            type="button"
                            disabled={!got}
                            onClick={() => {
                              sfx('stamp');
                              setOpen(id);
                            }}
                            className={`flex w-full flex-col items-center gap-1 rounded-lg border-2 p-2 ${got ? 'border-[#ffe24a]/70 bg-[#fff6dc]/10 hover:bg-[#fff6dc]/20' : 'border-white/10 bg-black/20'}`}
                            aria-label={
                              got ? `Postcard from ${p.name}` : `${p.name}: not collected yet`
                            }
                          >
                            <span className={got ? '' : 'opacity-30 grayscale'}>
                              <PlanetVisual planet={p} size={48} decorative />
                            </span>
                            <span className="text-center font-semibold">
                              {got ? p.name : '???'}
                            </span>
                          </button>
                        </motion.li>
                      );
                    })}
                  </ul>
                </>
              )}

              {tab === 'badges' && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BADGES.map((b, i) => {
                    const got = badges[b.id];
                    return (
                      <motion.li
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        key={b.id}
                        className={`flex items-center gap-2 rounded-lg border-2 p-2 ${got ? 'border-ok/60 bg-ok/10' : 'border-white/10 bg-black/20'}`}
                      >
                        <motion.span
                          className={`text-[clamp(22px,2.6vw,36px)] ${got ? '' : 'opacity-30 grayscale'}`}
                          aria-hidden="true"
                          animate={
                            got && !reduced
                              ? { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }
                              : undefined
                          }
                          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2 + (i % 4) }}
                        >
                          {b.icon}
                        </motion.span>
                        <span className="flex flex-col">
                          <strong className={got ? 'text-white' : 'text-white/60'}>
                            {b.name}
                            <span className="sr-only">{got ? ' (earned)' : ' (locked)'}</span>
                          </strong>
                          <span className="text-[#9fd8e6]">{b.how}</span>
                          {got && <span className="text-ok">Earned {day(got)}</span>}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              )}

              {tab === 'photos' &&
                (photos.length === 0 ? (
                  <p className="text-[#9fd8e6]">
                    Bring astronauts home safely and they’ll pose for a photo here.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {photos.map((ph, i) => {
                      const p = getPlanet(ph.planetId);
                      if (!p) return null;
                      return (
                        <motion.li
                          key={ph.date + i}
                          initial={{ opacity: 0, y: -30, rotate: -12 }}
                          animate={{ opacity: 1, y: 0, rotate: i % 2 ? 1.5 : -1 }}
                          transition={{
                            delay: i * 0.08,
                            type: 'spring',
                            stiffness: 160,
                            damping: 14,
                          }}
                          className="rotate-[-1deg] rounded bg-white p-2 pb-1 text-[#0b0f1e] shadow-lg odd:rotate-[1.5deg]"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_50%_30%,#14417a,#02040c)]">
                            <div className="absolute -right-[20%] -top-[25%] w-[75%]">
                              <PlanetVisual
                                planet={p}
                                size={200}
                                decorative
                                className="h-auto w-full"
                              />
                            </div>
                            <div className="absolute inset-x-0 bottom-[4%] flex items-end justify-center gap-[4%]">
                              {ph.crew.map((name) => {
                                const c = CREW.find((x) => x.name === name);
                                return (
                                  <div key={name} className="w-[22%]" title={name}>
                                    <PixelGrid
                                      rows={ASTRONAUT}
                                      palette={{ ...ASTRO_PALETTE, O: c?.suit ?? ASTRO_PALETTE.O }}
                                      title={name}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <p className="mt-1 text-center font-[cursive] text-[clamp(9px,0.95vw,13px)]">
                            {ph.crew.join(', ')} on {p.name}
                          </p>
                          <p className="text-center text-[10px] text-[#555]">{day(ph.date)}</p>
                        </motion.li>
                      );
                    })}
                  </ul>
                ))}
            </div>
          </div>
        </WallScreen>

        {opened && postcards[opened.id] && (
          <div
            className="absolute inset-0 z-40 grid place-items-center bg-black/60"
            onClick={() => setOpen(null)}
          >
            <motion.article
              role="dialog"
              aria-modal="true"
              aria-labelledby="postcard-title"
              initial={{ rotate: -8, scale: 0.6, opacity: 0 }}
              animate={{ rotate: -2, scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="relative flex w-[min(90%,620px)] gap-4 rounded-md border-8 border-[#fff6dc] bg-[#fff6dc] text-[#2a1d0b] shadow-2xl"
            >
              <div className="relative w-1/2 overflow-hidden rounded-sm bg-[radial-gradient(ellipse_at_40%_40%,#14417a,#02040c)] p-3">
                <PlanetVisual
                  planet={opened}
                  size={300}
                  spinSeconds={30}
                  decorative
                  className="h-auto w-full"
                />
                <p className="title-font absolute inset-x-0 bottom-2 text-center text-[clamp(12px,1.6vw,22px)] text-white [text-shadow:0_2px_0_#000]">
                  Greetings from {opened.name}!
                </p>
              </div>
              <div className="flex w-1/2 flex-col gap-2 py-3 pr-3 text-[clamp(10px,1.1vw,15px)]">
                <div className="flex items-start justify-between">
                  <h2 id="postcard-title" className="font-bold">
                    Dear Earth,
                  </h2>
                  <span
                    className="grid h-12 w-10 rotate-6 place-items-center border-2 border-dashed border-[#c0392b] text-[18px]"
                    aria-hidden="true"
                  >
                    🚀
                  </span>
                </div>
                <ul className="flex list-disc flex-col gap-1 pl-4">
                  {postcardFacts(opened).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="mt-auto text-[11px] opacity-70">
                  Collected {day(postcards[opened.id])} · Data: NASA Exoplanet Archive
                </p>
                <button
                  type="button"
                  className="tool-btn self-end px-3 py-1 text-[12px]"
                  onClick={() => setOpen(null)}
                  autoFocus
                >
                  Close
                </button>
              </div>
            </motion.article>
          </div>
        )}
      </CommandCenter>
    </Stage>
  );
}
