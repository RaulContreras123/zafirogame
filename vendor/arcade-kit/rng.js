// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// A seeded RNG, so a run can be replayed exactly.
//
// The original used p5's global random(), which made every bug a
// heisenbug: you could never re-roll the board that broke it. mulberry32 is
// small, fast, and good enough for tile drops.

export function makeRng(seed = Date.now() >>> 0) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    /** float in [0,1) */
    next,
    /** float in [lo,hi) */
    range: (lo, hi) => lo + next() * (hi - lo),
    /** integer in [0,n) */
    int: (n) => Math.floor(next() * n),
    /** uniform choice */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
