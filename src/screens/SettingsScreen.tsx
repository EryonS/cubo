// Réglages (legacy #settings): sounds, music, vibrations, color-blind marks, language,
// the cloud account (hidden until Firebase is configured) and the ad-privacy row.
import { useSyncExternalStore } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { tr } from '../core/i18n';
import { langPref, setLangPref, type LangPref } from '../i18n/lang';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { startTutorial } from '../game/tutorial';
import { privacyRequired, showPrivacyOptions, subscribePrivacy } from '../platform/ads';
import { available } from '../platform/cloud';
import type { Settings } from '../state/persist';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { AccountBlock } from '../ui/AccountBlock';
import { Icon } from '../ui/Icon';
import { Text } from '../ui/Text';

const LANGS: [LangPref, string][] = [['auto', 'Auto'], ['fr', 'Français'], ['en', 'English']];

function Section({ children }: { children: string }) {
  return <Text variant="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 13, marginTop: space.m, marginBottom: 2 }}>{children}</Text>;
}

function Toggle({ on }: { on: boolean }) {
  const colors = useColors();
  return (
    <View style={{ width: 50, height: 30, borderRadius: 15, backgroundColor: on ? colors.accent : colors.sunken, justifyContent: 'center' }}>
      <View style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 2, shadowOffset: { width: 0, height: 2 } }} />
    </View>
  );
}

function Row({ id, label, sub }: { id: keyof Settings; label: string; sub: string }) {
  const colors = useColors();
  const on = useGame((s) => s.saved.settings[id]);
  const flip = () => {
    const { saved, setSaved } = useGame.getState();
    setSaved({ ...saved, settings: { ...saved.settings, [id]: !on } });
    if (id === 'sfx' && !on) setTimeout(() => sfx.turn(), 0);
    if (id === 'vibrate' && !on) setTimeout(() => haptic('pick'), 0);
  };
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={flip}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, marginTop: space.s }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16 }}>{label}</Text>
        <Text variant="muted" style={{ fontSize: 12 }}>{sub}</Text>
      </View>
      <Toggle on={on} />
    </Pressable>
  );
}

export function SettingsScreen() {
  const colors = useColors();
  const nav = useNavigation();
  const pref = langPref();
  const privacy = useSyncExternalStore(subscribePrivacy, privacyRequired, privacyRequired);
  const cloud = available();
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space.l }}>
        <View style={{ backgroundColor: colors.panel, borderRadius: radius.card + 8, padding: space.xl, borderBottomWidth: 6, borderBottomColor: colors.edge }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.s }}>
            <Pressable accessibilityRole="button" accessibilityLabel={tr('Retour')} onPress={() => nav.goBack()} hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevLeft" size={16} color={colors.text} />
            </Pressable>
            <Text variant="title" style={{ fontSize: 30, textTransform: 'uppercase' }}>{tr('Réglages')}</Text>
          </View>
          <Section>{tr('Son')}</Section>
          <Row id="sfx" label={tr('Sons')} sub={tr('Effets du jeu')} />
          <Row id="music" label={tr('Musique')} sub={tr('Petite mélodie de fond')} />
          <Row id="vibrate" label={tr('Vibrations')} sub={tr('Retour haptique sur mobile')} />
          <Section>{tr('Affichage')}</Section>
          <Row id="patterns" label={tr('Motifs sur les blocs')} sub={tr('Un symbole par couleur, pour mieux les distinguer')} />
          <Row id="mascot" label={tr('Mascotte')} sub={tr('Cubo, perché sur le plateau, réagit à ta partie')} />
          <Section>{tr('Langue')}</Section>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: space.s }}>
            {LANGS.map(([id, label]) => (
              <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: pref === id }} onPress={() => { if (id !== pref) { sfx.turn(); setLangPref(id); } }}
                style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.panel2, alignItems: 'center', borderWidth: 2.5, borderColor: pref === id ? colors.accent : 'transparent' }}>
                <Text variant="title" style={{ fontSize: 16, lineHeight: 22 }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {cloud && <Section>{tr('Sauvegarde en ligne')}</Section>}
          {cloud && <AccountBlock />}
          {privacy && (
            <Pressable accessibilityRole="button" onPress={() => { sfx.turn(); void showPrivacyOptions(); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, marginTop: space.s }}>
              <Text style={{ fontSize: 16, flex: 1 }}>{tr('Confidentialité des pubs')}</Text>
              <Icon name="chevRight" size={16} color={colors.accent} />
            </Pressable>
          )}
          <Section>{tr('Aide')}</Section>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Revoir le tutoriel')}
            onPress={() => { sfx.turn(); startTutorial(); nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'Tabs' }, { name: 'Game' }] })); }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 4, backgroundColor: colors.panel2, marginTop: space.s }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16 }}>{tr('Revoir le tutoriel')}</Text>
              <Text variant="muted" style={{ fontSize: 12 }}>{tr('Une partie guidée en 3 étapes')}</Text>
            </View>
            <Icon name="chevRight" size={16} color={colors.accent} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
