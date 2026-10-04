/*
 * Cubo Blocks — Firebase for the cloud save: sign-in with Google or Apple, and the player's one
 * document users/{uid}. No game logic here (core/sync.js decides, screens/account.js drives).
 * The Firebase SDK (compat builds in vendor/firebase/) only loads once an account is used.
 * Web: sign-in popups. Native app: the system sheet of @capacitor-firebase/authentication
 * (skipNativeAuth), its tokens then signed in on the JS SDK, so data code is the same everywhere.
 */
(function (root) {
  'use strict';

  // Firebase console > Project settings > Your apps > Web app. Public by design: Firestore rules
  // (firestore.rules) protect the data. Empty apiKey = cloud save off (the Compte block hides).
  const CONFIG = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: '',
  };
  const SDK = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];

  const cap = root.Capacitor;
  const NativeAuth = cap && cap.isNativePlatform() && cap.Plugins.FirebaseAuthentication
    ? cap.Plugins.FirebaseAuthentication : null;

  const available = () => !!CONFIG.apiKey;

  let loading = null;
  function addScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // Loads the SDK once; resolves with the signed-in user (or null) once Firebase knows it.
  function load() {
    if (!loading) {
      loading = (async () => {
        for (const f of SDK) await addScript('vendor/firebase/' + f);
        const fb = root.firebase;
        fb.initializeApp(CONFIG);
        await new Promise((resolve) => { const off = fb.auth().onAuthStateChanged(() => { off(); resolve(); }); });
        return fb;
      })();
      loading.catch(() => { loading = null; }); // offline: try again next time
    }
    return loading;
  }

  const user = () => (root.firebase && root.firebase.apps.length ? root.firebase.auth().currentUser : null);

  // Signs in with the provider; resolves with { user, credential } (credential: the provider's
  // tokens, used to revoke Apple's on deletion). Rejects with code 'cancelled' if the player backs out.
  async function providerSignIn(provider, reauth) {
    const fb = await load();
    const auth = fb.auth();
    const cancelled = (err) => {
      const msg = String((err && (err.code || err.message)) || '');
      return /cancel|popup-closed|user-cancelled|canceled/i.test(msg);
    };
    try {
      let credential;
      let result;
      if (NativeAuth) {
        const r = provider === 'apple'
          ? await NativeAuth.signInWithApple({ skipNativeAuth: true })
          : await NativeAuth.signInWithGoogle({ skipNativeAuth: true });
        const c = r.credential || {};
        credential = provider === 'apple'
          ? new fb.auth.OAuthProvider('apple.com').credential({ idToken: c.idToken, rawNonce: c.nonce })
          : fb.auth.GoogleAuthProvider.credential(c.idToken, c.accessToken);
        result = reauth ? await auth.currentUser.reauthenticateWithCredential(credential) : await auth.signInWithCredential(credential);
        return { user: result.user, revokeToken: provider === 'apple' ? c.authorizationCode : null };
      }
      const p = provider === 'apple' ? new fb.auth.OAuthProvider('apple.com') : new fb.auth.GoogleAuthProvider();
      if (provider === 'apple') p.addScope('email');
      result = reauth ? await auth.currentUser.reauthenticateWithPopup(p) : await auth.signInWithPopup(p);
      credential = result.credential;
      return { user: result.user, revokeToken: provider === 'apple' && credential ? credential.accessToken : null };
    } catch (err) {
      if (cancelled(err)) { const e = new Error('cancelled'); e.code = 'cancelled'; throw e; }
      throw err;
    }
  }

  const signIn = (provider) => providerSignIn(provider, false).then((r) => r.user);

  async function signOut() {
    const fb = await load();
    await fb.auth().signOut();
    if (NativeAuth) await NativeAuth.signOut().catch(() => {});
  }

  const docRef = () => root.firebase.firestore().collection('users').doc(user().uid);

  // profile, settings and bests are stored as JSON text: Firestore refuses arrays inside arrays
  // and undefined values, and the game's saves are plain JSON anyway.
  const PACKED = ['profile', 'settings', 'bests'];
  const encode = (doc) => ({ ...doc, ...Object.fromEntries(PACKED.map((k) => [k, JSON.stringify(doc[k])])) });
  function decode(data) {
    try { return { ...data, ...Object.fromEntries(PACKED.map((k) => [k, JSON.parse(data[k])])) }; } catch { return data; }
  }

  // The cloud document, or null when the account has none yet.
  async function pull() {
    await load();
    const snap = await docRef().get();
    return snap.exists ? decode(snap.data()) : null;
  }

  // Writes doc only if the cloud copy is still the one this device knows (expected: its
  // updatedAt, 0 for none). Otherwise rejects with code 'conflict'.
  async function push(doc, expected) {
    const fb = await load();
    const ref = docRef();
    await fb.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const at = snap.exists ? snap.data().updatedAt || 0 : 0;
      if (at !== expected) { const e = new Error('conflict'); e.code = 'conflict'; throw e; }
      tx.set(ref, encode(doc));
    });
  }

  // Signs in again first (Firebase asks for a recent sign-in, and Apple's token must be revoked),
  // then removes the document and the account.
  async function deleteAccount(provider) {
    const fb = await load();
    const { revokeToken } = await providerSignIn(provider, true);
    await docRef().delete();
    if (revokeToken) await fb.auth().revokeAccessToken(revokeToken).catch(() => {});
    await fb.auth().currentUser.delete();
    if (NativeAuth) await NativeAuth.signOut().catch(() => {});
  }

  root.CuboBlocksCloud = { available, load, user, signIn, signOut, pull, push, deleteAccount };
})(window);
