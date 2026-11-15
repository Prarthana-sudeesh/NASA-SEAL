// One-line fun facts for the planet cards. Every fact below was checked on 2026-11-15 against the
// NASA page in `source` (page loaded and the supporting sentence quoted in `quote`).
// Facts that could not be verified on a NASA page were removed (the nickname stays).
// `catalogUrl` is set only where the science.nasa.gov exoplanet-catalog page was confirmed to load.

export interface PlanetFact {
  fact?: string;
  source?: string;
  quote?: string;
  catalogUrl?: string;
  /** Why there is no fact (shown in DECISIONS.md, not in the game). */
  removed?: string;
}

const CAT = 'https://science.nasa.gov/exoplanet-catalog/';

export const PLANET_FACTS: Record<string, PlanetFact> = {
  'proxima-cen-b': {
    fact: 'The nearest known exoplanet to Earth, only about 4 light-years away.',
    source: 'https://science.nasa.gov/universe/exoplanets/eso-discovers-earth-size-planet-in-habitable-zone-of-nearest-star/',
    quote: 'Only 4 light-years away, this world orbits its cool red star every 11 days.',
    catalogUrl: `${CAT}proxima-centauri-b/`,
  },
  'ross-128-b': {
    fact: 'Its star is quieter than Proxima Centauri, which is prone to flares.',
    source: 'https://science.nasa.gov/resource/ross-128-b/',
    quote: 'The star Ross 128 is quieter than Proxima Centauri, which is prone to flares of X-rays and ultraviolet light.',
    catalogUrl: `${CAT}ross-128-b/`,
  },
  'teegarden-b': {
    fact: 'Found in 2019 with a twin planet; NASA says it might be habitable despite hugging its star.',
    source: 'https://science.nasa.gov/universe/exoplanets/discovery-alert-new-twin-planets-prompt-comparisons-to-earth/',
    quote: 'might be habitable despite its close proximity to its star',
    catalogUrl: `${CAT}teegardens-star-b/`,
  },
  'trappist-1-e': {
    fact: 'One of seven Earth-size planets around the same tiny star.',
    source: 'https://science.nasa.gov/missions/hubble/nasa-telescope-reveals-largest-batch-of-earth-size-habitable-zone-planets-around-single-star/',
    quote: 'the first known system of seven Earth-size planets around a single star',
    catalogUrl: `${CAT}trappist-1-e/`,
  },
  'lhs-1140-b': {
    fact: 'A super-Earth circling a small red dwarf star.',
    source: `${CAT}lhs-1140-b/`,
    quote: 'LHS 1140 b is a super Earth exoplanet that orbits an M-type star.',
    catalogUrl: `${CAT}lhs-1140-b/`,
  },
  'toi-700-d': {
    fact: 'The first Earth-size planet in its star’s habitable zone found by NASA’s TESS.',
    source: 'https://www.nasa.gov/universe/nasa-planet-hunter-finds-its-1st-earth-size-habitable-zone-world/',
    quote: "has discovered its first Earth-size planet in its star's habitable zone.",
    catalogUrl: `${CAT}toi-700-d/`,
  },
  'kepler-186-f': {
    fact: 'The first Earth-size planet found in another star’s habitable zone.',
    source: 'https://www.nasa.gov/news-release/nasas-kepler-telescope-discovers-first-earth-size-planet-in-habitable-zone/',
    quote: 'the first Earth-size planet orbiting a star in the “habitable zone”.',
    catalogUrl: `${CAT}kepler-186-f/`,
  },
  'kepler-452-b': {
    fact: 'NASA called it Earth’s “bigger, older cousin”.',
    source: 'https://www.nasa.gov/news-release/nasas-kepler-mission-discovers-bigger-older-cousin-to-earth/',
    quote: 'NASA’s Kepler Mission Discovers Bigger, Older Cousin to Earth',
    catalogUrl: `${CAT}kepler-452-b/`,
  },
  'kepler-22-b': {
    fact: 'Kepler’s first confirmed planet in a habitable zone.',
    source: 'https://www.jpl.nasa.gov/news/nasas-kepler-confirms-its-first-planet-in-habitable-zone/',
    quote: 'Of the 54 habitable zone planet candidates reported in February 2011, Kepler-22b is the first to be confirmed.',
  },
  'k2-18-b': {
    fact: 'NASA’s Webb telescope found methane and carbon dioxide in its atmosphere.',
    source: 'https://science.nasa.gov/missions/webb/webb-discovers-methane-carbon-dioxide-in-atmosphere-of-k2-18-b/',
    quote: 'has revealed the presence of carbon-bearing molecules including methane and carbon dioxide.',
    catalogUrl: `${CAT}k2-18-b/`,
  },
  'gj-1214-b': {
    fact: 'Totally blanketed by haze or cloud that hides its atmosphere from view.',
    source: 'https://www.nasa.gov/universe/nasas-webb-takes-closest-look-yet-at-mysterious-planet/',
    quote: 'The planet is totally blanketed by some sort of haze or cloud layer.',
    catalogUrl: `${CAT}gj-1214-b/`,
  },
  'kepler-16-b': {
    fact: 'The first planet clearly detected orbiting two stars: a double sunset!',
    source: 'https://www.jpl.nasa.gov/news/nasas-kepler-discovery-confirms-first-planet-orbiting-two-stars/',
    quote: 'the first unambiguous detection of a circumbinary planet -- a planet orbiting two stars.',
  },
  'kelt-9-b': {
    fact: 'Hotter than most stars: the hottest gas giant found when NASA reported it in 2017.',
    source: 'https://science.nasa.gov/universe/exoplanets/astronomers-find-planet-hotter-than-most-stars/',
    quote: 'KELT-9b is a planet that is hotter than most stars',
    catalogUrl: `${CAT}kelt-9-b/`,
  },
  'wasp-12-b': {
    fact: 'Stretched into the shape of an egg and being torn apart by its star.',
    source: 'https://science.nasa.gov/universe/exoplanets/wasp-12b-an-egg-shaped-planet/',
    quote: 'Gravity causes enormous tidal forces which are stretching the planet into the shape of an egg.',
    catalogUrl: `${CAT}wasp-12-b/`,
  },
  'wasp-76-b': {
    removed: 'Iron rain on WASP-76 b was reported by an ESO-led team; no NASA page confirming it was found.',
    catalogUrl: `${CAT}wasp-76-b/`,
  },
  'hd-189733-b': {
    fact: 'Winds may blow glass sideways at about 5,400 mph (2 km/s).',
    source: 'https://science.nasa.gov/exoplanets/immersive/strange-new-worlds/',
    quote: 'Howling winds send the storming glass sideways at 5,400 mph (2km/s).',
    catalogUrl: `${CAT}hd-189733-b/`,
  },
  '55-cnc-e': {
    fact: 'Thought to be covered in an ocean of magma.',
    source: 'https://science.nasa.gov/missions/webb/nasas-webb-hints-at-possible-atmosphere-surrounding-rocky-exoplanet/',
    quote: "an ocean of magma that is thought to cover the planet's surface",
    catalogUrl: `${CAT}55-cancri-e/`,
  },
  '51-peg-b': {
    fact: 'The first exoplanet discovered orbiting a Sun-like star, in 1995.',
    source: 'https://science.nasa.gov/universe/exoplanets/nobel-winners-changed-our-understanding-with-exoplanet-discovery/',
    quote: 'was the first exoplanet discovered orbiting a Sun-like star in 1995.',
    catalogUrl: `${CAT}51-pegasi-b/`,
  },
  'hd-209458-b': {
    fact: 'Its heated atmosphere is escaping into space, likely in a comet-like tail.',
    source: 'https://science.nasa.gov/missions/hubble/nasa-finds-super-hot-planet-with-unique-comet-like-tail/',
    quote: 'its heated atmosphere is escaping into space',
    catalogUrl: `${CAT}hd-209458-b/`,
  },
};

export const STRANGE_NEW_WORLDS = 'https://science.nasa.gov/exoplanets/immersive/strange-new-worlds/';
