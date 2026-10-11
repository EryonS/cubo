// The end-of-week league result, shown once after the claim (game/social.ts `report`): ranks, coins, promotion or
// demotion, the new badge. Mounted once at the root (App.tsx) so it shows over whatever screen is up.
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { locale, tr } from '../core/i18n';
import * as G from '../core/league';
import { dismissReport, useSocial } from '../game/social';
import { space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { LeagueBadge } from './LeagueBadge';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';
import { Coin } from './Wallet';

const n = (v: number) => v.toLocaleString(locale());

export function LeagueResultHost() {
  const colors = useColors();
  const report = useSocial((s) => s.report);
  const ref = useRef<BottomSheetModal>(null);
  useEffect(() => { if (report) ref.current?.present(); }, [report]);
  const r = report;
  const head = !r ? '' : r.move > 0 ? tr`Promotion en ${G.tierName(r.to)} !` : r.move < 0 ? tr`Descente en ${G.tierName(r.to)}` : tr`Tu restes en ${G.tierName(r.to)}`;
  return (
    <Sheet ref={ref} onClose={dismissReport}>
      <View style={{ gap: space.m }}>
        <SheetHeader title={tr('Ligue de la semaine')} onClose={() => ref.current?.dismiss()} />
        {r && (
          <>
            <View style={{ alignItems: 'center', gap: space.s }}>
              <LeagueBadge tier={r.to} size={96} />
              <Text variant="title" style={{ textAlign: 'center' }}>{head}</Text>
              <Text variant="muted" style={{ textAlign: 'center' }}>
                {r.points > 0 ? tr`${r.pointsRank}e sur ${r.size} aux points (${n(r.points)} pts)` : tr`Aucun point cette semaine-là`}
              </Text>
              {r.bestRank > 0 && <Text variant="muted" style={{ textAlign: 'center' }}>{tr`${r.bestRank}e au meilleur score (${n(r.best)})`}</Text>}
            </View>
            {r.earned.length > 0 ? (
              <View style={{ gap: space.xs, padding: space.m, borderRadius: 16, backgroundColor: colors.panel2 }}>
                {r.earned.map((l) => (
                  <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
                    <Text variant="body" style={{ flex: 1 }}>{l.label}</Text>
                    <Text variant="headline">+{l.coins}</Text>
                    <Coin size={16} />
                  </View>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }} accessibilityLabel={tr`${r.total} pièces`}>
                  <Text variant="headline" style={{ flex: 1 }}>{tr('Total')}</Text>
                  <Text variant="headline">+{r.total}</Text>
                  <Coin size={16} />
                </View>
              </View>
            ) : <Text variant="muted" style={{ textAlign: 'center' }}>{tr('Pas de récompense cette fois. Une nouvelle semaine commence !')}</Text>}
            <Button label={tr('Super !')} onPress={() => ref.current?.dismiss()} />
          </>
        )}
      </View>
    </Sheet>
  );
}
