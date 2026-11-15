// Every physics constant and game assumption in one place. Each has a label and a reason so the
// "How the maths works" panel and the "Game assumptions" panel can show them verbatim.

export const G0 = 9.81; // m/s², standard gravity

export const ASSUMPTIONS = {
  earthLaunchKms: {
    value: 9.4,
    label: 'Earth launch to orbit',
    why: 'Real approximate figure: 7.8 km/s orbital speed plus about 1.5 km/s lost to gravity and air drag.',
  },
  marginFactor: {
    value: 1.1,
    label: 'Safety margin',
    why: 'Mission planners add spare Δv for surprises. The game adds 10% to every requirement.',
  },
  orbitRefuel: {
    value: 1,
    label: 'Refuelling in Earth orbit',
    why: 'After reaching orbit, tanker flights bring full replacement tanks (NASA’s Artemis Moon-lander plan uses orbital refuelling). So the Earth launch and the deep-space part are each checked against a full rocket.',
  },
  surfaceRefuel: {
    value: 1,
    label: 'Refuelling on the surface',
    why: 'On rocky worlds the lander makes fresh propellant from local ice and air before take-off (“in-situ resource use”, a real NASA idea: the MOXIE experiment made oxygen on Mars). So the landing and the take-off are each checked against full tanks.',
  },
  vacuumIsp: {
    value: 1,
    label: 'Vacuum Isp in space',
    why: 'Engines are more efficient with no air pushing on the exhaust. Burns after Earth orbit use the engine’s vacuum Isp.',
  },
  landingBurnFraction: {
    value: 0.1,
    label: 'Landing burn',
    why: 'The heat shield and parachutes do most of the braking (as Earth return capsules do); the final landing burn costs 10% of the planet’s orbital speed. Atmospheres are not measured, so this is assumed.',
  },
  ascentFactor: {
    value: 1.2,
    label: 'Take-off from the planet',
    why: 'Climbing to orbit costs about 1.2 × the planet’s orbital speed. That is Earth’s real ratio (9.4 ÷ 7.9).',
  },
  orbitBurnFraction: {
    value: 0.05,
    label: 'Orbit insertion and departure (each)',
    why: 'Arriving slowly on the Deep-Space Drive and entering a long, stretched orbit is cheap: each burn costs 5% of the orbital speed (NASA’s Juno entered Jupiter orbit with about 0.54 km/s, near 1.3% of Jupiter’s).',
  },
  returnCorrectionKms: {
    value: 0.3,
    label: 'Earth return correction',
    why: 'Small course fixes before re-entry. The heat shield does the rest.',
  },
  driveRoundTrip: {
    value: 2,
    label: 'Drive range needed',
    why: 'Gameplay assumption: the Deep-Space Drive must cover the distance twice (there and back).',
  },
  minTwr: {
    value: 1.2,
    label: 'Minimum lift-off thrust-to-weight',
    why: 'Real rockets lift off with TWR of about 1.2–1.5. Below 1.2 the climb wastes too much fuel fighting gravity.',
  },
  maxLaunchMassKg: {
    value: 600_000,
    label: 'Launch pad limit',
    why: 'Game assumption: our pad and rocket frame can take 600 t. For comparison, a Falcon 9 weighs about 550 t and NASA’s Saturn V about 2,900 t.',
  },
  crewMassKg: {
    value: 500,
    label: 'Mass per astronaut',
    why: 'Person, spacesuit, seat and supplies: about 0.5 t each (game assumption).',
  },
  crewRadiationMin: {
    value: 2,
    label: 'Crew radiation rating',
    why: 'Deep space is full of cosmic rays. Crewed Flight Director missions need a shield rated 2 or more.',
  },
} as const;

export type AssumptionKey = keyof typeof ASSUMPTIONS;
export const A = Object.fromEntries(Object.entries(ASSUMPTIONS).map(([k, v]) => [k, v.value])) as {
  [K in AssumptionKey]: number;
};
