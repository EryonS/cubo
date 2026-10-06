// Réglages (legacy #settings): sounds, music, vibrations, color-blind marks, language,
// and the ad-privacy row. The cloud account lives on the Profil tab.
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { tr } from '../core/i18n';
import { langPref, setLangPref, type LangPref } from '../i18n/lang';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { startTutorial } from '../game/tutorial';
import { privacyRequired, showPrivacyOptions, subscribePrivacy } from '../platform/ads';
import type { Settings } from '../state/persist';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { ListRow } from '../ui/ListRow';
import { Screen } from '../ui/Screen';
import { SectionLabel } from '../ui/SectionLabel';
import { Segmented } from '../ui/Segmented';
import { Toggle } from '../ui/Toggle';

const LANGS: [LangPref, string][] = [['auto', 'Auto'], ['fr', 'Français'], ['en', 'English']];

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
  return (
    <Screen title={tr('Réglages')} back>
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
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Langue')}</SectionLabel>
        <Segmented options={LANGS} value={pref} onChange={(id) => { sfx.turn(); setLangPref(id); }} />
      </View>
      <View style={{ gap: space.s }}>
        <SectionLabel>{tr('Aide')}</SectionLabel>
        <ListRow title={tr('Revoir le tutoriel')} sub={tr('Une partie guidée en 3 étapes')} right="chevron"
          onPress={() => { startTutorial(); nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Game' }] })); }} />
        {privacy && <ListRow title={tr('Confidentialité des pubs')} right="chevron" onPress={() => { void showPrivacyOptions(); }} />}
      </View>
    </Screen>
  );
}
