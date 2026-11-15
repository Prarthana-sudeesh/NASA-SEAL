import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { validateName } from '../../services/nameValidation.ts';
import { useGame } from '../../store/gameStore.ts';
import { MAX_TEAM, ROLES, rolesOf } from '../team.ts';

/** Set up team mode: up to four players on one device, each with their own jobs. */
export function TeamPanel({ onClose }: { onClose: () => void }) {
  const { player, team, setTeam } = useGame();
  const me = player?.username ?? 'Player 1';
  const [others, setOthers] = useState<string[]>(() => {
    const rest = team?.members.slice(1) ?? [];
    return [...rest, '', '', ''].slice(0, MAX_TEAM - 1);
  });
  const [error, setError] = useState<string | null>(null);
  const names = [me, ...others.map((n) => n.trim()).filter(Boolean)];
  const preview = { members: names };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    for (const n of names.slice(1)) {
      const v = validateName(n);
      if (!v.ok) return setError(`${n}: ${v.error}`);
    }
    if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
      return setError('Everyone needs a different name.');
    setTeam(names.length > 1 ? names : null);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/60 p-[2%]">
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-title"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex max-h-full w-[min(94%,620px)] flex-col gap-[0.8vw] overflow-y-auto rounded-2xl border-2 border-[#5ff3ff]/60 bg-[#06223a]/95 p-[1.6vw] text-[#cdf8ff] shadow-[0_0_30px_rgba(95,243,255,0.35)]"
      >
        <h2 id="team-title" className="title-font text-[clamp(16px,2.2vw,30px)] text-white">
          👥 Team mode
        </h2>
        <p className="text-[clamp(10px,1.05vw,14px)]">
          Play with up to {MAX_TEAM} people on one device. Everyone gets a job, takes turns at the
          controls, and must say GO before launch. Leave the names empty to play solo.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[clamp(10px,1vw,13px)]">
            Player 1 (you)
            <input
              value={me}
              disabled
              className="rounded-md border border-white/20 bg-black/30 px-2 py-1 text-white/70"
            />
          </label>
          {others.map((n, i) => (
            <label key={i} className="flex flex-col gap-1 text-[clamp(10px,1vw,13px)]">
              Player {i + 2}
              <input
                value={n}
                maxLength={16}
                placeholder="Name (optional)"
                onChange={(e) => {
                  setError(null);
                  setOthers((o) => o.map((x, j) => (j === i ? e.target.value : x)));
                }}
                className="rounded-md border border-[#5ff3ff]/40 bg-black/30 px-2 py-1 text-white"
              />
            </label>
          ))}
        </div>
        <ul
          className="flex flex-col gap-1 rounded-lg bg-black/30 p-2 text-[clamp(9px,0.95vw,13px)]"
          aria-label="Jobs"
        >
          {names.map((n, i) => (
            <li key={n + i}>
              <strong className="text-white">{n}</strong>:{' '}
              {rolesOf(preview, i)
                .map((r) => `${ROLES[r].icon} ${ROLES[r].title} (${ROLES[r].owns.toLowerCase()})`)
                .join('; ')}
            </li>
          ))}
        </ul>
        {error && (
          <p role="alert" className="text-[12px] text-[#ff8a8a]">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          {team && (
            <button
              type="button"
              className="tool-btn px-3 py-1 text-[12px]"
              onClick={() => {
                setTeam(null);
                onClose();
              }}
            >
              Play solo
            </button>
          )}
          <button type="button" className="tool-btn px-3 py-1 text-[12px]" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="big-btn text-[clamp(14px,1.6vw,22px)]" onClick={save}>
            {names.length > 1 ? `START TEAM OF ${names.length}` : 'PLAY SOLO'}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
