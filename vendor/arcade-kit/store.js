// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// store.js — the small amount of state a browser arcade game keeps between
// sessions: settings, and the best you have ever done.
//
// It is deliberately not a save system. There is no run state here, nothing
// versioned, nothing merged. A game in this estate is a single sitting; what
// survives it is a volume slider and a number you want to beat.
//
// Every access is wrapped, because localStorage throws rather than returning
// null in a surprising number of real situations — private windows on some
// browsers, site data disabled, a full quota, an embedded webview. A game that
// dies on boot because it could not remember a volume setting is a worse game
// than one that forgets.

const memory = new Map();      // the fallback when storage is unavailable

function read(key) {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch { /* fall through */ }
  return memory.has(key) ? memory.get(key) : null;
}

function write(key, value) {
  memory.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* memory-only for this session */ }
}

/**
 * A namespaced store.
 *
 *   const store = new Store('ironwake');
 *   store.get('settings', { volume: 0.8 });
 *   store.set('settings', { volume: 0.5 });
 *   store.best('score', 12000);        // records and returns the best so far
 */
export class Store {
  constructor(namespace) { this.ns = namespace; }

  _key(key) { return `${this.ns}:${key}`; }

  /**
   * Read a JSON value, shallow-merged over `fallback` when it is an object.
   *
   * The merge is what makes adding a setting safe: a player who saved settings
   * before the option existed gets the new default rather than `undefined`,
   * without any migration step.
   */
  get(key, fallback = null) {
    const raw = read(this._key(key));
    if (raw === null) return fallback;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return fallback; }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return parsed;
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed;
  }

  set(key, value) {
    write(this._key(key), JSON.stringify(value));
    return value;
  }

  /**
   * Record a candidate high score. Returns { value, beaten } so the caller can
   * say "NEW BEST" without asking twice and without racing itself.
   */
  best(key, candidate) {
    const current = Number(this.get(key, 0)) || 0;
    if (!(candidate > current)) return { value: current, beaten: false };
    this.set(key, candidate);
    return { value: candidate, beaten: true };
  }

  clear(key) {
    memory.delete(this._key(key));
    try { localStorage.removeItem(this._key(key)); } catch { /* nothing to do */ }
  }
}

/**
 * The OS-level "stop moving things" signal.
 *
 * Worth honouring by default rather than only offering a toggle: a player who
 * has already told their system they get motion sick should not have to find a
 * settings menu inside a game that is currently shaking.
 */
export function prefersReducedMotion() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch { return false; }
}
