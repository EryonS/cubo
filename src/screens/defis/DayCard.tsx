// The picked day's level (legacy dayHtml): world, goal, status (stars / tries) and a full-width Jouer / Continuer.
// Drawn flat: it sits in the Défi du jour card under the calendar; the note goes under that card.
import { View } from 'react-native';
import { LV, M, WD } from '../../core';
import { tr } from '../../core/i18n';
import { budgetText, dailyGoingOn, dailyWord, frDate, triesText } from '../../game/daily';
import { today } from '../../state/persist';
import { useGame } from '../../state/store';
import { space } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { DailyRefill } from '../../ui/DailyRefill';
import { StarRow } from '../../ui/Stars';
import { Text } from '../../ui/Text';

export function DayLevel({ day, onPlay }: { day: string; onPlay: () => void }) {
  const profile = useGame((s) => s.profile);
  const going = useGame((s) => dailyGoingOn(s.saved.state, day));
  const t = today();
  const stage = LV.daily(day);
  const d = M.dailyOf(profile, day);
  const left = M.dailyAttemptsLeft(profile, day, t);
  const done = d.stars !== undefined;
  const tries = day === t ? triesText(left) : tr('Essais illimités');
  const label = going ? tr('Continuer') : !left ? tr('Demain') : done ? tr('Rejouer') : tr('Jouer');
  return (
    <View style={{ gap: space.xs }}>
      <Text variant="label">{`${dailyWord(day, t)} #${LV.dayNumber(day)} · ${WD.WORLDS[stage.world].name}${day === t ? '' : ' · ' + frDate(day)}`}</Text>
      <Text variant="title">{LV.goalText(stage.goal)}</Text>
      {going ? <Text variant="muted">{tr('Partie en cours')}</Text>
        : done ? <StarRow n={d.stars!} size={18} gap={2} />
        : <Text variant="muted">{left ? `${budgetText(stage)} · ${tries}` : tr('Plus d’essai aujourd’hui')}</Text>}
      <Button label={label} disabled={!(left || going)} onPress={onPlay} style={{ alignSelf: 'stretch', marginTop: space.s }} />
      {!going && <DailyRefill day={day} />}
    </View>
  );
}

export function DayNote({ day }: { day: string }) {
  const profile = useGame((s) => s.profile);
  const t = today();
  const trophy = M.monthTrophy(profile, day.slice(0, 7));
  return (
    <Text variant="caption" style={{ marginHorizontal: space.xs }}>
      {day === t ? tr('Le même niveau pour tout le monde. Réussis-en un chaque jour pour garder ta série.')
        : tr('Rattrape un jour manqué : il compte pour le trophée du mois, pas pour la série.')}
      {trophy ? ' ' + (trophy === 'gold' ? tr('Trophée d’or gagné ce mois-ci.') : tr('Trophée d’argent gagné ce mois-ci.')) : ''}
    </Text>
  );
}
