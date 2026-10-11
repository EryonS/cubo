// Top of the Défis tab: « Ligue de la semaine » (tier badge, my rank in my group, time left, top 3), with a
// Ligue / Amis switch to the friends card. Signed out, no pseudo or not joined yet: one line. Opens Classement.
import { useCallback, useRef, useState } from 'react';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { tr } from '../../core/i18n';
import * as G from '../../core/league';
import * as C from '../../core/social';
import * as T from '../../core/titles';
import { flagged, refreshGroup, useLeagueRows, useSocial } from '../../game/social';
import type { RootParams } from '../../navigation/types';
import { now as clock } from '../../platform/clock';
import { useGame } from '../../state/store';
import { space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { LeagueBadge } from '../../ui/LeagueBadge';
import { PseudoSheet } from '../../ui/PseudoSheet';
import { Segmented } from '../../ui/Segmented';
import { Text } from '../../ui/Text';
import { fmt, leagueLines } from '../RankingScreen';
import { FriendsCard } from './FriendsCard';

let remembered: 'league' | 'friends' = 'league'; // the switch survives leaving the tab

function League() {
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const me = useSocial((s) => s.me);
  const tier = useGame((s) => G.tierOf(s.profile));
  const points = useGame((s) => C.weekOf(s.profile.week, clock()).points);
  const joined = useGame((s) => s.profile.league?.last?.week === C.weekId(clock()));
  const rows = useLeagueRows();
  useFocusEffect(useCallback(() => { void refreshGroup(); }, [me?.uid, joined]));
  const now = clock();
  const left = C.weekLeftText(C.weekEnd(now) - now);
  const head = (sub: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <LeagueBadge tier={tier} size={48} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="headline" numberOfLines={1}>{tr`Ligue de la semaine · ${G.tierName(tier)}`}</Text>
        <Text variant="muted">{sub}</Text>
      </View>
    </View>
  );
  if (!me) {
    return (
      <Card>
        {head(tr('Connecte-toi et choisis un pseudo pour jouer en ligue.'))}
        <Button kind="ghost" size="s" label={tr('Ouvrir la Communauté')} onPress={() => nav.navigate('Community')} />
      </Card>
    );
  }
  if (!joined) return <Card>{head(tr('Joue une partie Classique, Chrono ou Mondes pour rejoindre ta ligue.'))}</Card>;

  const lines = rows ? leagueLines(rows, 'points', tier) : [];
  const mine = lines.find((l) => l.row.me);
  return (
    <Card>
      {head(mine ? tr`Rang ${mine.rank} sur ${lines.length} · ${fmt(points)} pts · ${left}` : tr`${fmt(points)} pts cette semaine · ${left}`)}
      {lines.length > 0 && (
        <Card inset>
          {lines.slice(0, 3).map((l) => (
            <View key={l.row.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
              <Text variant="headline" style={{ width: 24, textAlign: 'center', color: l.row.me ? colors.accent : colors.muted }}>{l.rank}</Text>
              <Avatar look={l.row.look} size={32} mood={l.row.mood} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="body" numberOfLines={1}>{l.row.label}</Text>
                {!!T.titleName(l.row.title) && <Text variant="caption" numberOfLines={1}>{T.titleName(l.row.title)}</Text>}
              </View>
              <Text variant="headline" style={{ color: l.value ? colors.text : colors.muted }}>{l.value ? fmt(l.value) : '–'}</Text>
            </View>
          ))}
        </Card>
      )}
      <Button kind="ghost" size="s" label={tr('Voir le classement')} onPress={() => nav.navigate('Ranking', { scope: 'league' })} />
    </Card>
  );
}

export function LeagueCard() {
  const me = useSocial((s) => s.me);
  const pseudo = useRef<BottomSheetModal>(null);
  const [scope, setScope] = useState(remembered);
  const pick = (v: 'league' | 'friends') => { remembered = v; setScope(v); };
  if (flagged(me)) {
    return (
      <Card>
        <Text variant="headline">{tr('Ton pseudo a été signalé, choisis-en un autre.')}</Text>
        <Button label={tr('Choisir un autre pseudo')} onPress={() => pseudo.current?.present()} />
        <PseudoSheet ref={pseudo} />
      </Card>
    );
  }
  return (
    <View style={{ gap: space.m }}>
      <Segmented role="tab" value={scope} onChange={pick} options={[['league', tr('Ligue')], ['friends', tr('Amis')]]} />
      {scope === 'league' ? <League /> : <FriendsCard />}
    </View>
  );
}
