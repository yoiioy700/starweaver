// The eight constellations, hand-placed for a 1280x800 field. Each level is a
// launch pad, a set of gravity wells (planets, and from level 5 a black hole),
// and the stars the comet must gather. A planet may orbit: then cx/cy is the
// centre of its orbit, radius its distance from it, speed its angular speed and
// phase where it starts. Mass is in planet units; see config.js for gravity.

export const LEVELS = [
  {
    name: 'First Light',
    hint: 'Drag back from the comet, release to fly. Gather every star.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [{ x: 640, y: 420, r: 56, mass: 60, colour: 'terracotta' }],
    holes: [],
    stars: [
      { x: 420, y: 300 },
      { x: 760, y: 260 },
      { x: 1020, y: 430 },
    ],
  },
  {
    name: 'Twin Suns',
    hint: 'Two wells bend the flight twice. Aim between them.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 520, y: 380, r: 48, mass: 50, colour: 'teal' },
      { x: 880, y: 480, r: 44, mass: 45, colour: 'violet' },
    ],
    holes: [],
    stars: [
      { x: 380, y: 240 },
      { x: 700, y: 220 },
      { x: 960, y: 300 },
      { x: 1120, y: 560 },
    ],
  },
  {
    name: 'The Long Arc',
    hint: 'One great well. Ride its edge and let it carry you.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [{ x: 660, y: 430, r: 72, mass: 95, colour: 'amber', ring: true }],
    holes: [],
    stars: [
      { x: 380, y: 320 },
      { x: 560, y: 210 },
      { x: 780, y: 190 },
      { x: 980, y: 260 },
      { x: 1120, y: 420 },
    ],
  },
  {
    name: 'Slingshot',
    hint: 'Chain two stars in one flight and the combo pays double.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 480, y: 300, r: 50, mass: 55, colour: 'rose' },
      { x: 900, y: 520, r: 52, mass: 55, colour: 'slate' },
    ],
    holes: [],
    stars: [
      { x: 700, y: 180 },
      { x: 1050, y: 280 },
      { x: 1150, y: 620 },
      { x: 300, y: 520 },
    ],
  },
  {
    name: 'The Dark Heart',
    hint: 'A black hole drinks light and comets alike. Keep clear.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 340, y: 260, r: 40, mass: 40, colour: 'teal' },
      { x: 980, y: 300, r: 40, mass: 40, colour: 'violet' },
    ],
    holes: [{ x: 640, y: 400, r: 34, mass: 130 }],
    stars: [
      { x: 520, y: 180 },
      { x: 800, y: 170 },
      { x: 1100, y: 500 },
      { x: 220, y: 480 },
      { x: 640, y: 620 },
    ],
  },
  {
    name: 'Drift',
    hint: 'One world will not sit still. Time your launch.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 300, y: 250, r: 40, mass: 40, colour: 'slate' },
      { cx: 700, cy: 420, orbitRadius: 150, orbitSpeed: 0.25, phase: 0, r: 52, mass: 60, colour: 'amber' },
    ],
    holes: [],
    stars: [
      { x: 560, y: 200 },
      { x: 900, y: 240 },
      { x: 1080, y: 560 },
      { x: 420, y: 580 },
    ],
  },
  {
    name: 'The Gauntlet',
    hint: 'Three wells and a dark heart. Thread them all.',
    launches: 4,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 420, y: 320, r: 48, mass: 55, colour: 'terracotta' },
      { x: 760, y: 480, r: 48, mass: 55, colour: 'teal' },
      { x: 1050, y: 280, r: 42, mass: 45, colour: 'violet' },
    ],
    holes: [{ x: 640, y: 620, r: 30, mass: 110 }],
    stars: [
      { x: 300, y: 180 },
      { x: 620, y: 200 },
      { x: 940, y: 180 },
      { x: 1150, y: 480 },
      { x: 820, y: 680 },
      { x: 240, y: 600 },
    ],
  },
  {
    name: 'Grand Weave',
    hint: 'The last constellation. Everything you have learned, at once.',
    launches: 5,
    pad: { x: 140, y: 660 },
    planets: [
      { x: 400, y: 280, r: 50, mass: 55, colour: 'rose' },
      { cx: 850, cy: 450, orbitRadius: 130, orbitSpeed: 0.3, phase: 1.2, r: 48, mass: 55, colour: 'amber' },
    ],
    holes: [{ x: 640, y: 380, r: 32, mass: 120 }],
    stars: [
      { x: 280, y: 170 },
      { x: 560, y: 170 },
      { x: 880, y: 200 },
      { x: 1120, y: 380 },
      { x: 1000, y: 640 },
      { x: 300, y: 620 },
    ],
  },
];

export function levelCount() {
  return LEVELS.length;
}

export function getLevel(index) {
  return LEVELS[index] ?? LEVELS[0];
}
