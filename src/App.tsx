import { AnimatePresence, motion } from 'motion/react';
import { lazy, Suspense, useEffect } from 'react';
import { useGame, type Screen } from './store/game.ts';
import { useCalm, useSettings } from './store/settings.ts';
import { Starfield } from './ui/Starfield.tsx';
import { TopBar } from './ui/TopBar.tsx';
import { LiveRegion } from './ui/bits.tsx';
import { Title } from './screens/Title.tsx';
import { Briefing } from './screens/Briefing.tsx';
import { DifficultyScreen } from './screens/Difficulty.tsx';
import { Destinations } from './screens/Destinations.tsx';
import { MissionBrief } from './screens/MissionBrief.tsx';
import { Workshop } from './screens/Workshop.tsx';
import { PreLaunch } from './screens/PreLaunch.tsx';
import { Launch } from './screens/Launch.tsx';
import { Report } from './screens/Report.tsx';
import { RunProgress } from './screens/RunProgress.tsx';
import { SettingsScreen } from './screens/Settings.tsx';
import { isDebug } from './debug/debug.ts';

const Leaderboard = lazy(() => import('./screens/Leaderboard.tsx'));
const RunSummary = lazy(() => import('./screens/RunSummary.tsx'));
const DebugPanel = lazy(() => import('./debug/DebugPanel.tsx'));
const CutsceneTest = lazy(() => import('./debug/CutsceneTest.tsx'));

const SCREENS: Record<Screen, React.ComponentType> = {
  title: Title,
  briefing: Briefing,
  difficulty: DifficultyScreen,
  destinations: Destinations,
  brief: MissionBrief,
  workshop: Workshop,
  prelaunch: PreLaunch,
  launch: Launch,
  report: Report,
  progress: RunProgress,
  summary: RunSummary,
  leaderboard: Leaderboard,
  settings: SettingsScreen,
  'cutscene-test': CutsceneTest,
};

export function App() {
  const screen = useGame((s) => s.screen);
  const calm = useCalm();
  const textScale = useSettings((s) => s.textScale);

  useEffect(() => {
    document.documentElement.dataset.calm = String(calm);
    document.documentElement.style.setProperty('--text-scale', String(textScale));
  }, [calm, textScale]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    const h = document.querySelector('main h1') as HTMLElement | null;
    h?.focus?.({ preventScroll: true });
  }, [screen]);

  const Current = SCREENS[screen] ?? Title;
  const fullBleed = screen === 'launch' || screen === 'cutscene-test';

  return (
    <>
      <Starfield />
      {!fullBleed && <TopBar />}
      <AnimatePresence mode="wait">
        <motion.main
          key={screen}
          className={fullBleed ? 'fixed inset-0' : 'relative mx-auto min-h-dvh w-full max-w-[1500px] px-4 pb-16 pt-20 md:px-8'}
          initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.97, clipPath: 'circle(0% at 50% 50%)' }}
          animate={calm ? { opacity: 1 } : { opacity: 1, scale: 1, clipPath: 'circle(150% at 50% 50%)' }}
          exit={calm ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
          transition={{ duration: calm ? 0.15 : 0.38, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <Suspense fallback={<p className="p-8 text-center text-muted">Loading…</p>}>
            <Current />
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <LiveRegion />
      {isDebug() && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </>
  );
}
