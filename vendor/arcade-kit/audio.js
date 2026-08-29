// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// audio.js — Web Audio, one graph, no library.
//
// Two things matter here and both are about repetition. An arcade game fires
// the same handful of cues thousands of times a session, so every cue is a
// *set* of samples picked at random and detuned slightly; and chained events
// raise pitch by step, so a five-chain sounds like a five-chain instead of five
// identical clicks.
//
// The cue table and the music list are DATA, supplied by the game:
//
//   new Audio({
//     cues:  { shoot: { files: ['sfx/laser1.ogg', ...], gain: 0.4 }, ... },
//     music: ['menu', 'level-1', 'boss', 'defeat'],
//   })

export class Audio {
  constructor({ cues = {}, music = [], base = 'assets', masterGain = 0.9, musicGain = 0.5 } = {}) {
    this.CUES = cues;
    this.MUSIC = music;
    this.base = base;
    this.masterGain = masterGain;
    this.musicGainLevel = musicGain;
    this.ctx = null;
    this.buffers = new Map();
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.current = null;      // { name, source, gain }
    this.muted = false;
    this.ready = false;
  }

  /**
   * Must be called from a user gesture — browsers will not start an
   * AudioContext otherwise, and a silent game reads as a broken one.
   */
  async unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return; }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.masterGain;
    this.master.connect(this.ctx.destination);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 1;
    this.sfxBus.connect(this.master);

    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = this.musicGainLevel;
    this.musicBus.connect(this.master);

    await this.preloadSfx();
    this.ready = true;
  }

  async _load(url) {
    if (this.buffers.has(url)) return this.buffers.get(url);
    const res = await fetch(url);
    if (!res.ok) { this.buffers.set(url, null); return null; }
    const bytes = await res.arrayBuffer();
    try {
      const buf = await this.ctx.decodeAudioData(bytes);
      this.buffers.set(url, buf);
      return buf;
    } catch {
      this.buffers.set(url, null);
      return null;
    }
  }

  /** SFX are small; load them all up front so the first match is not silent. */
  async preloadSfx() {
    const urls = new Set();
    for (const cue of Object.values(this.CUES)) for (const f of cue.files) urls.add(`${this.base}/${f}`);
    await Promise.all([...urls].map(u => this._load(u)));
  }

  /**
   * Fire a cue. `step` raises pitch by semitone-ish increments for cascades;
   * `pan` places the sound across the board so a match on the left sounds left.
   */
  play(name, { step = 0, pan = 0, gain = 1, rate = null } = {}) {
    if (!this.ready || this.muted) return;
    const cue = this.CUES[name];
    if (!cue) return;
    const url = `${this.base}/${cue.files[(Math.random() * cue.files.length) | 0]}`;
    const buf = this.buffers.get(url);
    if (!buf) return;

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    // A little detune on every shot; without it, repetition turns into a
    // machine-gun artefact within about ten seconds of play.
    src.playbackRate.value = rate ?? (Math.pow(1.06, step) * (0.97 + Math.random() * 0.06));

    const g = this.ctx.createGain();
    g.gain.value = cue.gain * gain;

    const p = this.ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));

    src.connect(g).connect(p).connect(this.sfxBus);
    src.start();
  }

  /** Crossfade to a music cue. Re-requesting the current track is a no-op. */
  async music(name, { fade = 1.6, loop = true, volume = 1 } = {}) {
    if (!this.ready) return;
    if (this.current?.name === name) return;
    if (this.MUSIC.length && !this.MUSIC.includes(name)) return;

    const buf = await this._load(`${this.base}/music/${name}.ogg`);
    if (!buf) return;

    const now = this.ctx.currentTime;
    const old = this.current;
    if (old) {
      old.gain.gain.cancelScheduledValues(now);
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + fade);
      old.source.stop(now + fade + 0.1);
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume, now + fade);
    src.connect(g).connect(this.musicBus);
    src.start(now);

    this.current = { name, source: src, gain: g };
  }

  stopMusic(fade = 1.0) {
    if (!this.current) return;
    const now = this.ctx.currentTime;
    const { source, gain } = this.current;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + fade);
    source.stop(now + fade + 0.1);
    this.current = null;
  }

  /** Duck the music under a big moment, then bring it back. */
  duck(amount = 0.3, hold = 0.8) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const g = this.musicBus.gain;
    const base = this.musicGainLevel;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(base * amount, now + 0.08);
    g.linearRampToValueAtTime(base, now + 0.08 + hold);
  }

  toggleMute() {
    this.muted = !this.muted;
    this._applyMaster();
    return this.muted;
  }

  setMuted(v) {
    this.muted = !!v;
    this._applyMaster();
    return this.muted;
  }

  _applyMaster() {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.masterGain;
  }

  /**
   * Master and music volume, 0..1.
   *
   * A mute key is not a volume control. Every one of these games is something
   * a person plays with something else already making noise, and the only
   * options they have are "all of it" and "none of it".
   *
   * `duck()` ramps musicBus.gain against `musicGainLevel`, so the music setter
   * writes the level *and* the live value — otherwise the next duck springs
   * the volume back to whatever it used to be.
   */
  setMasterGain(v) {
    this.masterGain = clamp01(v);
    this._applyMaster();
  }

  setMusicGain(v) {
    this.musicGainLevel = clamp01(v);
    if (this.musicBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setValueAtTime(this.musicGainLevel, now);
    }
  }
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
