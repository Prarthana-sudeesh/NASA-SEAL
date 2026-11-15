# Animation slots

Five places in the game are kept free for the team's own animations. Each one shows nothing until you
register an animation for it.

| Slot id         | Where it appears                             |
| --------------- | -------------------------------------------- |
| `mission-intro` | Mission Control, over the planet hologram    |
| `lift-off`      | Launch screen, while the rocket leaves Earth |
| `emergency`     | Launch screen, behind the emergency panel    |
| `landing`       | Launch screen, at touchdown on the planet    |
| `homecoming`    | Launch screen, after a safe splashdown       |

## Adding an animation

1. Create a component in this folder, for example `RocketCheer.tsx`. It fills the whole screen area
   (the slot is a full-size overlay that ignores clicks) and receives one prop, `reduced`. When
   `reduced` is true, show a still picture or a gentle fade instead of movement.

   ```tsx
   import type { SlotAnimationProps } from './slots.tsx';

   export function RocketCheer({ reduced }: SlotAnimationProps) {
     return <div className={reduced ? '' : 'animate-bounce'}>🎉</div>;
   }
   ```

2. Register it in `registry.ts`:

   ```ts
   import { RocketCheer } from './RocketCheer.tsx';
   export const ANIMATIONS = { homecoming: RocketCheer };
   ```

Video or GIF files go in `public/animations/` and can be shown with `<video>` or `<img>` using a
relative path such as `animations/cheer.mp4`.
