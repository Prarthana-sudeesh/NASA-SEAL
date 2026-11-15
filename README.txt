EXO GAME ASSETS
===============
public/      -> copy into the game project's public/ folder (Claude Code prompt section 2)
  cutscenes/        1080p web clips with baked-in sound design + camera shake/rumble, posters, cutscenes.json (timings + cue points)
  cutscenes/calm/   same clips + sound, no shake (reduced-motion / Calm mode)
  sfx/              UI sounds + 24 s seamless ambient music loop (WAV)
masters_4k/  4K versions of the shaken clips with sound (for a presentation video; not needed in the game)
tools/       synth.py (generates every sound from scratch) and shake.py (per-frame shake + render). Re-run to tweak.
CLAUDE_CODE_PROMPT.md  -> paste into Claude Code

Key timings: launch ignition 0.08 s | explosion clip: alarms 3.45 s, spark 4.333 s, boom 4.417 s | planet chime 0.55 s
Shake: frame zoomed 8% so edges never show; shake is in-frame, do not add more in code.
All sound is original, procedurally synthesised (no samples, no licensing issues).
