/* Pushoff – sample data. Everything here is fictional and hard-coded for the mockup. */

// Hours the crowd forecast covers: 6 AM .. 9 PM
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

// Fake "predictive model": two gaussian bumps = typical busy periods (% of capacity).
function curve({ base, peak, at, w = 2.2, peak2 = 0, at2 = 0, w2 = 1.6 }) {
  return HOURS.map(h => {
    const v =
      base +
      peak * Math.exp(-((h - at) ** 2) / (2 * w * w)) +
      peak2 * Math.exp(-((h - at2) ** 2) / (2 * w2 * w2));
    return Math.max(4, Math.min(98, Math.round(v)));
  });
}

const PARKS = [
  {
    id: 'harbor',
    name: 'Harbor Bowl',
    area: 'Seafront',
    dist: 1.8,
    hours: 'Open 24h',
    lit: true,
    styles: ['bowl', 'transition'],
    difficulty: 2,
    features: ['Kidney bowl', 'Quarter pipes', 'Smooth concrete', 'Floodlights', 'Free entry', 'Water fountain'],
    tip: 'The shallow end is the best place to learn to drop in. The deep end gets rolled after dark.',
    hue: ['#FFD28A', '#FF8A5B'],
    map: { x: 22, y: 70 },
    crowd: {
      weekday: curve({ base: 8, peak: 60, at: 18.5, w: 1.8 }),
      weekend: curve({ base: 15, peak: 50, at: 13, w: 2.8 })
    }
  },
  {
    id: 'olive',
    name: 'Olive Yard Plaza',
    area: 'Old Town',
    dist: 0.9,
    hours: 'Open 6 AM – 10 PM',
    lit: false,
    styles: ['street'],
    difficulty: 2,
    features: ['Ledges', 'Stairs (4 & 7)', 'Flat rail', 'Open flat ground', 'Free entry', 'Shade trees'],
    tip: 'The 4-stair is the warm-up spot. Keep the flat ground clear for people learning lines.',
    hue: ['#CFE8A9', '#6DBE8C'],
    map: { x: 58, y: 44 },
    crowd: {
      weekday: curve({ base: 10, peak: 45, at: 16, w: 2.2, peak2: 25, at2: 19, w2: 1.5 }),
      weekend: curve({ base: 25, peak: 55, at: 16, w: 3 })
    }
  },
  {
    id: 'greenline',
    name: 'Greenline Flat',
    area: 'Riverside Path',
    dist: 2.4,
    hours: 'Open 24h',
    lit: false,
    styles: ['street', 'cruise'],
    difficulty: 1,
    features: ['Open flat ground', 'Manual pads', 'Low ledges', 'Smooth asphalt', 'Free entry', 'Water fountain'],
    tip: 'Wide and forgiving. A good first stop if you are learning to ollie or manual.',
    hue: ['#BDE6F2', '#6FB3D9'],
    map: { x: 40, y: 26 },
    crowd: {
      weekday: curve({ base: 6, peak: 30, at: 17, w: 2 }),
      weekend: curve({ base: 12, peak: 35, at: 11, w: 2.5 })
    }
  },
  {
    id: 'cinder',
    name: 'Cinder Pit',
    area: 'Industrial Quarter',
    dist: 4.1,
    hours: 'Open 24h',
    lit: true,
    styles: ['bowl', 'transition'],
    difficulty: 3,
    features: ['Deep bowl', 'Vert wall', 'Pool coping', 'Floodlights', 'Free entry'],
    tip: 'Not for first-timers. Locals are friendly, but the deep end is unforgiving.',
    hue: ['#F4C3D0', '#C9708F'],
    map: { x: 82, y: 72 },
    crowd: {
      weekday: curve({ base: 5, peak: 40, at: 19, w: 1.6 }),
      weekend: curve({ base: 10, peak: 45, at: 16, w: 2.5 })
    }
  },
  {
    id: 'midtown',
    name: 'Midtown Mini Yard',
    area: 'Midtown',
    dist: 3.0,
    hours: 'Open 7 AM – 9 PM',
    lit: false,
    styles: ['transition', 'street'],
    difficulty: 2,
    features: ['Mini ramp', 'Quarter pipes', 'Ledges', 'Flat ground', 'Free entry'],
    tip: 'Small footprint, so it feels busy fast. Skate the mini ramp early in the day.',
    hue: ['#E3D4FF', '#9A86E0'],
    map: { x: 70, y: 22 },
    crowd: {
      weekday: curve({ base: 8, peak: 50, at: 17, w: 2 }),
      weekend: curve({ base: 20, peak: 45, at: 15, w: 2.5 })
    }
  },
  {
    id: 'westgate',
    name: 'Westgate Street Course',
    area: 'West Gate',
    dist: 5.6,
    hours: 'Open 24h',
    lit: true,
    styles: ['street'],
    difficulty: 3,
    features: ['Big stairs (9)', 'Handrails', 'Gap to bank', 'Ledges', 'Floodlights', 'Free entry'],
    tip: 'Competition-style street course. Weekday evenings fill up with the local crew.',
    hue: ['#FFE29A', '#F2A33A'],
    map: { x: 12, y: 30 },
    crowd: {
      weekday: curve({ base: 10, peak: 65, at: 18, w: 1.8 }),
      weekend: curve({ base: 20, peak: 60, at: 17, w: 2.5 })
    }
  }
];
