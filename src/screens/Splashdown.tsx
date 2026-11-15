import { motion } from 'motion/react';
import { useCalm } from '../store/settings.ts';
import { Button } from '../ui/Button.tsx';

/** Splashdown celebration: capsule under parachutes drops into the sea. Drawn in the sticker style. */
export function Splashdown({ nickname, onContinue }: { nickname: string; onContinue: () => void }) {
  const calm = useCalm();
  return (
    <motion.div className="absolute inset-0 z-40 overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} data-testid="splashdown">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(#FFB070 0%, #FF8A5C 30%, #E040A0 62%, #3C6CC4 63%, #1D3A7A 100%)' }} />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="1240" cy="420" r="120" fill="#FFC94A" stroke="#05070F" strokeWidth="5" />
        {[0, 1, 2].map((i) => (
          <motion.path
            key={i}
            d={`M 0 ${600 + i * 70} Q 200 ${580 + i * 70} 400 ${600 + i * 70} T 800 ${600 + i * 70} T 1200 ${600 + i * 70} T 1600 ${600 + i * 70} V 900 H 0 Z`}
            fill={['#3C6CC4', '#2B52A0', '#1D3A7A'][i]}
            stroke="#05070F"
            strokeWidth="4"
            animate={calm ? undefined : { x: [0, -40 + i * 20, 0] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        <motion.g initial={calm ? { y: 0 } : { y: -620 }} animate={{ y: 0 }} transition={{ duration: calm ? 0 : 2.2, ease: 'easeOut' }}>
          <g transform="translate(800 330)">
            {[-90, 0, 90].map((dx, i) => (
              <g key={i}>
                <path d={`M ${dx - 70} -150 Q ${dx} -250 ${dx + 70} -150 Z`} fill={['#E8642C', '#FFF6E5', '#E8642C'][i]} stroke="#05070F" strokeWidth="5" />
                <line x1={dx - 70} y1="-150" x2="-20" y2="120" stroke="#05070F" strokeWidth="2" />
                <line x1={dx + 70} y1="-150" x2="20" y2="120" stroke="#05070F" strokeWidth="2" />
              </g>
            ))}
            <path d="M -60 230 L -40 120 Q 0 95 40 120 L 60 230 Z" fill="#FFF6E5" stroke="#05070F" strokeWidth="5" />
            <circle cx="0" cy="170" r="16" fill="#5CE1FF" stroke="#05070F" strokeWidth="4" />
          </g>
        </motion.g>
        {!calm && (
          <motion.g initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 1, 0], scale: [0.2, 1.3, 1.6] }} transition={{ delay: 2.1, duration: 1.2 }} style={{ originX: '800px', originY: '570px' }}>
            <ellipse cx="800" cy="575" rx="160" ry="34" fill="none" stroke="#FFF6E5" strokeWidth="8" />
          </motion.g>
        )}
      </svg>
      <div className="absolute inset-x-0 top-24 text-center">
        <motion.p
          initial={calm ? false : { scale: 0.3, rotate: 10, opacity: 0 }}
          animate={{ scale: 1, rotate: -3, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 12, delay: calm ? 0 : 0.4 }}
          className="sticker inline-block bg-go px-8 py-4 font-display text-[clamp(2rem,6vw,4.5rem)] font-bold text-ink"
          role="status"
          data-testid="overlay"
        >
          MISSION SUCCESS!
        </motion.p>
        <p className="mt-4 font-display text-2xl text-cream" style={{ textShadow: '2px 2px 0 #000' }}>
          Splashdown! Welcome home from {nickname}.
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-10 text-center">
        <Button size="lg" variant="secondary" onClick={onContinue} data-testid="to-report">
          Mission report →
        </Button>
      </div>
    </motion.div>
  );
}
