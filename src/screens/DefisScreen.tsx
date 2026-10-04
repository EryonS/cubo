// Défis tab (legacy #defis): the calendar on top (a week, unfolds to the month), the picked day's level,
// the streak with its freezes, today's missions. A daily in progress is resumed from here.
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { M } from '../core';
import { tr, many } from '../core/i18n';
import { sfx } from '../audio/engine';
import { calFirst, calLast, dailyGoingOn, pickDay, stepMonth } from '../game/daily';
import { guardFree, inProgress, isFree } from '../game/modes';
import { missionStatus, startDaily } from '../game/run';
import { haptic } from '../platform/haptics';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import type { RootParams } from '../navigation/types';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Card } from '../ui/Card';
import { ask } from '../ui/dialog';
import { Flame, Snow } from '../ui/Icon';
import { MissionList } from '../ui/Missions';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';
import { Calendar } from './defis/Calendar';
import { DayCard } from './defis/DayCard';

const nope = () => { sfx.nope(); haptic('nope'); };

function StreakBlock() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const t = today();
  const st = M.streakOf(profile);
  const now = M.streakNow(profile, t);
  const disabled = st.freezes >= M.FREEZE_MAX || profile.coins < M.FREEZE_COST;
  const freeze = () => {
    const { profile: p, setProfile } = useGame.getState();
    const next = M.buyFreeze(p);
    if (!next) { nope(); return; }
    setProfile(next);
    sfx.buy();
  };
  return (
    <View style={{ gap: 10 }}>
      <Text variant="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 13 }}>{tr('Série')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
        <Flame size={38} on={now > 0} color={colors.text} />
        <Text variant="title" style={{ fontSize: 34, lineHeight: 38 }}>{now}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, lineHeight: 18 }}>{many(now) ? tr("jours d'affilée") : tr("jour d'affilée")}</Text>
          <Text variant="muted" style={{ fontSize: 13, lineHeight: 17 }}>{tr`Record : ${st.best}`}</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }} accessibilityLabel={tr`Gels de série : ${st.freezes} sur ${M.FREEZE_MAX}`}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {Array.from({ length: M.FREEZE_MAX }, (_, i) => <Snow key={i} size={22} on={i < st.freezes} color={colors.muted} />)}
          </View>
          <Text variant="muted" style={{ fontSize: 12 }}>{tr`Gels ${st.freezes}/${M.FREEZE_MAX}`}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={freeze}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, opacity: disabled ? 0.45 : 1 }}>
        <Text style={{ fontSize: 15, flex: 1 }}>{tr('Gel de série : protège un jour manqué')}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{M.FREEZE_COST}</Text><Coin size={16} />
        </View>
      </Pressable>
    </View>
  );
}

export function DefisScreen() {
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const profile = useGame((s) => s.profile);
  const [pick, setPick] = useState(() => pickDay(today(), today()));
  const [open, setOpen] = useState(false);
  const t = today();
  const streak = M.streakNow(profile, t);
  // Back on the tab: a daily in progress is what it is for, show its day.
  useFocusEffect(useCallback(() => {
    useGame.getState().rollDay();
    const st = useGame.getState().saved.state;
    if (st.stage?.daily && dailyGoingOn(st, st.stage.daily)) setPick(pickDay(st.stage.daily, today()));
  }, []));

  const go = (day: string) => {
    const { saved } = useGame.getState();
    const st = saved.state;
    if (dailyGoingOn(st, day)) { nav.navigate('Game'); return; }
    const start = () => { if (startDaily(day)) nav.navigate('Game'); else nope(); };
    // Another level in progress is dropped (a free run is parked, not dropped).
    if (inProgress(st) && !isFree(st)) {
      const g = guardFree(st, saved.parked);
      ask({ title: tr('Abandonner ?'), text: g.text, ok: tr('Abandonner'), danger: true }).then((yes) => { if (yes) start(); });
    } else start();
  };
  const step = (d: number) => {
    if (open) {
      const month = stepMonth(pick.month, d);
      if (d < 0 ? calFirst(true, pick.month, pick.week) : calLast(true, pick.month, pick.week, t)) { nope(); return; }
      setPick({ ...pick, month });
    } else setPick(pickDay(M.addDays(pick.day, d * 7), t));
    sfx.turn();
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Text variant="title" style={{ flex: 1 }}>{tr('Défis')}</Text>
        <View accessibilityLabel={tr`Série de ${streak} jour${streak > 1 ? 's' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.panel, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: space.xs }}>
          <Flame size={18} on={streak > 0} color={colors.text} /><Text>{streak}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Pièces : ouvrir la Boutique')} onPress={() => nav.navigate('Tabs', { screen: 'Shop' })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.panel, borderRadius: radius.pill, paddingHorizontal: space.m, paddingVertical: space.xs }}>
          <Coin /><Text>{profile.coins.toLocaleString()}</Text>
        </Pressable>
      </View>
      <Card style={{ gap: space.m }}>
        <Calendar open={open} month={pick.month} week={pick.week} picked={pick.day}
          onToggle={() => { setOpen(!open); sfx.turn(); }} onStep={step}
          onPick={(day) => { setPick(pickDay(day, t)); sfx.turn(); }} />
        <DayCard day={pick.day} onPlay={() => { sfx.turn(); go(pick.day); }} />
        <StreakBlock />
        {/* Season event rows (milestone 7 part B) come here. */}
        <MissionList status={missionStatus()} />
        <Text variant="muted" style={{ fontSize: 12, lineHeight: 16 }}>{tr('Elles avancent dans tous les modes. Trois nouvelles chaque jour.')}</Text>
      </Card>
    </Screen>
  );
}
