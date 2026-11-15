// Badge shelf (🏅 in the top bar) and the pop-up toast that appears top-right when a badge is earned.
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { BADGES, badgeInfo, useBadges } from '../store/badges.ts';
import { useCalm } from '../store/settings.ts';
import { play } from '../audio/audio.ts';
import { announce } from './bits.tsx';

/** Shows each newly earned badge for a few seconds in the top-right corner. */
export function BadgeToast() {
  const toasts = useBadges((s) => s.toasts);
  const dismiss = useBadges((s) => s.dismiss);
  const calm = useCalm();
  const id = toasts[0];
  useEffect(() => {
    if (!id) return;
    const b = badgeInfo(id);
    play('leaderboard_chime');
    announce(`Badge earned: ${b.name}. ${b.how}`);
    const t = setTimeout(dismiss, 4200);
    return () => clearTimeout(t);
  }, [id, dismiss]);
  return (
    <div className="pointer-events-none fixed right-3 top-16 z-[70] md:right-4 md:top-20">
      <AnimatePresence>
        {id && (
          <motion.button
            key={id}
            className="sticker pointer-events-auto flex w-72 items-center gap-3 bg-plume p-3 text-left text-ink"
            initial={calm ? { opacity: 0 } : { x: 120, opacity: 0, rotate: 6 }}
            animate={{ x: 0, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, x: calm ? 0 : 80 }}
            onClick={dismiss}
            data-testid="badge-toast"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-ink bg-cream text-3xl" aria-hidden="true">
              {badgeInfo(id).icon}
            </span>
            <span>
              <span className="block text-xs font-extrabold uppercase tracking-wide">🏅 Badge earned!</span>
              <span className="block font-display text-lg font-bold leading-tight">{badgeInfo(id).name}</span>
              <span className="block text-sm">{badgeInfo(id).how}</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/** The 🏅 top-bar button and the badge shelf it opens. */
export function BadgeButton() {
  const earned = useBadges((s) => s.earned);
  const [open, setOpen] = useState(false);
  const count = BADGES.filter((b) => earned[b.id]).length;
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);
  return (
    <>
      <button
        className="btn relative grid h-11 w-11 place-items-center bg-panel-2 text-xl text-cream"
        aria-label={`Badges: ${count} of ${BADGES.length} earned`}
        title="Badges"
        onClick={() => {
          play('ui_click');
          setOpen(true);
        }}
        data-testid="badges-button"
      >
        🏅
        {count > 0 && <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full border-2 border-ink bg-plume px-1 text-xs font-extrabold text-ink">{count}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="badges-title" className="sticker max-h-[85dvh] w-full max-w-2xl overflow-y-auto bg-panel p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 id="badges-title" className="font-display text-3xl font-bold text-plume">
                🏅 Badges <span className="font-mono text-lg text-muted">{count}/{BADGES.length}</span>
              </h2>
              <button className="btn bg-cream px-3 py-1 text-ink" onClick={() => setOpen(false)} autoFocus>
                Close
              </button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {BADGES.map((b) => {
                const got = !!earned[b.id];
                return (
                  <li key={b.id} className={`flex items-center gap-3 rounded-xl border-2 border-ink p-2 ${got ? 'bg-panel-2' : 'bg-space/60 opacity-60'}`}>
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-ink text-2xl ${got ? 'bg-plume' : 'bg-panel-2 grayscale'}`} aria-hidden="true">
                      {got ? b.icon : '🔒'}
                    </span>
                    <span>
                      <span className="block font-display font-bold text-cream">{b.name}</span>
                      <span className="block text-sm text-muted">
                        <span className="sr-only">{got ? 'Earned. ' : 'Locked. '}</span>
                        {b.how}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
