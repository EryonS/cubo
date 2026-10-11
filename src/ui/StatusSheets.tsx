// Pickers for my community statuses (Communauté): the title shown under my pseudo (earned ones selectable, locked ones
// greyed with how to earn them) and the mood (a phrase + Cubo's face). Lists and rules: core/titles.ts.
import { forwardRef } from 'react';
import { ScrollView, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import * as T from '../core/titles';
import { mineMood, mineTitle, setMyStatus } from '../game/social';
import { cuboLookFor } from '../mascot/looks';
import { useGame } from '../state/store';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Avatar } from './Avatar';
import { Group } from './Group';
import { Icon } from './Icon';
import { ListRow } from './ListRow';
import { Sheet, SheetHeader } from './Sheet';
import { Tap } from './Tap';
import { Text } from './Text';

const close = (ref: React.ForwardedRef<BottomSheetModal>) => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();

export const TitleSheet = forwardRef<BottomSheetModal, object>(function TitleSheet(_, ref) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const bests = useGame((s) => s.saved.bests);
  const current = mineTitle(profile);
  const earned = T.earnedTitles(profile, bests).length;
  const pick = (id: string) => { setMyStatus('title', id); close(ref); };
  return (
    <Sheet ref={ref} scroll>
      <View style={{ gap: space.m }}>
        <SheetHeader title={tr('Titre')} onClose={() => close(ref)} />
        <Text variant="muted">{tr`${earned} sur ${T.TITLES.length} gagnés. Le titre choisi s’affiche sous ton pseudo.`}</Text>
        <ScrollView style={{ maxHeight: 470 }}>
          <Group>
            <ListRow title={tr('Aucun titre')} onPress={() => pick('')} role="radio" state={{ selected: !current }}
              right={!current ? <Icon name="check" size={18} color={colors.good} /> : undefined} />
            {T.TITLES.map((t) => {
              const ok = t.test(profile, bests);
              return (
                <ListRow key={t.id} title={t.name} sub={t.how} role="radio" disabled={!ok} quiet={!ok}
                  state={{ selected: current === t.id, disabled: !ok }}
                  label={ok ? t.name : tr`${t.name}, à gagner : ${t.how}`}
                  onPress={ok ? () => pick(t.id) : undefined}
                  style={ok ? undefined : { opacity: 0.55 }}
                  right={ok ? (current === t.id ? <Icon name="check" size={18} color={colors.good} /> : undefined) : <Icon name="lock" size={16} color={colors.muted} />} />
              );
            })}
          </Group>
        </ScrollView>
      </View>
    </Sheet>
  );
});

export const MoodSheet = forwardRef<BottomSheetModal, object>(function MoodSheet(_, ref) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const current = mineMood(profile);
  const look = cuboLookFor(profile.equipped.boards, profile.equipped.cubo);
  const pick = (id: string) => { setMyStatus('mood', id); close(ref); };
  return (
    <Sheet ref={ref} scroll>
      <View style={{ gap: space.m }}>
        <SheetHeader title={tr('Humeur')} onClose={() => close(ref)} />
        <Text variant="muted">{tr('Cubo prend la tête de ton humeur dans les classements et chez tes amis.')}</Text>
        <ScrollView style={{ maxHeight: 470 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s }}>
          {[{ id: '', text: tr('Aucune'), face: 'happy' }, ...T.MOODS].map((m) => {
            const on = current === m.id;
            return (
              <Tap key={m.id || 'none'} label={m.text} onPress={() => pick(m.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={{ width: '48.5%', alignItems: 'center', gap: space.xs, paddingVertical: space.m, paddingHorizontal: space.s, borderRadius: radius.tile, backgroundColor: colors.panel2, borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}>
                <Avatar look={look} size={56} mood={m.id} />
                <Text variant="headline" numberOfLines={2} style={{ textAlign: 'center' }}>{m.text}</Text>
              </Tap>
            );
          })}
        </ScrollView>
      </View>
    </Sheet>
  );
});
