/*
 * Cubo Blocks — cloud save rules: what is sent, how a cloud copy is checked, and what to do when
 * the device and the account differ. Pure, no DOM. The Firebase side is platform/cloud.js.
 * A cloud document: { v, profile, settings, bests, lang, updatedAt }.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CuboBlocksSync = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const M = typeof module === 'object' && module.exports ? require('./meta.js') : self.CuboBlocksMeta;

  const SYNC_VERSION = 1;
  const LANGS = ['auto', 'fr', 'en'];

  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

  // data: { profile, settings, bests, lang }; anything else (the run in progress) stays local.
  const payload = ({ profile, settings, bests, lang }, updatedAt) =>
    ({ v: SYNC_VERSION, profile, settings, bests, lang, updatedAt });

  const validate = (doc) => isObj(doc) && Number.isInteger(doc.v) && isObj(doc.profile)
    && typeof doc.profile.coins === 'number' && isObj(doc.settings) && isObj(doc.bests)
    && LANGS.includes(doc.lang) && typeof doc.updatedAt === 'number';

  // Written by a newer app: never applied, never overwritten.
  const tooNew = (doc) => doc.v > SYNC_VERSION || (doc.profile.version || 0) > M.PROFILE_VERSION;

  const count = (x) => (isObj(x) ? Object.keys(x).length : 0);
  // No progression yet: a new device (or a new player) takes the account's without asking.
  const isFresh = (profile) => !profile.games && !profile.coins && !M.totalStars(profile)
    && !count(profile.stickers) && !count(profile.daily) && !count(profile.puzzles);

  // What the choice dialog shows for each side.
  const summary = (profile) => ({
    coins: profile.coins || 0, stars: M.totalStars(profile), stickers: count(profile.stickers), day: profile.day || null,
  });

  // Same content whatever the key order and the time stamp.
  const stable = (x) => (Array.isArray(x) ? `[${x.map(stable).join(',')}]`
    : isObj(x) ? `{${Object.keys(x).sort().map((k) => JSON.stringify(k) + ':' + stable(x[k])).join(',')}}`
      : JSON.stringify(x));
  const same = (a, b) => ['profile', 'settings', 'bests', 'lang'].every((k) => stable(a[k]) === stable(b[k]));

  // local: { profile, settings, bests, lang }. remote: the cloud document, or null if none.
  // sync: null at sign-in, else { syncedAt, dirty } (last cloud version this device knows, and
  // whether it has changes not sent yet).
  // Returns 'push' (send local), 'pull' (apply remote), 'ask' (the player picks), 'same' (nothing
  // to move, note the remote time), 'none', 'keep' (remote unreadable) or 'update-app'.
  function decide({ local, remote, sync }) {
    if (remote === null || remote === undefined) return 'push';
    if (!validate(remote)) return 'keep';
    if (tooNew(remote)) return 'update-app';
    const mine = payload(local, 0);
    if (!sync) {
      if (same(mine, remote)) return 'same';
      return isFresh(local.profile) ? 'pull' : 'ask';
    }
    if (remote.updatedAt === sync.syncedAt) return sync.dirty ? 'push' : 'none';
    if (same(mine, remote)) return 'same';
    return sync.dirty ? 'ask' : 'pull';
  }

  return { SYNC_VERSION, payload, validate, tooNew, isFresh, summary, same, decide };
});
