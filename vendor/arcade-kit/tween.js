// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// tween.js — promise-returning tweens driven by the PixiJS ticker, and a
// particle pool.
//
// The ticker rides requestAnimationFrame, which browsers pause on a
// backgrounded tab. That is normally self-healing — on return, elapsed time
// already exceeds the duration and the tween completes on the next frame — but
// a ticker that never restarts would strand whatever `await`s it and lock
// input for good. Hence the timer backstop on every tween.

export const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  outBack: t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
};

export const wait = ms => new Promise(r => setTimeout(r, ms));

export function tween(ticker, ms, fn) {
  return new Promise(resolve => {
    const start = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      ticker.remove(step);
      resolve();
    };
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / ms);
      fn(t);
      if (t >= 1) finish();
    };
    const guard = setTimeout(() => { fn(1); finish(); }, ms + 2000);
    ticker.add(step);
  });
}

/**
 * A pooled additive-blend particle burst. Fixed cost per frame; sprites are
 * recycled rather than allocated, because a shmup or a cascade can ask for
 * hundreds a second.
 */
export class Particles {
  constructor(PIXI, container, texture, { max = 600 } = {}) {
    this.PIXI = PIXI;
    this.layer = container;
    this.texture = texture;
    this.max = max;
    this.live = [];
    this.pool = [];
  }

  _take() {
    const s = this.pool.pop() || new this.PIXI.Sprite(this.texture);
    s.anchor.set(0.5);
    s.blendMode = this.PIXI.BLEND_MODES.ADD;
    s.alpha = 1;
    s.visible = true;
    this.layer.addChild(s);
    return s;
  }

  burst(x, y, { tint = 0xffffff, count = 12, power = 1, size = 8, gravity = 0.22, spread = Math.PI * 2, angle = 0 } = {}) {
    for (let i = 0; i < count && this.live.length < this.max; i++) {
      const s = this._take();
      s.width = s.height = size * (0.5 + Math.random());
      s.x = x; s.y = y;
      s.tint = tint;
      const a = angle + (Math.random() - 0.5) * spread;
      const v = (1.4 + Math.random() * 3.2) * power;
      this.live.push({
        s, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: 1, decay: 0.016 + Math.random() * 0.02, gravity,
      });
    }
  }

  tick(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.s.x += p.vx * dt;
      p.s.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.98;
      p.life -= p.decay * dt;
      p.s.alpha = Math.max(0, p.life);
      p.s.scale.set(p.s.scale.x * (1 - 0.012 * dt));
      if (p.life <= 0) {
        this.layer.removeChild(p.s);
        p.s.visible = false;
        this.pool.push(p.s);
        this.live.splice(i, 1);
      }
    }
  }

  clear() {
    for (const p of this.live) { this.layer.removeChild(p.s); this.pool.push(p.s); }
    this.live.length = 0;
  }
}

/**
 * Screen shake with decay, applied to any container.
 *
 * It ACCUMULATES rather than taking a max, because ten explosions at once
 * should shake harder than one, and the amount is squared before it becomes
 * pixels so the falloff is punchy instead of a long linear slide.
 *
 * `scale` is the accessibility valve: one number, set once from the player's
 * setting, that every call site inherits without knowing about it. Shake is the
 * single largest source of motion in an arcade game, so it is the single place
 * worth being able to turn off.
 */
export class Shake {
  constructor(container, { scale = 1 } = {}) {
    this.c = container;
    this.amount = 0;
    this.scale = scale;
    this.baseX = container.x;
    this.baseY = container.y;
  }
  rebase() { this.baseX = this.c.x; this.baseY = this.c.y; }
  setScale(v) {
    this.scale = Math.max(0, v);
    if (this.scale === 0) { this.amount = 0; this.c.x = this.baseX; this.c.y = this.baseY; }
  }
  add(v, cap = 1.4) { this.amount = Math.min(cap, this.amount + v); }
  tick(dt) {
    this.amount = Math.max(0, this.amount - dt * 0.04);
    if (this.scale === 0) return;
    const s = this.amount * this.amount * 14 * this.scale;
    this.c.x = this.baseX + (Math.random() - 0.5) * s;
    this.c.y = this.baseY + (Math.random() - 0.5) * s;
  }
}
