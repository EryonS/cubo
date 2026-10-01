/*
 * Cubo Blocks — rewarded ads. showRewarded() resolves true when the reward is earned, false when
 * the player closes the ad early or none could be shown.
 * Native app: AdMob (@capacitor-community/admob), with Google's consent form (UMP) where the law
 * asks for it (EU, UK...), shown before the first ad. Web: a 3-second stand-in, as before.
 */
(function (root) {
  'use strict';

  const tr = root.GridlockI18n.tr;

  // Google's test ad units until the AdMob account exists. Before release, replace them, the app
  // ids (ios/App/App/Info.plist GADApplicationIdentifier, android strings.xml admob_app_id) and
  // set TESTING to false.
  const UNITS = {
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  };
  const TESTING = true;

  const cap = root.Capacitor;
  const AdMob = cap && cap.isNativePlatform() && cap.Plugins.AdMob ? cap.Plugins.AdMob : null;
  const api = { showRewarded, privacyRequired: () => privacy, showPrivacyOptions, onShow: null };

  // ----- native: AdMob
  let ready = null; // consent + SDK start, once
  let privacy = false; // the player must be able to reopen the consent choices (Réglages)
  let loaded = false;
  function start() {
    if (!ready) {
      ready = (async () => {
        let consent = await AdMob.requestConsentInfo();
        if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') consent = await AdMob.showConsentForm();
        privacy = consent.privacyOptionsRequirementStatus === 'REQUIRED';
        await AdMob.initialize({ initializeForTesting: TESTING });
        return consent.canRequestAds !== false;
      })().catch(() => { ready = null; return false; });
    }
    return ready;
  }
  async function preload() {
    try {
      await AdMob.prepareRewardVideoAd({ adId: UNITS[cap.getPlatform()], isTesting: TESTING });
      loaded = true;
    } catch {
      loaded = false;
    }
  }
  async function nativeRewarded() {
    if (!(await start())) return unavailable();
    if (!loaded) await preload();
    if (!loaded) return unavailable();
    return new Promise((resolve) => {
      let earned = false;
      let done = false;
      const handles = [];
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
        loaded = false;
        if (api.onShow) api.onShow(false);
        // addListener gives a handle, or a promise of one depending on the Capacitor version.
        handles.forEach((h) => Promise.resolve(h).then((x) => x.remove()));
        preload(); // the next one is ready when it is needed
      };
      handles.push(AdMob.addListener('onRewardedVideoAdReward', () => { earned = true; }));
      handles.push(AdMob.addListener('onRewardedVideoAdDismissed', () => finish(earned)));
      handles.push(AdMob.addListener('onRewardedVideoAdFailedToShow', () => finish(false)));
      if (api.onShow) api.onShow(true);
      AdMob.showRewardVideoAd().catch(() => finish(false));
    });
  }
  async function showPrivacyOptions() {
    if (AdMob) await AdMob.showPrivacyOptionsForm().catch(() => {});
  }

  // No ad to show (offline, no fill): say so briefly instead of a dead button.
  function unavailable() {
    const el = document.createElement('div');
    el.className = 'ad-toast';
    el.textContent = tr('Pas de pub disponible pour le moment. Réessaie plus tard.');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
    return false;
  }

  // ----- web: a stand-in
  const DURATION = 3;
  function webRewarded() {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'ad-overlay';
      el.innerHTML = `
        <div class="ad-box">
          <div class="ad-tag">${tr('Publicité · simulation')}</div>
          <div class="ad-count">${DURATION}</div>
          <div class="ad-text">${tr('Ta pub ici')}</div>
          <button class="ad-close" aria-label="${tr('Fermer')}">✕</button>
        </div>`;
      document.body.appendChild(el);
      const count = el.querySelector('.ad-count');
      let left = DURATION;
      const done = (ok) => {
        clearInterval(timer);
        el.remove();
        resolve(ok);
      };
      const timer = setInterval(() => {
        left -= 1;
        if (left <= 0) done(true);
        else count.textContent = left;
      }, 1000);
      el.querySelector('.ad-close').addEventListener('click', () => done(false));
    });
  }

  function showRewarded() {
    return AdMob ? nativeRewarded() : webRewarded();
  }

  root.GridlockAds = api;
})(window);
