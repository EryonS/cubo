// The picked day's level (legacy dayHtml): world, goal, status (stars / tries) and Jouer / Continuer.
import { View } from 'react-native';
import { LV, M, WD } from '../../core';
import { tr } from '../../core/i18n';
import { budgetText, dailyGoingOn, dailyWord, frDate, triesText } from '../../game/daily';
import { today } from '../../state/persist';
import { useGame } from '../../state/store';
import { radius } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Button } from '../../ui/Button';
import { DailyRefill } from '../../ui/DailyRefill';
import { StarRow } from '../../ui/Stars';
import { Text } from '../../ui/Text';

export function DayCard({ day, onPlay }: { day: string; onPlay: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const going = useGame((s) => dailyGoingOn(s.saved.state, day));
  const t = today();
  const stage = LV.daily(day);
  const d = M.dailyOf(profile, day);
  const left = M.dailyAttemptsLeft(profile, day, t);
  const done = d.stars !== undefined;
  const tries = day === t ? triesText(left) : tr('Essais illimités');
  const label = going ? tr('Continuer') : !left ? tr('Demain') : done ? tr('Rejouer') : tr('Jouer');
  const trophy = M.monthTrophy(profile, day.slice(0, 7));
  const small = { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 } as const;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ padding: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, borderWidth: 2, borderColor: done ? colors.good : 'transparent' }}>
        <Text variant="muted" style={small}>{`${dailyWord(day, t)} #${LV.dayNumber(day)} · ${WD.WORLDS[stage.world].name}${day === t ? '' : ' · ' + frDate(day)}`}</Text>
        <Text variant="title" style={{ fontSize: 21, lineHeight: 24, marginTop: 4 }}>{LV.goalText(stage.goal)}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            {going ? <Text variant="muted">{tr('Partie en cours')}</Text>
              : done ? <StarRow n={d.stars!} size={18} gap={2} />
              : <Text variant="muted">{left ? `${budgetText(stage)} · ${tries}` : tr('Plus d’essai aujourd’hui')}</Text>}
          </View>
          <Button label={label} disabled={!(left || going)} onPress={onPlay} style={{ paddingHorizontal: 22, paddingVertical: 8, opacity: left || going ? 1 : 0.5 }} />
        </View>
        {!going && <DailyRefill day={day} plain />}
      </View>
      <Text variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>
        {day === t ? tr('Le même niveau pour tout le monde. Réussis-en un chaque jour pour garder ta série.')
          : tr('Rattrape un jour manqué : il compte pour le trophée du mois, pas pour la série.')}
        {trophy ? ' ' + (trophy === 'gold' ? tr('Trophée d’or gagné ce mois-ci.') : tr('Trophée d’argent gagné ce mois-ci.')) : ''}
      </Text>
    </View>
  );
}
