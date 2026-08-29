// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// motion.js — idle paths for a 3D actor, described as data.
//
// The point is that a game's enemies should not all read as "a model bobbing
// in place". A motion spec is pure data, so an enemy's presence lives in the
// theme file next to its name and its health.
//
//   motion: { kind: 'hover', bob: 0.3, swayX: 1.5, pathSpeed: 0.42, roll: 0.16 }

export const DEFAULT_MOTION = {
  kind: 'hover', bob: 0.25, bobSpeed: 1.1, swayX: 0.9, swayZ: 0.4,
  pathSpeed: 0.32, roll: 0.10, yaw: 0.22, track: 0.7,
};

/**
 * Evaluate a motion spec at time `t`.
 * Returns { dx, dy, dz, roll, yaw, fade } — offsets from the actor's anchor.
 *
 *   hover — figure-eight, banking into the turns (winged, weightless)
 *   phase — long lateral drift with a breathing rise and a fade (undead)
 *   lurch — planted; shifts weight instead of floating (heavy, rooted)
 *   prowl — a wide slow arc with real bank (a boss circling the room)
 *   drift — straight lateral patrol (formation flyers, patrolling guards)
 */
export function evalMotion(m, t) {
  m = m || DEFAULT_MOTION;
  const p = t * (m.pathSpeed ?? 0.32);
  let dx = 0, dy = 0, dz = 0, roll = 0, yaw = 0, fade = null;

  switch (m.kind) {
    case 'phase':
      dx = Math.sin(p) * (m.swayX ?? 1);
      dz = Math.sin(p * 0.6 + 1.1) * (m.swayZ ?? 0.5);
      dy = Math.sin(t * (m.bobSpeed ?? 0.7)) * (m.bob ?? 0.5);
      yaw = Math.sin(p) * (m.yaw ?? 0.2);
      roll = Math.cos(p) * (m.roll ?? 0.05);
      if (m.fade) fade = 1 - (m.fade * 0.5) + Math.sin(t * 0.8) * (m.fade * 0.5);
      break;

    case 'lurch': {
      // The square-root easing holds it at the extremes, which is what reads
      // as mass rather than as drift.
      const shift = Math.sin(p);
      dx = Math.sign(shift) * Math.sqrt(Math.abs(shift)) * (m.swayX ?? 0.35);
      dz = Math.sin(p * 0.7) * (m.swayZ ?? 0.15);
      dy = m.planted ? Math.abs(Math.sin(p)) * (m.bob ?? 0.1)
                     : Math.sin(t * (m.bobSpeed ?? 0.6)) * (m.bob ?? 0.1);
      roll = -shift * (m.roll ?? 0.09);
      yaw = Math.sin(p * 0.5) * (m.yaw ?? 0.1);
      break;
    }

    case 'prowl':
      dx = Math.sin(p) * (m.swayX ?? 3);
      dz = Math.cos(p) * (m.swayZ ?? 1.5);
      dy = Math.sin(t * (m.bobSpeed ?? 0.9)) * (m.bob ?? 0.45);
      yaw = Math.cos(p) * (m.yaw ?? 0.45);
      roll = -Math.sin(p) * (m.roll ?? 0.26);
      break;

    case 'drift':
      dx = Math.sin(p) * (m.swayX ?? 2);
      dy = Math.sin(t * (m.bobSpeed ?? 0.8)) * (m.bob ?? 0.15);
      yaw = Math.cos(p) * (m.yaw ?? 0.12);
      break;

    case 'hover':
    default:
      // Lissajous: x on the fundamental, z on the second harmonic, so the path
      // crosses itself instead of tracing a circle.
      dx = Math.sin(p) * (m.swayX ?? 1);
      dz = Math.sin(p * 2) * (m.swayZ ?? 0.5) * 0.5;
      dy = Math.sin(t * (m.bobSpeed ?? 1.4)) * (m.bob ?? 0.3);
      yaw = Math.sin(p) * (m.yaw ?? 0.3);
      roll = -Math.cos(p) * (m.roll ?? 0.15);
      break;
  }

  return { dx, dy, dz, roll, yaw, fade };
}

/**
 * Fit an actor and its path into a horizontal gap.
 *
 * Getting this wrong is subtle in both directions, and both were shipped once:
 * clamping the path's CENTRE lets a wide silhouette slide under the UI anyway,
 * and clamping by silhouette alone leaves the widest actors with a sway of
 * exactly zero, which throws the bespoke motion away. So shrink until width
 * PLUS path fits, and only trim the path once the actor is as small as allowed.
 *
 * @returns {{scale:number, sway:number}}
 */
export function fitToGap({ gapWorld, bodyHalfWidth, desiredSway, minScale = 0.55, margin = 0.5 }) {
  const available = gapWorld * 0.5 - margin;
  let sway = desiredSway;
  let scale = 1;
  if (bodyHalfWidth + sway > available) {
    scale = Math.max(minScale, (available - sway) / bodyHalfWidth);
    sway = Math.max(0.35, available - bodyHalfWidth * scale);
  }
  return { scale, sway };
}
