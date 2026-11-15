import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { play } from '../audio/audio.ts';

type Variant = 'primary' | 'secondary' | 'ghost' | 'go' | 'danger' | 'magenta';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-orange text-cream',
  secondary: 'bg-cream text-ink',
  ghost: 'bg-panel-2 text-cream',
  go: 'bg-go text-ink',
  danger: 'bg-danger text-ink',
  magenta: 'bg-magenta text-cream',
};

const SIZE = {
  sm: 'px-3 py-1.5 text-base',
  md: 'px-5 py-2.5 text-lg',
  lg: 'px-8 py-4 text-2xl',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: keyof typeof SIZE;
  sound?: 'ui_click' | 'none' | 'error';
}

/** Chunky sticker button: presses down physically, clicks and hover-ticks. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', sound = 'ui_click', className = '', onClick, onMouseEnter, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`btn ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      onClick={(e) => {
        if (sound !== 'none') play(sound);
        onClick?.(e);
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled) play('ui_hover');
        onMouseEnter?.(e);
      }}
      {...rest}
    />
  );
});
