// Rewarded ads (legacy platform/ads.js). showRewarded() resolves true when the reward is earned,
// false when the player closes the ad early or none could be shown. Google's consent form (UMP)
// runs where the law asks for it, then the iOS tracking prompt, both before the first ad.
// Dev builds keep Google's test units: AdMob suspends accounts that view or click their own live ads.
import { Platform } from 'react-native';
import { tr } from '../core/i18n';
import { holdAudio } from '../audio/engine';
import { toast } from '../ui/Toast';

const UNITS = __DEV__ ? {
  ios: 'ca-app-pub-3940256099942544/1712485313',
  android: 'ca-app-pub-3940256099942544/5224354917',
} : {
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
      return info.canRequestAds !== false;
    })().catch((err) => {
      ready = null;
      if (__DEV__) console.warn(err);
      return false;
    });
  }
  return ready;
}

function unavailable() {
  toast(tr('Pas de pub disponible pour le moment. Réessaie plus tard.'));
  return false;
}

function play(): Promise<boolean> {
  return new Promise((resolve) => {
    void (async () => {
      const { RewardedAd, RewardedAdEventType, AdEventType } = await import('react-native-google-mobile-ads');
      const unit = Platform.OS === 'ios' ? UNITS.ios : UNITS.android;
      const ad = RewardedAd.createForAdRequest(unit);
      let earned = false;
      let settled = false;
      const offs: (() => void)[] = [];
      const finish = (ok: boolean, say: boolean) => {
        if (settled) return;
        settled = true;
        offs.forEach((off) => off());
        holdAudio(false);
        if (!ok && say) unavailable();
        resolve(ok);
      };
      offs.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        holdAudio(true);
        ad.show().catch(() => finish(false, true));
      }));
      offs.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      offs.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned, false)));
      offs.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(false, true)));
      ad.load();
    })().catch(() => { holdAudio(false); unavailable(); resolve(false); });
  });
}

export async function showRewarded(): Promise<boolean> {
  try {
    if (!(await start())) return unavailable();
    return await play();
  } catch (err) {
    if (__DEV__) console.warn(err);
    holdAudio(false);
    return unavailable();
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
