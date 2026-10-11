// Classement entre amis: me + my friends on three boards (points of the week, best Classique score of the week,
// all-time Classique record). Ties share a rank. Data: game/social.ts (cache 60 s, pull to refresh).
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { locale, tr } from '../core/i18n';
import * as C from '../core/social';
import { refreshBoard, useBoardRows, useSocial, type BoardRow } from '../game/social';
import type { RootParams } from '../navigation/types';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Group } from '../ui/Group';
import { ListRow } from '../ui/ListRow';
import { Screen } from '../ui/Screen';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';

export type Tab = 'points' | 'best' | 'record';
export const fmt = (n: number) => n.toLocaleString(locale());

// Ranked lines of a board, me among them.
export const rankBoard = (rows: BoardRow[], tab: Tab) => C.rankRows(rows, (r) => r[tab], (a, b) => a.label.localeCompare(b.label));

function RankRow({ r }: { r: C.Ranked<BoardRow> }) {
  const colors = useColors();
  const mine = r.row.me;
  return (
    <ListRow title={r.row.label} sub={mine ? tr('Toi') : undefined}
      label={tr`${r.rank}e, ${r.row.label}, ${fmt(r.value)} points`}
      style={mine ? { backgroundColor: colors.panel2 } : undefined}
      icon={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <Text variant="headline" style={{ width: 28, textAlign: 'center', color: mine ? colors.accent : colors.muted }}>{r.rank}</Text>
          <Avatar look={r.row.look} size={40} />
        </View>
      )}
      right={<Text variant="headline" style={{ color: r.value ? colors.text : colors.muted }}>{r.value ? fmt(r.value) : '–'}</Text>} />
  );
}

export function RankingScreen() {
  const nav = useNavigation<NavigationProp<RootParams>>();
  const rows = useBoardRows();
  const boarding = useSocial((s) => s.boarding);
  const [tab, setTab] = useState<Tab>('points');
  useEffect(() => { void refreshBoard(); }, []);
  const now = Date.now();
  const left = C.weekLeftText(C.weekEnd(now) - now);
  const ranked = rows ? rankBoard(rows, tab) : [];
  return (
    <Screen title={tr('Classement')} back onRefresh={() => { void refreshBoard(true); }} refreshing={boarding}>
      <Segmented role="tab" value={tab} onChange={setTab}
        options={[['points', tr('Points de la semaine')], ['best', tr('Meilleur score')], ['record', tr('Record')]]} />
      <Text variant="caption" style={{ marginHorizontal: space.xs }}>
        {tab === 'points' ? tr`Classique, Chrono et Mondes. ${left}`
          : tab === 'best' ? tr`Meilleure partie Classique de la semaine. ${left}`
          : tr('Meilleur score Classique de tous les temps.')}
      </Text>
      {!rows && <Text variant="muted">{boarding ? tr('Chargement…') : tr('Connexion impossible, réessaie plus tard.')}</Text>}
      {rows && <Group>{ranked.map((r) => <RankRow key={r.row.uid} r={r} />)}</Group>}
      {rows && rows.length < 2 && (
        <Card>
          <Text variant="muted">{tr('Ajoute un ami avec son code pour vous classer.')}</Text>
          <Button kind="ghost" size="s" label={tr('Ajouter un ami')} onPress={() => nav.navigate('Community')} />
        </Card>
      )}
    </Screen>
  );
}
