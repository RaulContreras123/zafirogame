// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// logbook.js — the shared arcade account, and a sticker page to spend it on.
//
// Extracted from Space Arcade Cadet after it shipped, following this kit's
// rule: nothing goes in here that has not already worked in a real game.
//
// Three things, deliberately separable:
//
//   Arcade    reads the session from the shared account backend and syncs one
//             jsonb blob. It does NOT implement login — raulcontrerasherrera.com
//             runs one OAuth service for every game on the estate and the nav
//             shell draws the sign-in button itself. A second login per game
//             would be a second thing to keep secure.
//   award()   pure sticker evaluation over a game's own definitions.
//   Logbook   the ruled-paper page. DOM, not canvas: the whole appeal of a
//             sticker album is that it is a different MATERIAL from the game,
//             and paper has to stay crisp and scrollable at any DPI.
//
// Each game supplies its own sticker list; everything else is shared.
//
// --- Offline is the normal case, not the error case -----------------------
// Most people play signed out, on a phone, sometimes from a host with no
// backend at all. localStorage is the primary store and the account mirrors
// it. Nothing waits on the network; a signed-out player loses only portability
// between devices.

const DEFAULT_API = '/api';

/* ------------------------------------------------------------------ store */

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocal(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch { return false; }
}

/**
 * Union of earned stickers; scalar bests take the higher value.
 *
 * Union, NOT last-write-wins. Earning is monotonic — you cannot un-earn a
 * sticker — so two collected signed out on a phone and three signed in on a
 * laptop must end as five. Last-write-wins would quietly delete whichever
 * device synced first, which is the one failure a collectible does not survive.
 */
export function mergeProgress(a = {}, b = {}) {
  const out = { ...b, ...a };
  out.stickers = [...new Set([...(a.stickers ?? []), ...(b.stickers ?? [])])];
  for (const k of ['bestScore', 'bestStreak', 'runsCompleted', 'bestWave', 'bestDepth']) {
    const av = a[k], bv = b[k];
    if (av !== undefined || bv !== undefined) out[k] = Math.max(av ?? 0, bv ?? 0);
  }
  return out;
}

export class Arcade {
  /** @param {{game:string, api?:string, storageKey?:string}} opts */
  constructor(opts) {
    if (!opts?.game) throw new Error('Arcade needs a game id');
    this.game = opts.game;
    this.api = opts.api ?? DEFAULT_API;
    this.key = opts.storageKey ?? `${opts.game}Progress`;

    this.me = { signedIn: false };
    this.online = false;
    this.data = readLocal(this.key) ?? {};
    this.pending = null;
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); return this; }
  emit() { for (const fn of this.listeners) fn(this); }

  get signedIn() { return !!this.me.signedIn; }
  get displayName() { return this.me.handle || this.me.name || 'PLAYER'; }

  /* Tolerant by design: a failure here means "play offline", never an error the
     player has to read. */
  async init() {
    try {
      const res = await fetch(`${this.api}/me`, { credentials: 'include' });
      if (res.ok) { this.me = await res.json(); this.online = true; }
    } catch { this.online = false; }
    if (this.signedIn) await this.pull();
    this.emit();
    return this;
  }

  async pull() {
    try {
      const res = await fetch(`${this.api}/games/${this.game}/progress`,
        { credentials: 'include' });
      if (!res.ok) return;
      const remote = (await res.json())?.data ?? {};
      const merged = mergeProgress(this.data, remote);
      const localAdded = JSON.stringify(merged) !== JSON.stringify(remote);
      this.data = merged;
      writeLocal(this.key, this.data);
      if (localAdded) await this.push();
    } catch { /* offline; the local copy stands */ }
  }

  /** Local write is synchronous and always happens; the cloud write is
   *  debounced, because a run can award several stickers in a few seconds. */
  save(mutate) {
    mutate(this.data);
    writeLocal(this.key, this.data);
    this.emit();
    if (!this.signedIn) return;
    clearTimeout(this.pending);
    this.pending = setTimeout(() => this.push(), 1200);
  }

  async push() {
    if (!this.signedIn) return false;
    try {
      // PUT, not POST. POST to that path is a 404 on this service — verified
      // against the running backend rather than assumed.
      const res = await fetch(`${this.api}/games/${this.game}/progress`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.data)
      });
      return res.ok;
    } catch { return false; }
  }

  signInUrl() {
    return `${this.api}/auth/google/login?return_to=${encodeURIComponent(location.href)}`;
  }
}

/* --------------------------------------------------------------- stickers */

/**
 * Award pass over a game's sticker definitions. Returns ids newly earned —
 * never ones already owned, so a non-empty result means "celebrate".
 *
 * Re-entrant exactly once, so a capstone sticker whose condition is about the
 * COLLECTION (rather than about play) lights on the same event that completes
 * it, instead of staying locked until something unrelated re-runs the checks.
 * Bounded deliberately: looping until quiescent sounds better and is an easy
 * way to hang the game on a sticker that awards itself.
 */
export function award(stickers, event, owned = []) {
  const have = new Set(owned);
  const won = [];

  const pass = (e) => {
    for (const s of stickers) {
      if (have.has(s.id)) continue;
      let hit = false;
      // A malformed event must never break the award pass.
      try { hit = !!s.check(e); } catch { hit = false; }
      if (hit) { won.push(s.id); have.add(s.id); }
    }
  };

  pass(event);
  if (won.length) pass({ type: 'award', owned: [...have] });
  return won;
}

export function starCount(stickers, owned = []) {
  const by = new Map(stickers.map(s => [s.id, s]));
  return owned.reduce((n, id) => n + (by.get(id)?.star ?? 0), 0);
}

export function totalStars(stickers) {
  return stickers.reduce((n, s) => n + s.star, 0);
}

/* ---------------------------------------------------------------- the page */

/* The page's own words. English by default because most of the estate is, but
   a game written in Spanish should not sprout an English UI in the middle of
   it — the logbook is the most read-heavy surface any of these games has. */
export const EN = {
  stars: 'stars',
  signedInAs: (who) => `Signed in as ${who}`,
  syncOn: 'your stickers follow you to any device',
  signIn: 'Sign in',
  signInWhy: 'to carry these stickers between devices. They are saved here either way.',
  localOnly: 'Saved on this device.',
  close: 'Close',
  dialogLabel: 'Sticker logbook',
};

export const ES = {
  stars: 'estrellas',
  signedInAs: (who) => `Sesión iniciada como ${who}`,
  syncOn: 'tus estampas te siguen a cualquier dispositivo',
  signIn: 'Inicia sesión',
  signInWhy: 'para llevarte estas estampas a otro dispositivo. Aquí se guardan igual.',
  localOnly: 'Guardado en este dispositivo.',
  close: 'Cerrar',
  dialogLabel: 'Álbum de estampas',
};

/* Fixed per-id jitter. Random rotation would re-roll on every open and the page
   would feel unstable; hashing the id means each sticker always sits at its own
   angle, the way a real one stays where it was pressed. */
function jitter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return {
    rot: ((h % 1000) / 1000 - 0.5) * 7,
    dx: (((h >> 10) % 100) / 100 - 0.5) * 6,
    dy: (((h >> 17) % 100) / 100 - 0.5) * 6
  };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class Logbook {
  /** @param {{mount:HTMLElement, arcade:Arcade, stickers:Array, title?:string,
   *           onOpen?:Function}} opts */
  constructor(opts) {
    this.el = opts.mount;
    this.arcade = opts.arcade;
    this.stickers = opts.stickers;
    this.title = opts.title ?? 'LOGBOOK';
    this.onOpen = opts.onOpen;
    this.t = { ...EN, ...(opts.strings ?? {}) };
    this.open = false;

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el || e.target.dataset.act === 'close') this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.open) this.close();
    });
  }

  get owned() { return this.arcade.data.stickers ?? []; }

  toggle() { this.open ? this.close() : this.show(); }
  close() { this.open = false; this.el.classList.remove('on'); }

  show() {
    this.open = true;
    this.render();
    this.el.classList.add('on');
    this.onOpen?.();
  }

  /** Keeps the page current without stealing the screen mid-run. */
  refresh() { if (this.open) this.render(); }

  render() {
    const owned = new Set(this.owned);
    const stars = starCount(this.stickers, [...owned]);
    const total = totalStars(this.stickers);
    const a = this.arcade;

    /* The only place a game mentions sign-in, and phrased as what you GET
       rather than as a demand. Signed out is a first-class state. */
    const t = this.t;
    const account = a.signedIn
      ? `<span class="ok">${esc(t.signedInAs(a.displayName))}</span> · ${esc(t.syncOn)}`
      : a.online
        ? `<a href="${a.signInUrl()}" class="signin">${esc(t.signIn)}</a> ${esc(t.signInWhy)}`
        : esc(t.localOnly);

    const cells = this.stickers.map(s => {
      const has = owned.has(s.id);
      const j = jitter(s.id);
      const style = has ? `transform: rotate(${j.rot}deg) translate(${j.dx}px, ${j.dy}px)` : '';
      const stars5 = '★'.repeat(s.star) + `<span class="dim">${'★'.repeat(5 - s.star)}</span>`;
      return `
        <div class="slot ${has ? 'earned' : 'locked'} ${s.rare ? 'rare' : ''}"
             style="${style}" title="${esc(s.hint)}">
          <div class="badge">${has ? '★' : '☆'}</div>
          <div class="sname">${has ? esc(s.name) : '· · ·'}</div>
          <div class="shint">${esc(s.hint)}</div>
          <div class="sstars">${stars5}</div>
        </div>`;
    }).join('');

    this.el.innerHTML = `
      <div class="page" role="dialog" aria-label="${esc(t.dialogLabel)}">
        <button class="paperclose" data-act="close" aria-label="${esc(t.close)}">×</button>
        <div class="pagehead">
          <div class="pagetitle">${esc(this.title)}</div>
          <div class="pagestars">${stars} <span class="dim">/ ${total}</span> ${esc(t.stars)}</div>
        </div>
        <div class="pageaccount">${account}</div>
        <div class="grid">${cells}</div>
      </div>`;
  }
}

/* The paper. Injected rather than shipped as a stylesheet so a game gets the
   logbook by importing one module — these games have no bundler and adding a
   second <link> per game is a second thing to forget. */
export function injectLogbookStyles(doc = document) {
  if (doc.getElementById('arcade-logbook-css')) return;
  const el = doc.createElement('style');
  el.id = 'arcade-logbook-css';
  el.textContent = `
.arcade-logbook{position:fixed;inset:0;display:none;z-index:60;align-items:center;
 justify-content:center;background:rgba(3,6,18,.82);backdrop-filter:blur(4px);
 padding:20px;overflow-y:auto}
.arcade-logbook.on{display:flex}
.arcade-logbook .page{position:relative;width:min(760px,96vw);max-height:92vh;
 overflow-y:auto;padding:26px 26px 30px 58px;color:#23324a;border-radius:3px;
 font-family:'Rajdhani','Segoe UI',sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.6);
 background:linear-gradient(90deg,transparent 44px,#e9a8a8 44px,#e9a8a8 46px,transparent 46px),
 repeating-linear-gradient(180deg,transparent 0 33px,#cfd9e6 33px 34px),#fbf7ee}
.arcade-logbook .paperclose{position:absolute;top:8px;right:10px;width:34px;height:34px;
 border:none;background:transparent;color:#8494ab;font-size:26px;line-height:1;
 cursor:pointer;border-radius:50%}
.arcade-logbook .paperclose:hover{background:rgba(0,0,0,.07);color:#23324a}
.arcade-logbook .pagehead{display:flex;align-items:baseline;justify-content:space-between;
 gap:12px;margin-bottom:4px}
.arcade-logbook .pagetitle{font-family:'Orbitron','Rajdhani',sans-serif;font-weight:900;
 font-size:clamp(19px,4.2vw,27px);letter-spacing:.1em;color:#1b2740}
.arcade-logbook .pagestars{font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;
 font-size:15px;color:#c8901f}
.arcade-logbook .dim{opacity:.32}
.arcade-logbook .pageaccount{font-size:13.5px;line-height:1.5;opacity:.78;margin-bottom:18px;
 padding-bottom:12px;border-bottom:1px dashed #c3cede}
.arcade-logbook .pageaccount .ok{color:#1d7a4a;font-weight:600}
.arcade-logbook .signin{color:#1558b0;font-weight:700;text-decoration:underline}
.arcade-logbook .grid{display:grid;gap:12px;
 grid-template-columns:repeat(auto-fill,minmax(148px,1fr))}
.arcade-logbook .slot{position:relative;text-align:center;padding:12px 8px 9px;
 border-radius:10px;min-height:132px}
.arcade-logbook .slot.locked{border:2px dashed #b9c5d6;color:#94a3b8;
 background:rgba(255,255,255,.4)}
.arcade-logbook .slot.earned{border:none;color:#21304a;
 background:conic-gradient(from 210deg,#fff3c4,#ffd166,#fff6d8,#f7b733,#fff3c4);
 box-shadow:0 5px 12px rgba(0,0,0,.24),inset 0 0 0 3px rgba(255,255,255,.65)}
.arcade-logbook .slot.earned.rare{
 background:conic-gradient(from 200deg,#d8f3ff,#7fd4ff,#eaf9ff,#35a7e8,#d8f3ff)}
.arcade-logbook .slot .badge{font-size:30px;line-height:1}
.arcade-logbook .slot.earned .badge{color:#b8860b;text-shadow:0 1px 0 #fff}
.arcade-logbook .slot .sname{font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;
 font-size:11.5px;letter-spacing:.07em;margin:5px 0 3px}
.arcade-logbook .slot .shint{font-size:11.5px;line-height:1.3;opacity:.8}
.arcade-logbook .slot .sstars{margin-top:6px;font-size:10px;color:#c8901f;letter-spacing:1px}
.arcade-logbook .slot.locked .sstars{color:#a9b6c8}
.arcade-toast{position:fixed;left:50%;bottom:84px;transform:translateX(-50%) translateY(20px);
 z-index:59;pointer-events:none;opacity:0;display:flex;align-items:center;gap:10px;
 padding:10px 18px;border-radius:999px;background:linear-gradient(120deg,#fff3c4,#ffd166);
 color:#3a2a05;box-shadow:0 8px 30px rgba(0,0,0,.45);
 font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;font-size:13px;
 letter-spacing:.08em;transition:opacity .26s ease,transform .26s ease}
.arcade-toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
.arcade-bookbtn{position:fixed;left:50%;transform:translateX(-50%);
 bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:58;cursor:pointer;
 font-family:'Orbitron','Rajdhani',sans-serif;font-weight:800;font-size:11px;
 letter-spacing:.14em;padding:9px 16px;min-height:40px;color:#ffd166;
 background:rgba(10,16,34,.72);border:1px solid rgba(255,209,102,.45);border-radius:999px}
.arcade-bookbtn .count{opacity:.7;margin-left:6px}
`;
  doc.head.appendChild(el);
}

/**
 * The whole thing, wired: styles, page, button, toast, award pass, persistence.
 * A game calls this once and then only has to report events.
 *
 *   const log = mountLogbook({ game:'runefall', title:'RUNE LOG', stickers: STICKERS });
 *   log.report({ type:'floorClear', floor:2 });
 */
/* Defaults on every optional argument, not just for tidiness: a TypeScript
   caller infers a destructured parameter without a default as REQUIRED, so
   omitting `onToast` was a type error in the one game that is written in TS. */
export function mountLogbook({
  game, stickers,
  title = 'LOGBOOK', api = undefined, onToast = null, strings = null, migrate = null,
}) {
  injectLogbookStyles();

  const arcade = new Arcade({ game, api });

  const page = document.createElement('div');
  page.className = 'arcade-logbook';
  document.body.appendChild(page);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'arcade-bookbtn';
  btn.innerHTML = `${title ?? 'LOGBOOK'}<span class="count"></span>`;
  document.body.appendChild(btn);

  const toast = document.createElement('div');
  toast.className = 'arcade-toast';
  toast.innerHTML = '<span class="t-star">★</span><span class="t-name"></span>';
  document.body.appendChild(toast);

  const book = new Logbook({
    mount: page, arcade, stickers, title: title ?? 'LOGBOOK', strings,
  });

  /* One-time import of whatever the game stored before it had a logbook.
     Running it before init() means the migrated stickers are part of the local
     copy when the account merge happens, so they sync up rather than being
     overwritten by an emptier remote. */
  if (typeof migrate === 'function') {
    try {
      const found = migrate() ?? [];
      const known = new Set(stickers.map(s => s.id));
      const add = found.filter(id => known.has(id));
      if (add.length) {
        arcade.save(d => {
          d.stickers = [...new Set([...(d.stickers ?? []), ...add])];
        });
      }
    } catch { /* a broken old save must not stop the game booting */ }
  }
  btn.addEventListener('click', () => book.toggle());

  const total = totalStars(stickers);
  const refreshBtn = () => {
    btn.querySelector('.count').textContent =
      `${starCount(stickers, arcade.data.stickers ?? [])}/${total}`;
  };

  /* One toast at a time, queued. A finished run can award four stickers at once
     and four overlapping toasts is noise rather than celebration. */
  let queue = [];
  let timer = null;
  const byId = new Map(stickers.map(s => [s.id, s]));
  function showToast(ids) {
    queue.push(...ids);
    if (timer) return;
    const next = () => {
      const id = queue.shift();
      if (!id) { timer = null; toast.classList.remove('on'); return; }
      toast.querySelector('.t-name').textContent = byId.get(id)?.name ?? id;
      toast.classList.add('on');
      onToast?.(id);
      timer = setTimeout(() => {
        toast.classList.remove('on');
        setTimeout(next, 260);
      }, 1900);
    };
    next();
  }

  arcade.onChange(() => { refreshBtn(); book.refresh(); });
  arcade.init().catch(() => {});
  refreshBtn();

  return {
    arcade, book,
    /** Report something that happened. Returns ids newly earned. */
    report(event, extra) {
      const won = award(stickers, event, arcade.data.stickers ?? []);
      if (!won.length) return won;
      arcade.save(d => {
        d.stickers = [...new Set([...(d.stickers ?? []), ...won])];
        if (extra) extra(d);
      });
      book.refresh();
      refreshBtn();
      showToast(won);
      return won;
    },
    open: () => book.show()
  };
}
