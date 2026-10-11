// Classement: Ligue (my group of the week, Points / Meilleur score, promotion and demotion zones, rewards) and
// Amis (me + my friends: points of the week, best Classique score of the week, all-time record). Ties share a rank.
// Data: game/social.ts (cached 60 s, pull to refresh).
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { locale, tr } from '../core/i18n';
import * as G from '../core/league';
import * as C from '../core/social';
import { refreshBoard, refreshGroup, useBoardRows, useLeagueRows, useSocial, type BoardRow, type LeagueRow } from '../game/social';
import type { RootParams } from '../navigation/types';
import { now as clock } from '../platform/clock';
import { useGame } from '../state/store';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Group } from '../ui/Group';
import { LeagueBadge } from '../ui/LeagueBadge';
import { ListRow } from '../ui/ListRow';
import { Screen } from '../ui/Screen';
import { Segmented } from '../ui/Segmented';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

export type Tab = 'points' | 'best' | 'record';
export const fmt = (n: number) => n.toLocaleString(locale());

// Ranked lines of a board, me among them.
export const rankBoard = (rows: BoardRow[], tab: Tab) => C.rankRows(rows, (r) => r[tab], (a, b) => a.label.localeCompare(b.label));

// A league line: its (shared) rank, what happens to it at the end of the week and the coins it pays.
export interface LeagueLine { row: LeagueRow; rank: number; value: number; move: -1 | 0 | 1; pay: number }
export function leagueLines(rows: LeagueRow[], tab: 'points' | 'best', tier: number): LeagueLine[] {
  const ranked = C.rankRows(rows, (r) => r[tab], (a, b) => a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid)); // G.pointsBoard's order
  return ranked.map((r) => {
    const move = G.leagueMove(r.rank, rows.length, tier, r.row.points);
    const pay = tab === 'points' ? G.totalPay(G.leagueRewards(r.value > 0 ? r.rank : 0, 0, move > 0)) : G.totalPay(G.leagueRewards(0, r.value > 0 ? r.rank : 0));
    return { row: r.row, rank: r.rank, value: r.value, move, pay };
  });
}

// A color with a see-through veil, for the promotion / demotion zones.
const veil = (hex: string, a = '2e') => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + a : hex);

interface RowProps { row: { label: string; look: BoardRow['look']; me: boolean }; rank: number; value: number; veil?: string; pay?: number }
function RankRow({ row, rank, value, veil: tint, pay }: RowProps) {
  const colors = useColors();
  const mine = row.me;
  return (
    <ListRow title={row.label} sub={mine ? tr('Toi') : undefined}
      label={tr`${rank}e, ${row.label}, ${fmt(value)} points`}
      style={tint ? { backgroundColor: tint } : mine ? { backgroundColor: colors.panel2 } : undefined}
      icon={(
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <Text variant="headline" style={{ width: 28, textAlign: 'center', color: mine ? colors.accent : colors.muted }}>{rank}</Text>
          <Avatar look={row.look} size={40} />
        </View>
      )}
      right={(
        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="headline" style={{ color: value ? colors.text : colors.muted }}>{value ? fmt(value) : '–'}</Text>
          {!!pay && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }} accessibilityLabel={tr`${pay} pièces`}>
              <Text variant="caption">+{pay}</Text>
              <Coin size={12} />
            </View>
          )}
        </View>
      )} />
  );
}

function FriendsBoard() {
  const nav = useNavigation<NavigationProp<RootParams>>();
  const rows = useBoardRows();
  const boarding = useSocial((s) => s.boarding);
  const [tab, setTab] = useState<Tab>('points');
  const now = clock();
  const left = C.weekLeftText(C.weekEnd(now) - now);
  const ranked = rows ? rankBoard(rows, tab) : [];
  return (
    <>
      <Segmented role="tab" value={tab} onChange={setTab} inset
        options={[['points', tr('Points de la semaine')], ['best', tr('Meilleur score')], ['record', tr('Record')]]} />
      <Text variant="caption" style={{ marginHorizontal: space.xs }}>
        {tab === 'points' ? tr`Classique, Chrono et Mondes. ${left}`
          : tab === 'best' ? tr`Meilleure partie Classique de la semaine. ${left}`
          : tr('Meilleur score Classique de tous les temps.')}
      </Text>
      {!rows && <Text variant="muted">{boarding ? tr('Chargement…') : tr('Connexion impossible, réessaie plus tard.')}</Text>}
      {rows && <Group>{ranked.map((r) => <RankRow key={r.row.uid} row={r.row} rank={r.rank} value={r.value} />)}</Group>}
      {rows && rows.length < 2 && (
        <Card>
          <Text variant="muted">{tr('Ajoute un ami avec son code pour vous classer.')}</Text>
          <Button kind="ghost" size="s" label={tr('Ajouter un ami')} onPress={() => nav.navigate('Community')} />
        </Card>
      )}
    </>
  );
}

function LeagueBoard() {
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const me = useSocial((s) => s.me);
  const grouping = useSocial((s) => s.grouping);
  const tier = useGame((s) => G.tierOf(s.profile));
  const joined = useGame((s) => s.profile.league?.last?.week === C.weekId(clock()));
  const rows = useLeagueRows();
  const [tab, setTab] = useState<'points' | 'best'>('points');
  const now = clock();
  const left = C.weekLeftText(C.weekEnd(now) - now);
  const lines = rows ? leagueLines(rows, tab, tier) : [];
  const up = lines.some((l) => l.move > 0);
  const down = lines.some((l) => l.move < 0);
  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
          <LeagueBadge tier={tier} size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="title" numberOfLines={1}>{tr`Ligue ${G.tierName(tier)}`}</Text>
            <Text variant="muted">{rows ? tr`${rows.length} joueurs · ${left}` : left}</Text>
          </View>
        </View>
      </Card>
      {!me && (
        <Card>
          <Text variant="muted">{tr('Connecte-toi et choisis un pseudo pour jouer en ligue.')}</Text>
          <Button kind="ghost" size="s" label={tr('Ouvrir la Communauté')} onPress={() => nav.navigate('Community')} />
        </Card>
      )}
      {me && !joined && <Card><Text variant="muted">{tr('Joue une partie Classique, Chrono ou Mondes pour rejoindre ta ligue.')}</Text></Card>}
      {me && joined && !rows && <Text variant="muted">{grouping ? tr('Chargement…') : tr('Connexion impossible, réessaie plus tard.')}</Text>}
      {rows && (
        <>
          <Segmented role="tab" value={tab} onChange={setTab} inset options={[['points', tr('Points')], ['best', tr('Meilleur score')]]} />
          <Text variant="caption" style={{ marginHorizontal: space.xs }}>
            {tab === 'points' ? tr('Classique, Chrono et Mondes. Les récompenses sont versées à la fin de la semaine.') : tr('Meilleure partie Classique de la semaine.')}
          </Text>
          <Group>
            {lines.map((l) => (
              <RankRow key={l.row.uid} row={l.row} rank={l.rank} value={l.value} pay={l.pay}
                veil={tab === 'points' && l.move > 0 ? veil(colors.good) : tab === 'points' && l.move < 0 ? veil(colors.danger) : undefined} />
            ))}
          </Group>
          {tab === 'points' && (up || down) && (
            <Text variant="caption" style={{ marginHorizontal: space.xs }}>
              {up && down ? tr('Zone verte : promotion (+20 pièces). Zone rouge : descente.') : up ? tr('Zone verte : promotion (+20 pièces).') : tr('Zone rouge : descente.')}
            </Text>
          )}
        </>
      )}
    </>
  );
}

export function RankingScreen() {
  const route = useRoute<RouteProp<RootParams, 'Ranking'>>();
  const [scope, setScope] = useState<'league' | 'friends'>(route.params?.scope ?? 'league');
  const boarding = useSocial((s) => s.boarding);
  const grouping = useSocial((s) => s.grouping);
  useEffect(() => { void (scope === 'league' ? refreshGroup() : refreshBoard()); }, [scope]);
  return (
    <Screen title={tr('Classement')} back refreshing={scope === 'league' ? grouping : boarding}
      onRefresh={() => { void (scope === 'league' ? refreshGroup(true) : refreshBoard(true)); }}>
      <Segmented role="tab" value={scope} onChange={setScope} options={[['league', tr('Ligue')], ['friends', tr('Amis')]]} />
      {scope === 'league' ? <LeagueBoard /> : <FriendsBoard />}
    </Screen>
  );
}
