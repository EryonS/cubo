// Paramètres (legacy #settings): the cloud account (hidden until Firebase is configured), sounds, music,
// vibrations, color-blind marks, the app icon, language, help and contact, the privacy policy and
// ad-privacy rows, and the app version at the bottom. Tapping the version 7 times shows Développeur
// (test mode, game/devmode.ts); a dev build always shows it.
import { useRef, useState, useSyncExternalStore } from 'react';
import { Linking, Platform, View } from 'react-native';
import * as Application from 'expo-application';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { M } from '../core';
import { lang, tr } from '../core/i18n';
import { langPref, setLangPref, type LangPref } from '../i18n/lang';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { startTutorial } from '../game/tutorial';
import { appIcon, canChangeAppIcon } from '../platform/app-icon';
import { privacyRequired, showPrivacyOptions, subscribePrivacy } from '../platform/ads';
import { available } from '../platform/cloud';
import { devShown, showDev, testMode } from '../platform/kv';
import { addTestCoins, resetTestProfile, switchTestMode } from '../game/devmode';
import type { Settings } from '../state/persist';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { AccountBlock } from '../ui/AccountBlock';
import { AppIconSheet, AppIconThumb } from '../ui/AppIconSheet';
import { ListRow } from '../ui/ListRow';
import { Screen } from '../ui/Screen';
import { SectionLabel } from '../ui/SectionLabel';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';
import { Toggle } from '../ui/Toggle';

const LANGS: [LangPref, string][] = [['auto', 'Auto'], ['fr', 'Français'], ['en', 'English']];
const CONTACT = 'contact@slapps.dev';
// "1.0.0 (12)": store version and build number, as App Store Connect and Play show them.
const VERSION = `${Application.nativeApplicationVersion ?? '?'} (${Application.nativeBuildVersion ?? '?'})`;

const DEV_TAPS = 7;

const open = (url: string) => { Linking.openURL(url).catch(() => {}); };
// The policy opens in the app's language (site/lang.js reads ?lang=).
const openPolicy = () => open(`https://cuboblocks.app/privacy.html?lang=${lang()}`);
// The subject carries the version and the system, for the reply.
const openContact = () => open(`mailto:${CONTACT}?subject=${encodeURIComponent(`Cubo Blocks ${VERSION} · ${Platform.OS} ${Platform.Version}`)}`);

function Row({ id, label, sub }: { id: keyof Settings; label: string; sub: string }) {
  const on = useGame((s) => s.saved.settings[id]);
  const flip = () => {
    const { saved, setSaved } = useGame.getState();
    setSaved({ ...saved, settings: { ...saved.settings, [id]: !on } });
    if (id === 'sfx' && !on) setTimeout(() => sfx.turn(), 0);
    if (id === 'vibrate' && !on) setTimeout(() => haptic('pick'), 0);
  };
  return <ListRow title={label} sub={sub} role="switch" state={{ checked: on }} onPress={flip} quiet right={<Toggle on={on} />} />;
}

export function SettingsScreen() {
  const nav = useNavigation();
  const pref = langPref();
  const privacy = useSyncExternalStore(subscribePrivacy, privacyRequired, privacyRequired);
  const iconRef = useRef<BottomSheetModal>(null);
  const [icon, setIcon] = useState(appIcon);
  const [dev, setDev] = useState(devShown);
  const taps = useRef(0);
  const tapVersion = () => {
    if (dev || ++taps.current < DEV_TAPS) return;
    showDev();
    setDev(true);
    haptic('pick');
  };
  return (
    <Screen title={tr('Paramètres')} back>
      {available() && !testMode && (
        <View style={{ gap: space.s }}>
          <SectionLabel>{tr('Sauvegarde en ligne')}</SectionLabel>
          <AccountBlock />
        </View>
      )}
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Son')}</SectionLabel>
        <Row id="sfx" label={tr('Sons')} sub={tr('Effets du jeu')} />
        <Row id="music" label={tr('Musique')} sub={tr('Petite mélodie de fond')} />
        <Row id="vibrate" label={tr('Vibrations')} sub={tr('Retour haptique sur mobile')} />
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Affichage')}</SectionLabel>
        <Row id="patterns" label={tr('Motifs sur les blocs')} sub={tr('Un symbole par couleur, pour mieux les distinguer')} />
        <Row id="mascot" label={tr('Mascotte')} sub={tr('Cubo, perché sur le plateau, réagit à ta partie')} />
        {canChangeAppIcon && <ListRow title={tr('Icône de l’app')} sub={M.SKINS.boards.find((sk) => sk.id === icon)?.name} icon={<AppIconThumb id={icon} size={40} />}
          right="chevron" onPress={() => iconRef.current?.present()} />}
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Langue')}</SectionLabel>
        <Segmented options={LANGS} value={pref} onChange={(id) => { sfx.turn(); setLangPref(id); }} />
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Aide')}</SectionLabel>
        <ListRow title={tr('Revoir le tutoriel')} sub={tr('Une partie guidée en 3 étapes')} right="chevron"
          onPress={() => { startTutorial(); nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Game' }] })); }} />
        <ListRow title={tr('Nous contacter')} sub={CONTACT} right="chevron" onPress={openContact} />
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Confidentialité')}</SectionLabel>
        <ListRow title={tr('Politique de confidentialité')} sub={tr('Les données utilisées, et pourquoi')} right="chevron" onPress={openPolicy} />
        {privacy && <ListRow title={tr('Confidentialité des pubs')} sub={tr('Changer ton choix de consentement')} right="chevron" onPress={() => { void showPrivacyOptions(); }} />}
      </View>
      {dev && (
        <View style={{ gap: space.s }}>
          <SectionLabel>{tr('Développeur')}</SectionLabel>
          <ListRow title={tr('Mode test')} sub={tr('Profil séparé, tout ouvert, sans synchro')} role="switch" state={{ checked: testMode }}
            onPress={() => { void switchTestMode(); }} quiet right={<Toggle on={testMode} />} />
          {testMode && <ListRow title={tr('Ajouter des pièces')} sub={tr('Au profil de test')} right="chevron" onPress={addTestCoins} />}
          {testMode && <ListRow title={tr('Réinitialiser le profil de test')} sub={tr('Il repart de zéro, tout ouvert')} right="chevron" onPress={() => { void resetTestProfile(); }} />}
        </View>
      )}
      <Text variant="caption" style={{ textAlign: 'center' }} onPress={tapVersion} suppressHighlighting>{tr`Cubo Blocks, version ${VERSION}`}</Text>
      {canChangeAppIcon && <AppIconSheet ref={iconRef} onPicked={setIcon} />}
    </Screen>
  );
}
