# Decisions

Choices made while building STARBOUND from the brief (`CLAUDE_CODE_PROMPT.md`), and why. Where the brief
could not be followed literally, the reason and the replacement are recorded here.

## Plan (as built)

1. Scaffold (Vite + React + TS strict + Tailwind 4), theme tokens, fonts, assets.
2. `npm run fetch-planets` → `src/data/planets.json` (19/19 planets found, retrieved 2026-11-15).
3. Parts catalogue (`src/data/components.ts`).
4. Pure-TS mission engine + scoring + Vitest (engine tests pass before any UI).
5. Audio module + double-buffered `CutscenePlayer`; all seven sequences checked via `?debug=1`.
6–9. Screens, workshop, launch/report/run of 10, leaderboard.
10. Polish, accessibility, Playwright runs on all three difficulties, README.

## The existing game was replaced

The repo held "Rocket Builder" v2. The team chose to replace it with this brief. The old code is in git history
(commit `179e7f1` and earlier) and on `main`. The GitHub Pages workflow was kept.

## Assets

- Supplied files: 4K shaken masters with sound, 1080p clips, posters, `cutscenes.json`, 13 WAVs, `shake.py`, `synth.py`.
- The supplied 1080p clips are the **calm** (no-shake) renders: they match the masters only after applying
  `shake.py`'s 8% zoom (SSIM 0.92 → 0.98 on frame 1). They are used as `public/cutscenes/calm/*.mp4`.
- The shaken 1080p clips were rendered from the 4K masters with `shake.py`'s own web settings
  (lanczos to 1920×1080, x264 CRF 21, AAC 192 kb/s, faststart). Frame counts match `cutscenes.json` exactly
  (45 / 113 / 132 / 29). Size: shaken set 2.7 MB, calm set 2.0 MB (4.7 MB total; a player only loads one set).
- 4K masters are not in the build (source material, like `masters_4k/`).

## Physics: where the brief's numbers were changed (and why)

An exhaustive search over every legal rocket (`npm run balance-check`) showed the brief's literal rules cannot
be won with realistic parts:

| Brief rule | Problem | Replacement (labelled "Game assumption" in the UI) |
|---|---|---|
| Land + ascent Δv = 2 × 1.2 × orbital speed, on top of 9.4 km/s launch | Needs 29–48 km/s for Cadet planets. The best realistic chemical rocket (3 drop tanks, H₂/LOX, near-zero payload) gives ~17 km/s. | Landing burn 0.1 × v (heat shield + parachutes do most braking); take-off 1.2 × v (Earth's real ratio, 9.4 ÷ 7.9). |
| One propellant load for the whole trip | Same infeasibility | **Refuelling in Earth orbit** (Artemis lander plan) and **on the surface** (in-situ resource use; MOXIE made oxygen on Mars). Each leg is checked against full tanks. |
| Single-stage Tsiolkovsky | Single-stage chemical rockets top out near 9.5–12.5 km/s | **Drop-tank staging**: tanks burn bottom-first and are dropped when empty (engine kept), like the Shuttle's external tank. With one tank this is exactly the brief's formula (unit-tested). |
| One Isp per engine | Burns after Earth orbit happen in vacuum | Engines have a climbing Isp (Earth launch) and a vacuum Isp (everything after orbit), both real figures. |
| Orbit survey "at a stated fraction" | Needed a value | 5% of orbital speed each for insertion and departure (Juno entered Jupiter orbit with ~0.54 km/s ≈ 1.3%). |
| Max launch mass | A 3,000 t limit could never trigger (heaviest legal build ≈ 680 t), leaving the explosion branch dead | Pad limit 600 t (Falcon 9 ≈ 550 t). The mass check runs before thrust so the branch is reachable. |
| LHS 1140 b in Cadet ("land and return") | 1.73 Earth radii > 1.6, so the brief's own rule makes it an orbit survey | Kept the rule: orbit survey. |
| 55 Cnc e "rocky, land" | 8 Earth masses: take-off needs ~20 km/s, beyond any chemical rocket (a real result about super-Earths) | Labelled "Probably rocky"; Mission Control orders an orbit survey and the reason is shown. Its 1,958 K still requires a shield rated above that. |

Other engine rules:
- Earth leg = 9.4 km/s × 1.1 (climbing Isp). Deep-space need = max(landing, take-off, take-off + 0.3 km/s return correction) × 1.1 (vacuum Isp).
- Drive range must be ≥ 2 × distance. If it reaches the planet but not home, the failure happens **on the way home**
  (return-journey sequence); if it can't reach the planet, it's "Out of fuel" in transit. Both fit the 6.2 table.
- Crew radiation failures happen at **arrival** (planet sequence, "Radiation dose too high: mission aborted").
- Checks are evaluated in flight order; the first failure decides the cutscene and partial credit
  (0 / 50 / 150 / 250 / 350 / 400 for pad, launch–transit, arrival–planet, return, re-entry, success).
- Over budget: Cadet and Engineer may launch (0 budget points); Flight Director is blocked.
- Mismatched tank propellant and more crew than seats block the launch on every level.

### Balance (exhaustive, `npm run balance-check`)

| Difficulty | Budget | Planets winnable within budget | Cheapest winning build |
|---|---|---|---|
| Cadet | $800M | 6/6 | $205–325M |
| Engineer | $650M | 6/6 | $268–475M (Kepler-186 f: only 5 of 97,200 builds win) |
| Flight Director | $600M | 7/7 | $336–540M |

The solid booster (Isp 250 s) can never reach orbit alone (best 6.8 km/s of 10.3). That's realistic for a single
solid motor and is the game's lesson about Isp; Cass warns about it through the rocket-power gauge.

## Score

Exactly the brief's split: mission 400, performance 200 (Δv 100–125% of need and TWR 1.3–2.0 get full marks,
falling off both ways), budget 200 (≤ 50% of budget = 200, linearly to 60 at 100%, 0 if over), suitability 100
(25 each for drive, comms, shield, pressure: full for the cheapest catalogue part that does the job), resources
100 (seats filled 50 + little spare propellant 50). Crew multiplier as specified; max 1,400; run = mean of 10,
one decimal.

## Planet facts

Each fun fact was checked by loading the NASA page and quoting the supporting sentence
(`src/data/planet-facts.ts` stores the URL and quote). Changes from the brief's wording:

- Reworded to match NASA's text: Proxima ("about 4 light-years"), Ross 128 (quieter than Proxima), Teegarden's
  Star b (twin planet, "might be habitable"), Kepler-16 b ("first clearly detected"), KELT-9 b ("hotter than most
  stars"; hottest gas giant as of NASA's 2017 report), WASP-12 b ("torn apart by its star"), GJ 1214 b (haze hides
  its atmosphere), HD 209458 b ("likely" comet-like tail).
- **LHS 1140 b**: no NASA page found saying "habitable zone"; reduced to what NASA's catalogue page says
  (a super-Earth around a red dwarf).
- **WASP-76 b**: fact removed. Iron rain was reported by an ESO-led team; no NASA page confirming it was found.
  The nickname "Iron Rain" stays, labelled as made up.
- Direct science.nasa.gov catalogue links are used for 17 planets (confirmed to load). Kepler-22 b and
  Kepler-16 b return 404 there, so they link to the catalogue search instead.
- Two NASA Glenn physics pages moved to `www1.grc.nasa.gov/beginners-guide-to-aeronautics/…`; the
  thrust-to-weight page returns 404 and is not linked.

## Data notes

- `pl_bmassprov`: "Msini" → badge "minimum mass (true mass may be higher)"; "M-R relationship" → "estimated".
- `st_spectype` is not measured for Kepler-16 b and WASP-12 b; shown as "not measured".
- No planet lacks `pl_eqt`; the 300 K fallback exists and is shown in Game assumptions if one ever does.

## UI and tech

- `motion` v11 (Framer Motion), `zustand` with `persist` (run, design and settings survive refresh; the launch
  is recorded when LAUNCH is pressed, so a refresh mid-cutscene cannot re-roll it).
- Drag and drop: dnd-kit pointer/touch/keyboard sensors, plus "tap a part, tap a slot" and a "+ Add" button on
  every part (fully keyboard and small-screen friendly).
- Key listeners for Skip use `useLayoutEffect` so a very fast key press after a screen change isn't lost.
- No NASA logos or insignia. Cass is an original SVG character.
- The `frontend-design` skill was not available in this environment; the look follows the brief's
  "sticker-book mission control" direction directly.
- Lighthouse was not run (blocked by this environment's permissions). Local paint timings: FCP ≈ 0.45 s,
  LCP ≈ 0.63 s on the title screen; leaderboard, run summary, debug and confetti are lazy-loaded.
