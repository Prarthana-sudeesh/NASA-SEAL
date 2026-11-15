import { useGame, LAUNCHES_PER_RUN } from '../store/game.ts';
import { useSettings } from '../store/settings.ts';
import { toggleMute, play } from '../audio/audio.ts';
import { DIFFICULTIES } from '../engine/difficulty.ts';
import { runAverage } from '../engine/score.ts';

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className="btn grid h-11 w-11 place-items-center bg-panel-2 text-xl text-cream"
      aria-label={label}
      title={label}
      onClick={() => {
        play('ui_click');
        onClick();
      }}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const { screen, open, difficulty, attempts, go } = useGame();
  const muted = useSettings((s) => s.muted);
  const inRun = difficulty && !['title', 'briefing'].includes(screen);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between gap-2 p-3 md:p-4">
      <div className="pointer-events-auto flex items-center gap-2">
        {screen !== 'title' && (
          <button className="btn bg-panel-2 px-3 py-1.5 font-display text-lg text-cream" onClick={() => go('title')} aria-label="Orbital Uprise home">
            <span className="text-plume">★</span> ORBITAL UPRISE
          </button>
        )}
        {inRun && (
          <div className="sticker-sm hidden items-center gap-2 bg-panel px-3 py-1 text-sm font-bold sm:flex" aria-label="Run progress">
            <span className="text-cyan">{DIFFICULTIES[difficulty].label}</span>
            <span className="text-muted">·</span>
            <span>
              Launch {Math.min(attempts.length + 1, LAUNCHES_PER_RUN)}/{LAUNCHES_PER_RUN}
            </span>
            {attempts.length > 0 && (
              <>
                <span className="text-muted">·</span>
                <span className="text-plume tnum">avg {runAverage(attempts.map((a) => a.score)).toFixed(1)}</span>
              </>
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-auto flex gap-2">
        <IconBtn label={muted ? 'Unmute (M)' : 'Mute (M)'} onClick={toggleMute}>
          {muted ? '🔇' : '🔊'}
        </IconBtn>
        <IconBtn label="Leaderboard" onClick={() => open('leaderboard')}>
          🏆
        </IconBtn>
        <IconBtn label="Settings" onClick={() => open('settings')}>
          ⚙️
        </IconBtn>
      </div>
    </div>
  );
}
