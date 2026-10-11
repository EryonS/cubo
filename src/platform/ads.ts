// Rewarded ads (legacy platform/ads.js). showRewarded() resolves true when the reward is earned,
// false when the player closes the ad early or none could be shown. Google's consent form (UMP)
// runs where the law asks for it, then the iOS tracking prompt, both before the first ad.
// Dev builds keep Google's test units: AdMob suspends accounts that view or click their own live ads.
// With Paramètres > Développeur shown, the "no ad" toast ends with Google's error code (no-fill...),
// and the section can try either unit (debugAd) and show the consent and tracking state (adStatus).
import { Platform } from 'react-native';
import { tr } from '../core/i18n';
import { holdAudio } from '../audio/engine';
import { toast } from '../ui/Toast';
import { isDeveloper } from '../game/account';

const TEST_UNITS = {
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
};
const UNITS = __DEV__ ? TEST_UNITS : {
  ios: 'ca-app-pub-5131625589164824/9079015257',
  android: 'ca-app-pub-5131625589164824/6466575616',
};

let ready: Promise<boolean> | null = null;
let privacy = false;
const privacyListeners = new Set<() => void>();

function setPrivacy(next: boolean) {
  if (privacy === next) return;
  privacy = next;
  privacyListeners.forEach((l) => l());
}

export const privacyRequired = () => privacy;
export const subscribePrivacy = (l: () => void) => {
  privacyListeners.add(l);
  return () => privacyListeners.delete(l);
};

// Consent + SDK start, once. False when ads must not be requested (or the SDK is missing).
function start(): Promise<boolean> {
  if (!ready) {
    ready = (async () => {
      const ads = await import('react-native-google-mobile-ads');
      let info = await ads.AdsConsent.requestInfoUpdate();
      if (info.isConsentFormAvailable && info.status === ads.AdsConsentStatus.REQUIRED) {
        info = await ads.AdsConsent.loadAndShowConsentFormIfRequired();
      }
      setPrivacy(info.privacyOptionsRequirementStatus === ads.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
      if (Platform.OS === 'ios') {
        const att = await import('expo-tracking-transparency');
        const cur = await att.getTrackingPermissionsAsync();
        if (cur.status === 'undetermined') await att.requestTrackingPermissionsAsync();
      }
      await ads.default().initialize();
      if (info.canRequestAds === false) blocked = 'consent';
      return info.canRequestAds !== false;
    })().catch((err) => {
      ready = null;
      blocked = code(err);
      if (__DEV__) console.warn(err);
      return false;
    });
  }
  return ready;
}

// Why start() said no, for the developer toast.
let blocked = '';
// "no-fill" from a googleMobileAds/no-fill error, else the message.
const code = (err: unknown) => {
  const e = err as { code?: string; message?: string } | null;
  return e?.code ? e.code.replace(/^googleMobileAds\//, '') : String(e?.message ?? err);
};

function unavailable(why?: string) {
  const text = tr('Pas de pub disponible pour le moment. Réessaie plus tard.');
  toast(why && isDeveloper() ? `${text} (${why})` : text);
  return false;
}

// Loads a rewarded ad and shows it. With show false (developer check of the live unit), resolves
// true as soon as it loads, without showing it: no impression of our own ad is counted.
function play(unit = Platform.OS === 'ios' ? UNITS.ios : UNITS.android, show = true): Promise<boolean> {
  return new Promise((resolve) => {
    void (async () => {
      const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
      const ad = RewardedAd.createForAdRequest(unit);
      let earned = false;
      let settled = false;
      const offs: (() => void)[] = [];
      const finish = (ok: boolean, why?: string) => {
        if (settled) return;
        settled = true;
        offs.forEach((off) => off());
        holdAudio(false);
        if (!ok && why) unavailable(why);
        resolve(ok);
      };
      offs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        if (!show) return finish(true);
        holdAudio(true);
        ad.show().catch((err) => finish(false, code(err)));
      }));
      offs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      offs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned)));
      offs.push(ad.addAdEventListener(AdEventType.ERROR, (err) => finish(false, code(err))));
      ad.load();
    })().catch((err) => { holdAudio(false); unavailable(code(err)); resolve(false); });
  });
}

export async function showRewarded(): Promise<boolean> {
  try {
    if (!(await start())) return unavailable(blocked);
    return await play();
  } catch (err) {
    if (__DEV__) console.warn(err);
    holdAudio(false);
    return unavailable(code(err));
  }
}

// Paramètres > Développeur. Google's test unit plays a whole ad (safe in any build); the live unit
// only loads, to see whether AdMob serves this app yet.
export async function debugAd(live: boolean) {
  try {
    if (!(await start())) return void unavailable(blocked);
    const unit = live ? (Platform.OS === 'ios' ? UNITS.ios : UNITS.android) : (Platform.OS === 'ios' ? TEST_UNITS.ios : TEST_UNITS.android);
    const ok = await play(unit, !live);
    if (live && ok) toast(tr('Vraie pub reçue (pas affichée) : AdMob diffuse bien.'));
    else if (ok) toast(tr('Pub de test : récompense obtenue.'));
  } catch (err) {
    unavailable(code(err));
  }
}

// One line for the developer row: consent status, whether ads may be requested, the iOS tracking
// answer and the advertising id (to register this phone as a test device in AdMob).
export async function adStatus() {
  try {
    const { AdsConsent } = await import('react-native-google-mobile-ads');
    const info = await AdsConsent.getConsentInfo();
    let att = '';
    let idfa: string | null = null;
    if (Platform.OS === 'ios') {
      const t = await import('expo-tracking-transparency');
      att = ` · ATT ${(await t.getTrackingPermissionsAsync()).status}`;
      idfa = t.getAdvertisingId();
    }
    return { line: `UMP ${info.status} · ads ${info.canRequestAds ? 'ok' : 'no'}${att}`, idfa };
  } catch (err) {
    return { line: code(err), idfa: null };
  }
}

// Clears the consent answer, so the next ad asks again (EEA form).
export async function resetAdConsent() {
  try {
    const { AdsConsent } = await import('react-native-google-mobile-ads');
    AdsConsent.reset();
    ready = null;
  } catch (err) {
    if (__DEV__) console.warn(err);
  }
}

// At launch, without any form: whether Paramètres must offer the privacy options, so a consent can be
// changed at any time, not only after an ad in this session.
export async function checkPrivacy() {
  try {
    const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } = await import('react-native-google-mobile-ads');
    const info = await AdsConsent.requestInfoUpdate();
    setPrivacy(info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED);
  } catch (err) {
    if (__DEV__) console.warn(err);
  }
}

export async function showPrivacyOptions() {
  try {
    const { AdsConsent } = await import('react-native-google-mobile-ads');
    await AdsConsent.showPrivacyOptionsForm();
  } catch (err) {
    if (__DEV__) console.warn(err);
  }
}
