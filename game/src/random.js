// A tiny seeded random source (mulberry32) so a level, a starfield and a screenshot
// are the same every time for the same seed, and a ?seed=N run is reproducible.

export function createRandom(seed) {
  let state = seed >>> 0;
  if (state === 0) state = 0x9e3779b9;
  return {
    /** A float in [0, 1). */
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    /** An integer in [min, max). */
    int(min, max) {
      return min + Math.floor(this.next() * (max - min));
    },
    /** A float in [min, max). */
    range(min, max) {
      return min + this.next() * (max - min);
    },
    /** One element of an array. */
    pick(list) {
      return list[Math.floor(this.next() * list.length)];
    },
  };
}
