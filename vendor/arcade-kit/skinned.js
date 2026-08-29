// VENDORED from _arcade-kit — do not edit here. Re-run bin/vendor-into.mjs.
// skinned.js — the three.js glTF/skinned-mesh traps, solved once.
//
// Every function here exists because the naive version fails SILENTLY: the
// mesh reports itself visible, draws its triangles, and is either nowhere near
// where you put it or the size of a speck. All three cost real debugging time
// on the first game that used them.
//
// `THREE` is injected rather than imported so a game can vendor its own copy.

/**
 * Clone a glTF scene, skeleton and all.
 *
 * `Object3D.clone()` does NOT clone a skeleton — the copy keeps a reference to
 * the ORIGINAL bones, so it renders wherever those are and ignores its own
 * transform entirely. Always route skinned glTF clones through
 * SkeletonUtils.clone.
 *
 * @param {Function} skeletonUtilsClone the `clone` export of SkeletonUtils.js
 */
export function cloneModel(skeletonUtilsClone, scene) {
  const model = skeletonUtilsClone(scene);
  // A skinned mesh whose bounds are the bind pose gets culled the moment it
  // animates outside them.
  model.traverse(o => { if (o.isSkinnedMesh) o.frustumCulled = false; });
  return model;
}

/**
 * Bounds of a model *as posed*.
 *
 * `Box3.setFromObject` measures a skinned mesh from its bind-pose geometry,
 * which for the common CC0 packs is a starfish: Quaternius' Goleling reports
 * 492 units wide against a creature that is 2.8 wide once posed. The bones,
 * after the idle clip has been applied, describe where the thing actually is.
 */
export function posedBounds(THREE, root) {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  let bones = 0;

  root.traverse(o => {
    if (!o.isSkinnedMesh || !o.skeleton) return;
    for (const bone of o.skeleton.bones) {
      bone.updateWorldMatrix(true, false);
      box.expandByPoint(v.setFromMatrixPosition(bone.matrixWorld));
      bones++;
    }
  });

  if (!bones || box.isEmpty()) return new THREE.Box3().setFromObject(root);

  // Bones are joint centres, not the silhouette; pad to cover the mesh on them.
  const size = new THREE.Vector3();
  box.getSize(size);
  box.expandByScalar(Math.max(size.x, size.y, size.z) * 0.14);
  return box;
}

/**
 * Scale a model to a target *height*, centre it on x/z, stand it on y=0.
 *
 * Height, not longest axis — see posedBounds for why the widest axis lies.
 *
 * MUST run while the model is DETACHED. Box3 returns *world* bounds; applying
 * that correction to a *local* position while the model already has a parent
 * subtracts the parent's transform straight back out, and the model silently
 * snaps to the origin.
 */
export function normalizeHeight(THREE, object3d, targetHeight) {
  if (object3d.parent) throw new Error('normalizeHeight must run before parenting');
  object3d.position.set(0, 0, 0);
  object3d.scale.setScalar(1);
  object3d.updateWorldMatrix(false, true);

  const box = posedBounds(THREE, object3d);
  const size = new THREE.Vector3();
  box.getSize(size);
  object3d.scale.setScalar(targetHeight / (size.y || 1));
  object3d.updateWorldMatrix(false, true);

  const box2 = posedBounds(THREE, object3d);
  const centre = new THREE.Vector3();
  box2.getCenter(centre);
  object3d.position.set(-centre.x, -box2.min.y, -centre.z);
  return object3d;
}

/**
 * Find the clips a game actually wants out of a pack's naming.
 *
 * The Quaternius CC0 packs ship a consistent set — Death, Flying_Idle,
 * HitReact, Punch, Headbutt — under a `CharacterArmature|` prefix that varies
 * per model, so match loosely. Do not write procedural flinch/death animation
 * for these; it is already in the file.
 */
export function findClips(animations, patterns = {}) {
  const p = {
    idle: /idle/i, hit: /hitreact|hit|damage/i,
    attack: /punch|headbutt|attack|bite|shoot/i, death: /death|die/i,
    ...patterns,
  };
  const out = {};
  for (const [key, re] of Object.entries(p)) out[key] = animations.find(a => re.test(a.name));
  out.idle = out.idle || animations[0];
  return out;
}

/**
 * A look-at that composes on top of whatever the animation clip is doing.
 *
 * Two things make this harder than it looks:
 *
 *  1. It must run AFTER `mixer.update()` in the same frame, or the clip simply
 *     overwrites it.
 *  2. The mixer only writes bones the CURRENT CLIP has a track for. Rigs
 *     commonly animate `Head.quaternion` but not `Neck.quaternion`, so
 *     multiplying onto the bone every frame is correct for the head — the
 *     mixer resets it — and UNBOUNDED for the neck, which accumulates until it
 *     spins. Introspecting clip tracks does not fix it either, because clips
 *     differ (idle and death disagree).
 *
 * So detect it: if a bone still holds exactly what we wrote last frame, nothing
 * else drove it and its rest pose is the base. Otherwise the mixer has been
 * here and the current value is the base.
 */
export function applyLook(THREE, bone, share, pitch, yaw, scratch) {
  if (!bone) return;
  if (!bone.userData.restQuat) bone.userData.restQuat = bone.quaternion.clone();

  const written = bone.userData.lookWritten;
  const untouchedByMixer = written && bone.quaternion.equals(written);
  const base = untouchedByMixer ? bone.userData.restQuat : bone.quaternion;

  scratch.euler.set(pitch * share, yaw * share, 0, 'XYZ');
  scratch.quat.setFromEuler(scratch.euler);

  bone.quaternion.copy(base).multiply(scratch.quat);
  bone.userData.lookWritten = (written || new THREE.Quaternion()).copy(bone.quaternion);
}

export function makeLookScratch(THREE) {
  return { quat: new THREE.Quaternion(), euler: new THREE.Euler() };
}
