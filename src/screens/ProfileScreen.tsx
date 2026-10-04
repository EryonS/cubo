// Profil tab. Milestone 1 placeholder: a few totals and the language choice.
import { Pressable, View } from 'react-native';
import { M } from '../core';
import { tr } from '../core/i18n';
import { langPref, setLangPref, type LangPref } from '../i18n/lang';
import { useGame } from '../state/store';
import { colors, radius, space } from '../theme/tokens';
import { Card } from '../ui/Card';
import { Text } from '../ui/Text';
import { Screen } from '../ui/Screen';

const LANGS: [LangPref, string][] = [['auto', 'Auto'], ['fr', 'Français'], ['en', 'English']];

export function ProfileScreen() {
  const profile = useGame((s) => s.profile);
  const pref = langPref();
  return (
    <Screen>
      <Text variant="title">{tr('Profil')}</Text>
      <Card>
        <Text variant="muted">{tr('Parties jouées')}</Text>
        <Text variant="big">{profile.games}</Text>
        <Text variant="muted">{tr('Étoiles')}</Text>
        <Text variant="big">{M.totalStars(profile)}</Text>
      </Card>
      <Card>
        <Text variant="muted">{tr('Langue')}</Text>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          {LANGS.map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: pref === id }}
              onPress={() => setLangPref(id)}
              style={{ paddingHorizontal: space.m, paddingVertical: space.s, borderRadius: radius.pill, backgroundColor: pref === id ? colors.accent : colors.panel2 }}
            >
              <Text style={{ color: pref === id ? colors.onAccent : colors.text }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
