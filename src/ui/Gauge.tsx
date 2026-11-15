import { motion } from 'motion/react';

/** Semi-circular dial. value: 0..1.3 (1 = full capacity). spike: briefly kick the needle. */
export function Gauge({ value, label, danger = false, spike = false, size = 150 }: { value: number; label: string; danger?: boolean; spike?: boolean; size?: number }) {
  const v = Math.max(0, Math.min(1.3, value)) / 1.3;
  const angle = -90 + v * 180 + (spike ? 22 : 0);
  return (
    <svg width={size} height={size * 0.65} viewBox="-10 0 170 98" role="img" aria-label={`Gauge: ${label}`}>
      <path d="M 15 85 A 60 60 0 0 1 135 85" fill="none" stroke="#05070F" strokeWidth="16" />
      <path d="M 15 85 A 60 60 0 0 1 104 33" fill="none" stroke="#5BD982" strokeWidth="10" />
      <path d="M 104 33 A 60 60 0 0 1 123 52" fill="none" stroke="#FFB547" strokeWidth="10" />
      <path d="M 123 52 A 60 60 0 0 1 135 85" fill="none" stroke="#FF5A5F" strokeWidth="10" />
      <motion.g style={{ originX: '75px', originY: '85px' }} animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: spike ? 500 : 120, damping: spike ? 8 : 16 }}>
        <line x1="75" y1="85" x2="75" y2="32" stroke={danger ? '#FF5A5F' : '#FFF6E5'} strokeWidth="4" strokeLinecap="round" />
      </motion.g>
      <circle cx="75" cy="85" r="7" fill="#E8642C" stroke="#05070F" strokeWidth="3" />
      <text x="75" y="97" textAnchor="middle" fill="#B9C0E0" fontSize="11" fontFamily="Space Mono, monospace">
        {label}
      </text>
    </svg>
  );
}
