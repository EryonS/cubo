// Firebase for the cloud save (legacy platform/cloud.js). Empty apiKey = the feature stays hidden.
// Fill CONFIG from the Firebase web app, plus the Google OAuth client ids, before it can sign in.
// Google: webClientId is the project's Web client (the ID token's audience, which Firebase accepts);
// Android also needs an Android OAuth client (package + SHA-1) in the same project, not passed here.
// No game logic here: core/sync.ts decides, game/account.ts drives.
import { Platform } from 'react-native';
import type { Auth, Persistence, User } from 'firebase/auth';

type AuthMod = typeof import('firebase/auth');
// The string is the React Native build (no bundled types). The cast only tells the checker.
const authApi = () => import('@firebase/auth/dist/rn/index.js' as 'firebase/auth');
import type { Firestore } from 'firebase/firestore';
import { decodeDoc, encodeDoc } from './cloud-doc';

export const CONFIG = {
  apiKey: 'AIzaSyCIyc-oEMqIUf8Tf5i_dm-zyaLg6NAfMuY',
  authDomain: 'cubo-blocks.firebaseapp.com',
  projectId: 'cubo-blocks',
  appId: '1:779075128285:web:5972bb48525421bc32c434',
  webClientId: '779075128285-o4022si566gbo2ib9d4l8u55bh77bb8d.apps.googleusercontent.com',
  iosClientId: '779075128285-9ajv2baduf9tdherm72d9qnn5ahkihh8.apps.googleusercontent.com',
};

export const available = () => CONFIG.apiKey.length > 0;

export interface CloudUser { uid: string; email: string | null }

const cancelled = (err: unknown) => /cancel|canceled|popup-closed|user-cancelled/i.test(String((err as { code?: string; message?: string })?.code || (err as { message?: string })?.message || ''));

function coded(code: string) {
  const e = new Error(code) as Error & { code: string };
  e.code = code;
  return e;
}

let loading: Promise<{ auth: Auth; db: Firestore }> | null = null;

async function load() {
  if (!available()) throw coded('off');
  if (!loading) {
    loading = (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      // The React Native build: the package's default entry is the browser SDK.
      const authMod = await authApi();
      const { initializeFirestore, memoryLocalCache } = await import('firebase/firestore');
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const app = getApps()[0] ?? initializeApp({ apiKey: CONFIG.apiKey, authDomain: CONFIG.authDomain, projectId: CONFIG.projectId, appId: CONFIG.appId });
      const getRn = (authMod as unknown as { getReactNativePersistence?: (s: typeof AsyncStorage) => Persistence }).getReactNativePersistence;
      const persistence = getRn ? getRn(AsyncStorage) : authMod.inMemoryPersistence;
      let auth: Auth;
      try { auth = authMod.initializeAuth(app, { persistence }); } catch { auth = authMod.getAuth(app); }
      const db = initializeFirestore(app, { localCache: memoryLocalCache() });
      await auth.authStateReady();
      return { auth, db };
    })();
    loading.catch(() => { loading = null; });
  }
  return loading;
}

const toUser = (user: User): CloudUser => ({ uid: user.uid, email: user.email });

async function nativeCredential(provider: 'google' | 'apple', authMod: AuthMod) {
  if (provider === 'apple') {
    const Apple = await import('expo-apple-authentication');
    const Crypto = await import('expo-crypto');
    const raw = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, '0')).join('');
    const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
    const cred = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce: hashed,
    });
    if (!cred.identityToken) throw coded('cancelled');
    const oauth = new authMod.OAuthProvider('apple.com');
    return { credential: oauth.credential({ idToken: cred.identityToken, rawNonce: raw }), revokeToken: cred.authorizationCode };
  }
  if (!CONFIG.webClientId || (Platform.OS === 'ios' && !CONFIG.iosClientId)) throw coded('off');
  const { GoogleSignin, isSuccessResponse } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: CONFIG.webClientId, iosClientId: CONFIG.iosClientId || undefined });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const result = await GoogleSignin.signIn();
  if (!isSuccessResponse(result) || !result.data.idToken) throw coded('cancelled');
  return { credential: authMod.GoogleAuthProvider.credential(result.data.idToken), revokeToken: null as string | null };
}

// Signs in. Rejects with code 'cancelled' when the player backs out.
export async function signIn(provider: 'google' | 'apple'): Promise<CloudUser> {
  const authMod = await authApi();
  const { auth } = await load();
  try {
    const { credential } = await nativeCredential(provider, authMod);
    const result = await authMod.signInWithCredential(auth, credential);
    return toUser(result.user);
  } catch (err) {
    if ((err as { code?: string })?.code === 'cancelled' || cancelled(err)) throw coded('cancelled');
    throw err;
  }
}

export async function signOut() {
  const authMod = await authApi();
  const { auth } = await load();
  await authMod.signOut(auth);
  // Forget the Google account too, so the next sign-in shows the account picker.
  if (CONFIG.webClientId) await import('@react-native-google-signin/google-signin').then(({ GoogleSignin }) => GoogleSignin.signOut()).catch(() => {});
}

export async function user(): Promise<CloudUser | null> {
  const { auth } = await load();
  return auth.currentUser ? toUser(auth.currentUser) : null;
}

function refOf(db: Firestore, uid: string) {
  return import('firebase/firestore').then(({ doc }) => doc(db, 'users', uid));
}

export async function pull(): Promise<unknown> {
  const { db, auth } = await load();
  if (!auth.currentUser) return null;
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(await refOf(db, auth.currentUser.uid));
  return snap.exists() ? decodeDoc(snap.data() as Record<string, unknown>) : null;
}

// Writes doc only if the cloud copy is still the one this device knows (expected: its updatedAt,
// 0 for none). Otherwise rejects with code 'conflict'.
export async function push(doc: Record<string, unknown>, expected: number) {
  const { db, auth } = await load();
  if (!auth.currentUser) throw coded('off');
  const { runTransaction } = await import('firebase/firestore');
  const ref = await refOf(db, auth.currentUser.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const at = snap.exists() ? Number(snap.data().updatedAt) || 0 : 0;
    if (at !== expected) throw coded('conflict');
    tx.set(ref, encodeDoc(doc));
  });
}

// Signs in again first (Firebase asks for a recent sign-in, and Apple's token must be revoked),
// then removes the document and the account.
export async function deleteAccount(provider: 'google' | 'apple') {
  const authMod = await authApi();
  const { auth, db } = await load();
  const { credential, revokeToken } = await nativeCredential(provider, authMod);
  if (!auth.currentUser) throw coded('off');
  await authMod.reauthenticateWithCredential(auth.currentUser, credential);
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(await refOf(db, auth.currentUser.uid));
  if (revokeToken) await authMod.revokeAccessToken(auth, revokeToken).catch(() => {});
  await authMod.deleteUser(auth.currentUser);
}
