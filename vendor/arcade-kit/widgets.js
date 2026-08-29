// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// widgets.js — the small retained PixiJS pieces every HUD in this estate needs.
//
// The p5-era prototypes drew their whole UI with rect() and text() every frame,
// recomputed from scratch. These are retained sprites that only update when
// their value changes, which is both cheaper and lets a bar ease toward a
// number instead of snapping to it.
//
// `PIXI` is injected so a game can vendor its own build.
//
// Everything here reports its own size on `__w` / `__h`. Reading `.width` off a
// PixiJS Container costs a bounds pass and lies whenever a child sits at a
// negative offset or carries an invisible hit sprite, and `.width =` on a
// Container sets SCALE rather than size — so measurement that goes through Pixi
// is both slow and wrong. `Column` reads the fields instead.

/** Minimum pointer target, in CSS px. See UI-RESEARCH.md — 44 (Apple/WCAG AAA)
 *  and 48 (Material) reconciled upward, because a player reaching for a menu
 *  mid-run is less accurate than one filling in a form. */
export const TOUCH_MIN = 48;

export function panel(PIXI, tex, w, h, { tint = 0x2a2733, alpha = 0.92, border = 0xc9a227, slice = 16, art = 'panelPlain' } = {}) {
  const box = new PIXI.Container();
  if (tex[art]) {
    const bg = new PIXI.NineSlicePlane(tex[art], slice, slice, slice, slice);
    bg.width = w; bg.height = h; bg.tint = tint; bg.alpha = alpha;
    box.addChild(bg);
  }
  if (tex.panelBorder && art === 'panelPlain') {
    const fr = new PIXI.NineSlicePlane(tex.panelBorder, 16, 16, 16, 16);
    fr.width = w; fr.height = h; fr.tint = border; fr.alpha = 0.9;
    box.addChild(fr);
  }
  box.__w = w; box.__h = h;
  return box;
}

export function label(PIXI, text, size, {
  fill = 0xe8dcc0, font = 'sans-serif', weight = '600', align = 'left',
  stroke = 0, strokeThickness = 0, wrap = 0,
} = {}) {
  const style = { fontFamily: font, fontSize: size, fontWeight: weight, fill, align, stroke, strokeThickness };
  if (wrap) { style.wordWrap = true; style.wordWrapWidth = wrap; }
  return new PIXI.Text(text, style);
}

/**
 * A button.
 *
 * Two things here are not cosmetic. The press offset moves an INNER container,
 * not the button itself: shifting `box.y` meant the caller had to stash the
 * resting position in `box.__y` by hand, and any layout that moved the button
 * afterwards left it permanently two pixels down. Nothing outside can forget to
 * do something it no longer has to do.
 *
 * And the hit area is inflated to TOUCH_MIN independently of the drawn size, so
 * a 34px-tall secondary button is still a 48px target. Every target-size spec
 * measures the region that responds to a pointer, not the ink.
 */
export function button(PIXI, tex, text, w, h, onClick, opts = {}) {
  const {
    tint = 0xffffff, hover = 0xffe3b0, art = 'buttonIdle', down = 'buttonDown',
    icon = null, iconTint = 0xffffff, fontSize = Math.round(h * 0.36), ...textOpts
  } = opts;

  const box = new PIXI.Container();
  const inner = new PIXI.Container();
  box.addChild(inner);

  const bg = new PIXI.NineSlicePlane(tex[art] || tex.buttonIdle || tex.white, 12, 12, 12, 14);
  bg.width = w; bg.height = h; bg.tint = tint;
  inner.addChild(bg);

  const t = label(PIXI, text, fontSize, {
    fill: 0xfff3d8, weight: '700', stroke: 0x2a1a0a, strokeThickness: 3, ...textOpts,
  });
  t.anchor.set(0.5);
  t.y = h / 2 - 2;
  inner.addChild(t);

  let ic = null;
  if (icon && tex[icon]) {
    ic = new PIXI.Sprite(tex[icon]);
    const s = Math.round(h * 0.42);
    ic.width = ic.height = s;
    ic.anchor.set(0.5);
    ic.tint = iconTint;
    ic.y = h / 2 - 1;
    inner.addChild(ic);
    // Icon and label are centred as one group, or a wide label pushes the icon
    // off the left edge of a narrow button.
    const gap = Math.round(s * 0.4);
    const total = s + gap + t.width;
    ic.x = w / 2 - total / 2 + s / 2;
    t.x = w / 2 - total / 2 + s + gap + t.width / 2;
  } else {
    t.x = w / 2;
  }

  // Pointer targets are measured on the responsive region, not the artwork.
  const grow = Math.max(0, TOUCH_MIN - h) / 2;
  box.eventMode = 'static';
  box.cursor = 'pointer';
  box.hitArea = new PIXI.Rectangle(-4, -grow, w + 8, h + grow * 2);

  const pressed = tex[down] || null;
  const rest = () => { inner.y = 0; if (pressed) bg.texture = tex[art] || tex.buttonIdle; };
  box.on('pointerover', () => { bg.tint = hover; });
  box.on('pointerout', () => { bg.tint = tint; rest(); });
  box.on('pointerdown', () => { inner.y = 2; if (pressed) bg.texture = pressed; });
  // Fires on release, never on press, so a finger that lands wrong can slide
  // off and cancel. That is the only undo a one-tap control can offer.
  box.on('pointerup', () => { rest(); onClick?.(); });
  box.on('pointerupoutside', rest);

  box.__label = t;
  box.__icon = ic;
  box.__w = w; box.__h = h;
  return box;
}

// --- layout -----------------------------------------------------------------

let insetProbe = null;

/**
 * The four safe-area insets, in CSS px.
 *
 * `env(safe-area-inset-*)` is a CSS value and a canvas cannot read one, so the
 * page carries a hidden element whose padding is set from the four env() values
 * and this reads them back. It only reports anything at all when the document
 * has `viewport-fit=cover`; without that the insets resolve to zero and a
 * notched phone eats the corners of the UI in silence.
 *
 * Landscape is the case that matters: a notched iPhone reports 44px on BOTH
 * sides there, which is 12% of a 750px viewport.
 */
export function safeInsets() {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof document === 'undefined' || !document.body) return zero;
  if (!insetProbe) {
    insetProbe = document.createElement('div');
    insetProbe.setAttribute('aria-hidden', 'true');
    insetProbe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
      'padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);' +
      'padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px);';
    document.body.appendChild(insetProbe);
  }
  const cs = getComputedStyle(insetProbe);
  const n = v => { const f = parseFloat(v); return Number.isFinite(f) && f > 0 ? f : 0; };
  return {
    top: n(cs.paddingTop), right: n(cs.paddingRight),
    bottom: n(cs.paddingBottom), left: n(cs.paddingLeft),
  };
}

/**
 * The rectangle a screen is allowed to draw in.
 *
 * Two different problems, both of which apply: the safe-area insets keep UI out
 * from under the hardware, and the action-safe fraction keeps it away from an
 * edge the pointer is inaccurate near. Broadcast settled on 90% in the sixties
 * and every console TRC since has inherited it.
 */
export function safeFrame(w, h, { pad = 16, action = 0.94 } = {}) {
  const s = safeInsets();
  const bx = Math.max(pad, s.left) + (w * (1 - action)) / 2;
  const by = Math.max(pad, s.top) + (h * (1 - action)) / 2;
  const ex = Math.max(pad, s.right) + (w * (1 - action)) / 2;
  const ey = Math.max(pad, s.bottom) + (h * (1 - action)) / 2;
  return { x: bx, y: by, w: Math.max(1, w - bx - ex), h: Math.max(1, h - by - ey) };
}

/**
 * A measured vertical flow.
 *
 * The screens this replaces positioned everything at a fraction of viewport
 * height — `h * 0.55`, `h * 0.71`, `h * 0.80`. Those fractions are a fixed
 * ratio and the things they position are a fixed number of pixels tall, so the
 * two converge as the viewport shrinks and cross over somewhere around 400px:
 * at 342px tall the LAUNCH button and the control text occupied the same
 * ninety pixels. A flow cannot do that. Each item is placed below the measured
 * bottom of the one before it, so overlap is not a bug that can be introduced,
 * it is a state the layout cannot represent.
 */
export class Column {
  constructor(PIXI, { width = 0, gap = 12, align = 'center' } = {}) {
    this.root = new PIXI.Container();
    this.width = width;
    this.gap = gap;
    this.align = align;
    this.items = [];
    this.height = 0;
  }

  add(node, opts = {}) {
    this.items.push({ node, ...opts });
    this.root.addChild(node);
    return node;
  }

  /**
   * Push extra space in above one item and re-flow.
   *
   * What this is for: two columns side by side whose last items should line up
   * along the bottom of the taller one — a confirm button and a cancel button
   * across a split layout — without the shorter column's heading sliding down
   * to the middle of the screen to achieve it.
   */
  pad(index, px) {
    const it = this.items[index];
    if (!it || !(px > 0)) return this.height;
    it.before = (it.before ?? 0) + px;
    return this.arrange();
  }

  /** Measured size, preferring the field a widget reports over a bounds pass. */
  static sizeOf(node) {
    const w = node.__w ?? node.width ?? 0;
    const h = node.__h ?? node.height ?? 0;
    return { w, h };
  }

  arrange() {
    let y = 0;
    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      if (it.node.visible === false) continue;
      const m = Column.sizeOf(it.node);
      const w = it.width ?? m.w;
      const h = it.height ?? m.h;
      const align = it.align ?? this.align;
      it.node.x = Math.round(
        align === 'left' ? 0 : align === 'right' ? this.width - w : (this.width - w) / 2,
      );
      it.node.y = Math.round(y + (it.before ?? 0));
      y += h + (it.before ?? 0) + (i === this.items.length - 1 ? 0 : (it.gap ?? this.gap));
    }
    this.height = Math.round(y);
    this.root.__w = this.width;
    this.root.__h = this.height;
    return this.height;
  }
}

/**
 * A clipped, draggable viewport for content that is genuinely taller than the
 * space available.
 *
 * The escape hatch of last resort. Shrinking a settings list until it fits is
 * the wrong answer, because the floor it would have to break through is the
 * touch-target minimum and the legible-type minimum at the same time; past
 * that point the list is present but unusable, which is worse than absent.
 * So the fit scale stops at a floor and whatever still does not fit scrolls.
 *
 * A visible thumb is not decoration. Content cut off with no signifier reads as
 * content that ended.
 */
export class Scroller {
  constructor(PIXI, w, h, { bar = 0x6ff0ff } = {}) {
    this.PIXI = PIXI;
    this.root = new PIXI.Container();
    this.w = w; this.h = h;
    this.offset = 0;
    this.contentH = 0;

    this.content = new PIXI.Container();
    this.root.addChild(this.content);

    const mask = new PIXI.Graphics();
    mask.beginFill(0xffffff).drawRect(0, 0, w, h).endFill();
    this.root.addChild(mask);
    this.content.mask = mask;

    this.track = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.track.width = 3; this.track.height = h; this.track.x = w - 3;
    this.track.tint = 0x1b2b3d; this.track.alpha = 0.8;
    this.root.addChild(this.track);

    this.thumb = new PIXI.Sprite(PIXI.Texture.WHITE);
    this.thumb.width = 3; this.thumb.x = w - 3;
    this.thumb.tint = bar;
    this.root.addChild(this.thumb);

    // The drag listens on the container and lets events BUBBLE up to it. The
    // obvious implementation — a full-size transparent sprite on top to catch
    // drags — makes everything inside the list unclickable, because the catcher
    // wins every hit test against the content it is covering. That is a silent
    // failure: the list scrolls, it looks alive, and not one button in it works.
    this.root.eventMode = 'static';
    this.root.hitArea = new PIXI.Rectangle(0, 0, w, h);

    // A drag has to be mostly VERTICAL before it counts as a scroll. Otherwise
    // dragging a horizontal slider inside the list scrolls the list as well,
    // and the two fight over the same finger.
    let fx = 0, fy = 0, base = 0, tracking = false, scrolling = false;
    this.root.on('pointerdown', e => {
      tracking = true; scrolling = false;
      fx = e.global.x; fy = e.global.y; base = this.offset;
    });
    this.root.on('globalpointermove', e => {
      if (!tracking) return;
      const dy = e.global.y - fy, dx = e.global.x - fx;
      if (!scrolling && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx) * 1.5) scrolling = true;
      if (scrolling) this.scrollTo(base + dy);
    });
    const stop = () => { tracking = false; scrolling = false; };
    this.root.on('pointerup', stop);
    this.root.on('pointerupoutside', stop);
    this.root.on('wheel', e => this.scrollTo(this.offset - e.deltaY));

    this.root.__w = w; this.root.__h = h;
  }

  setContent(node, height) {
    this.content.removeChildren();
    this.content.addChild(node);
    this.contentH = height ?? Column.sizeOf(node).h;
    this.scrollTo(this.offset);
  }

  scrollTo(v) {
    const span = Math.max(0, this.contentH - this.h);
    this.offset = Math.max(-span, Math.min(0, v));
    this.content.y = Math.round(this.offset);
    const frac = span > 0 ? this.h / this.contentH : 1;
    this.thumb.height = Math.max(16, Math.round(this.h * frac));
    this.thumb.visible = span > 0;
    this.track.visible = span > 0;
    this.thumb.y = span > 0
      ? Math.round((-this.offset / span) * (this.h - this.thumb.height))
      : 0;
  }
}

const clamp01 = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Uniform fit scale for a block of content, capped at both ends.
 *
 * `min(availW/contentW, availH/contentH)` is Unity's CanvasScaler "Expand" and
 * broadcast's fit: nothing is cropped, the surplus becomes margin. The cap at
 * the top stops a 1600x900 desktop from rendering a phone screenshot at 2.4x,
 * and the floor at the bottom is where the caller has to start scrolling
 * instead, because below it the type and the targets stop being usable.
 */
export function fitScale(availW, availH, contentW, contentH, { min = 0.7, max = 1.4 } = {}) {
  if (!(contentW > 0) || !(contentH > 0)) return 1;
  return clamp01(Math.min(availW / contentW, availH / contentH), min, max);
}

/**
 * A bar that eases toward its value, with a shield overlay and a hit flash.
 * Shield rides ON TOP of health rather than beside it, so "how much is between
 * me and death" is one length to read, not two.
 */
export class Bar {
  constructor(PIXI, tex, w, h, colour, shieldColour = 0x7fd4ff) {
    this.PIXI = PIXI;
    this.root = new PIXI.Container();
    this.w = w; this.h = h;

    const back = new PIXI.Sprite(tex.white);
    back.width = w; back.height = h; back.tint = 0x120f18; back.alpha = 0.9;
    this.root.addChild(back);

    this.fill = new PIXI.Sprite(tex.white);
    this.fill.width = w; this.fill.height = h; this.fill.tint = colour;
    this.root.addChild(this.fill);

    this.shield = new PIXI.Sprite(tex.white);
    this.shield.width = 0; this.shield.height = h; this.shield.tint = shieldColour; this.shield.alpha = 0.85;
    this.root.addChild(this.shield);

    this.flash = new PIXI.Sprite(tex.white);
    this.flash.width = w; this.flash.height = h; this.flash.tint = 0xffffff; this.flash.alpha = 0;
    this.flash.blendMode = PIXI.BLEND_MODES.ADD;
    this.root.addChild(this.flash);

    const frame = new PIXI.Graphics();
    frame.lineStyle(2, 0x000000, 0.55);
    frame.drawRect(0, 0, w, h);
    this.root.addChild(frame);

    this.value = 1; this.target = 1;
    this.shieldValue = 0; this.shieldTarget = 0;
  }

  set(current, max, shield = 0, shieldMax = 0) {
    this.target = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
    this.shieldTarget = shieldMax > 0 ? Math.max(0, Math.min(1, shield / shieldMax)) : 0;
  }

  hit() { this.flash.alpha = 0.7; }

  tick(dt) {
    this.value += (this.target - this.value) * Math.min(1, dt * 0.16);
    this.shieldValue += (this.shieldTarget - this.shieldValue) * Math.min(1, dt * 0.16);
    this.fill.width = Math.max(0, this.w * this.value);
    this.shield.width = Math.max(0, this.w * this.shieldValue);
    if (this.flash.alpha > 0) this.flash.alpha = Math.max(0, this.flash.alpha - dt * 0.06);
  }
}

/** A number that counts up rather than jumping, so a score reads as earned. */
export class Counter {
  constructor(text) { this.text = text; this.shown = 0; this.target = 0; }
  set(v) { this.target = v; }
  snap(v) { this.shown = this.target = v; this.text.text = String(v); }
  tick(dt) {
    if (this.shown === this.target) return;
    const diff = this.target - this.shown;
    const step = Math.max(1, Math.abs(diff) * 0.18) * Math.sign(diff);
    this.shown = Math.abs(diff) < 1.5 ? this.target : Math.round(this.shown + step * dt);
    this.text.text = String(Math.round(this.shown));
  }
}

/** Rising damage/score numbers. One pool, ticked together. */
export class Floaters {
  constructor(PIXI, container) { this.PIXI = PIXI; this.layer = container; this.items = []; }

  add(text, x, y, colour = 0xffffff, size = 26, font = 'sans-serif') {
    const t = label(this.PIXI, text, size, {
      fill: colour, weight: '700', font, stroke: 0x0a0910, strokeThickness: 4,
    });
    t.anchor.set(0.5);
    t.x = x; t.y = y;
    this.layer.addChild(t);
    this.items.push({ t, life: 1, vy: -0.9 - Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.8 });
  }

  tick(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const f = this.items[i];
      f.t.y += f.vy * dt;
      f.t.x += f.vx * dt;
      f.vy += 0.012 * dt;
      f.life -= 0.014 * dt;
      f.t.alpha = Math.max(0, Math.min(1, f.life * 1.6));
      if (f.life <= 0) { this.layer.removeChild(f.t); this.items.splice(i, 1); }
    }
  }
}

/**
 * A drag-and-click slider. Retained, like everything else here.
 *
 * The hit area is the full height of the row rather than the 6px track, because
 * a 6px drag target is a 6px drag target whatever the art says. Dragging is
 * captured globally once it starts, so the pointer leaving the widget mid-drag
 * does not drop the value halfway.
 *
 * The handle draws from `tex.sliderKnob` when a game has collected one and
 * falls back to a drawn bar when it has not, so this stays a drop-in for the
 * games that vendored the earlier version. The fallback knob is deliberately
 * wider than it used to be: an 8px handle is invisible against a 6px track and
 * gives a thumb nothing to aim at.
 */
export class Slider {
  constructor(PIXI, tex, w, h, value, onChange, { tint = 0x6ff0ff, track = 0x1b2b3d, thickness = 8 } = {}) {
    this.PIXI = PIXI;
    this.root = new PIXI.Container();
    this.w = w;
    this.value = value;
    this.onChange = onChange;

    const ty = Math.round((h - thickness) / 2);
    const back = tex.sliderTrack
      ? new PIXI.NineSlicePlane(tex.sliderTrack, 8, 0, 8, 0)
      : new PIXI.Sprite(tex.white);
    back.width = w; back.height = thickness; back.y = ty;
    back.tint = track;
    this.root.addChild(back);

    this.fill = tex.sliderTrack
      ? new PIXI.NineSlicePlane(tex.sliderTrack, 8, 0, 8, 0)
      : new PIXI.Sprite(tex.white);
    this.fill.height = thickness; this.fill.y = ty;
    this.fill.tint = tint;
    this.root.addChild(this.fill);

    if (tex.sliderKnob) {
      this.knob = new PIXI.Sprite(tex.sliderKnob);
      const kh = Math.round(Math.min(h, 34));
      this.knob.height = kh;
      this.knob.width = Math.round(kh * 0.75);
    } else {
      this.knob = new PIXI.Sprite(tex.white);
      this.knob.width = 14; this.knob.height = Math.round(h * 0.62);
    }
    this.knob.anchor.set(0.5, 0.5);
    this.knob.y = h / 2;
    this.knob.tint = 0xffffff;
    this.root.addChild(this.knob);

    // Texture.EMPTY has no frame, so a sprite made from it reports a zero-size
    // bounds on some Pixi builds and silently stops being hit-testable. WHITE
    // at alpha 0 measures correctly and still draws nothing.
    const hit = new PIXI.Sprite(PIXI.Texture.WHITE);
    hit.width = w + 32; hit.height = Math.max(h, TOUCH_MIN);
    hit.x = -16; hit.y = (h - hit.height) / 2;
    hit.alpha = 0;
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    this.root.addChild(hit);

    let dragging = false;
    const apply = ev => {
      const local = this.root.toLocal(ev.global);
      this.set(Math.max(0, Math.min(1, local.x / w)));
      this.onChange?.(this.value);
    };
    hit.on('pointerdown', ev => { dragging = true; apply(ev); });
    hit.on('globalpointermove', ev => { if (dragging) apply(ev); });
    const stop = () => { dragging = false; };
    hit.on('pointerup', stop);
    hit.on('pointerupoutside', stop);

    this.root.__w = w; this.root.__h = h;
    this.set(value);
  }

  set(v) {
    this.value = Math.max(0, Math.min(1, v));
    // A NineSlicePlane with a zero width renders its two corner slices on top
    // of each other and leaves a stub of track lit at value 0.
    this.fill.width = Math.max(0.01, this.w * this.value);
    this.fill.visible = this.value > 0.005;
    this.knob.x = this.w * this.value;
  }
}

/**
 * An on/off row. Same shape as Slider so a settings screen can lay both out.
 *
 * Drawn as a checkbox rather than a pill when the art is available. A pill
 * reads as a toggle only once it has been touched; a box with a tick in it is
 * legible at a glance and at any size, and the box is a single square target
 * instead of a 62x24 sliver.
 */
export class Toggle {
  constructor(PIXI, tex, w, h, value, onChange, { on = 0x6ff0ff, off = 0x2a3a4d, font = 'sans-serif' } = {}) {
    this.root = new PIXI.Container();
    this.value = !!value;
    this.onChange = onChange;
    this.onTint = on; this.offTint = off;

    const boxed = !!tex.checkBox;
    let textX;

    if (boxed) {
      const s = Math.round(Math.min(h, 38));
      this.pill = new PIXI.Sprite(tex.checkBox);
      this.pill.width = this.pill.height = s;
      this.pill.y = Math.round((h - s) / 2);
      this.root.addChild(this.pill);

      this.knob = new PIXI.Sprite(tex.checkMark || tex.checkBox);
      this.knob.width = this.knob.height = s;
      this.knob.x = 0; this.knob.y = this.pill.y;
      this.root.addChild(this.knob);
      textX = s + 14;
    } else {
      this.pill = new PIXI.Sprite(tex.white);
      this.pill.width = 62; this.pill.height = 24;
      this.pill.y = (h - 24) / 2;
      this.root.addChild(this.pill);

      this.knob = new PIXI.Sprite(tex.white);
      this.knob.width = 22; this.knob.height = 18;
      this.knob.y = (h - 18) / 2;
      this.knob.tint = 0x05070f;
      this.root.addChild(this.knob);
      textX = 74;
    }
    this.boxed = boxed;

    this.text = label(PIXI, '', 16, { fill: 0x9fb6c8, weight: '700', font });
    this.text.anchor.set(0, 0.5);
    this.text.x = textX; this.text.y = h / 2;
    this.root.addChild(this.text);

    const hit = new PIXI.Sprite(PIXI.Texture.WHITE);
    hit.width = w; hit.height = Math.max(h, TOUCH_MIN);
    hit.y = (h - hit.height) / 2;
    hit.alpha = 0;
    hit.eventMode = 'static';
    hit.cursor = 'pointer';
    hit.on('pointerup', () => { this.set(!this.value); this.onChange?.(this.value); });
    this.root.addChild(hit);

    this.root.__w = w; this.root.__h = h;
    this.set(this.value);
  }

  set(v) {
    this.value = !!v;
    if (this.boxed) {
      this.pill.tint = this.value ? this.onTint : this.offTint;
      this.pill.alpha = this.value ? 0.55 : 0.95;
      this.knob.visible = this.value;
      this.knob.tint = this.onTint;
    } else {
      this.pill.tint = this.value ? this.onTint : this.offTint;
      this.pill.alpha = this.value ? 0.5 : 0.9;
      this.knob.x = this.value ? 38 : 2;
    }
    this.text.text = this.value ? 'ON' : 'OFF';
    this.text.style.fill = this.value ? this.onTint : 0x8aa6bc;
  }
}
