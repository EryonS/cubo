// "Entre amis" on top of the Défis tab: my rank and points this week, the top 3, the time left. Signed out, no
// pseudo or no friend yet: one line and a button to Profil > Communauté. Opens the Classement screen.
import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { tr } from '../../core/i18n';
import * as C from '../../core/social';
import { refreshBoard, useBoardRows, useSocial } from '../../game/social';
import type { RootParams } from '../../navigation/types';
import { useGame } from '../../state/store';
import { space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Text } from '../../ui/Text';
import { fmt, rankBoard } from '../RankingScreen';

export function FriendsCard() {
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const me = useSocial((s) => s.me);
  const rows = useBoardRows();
  const week = useGame((s) => s.profile.week);
  useFocusEffect(useCallback(() => { void refreshBoard(); }, [me?.uid]));
  const now = Date.now();
  const left = C.weekLeftText(C.weekEnd(now) - now);
  const invite = (text: string, button: string) => (
    <Card>
      <Text variant="headline">{tr('Entre amis')}</Text>
      <Text variant="muted">{text}</Text>
      <Button kind="ghost" size="s" label={button} onPress={() => nav.navigate('Community')} />
    </Card>
  );
  if (!me) return invite(tr('Connecte-toi et choisis un pseudo pour te mesurer à tes amis chaque semaine.'), tr('Ouvrir la Communauté'));
  if (rows && rows.length < 2) return invite(tr('Ajoute un ami avec son code pour comparer vos scores de la semaine.'), tr('Ajouter un ami'));

  const ranked = rows ? rankBoard(rows, 'points') : [];
  const mine = ranked.find((r) => r.row.me);
  const points = C.weekOf(week, now).points;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.s }}>
        <Text variant="headline">{tr('Entre amis')}</Text>
        <Text variant="caption">{left}</Text>
      </View>
      <Text variant="muted">
        {mine ? tr`Rang ${mine.rank} sur ${ranked.length} · ${fmt(points)} pts cette semaine` : tr`${fmt(points)} pts cette semaine`}
      </Text>
      {ranked.length > 0 && (
        <Card inset>
          {ranked.slice(0, 3).map((r) => (
            <View key={r.row.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
              <Text variant="headline" style={{ width: 24, textAlign: 'center', color: r.row.me ? colors.accent : colors.muted }}>{r.rank}</Text>
              <Avatar look={r.row.look} size={32} />
              <Text variant="body" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{r.row.label}</Text>
              <Text variant="headline" style={{ color: r.value ? colors.text : colors.muted }}>{r.value ? fmt(r.value) : '–'}</Text>
            </View>
          ))}
        </Card>
      )}
      <Button kind="ghost" size="s" label={tr('Voir le classement')} onPress={() => nav.navigate('Ranking')} />
    </Card>
  );
}
