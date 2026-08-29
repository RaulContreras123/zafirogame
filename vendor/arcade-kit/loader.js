// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// loader.js — load everything once, up front, behind a progress bar.
//
// A game that pops a texture in mid-animation looks broken, and these builds
// carry tens of megabytes. One failed decoration must never take the game down
// with it, so every load is individually guarded.

/**
 * @param {object} cfg
 * @param {object} cfg.PIXI
 * @param {Array}  cfg.textures  [{ key, url, group?, resolution? }]
 * @param {Array}  [cfg.fonts]   [{ family, url }]
 * @param {Function} [cfg.onProgress] (0..1)
 * @returns {Promise<object>} textures keyed by `key`, grouped under `group` when given
 */
export async function loadAssets({ PIXI, textures = [], fonts = [], onProgress = () => {} }) {
  const out = {};
  let done = 0;
  const total = textures.length + fonts.length;
  const bump = () => onProgress(total ? ++done / total : 1);

  await Promise.all(textures.map(async job => {
    try {
      // SVGs need an explicit resolution or PixiJS rasterises them tiny.
      const t = job.resolution
        ? await PIXI.Assets.load({ src: job.url, data: { resolution: job.resolution } })
        : await PIXI.Assets.load(job.url);
      if (job.group) (out[job.group] ||= {})[job.key] = t;
      else out[job.key] = t;
    } catch {
      console.warn('asset failed:', job.url);
    } finally { bump(); }
  }));

  await Promise.all(fonts.map(async f => {
    try {
      const face = new FontFace(f.family, `url(${f.url})`);
      await face.load();
      document.fonts.add(face);
    } catch {
      console.warn('font failed:', f.family);
    } finally { bump(); }
  }));

  out.white = whiteTexture(PIXI);
  return out;
}

/** A 1x1 white texture, for tinted rectangles that batch with sprites. */
export function whiteTexture(PIXI) {
  const c = document.createElement('canvas');
  c.width = c.height = 8;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 8, 8);
  return PIXI.Texture.from(c);
}

/** A soft round sprite, generated rather than shipped. */
export function sparkTexture(THREE_or_PIXI, { asThreeTexture = null } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,240,200,0.7)');
  grd.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  if (asThreeTexture) {
    const t = new asThreeTexture.CanvasTexture(c);
    t.colorSpace = asThreeTexture.SRGBColorSpace;
    return t;
  }
  return THREE_or_PIXI.Texture.from(c);
}
