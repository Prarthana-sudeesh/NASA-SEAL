# Orbital Uprise

*An exoplanet rocket lab.*

A browser game for the NASA Space Apps Challenge. You've just been promoted to aerospace engineer: pick a real
exoplanet from NASA's catalogue, build a rocket that flies there **and comes home**, stay within budget, and
launch. Hand-drawn cutscenes show what happens, then the game explains exactly why, with real numbers. A run is
3 launches; the average goes on a shared leaderboard.

Not an official NASA product. No NASA logos or insignia are used.

## Development timeline (disclosure)

We want to be upfront about what was made when. The commit history is unedited, so every date can be checked.

- **Oct 20–21:** the repository was created and a first file was uploaded.
- **Nov 12:** we explored an early prototype ("Rocket Builder") in 7 commits.
- **Nov 15, during the event:** the submitted game, Orbital Uprise, was **rebuilt from scratch**. The rebuild
  deleted the prototype's game code; the game itself (screens, rocket workshop, mission engine, scoring,
  cutscenes, space hazards, quizzes, mini-games, badges, leaderboard and tests) was all written during the event.
- **Carried over from the Nov 12 prototype:** only project setup files (`package.json`, TypeScript, Vite,
  lint and formatting config, `.gitignore`, the GitHub Pages workflow, `index.html`, the test setup file) and
  the NASA Exoplanet Archive planet-data script with its data files (`scripts/fetch-planets.ts`,
  `src/data/planets.json`, `src/data/planets.ts`, `src/data/types.ts`, `scripts/balance-check.ts`). Most of
  these were rewritten on Nov 15.
- The hazard backdrops, launch-site pixel art, hazard quiz questions and hazard sounds were adapted from our
  prototype branch (`Secondary-prototype`). Those parts of the prototype were themselves made during the event
  (Nov 15), except a few small sound-making helper functions in `src/hazards/hazardSound.ts`, which date from
  the Nov 12 prototype.

## Run it

Needs Node 22.18 or newer.

```bash
npm install
```

```bash
npm run dev
```

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173 (add `?debug=1` for the demo panel) |
| `npm run build` | Type-check and build a static site into `dist/` |
| `npm test` | Vitest: mission engine, scoring, cutscene mapping, names, leaderboard, telemetry (51 tests) |
| `npm run test:e2e` | Playwright: a full 3-launch run on each difficulty, ending on the leaderboard |
| `npm run balance-check` | Tries every legal rocket on every planet; fails if any planet can't be won within budget |
| `npm run build-cutscenes` | Re-renders the seven cutscene sequence videos from the artist's clips (needs ffmpeg) |
| `npm run fetch-planets` | Refreshes `src/data/planets.json` from the NASA Exoplanet Archive |
| `npm run lint` | ESLint |

Playwright uses the Chromium that ships with `@playwright/test`. On a fresh machine run
`npx playwright install chromium` once.

## Deploy

`npm run build` produces a fully static `dist/` with relative paths, so it works at any URL.

- **Vercel**: import the repo; framework "Vite", build `npm run build`, output `dist`. Add the two Supabase
  variables below under Project → Settings → Environment Variables.
- **Netlify**: build `npm run build`, publish `dist`. Same variables under Site configuration → Environment.
- **GitHub Pages**: `.github/workflows/deploy-pages.yml` builds `main` and publishes it (Settings → Pages →
  Source: GitHub Actions). Add the variables as repository secrets and pass them to the build step if you want
  the shared leaderboard there.

## Shared leaderboard (Supabase)

Without configuration the leaderboard is stored in the browser and shows
"Offline: scores saved on this device only". To share it between players:

1. Create a free project at supabase.com.
2. Open SQL Editor → New query, paste [`supabase/schema.sql`](supabase/schema.sql) and run it. It creates the
   `leaderboard` table, row-level security (public read; public insert only for names of 1–20 characters,
   difficulty easy/medium/hard, exactly 3 attempts, average 0–1400; no update or delete), and adds the table
   to realtime so boards refresh live.
3. Project Settings → API: copy the Project URL and the `anon` public key into `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

4. Restart `npm run dev` (or rebuild). The badge changes to "● Live leaderboard".

The anon key is meant to be public; the table policies are what protect the data.

**Honest limitation:** scores are computed in the browser, so a determined person could submit a fake score
that passes the checks. That's acceptable for a hackathon. A stretch goal is a Supabase Edge Function that
re-runs `src/engine` on the submitted designs and only then inserts the row.

The Supabase leaderboard code is type-checked but was **not** tested against a live Supabase project during
development (none was available). The local leaderboard is covered by unit and end-to-end tests.

## Refreshing planet data

```bash
npm run fetch-planets
```

The script queries the NASA Exoplanet Archive TAP service (`pscomppars` table) for the 19 planets in
`src/data/planetList.ts`. It matches names exactly first, then tolerantly (case, spaces, apostrophes), prints any
planet it can't find (dropped, never invented), lists unmeasured columns, and writes `src/data/planets.json` with
the retrieval date. The game never fetches at runtime; it ships the committed snapshot and works offline.

Every number in the UI is labelled **NASA data**, **Calculated from NASA data**, or **Game assumption**.

## Assets

- `exo-game-assets/clips/shaken/*.mp4` and `exo-game-assets/clips/calm/*.mp4`: the four cutscenes **hand-drawn by
  our artist** at 24 fps, with finished sound design, with and without camera shake. These are source files and
  are not shipped as-is.
- `public/cutscenes/seq/*.mp4` (and `seq/calm/`): **one ready-made video per outcome** (7 of them), made from the
  clips by `npm run build-cutscenes`. Each joins the right clips in order (launch → cruise → planet → mirrored
  return journey, freezes, the success hold) into a single 1280×720 file. The game plays exactly one file per
  launch, so there is nothing to stitch together in the browser: no gaps, no black frames, unbroken sound. Each
  launch downloads 0.15–1.2 MB.
- `public/cutscenes/cutscenes.json`: clip durations, frame counts and cue points (ignition, rumble, warning, spark,
  explosion, arrival chime). The build script turns these into absolute times per sequence in
  `src/data/sequences.json`, which drive captions, haptics and HUD effects.
- `public/sfx/*.wav`: UI sounds and a 24 s seamless music loop. All sound effects and the shake were **generated
  procedurally** (no samples).
- `exo-game-assets/tools/`: `synth.py` regenerates every sound; `shake.py` regenerates the shake and renders the
  clips. After changing the clips, run `npm run build-cutscenes`.
- Planet pictures are drawn by the game from each planet's temperature, size and type, and are labelled
  "Illustration generated by the game, not an image of the planet." CAPCOM Cass is an original SVG character.

## The physics model (and its simplifications)

Full reasoning and the balance numbers are in [DECISIONS.md](DECISIONS.md). In short:

- **Rocket equation (Tsiolkovsky):** Δv = Isp × 9.81 × ln(m₀ ÷ m_f), applied tank by tank. Empty tanks are
  dropped (like the Space Shuttle's external tank); the engine stays. With one tank it is exactly the textbook
  formula.
- **Lift-off:** thrust-to-weight = thrust ÷ (m₀ × 9.81) must be at least 1.2. The pad takes at most 600 t.
- **Earth launch:** 9.4 km/s to orbit (a real figure including gravity and drag losses), checked with the
  engine's climbing Isp.
- **Refuelling (game assumption based on real NASA plans):** tanks are refilled in Earth orbit (Artemis lander
  concept) and, on rocky worlds, on the surface from local resources (MOXIE made oxygen on Mars). So each leg
  is checked against full tanks, using the vacuum Isp after Earth orbit.
- **At the planet:** surface orbital speed v ≈ 7.9 × √(M ÷ R) km/s. Landing burn 0.1 × v (heat shield and
  parachutes do the rest); take-off 1.2 × v (Earth's ratio, 9.4 ÷ 7.9). Orbit surveys: 5% of v each to enter and
  leave a long, stretched orbit. Return correction 0.3 km/s. Every requirement gets a 10% margin.
- **Planet type (gameplay rule):** radius ≤ 1.6 Earth radii → probably rocky → land; larger → probably
  gas/ice-rich → orbit survey. 55 Cancri e is rocky but too massive to take off from with chemical rockets, so
  it's an orbit survey.
- **Deep-Space Drive (imaginary):** no real spacecraft can reach another star in a lifetime; Voyager 1 would
  need tens of thousands of years for even the nearest. The drive's range must cover the distance twice.
  Comms ranges in light-years are also imaginary (a real message would take years to arrive).
- **Heat, comms, pressure, radiation:** shield ≥ planet equilibrium temperature and re-entry rated; comms range
  ≥ distance; liquid tanks need a pressure system that suits the propellant and holds it all; crewed Flight
  Director missions need radiation rating ≥ 2. Cadet simplifies these; Engineer adds comms and heat; Flight
  Director checks everything.
- **Score per launch:** mission 400, performance 200, budget 200, part suitability 100, resource balance 100,
  then × (1 + 0.1 × crew) on success or × (1 − 0.15 × crew) on failure. Max 1,400. Run score = average of 3.

## Debug and demo tools

Add `?debug=1` to the URL (works in production builds too, only with the flag) to:
play any of the seven outcome sequences on its own, force the next launch's cutscene, jump to any screen,
fill a run with 3 random scores, and switch the leaderboard to offline mode.

## Accessibility

Keyboard play throughout (including the workshop: every part has an "+ Add" button, and dnd-kit's keyboard
sensor works), visible focus rings, an ARIA live region for part changes, countdown and outcomes, captions for
every cutscene, Calm mode (no-shake clips, no parallax or wobble, fewer particles; follows
`prefers-reduced-motion` by default), text size options, and haptics that can be turned off. Press **M** to mute
and **Esc**/**Space** to skip the countdown or a cutscene.

## Credits and sources

- Planet data: [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) (operated by NExScI/Caltech
  for NASA), table `pscomppars`.
- [NASA Exoplanet Catalog](https://science.nasa.gov/exoplanets/exoplanet-catalog/) and
  [NASA Strange New Worlds](https://science.nasa.gov/exoplanets/immersive/strange-new-worlds/).
- Planet facts: one NASA page per fact, listed with quotes in `src/data/planet-facts.ts`.
- Physics references: NASA Glenn Research Center Beginner's Guide to Aeronautics (rocket equation, specific
  impulse).
- Cutscenes: hand-drawn by our artist. Sound and shake: procedurally generated (`exo-game-assets/tools/`).
- Fonts: Fredoka, Nunito and Space Mono (Google Fonts).
