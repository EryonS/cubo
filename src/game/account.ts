// Cloud save (legacy screens/account.js). Rules in core/sync.ts, Firebase in platform/cloud.ts.
// cuboblocks.sync remembers the account on this device. Without a Firebase apiKey nothing here runs.
import { AppState } from 'react-native';
import { DevSettings } from 'react-native';
import { reloadAppAsync } from 'expo';
import { S } from '../core';
import type { SyncDoc } from '../core/sync';
import { tr } from '../core/i18n';
import { langPref } from '../i18n/lang';
import { mmkv } from '../platform/kv';
import * as Cloud from '../platform/cloud';
import { setOnSaved } from '../platform/saved';
import { PROFILE_KEY, RUN_KEY } from '../state/persist';
import { useGame } from '../state/store';
import { ask } from '../ui/dialog';
import { toast } from '../ui/Toast';
import { askSide } from '../ui/SyncChoice';
import { runOpen, whenHub } from './hub';

const SYNC_KEY = 'cuboblocks.sync';
const SYNCED_FLAG = 'cuboblocks.synced';
const SYNC_DELAY = 3000;

export interface SyncInfo { uid: string; provider: 'google' | 'apple'; email: string; syncedAt: number; dirty: boolean }

let syncInfo: SyncInfo | null = readInfo();
let cloudDoc: SyncDoc | null = null;
let cloudBlocked = false;
let pushing: Promise<void> | null = null;
let pushAgain = false;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let refreshing: Promise<void> | null = null;
const listeners = new Set<() => void>();

function readInfo(): SyncInfo | null {
  const raw = mmkv.get(SYNC_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as SyncInfo;
    if (v && v.uid && (v.provider === 'google' || v.provider === 'apple')) return v;
  } catch { /* absent */ }
  return null;
}

export const signedIn = () => !!syncInfo;
export const accountInfo = () => syncInfo;
export const subscribeAccount = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const publish = () => listeners.forEach((l) => l());

function saveSyncInfo() {
  if (syncInfo) mmkv.set(SYNC_KEY, JSON.stringify(syncInfo));
  else mmkv.remove(SYNC_KEY);
  publish();
}
function forgetAccount() {
  syncInfo = null;
  cloudDoc = null;
  cloudBlocked = false;
  saveSyncInfo();
}

const localData = () => {
  const { profile, saved } = useGame.getState();
  return { profile, settings: saved.settings, bests: saved.bests, lang: langPref() };
};

function noteSaved() {
  if (!syncInfo || cloudBlocked || !Cloud.available()) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(checkChanges, SYNC_DELAY);
}

function checkChanges() {
  syncTimer = null;
  if (!syncInfo || !cloudDoc || S.same(S.payload(localData(), 0), cloudDoc)) return;
  syncInfo = { ...syncInfo, dirty: true };
  saveSyncInfo();
  void pushNow();
}

async function pushNow() {
  if (!syncInfo) return;
  if (pushing) { pushAgain = true; return pushing; }
  const doc = S.payload(localData(), Math.max(Date.now(), (syncInfo.syncedAt || 0) + 1));
  pushing = (async () => {
    try {
      await Cloud.push({ ...doc }, syncInfo?.syncedAt || 0);
      cloudDoc = doc;
      if (syncInfo) syncInfo = { ...syncInfo, syncedAt: doc.updatedAt, dirty: false };
      saveSyncInfo();
    } catch (err) {
      if ((err as { code?: string })?.code === 'conflict') setTimeout(refreshCloud, 0);
    } finally {
      pushing = null;
      if (pushAgain) { pushAgain = false; checkChanges(); }
    }
  })();
  return pushing;
}

// Writes the cloud copy over the local saves and starts the app again. The run in progress stays.
async function applyCloud(doc: SyncDoc) {
  const raw = mmkv.get(RUN_KEY);
  let saved: Record<string, unknown> = {};
  try { saved = raw ? JSON.parse(raw) : {}; } catch { saved = {}; }
  mmkv.set(RUN_KEY, JSON.stringify({ ...saved, settings: doc.settings, bests: doc.bests }));
  mmkv.set(PROFILE_KEY, JSON.stringify(doc.profile));
  mmkv.set('cuboblocks.lang', doc.lang);
  if (syncInfo) syncInfo = { ...syncInfo, syncedAt: doc.updatedAt, dirty: false };
  saveSyncInfo();
  mmkv.set(SYNCED_FLAG, '1');
  if (__DEV__) DevSettings.reload();
  else await reloadAppAsync().catch(() => {});
}

async function applyWhenIdle(doc: SyncDoc) {
  if (runOpen()) await whenHub();
  await applyCloud(doc);
}

async function carryOut(decision: ReturnType<typeof S.decide>, remote: unknown, atSignIn: boolean) {
  if (decision === 'push') { await pushNow(); return; }
  if (decision === 'pull') {
    if (atSignIn) await applyCloud(remote as SyncDoc);
    else await applyWhenIdle(remote as SyncDoc);
    return;
  }
  if ((decision === 'same' || decision === 'none') && remote && typeof remote === 'object') {
    cloudDoc = remote as SyncDoc;
    if (decision === 'same' && syncInfo) {
      syncInfo = { ...syncInfo, syncedAt: (remote as SyncDoc).updatedAt, dirty: false };
      saveSyncInfo();
    } else publish();
    return;
  }
  if (decision === 'ask') { await chooseSide(remote as SyncDoc, atSignIn); return; }
  cloudBlocked = true;
  toast(decision === 'update-app' ? tr('Mets à jour Cubo Blocks pour synchroniser.') : tr('Connexion impossible, réessaie plus tard.'));
  if (atSignIn) { await Cloud.signOut().catch(() => {}); forgetAccount(); }
}

function refreshCloud() {
  if (!syncInfo || refreshing || !Cloud.available()) return refreshing;
  refreshing = (async () => {
    try {
      if (!(await Cloud.user())) { forgetAccount(); return; }
      cloudBlocked = false;
      const remote = await Cloud.pull();
      await carryOut(S.decide({ local: localData(), remote, sync: syncInfo }), remote, false);
    } catch { /* offline: next launch or return */ } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function chooseSide(remote: SyncDoc, atSignIn: boolean) {
  for (;;) {
    const side = await askSide(S.summary(useGame.getState().profile), S.summary(remote.profile));
    if (!side) break;
    const sure = await ask({
      title: tr('Remplacer l’autre progression ?'),
      text: side === 'device'
        ? tr('Tu gardes la progression de cet appareil. Celle du compte sera remplacée.')
        : tr('Tu gardes la progression du compte. Celle de cet appareil sera remplacée.'),
      ok: tr('Confirmer'),
      danger: true,
    });
    if (!sure) continue;
    if (side === 'account') { await applyCloud(remote); return; }
    if (syncInfo) syncInfo = { ...syncInfo, syncedAt: remote.updatedAt, dirty: true };
    saveSyncInfo();
    cloudDoc = remote;
    await pushNow();
    return;
  }
  if (atSignIn) { await Cloud.signOut().catch(() => {}); forgetAccount(); }
}

export async function signInWith(provider: 'google' | 'apple') {
  let who;
  try { who = await Cloud.signIn(provider); } catch (err) {
    if ((err as { code?: string })?.code !== 'cancelled') toast(tr('Connexion impossible, réessaie plus tard.'));
    return;
  }
  syncInfo = { uid: who.uid, provider, email: who.email || '', syncedAt: 0, dirty: false };
  saveSyncInfo();
  let remote: unknown;
  try { remote = await Cloud.pull(); } catch {
    toast(tr('Connexion impossible, réessaie plus tard.'));
    await Cloud.signOut().catch(() => {});
    forgetAccount();
    return;
  }
  await carryOut(S.decide({ local: localData(), remote, sync: null }), remote, true);
}

export async function signOutCloud() {
  await Cloud.signOut().catch(() => {});
  forgetAccount();
  toast(tr('Déconnecté. Ta progression reste sur cet appareil.'));
}

export async function deleteCloudAccount() {
  if (!syncInfo) return;
  const sure = await ask({
    title: tr('Supprimer ton compte ?'),
    text: tr('Ta sauvegarde en ligne sera effacée. Ta progression reste sur cet appareil.'),
    ok: tr('Supprimer'),
    danger: true,
  });
  if (!sure) return;
  try { await Cloud.deleteAccount(syncInfo.provider); } catch (err) {
    if ((err as { code?: string })?.code !== 'cancelled') toast(tr('Connexion impossible, réessaie plus tard.'));
    return;
  }
  forgetAccount();
  toast(tr('Compte supprimé.'));
}

export function syncedLabel() {
  if (!syncInfo || syncInfo.dirty || !syncInfo.syncedAt) return tr('Pas encore synchronisé');
  const min = Math.round((Date.now() - syncInfo.syncedAt) / 60000);
  if (min < 1) return tr('Synchronisé à l’instant');
  // Written out: Hermes has no Intl.RelativeTimeFormat.
  if (min < 60) return tr`Synchronisé il y a ${min} min`;
  if (min < 1440) return tr`Synchronisé il y a ${Math.round(min / 60)} h`;
  const days = Math.round(min / 1440);
  return days === 1 ? tr('Synchronisé hier') : tr`Synchronisé il y a ${days} jours`;
}

export function startAccount() {
  setOnSaved(noteSaved);
  if (!Cloud.available()) return;
  if (mmkv.get(SYNCED_FLAG)) {
    mmkv.remove(SYNCED_FLAG);
    toast(tr('Progression synchronisée.'));
  }
  if (syncInfo) void refreshCloud();
  AppState.addEventListener('change', (s) => {
    if (!syncInfo) return;
    if (s === 'active') refreshCloud();
    else if (s === 'background' || s === 'inactive') {
      if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; checkChanges(); }
    }
  });
}
