// Défis calendar (legacy calendarHtml / dayCell): a week strip that unfolds to the month; each day shows
// its stars; the picked day's level is the card under it.
import { Pressable, View } from 'react-native';
import { M, LV } from '../../core';
import { tr } from '../../core/i18n';
import { calFirst, calLast, dailyGoingOn, frDate, frMonth, monthCells, weekCells, weekdayNames } from '../../game/daily';
import { today } from '../../state/persist';
import { useGame } from '../../state/store';
import { useColors } from '../../theme/useColors';
import { Icon } from '../../ui/Icon';
import { StarRow } from '../../ui/Stars';
import { Text } from '../../ui/Text';

interface Props {
  open: boolean; month: string; week: string; picked: string;
  onToggle: () => void; onStep: (d: number) => void; onPick: (day: string) => void;
}

function Cell({ day, picked, onPick }: { day: string; picked: string; onPick: (d: string) => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const going = useGame((s) => dailyGoingOn(s.saved.state, day));
  const t = today();
  const d = M.dailyOf(profile, day);
  const off = day > t || day < LV.DAILY_START;
  const isToday = day === t;
  const fg = isToday ? colors.onAccent : off ? colors.muted : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={frDate(day)} disabled={off} onPress={() => onPick(day)}
      style={{ flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 1,
        backgroundColor: off ? 'transparent' : isToday ? colors.accent : colors.panel2, opacity: off ? 0.45 : 1,
        borderWidth: 2, borderColor: d.stars !== undefined ? colors.good : day === picked ? colors.text : 'transparent' }}>
      <Text style={{ fontSize: 15, lineHeight: 18, color: fg }}>{Number(day.slice(8))}</Text>
      {d.stars !== undefined ? <StarRow n={d.stars} size={8} gap={0} />
        : going ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isToday ? colors.onAccent : colors.accent }} /> : <View style={{ height: 8 }} />}
    </Pressable>
  );
}

export function Calendar({ open, month, week, picked, onToggle, onStep, onPick }: Props) {
  const colors = useColors();
  const t = today();
  const first = calFirst(open, month, week);
  const last = calLast(open, month, week, t);
  const cells = open ? monthCells(month) : weekCells(week);
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const arrow = (d: number, disabled: boolean) => (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onStep(d)}
      accessibilityLabel={d < 0 ? (open ? tr('Mois précédent') : tr('Semaine précédente')) : (open ? tr('Mois suivant') : tr('Semaine suivante'))}
      style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.panel2, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Icon name={d < 0 ? 'chevLeft' : 'chevRight'} size={16} color={colors.text} />
    </Pressable>
  );
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        {arrow(-1, first)}
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10 }}>
          <Text variant="title" style={{ fontSize: 20, textTransform: 'capitalize' }}>{frMonth(open ? month : picked.slice(0, 7))}</Text>
          <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="chevDown" size={16} color={colors.text} /></View>
        </Pressable>
        {arrow(1, last)}
      </View>
      <View style={{ flexDirection: 'row', gap: 5 }}>
        {weekdayNames().map((n, i) => (
          <Text key={i} variant="muted" style={{ flex: 1, textAlign: 'center', fontSize: 12, textTransform: 'uppercase' }}>{n}</Text>
        ))}
      </View>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: 5 }}>
          {row.map((day, i) => (day ? <Cell key={day} day={day} picked={picked} onPick={onPick} /> : <View key={'x' + i} style={{ flex: 1 }} />))}
        </View>
      ))}
    </View>
  );
}
