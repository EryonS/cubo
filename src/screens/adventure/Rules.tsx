// A world's rules (legacy .rules): what helps, what hurts, and its second obstacle from level 11.
// RulesFold folds them into one row on the Aventure screen, so the levels sit higher.
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LV, M, WD } from '../../core';
import { tr } from '../../core/i18n';
import { fonts } from '../../theme/fonts';
import { radius, space } from '../../theme/tokens';
import { raised } from '../../theme/elevation';
import { useColors } from '../../theme/useColors';
import { Icon } from '../../ui/Icon';
import { KindIcon } from '../../ui/KindIcon';
import { ListRow } from '../../ui/ListRow';
import { Text } from '../../ui/Text';

function Row({ sign, bg, children }: { sign: string; bg: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center', paddingVertical: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low') }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 18, lineHeight: 22 }}>{sign}</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function Rules({ w }: { w: string }) {
  const colors = useColors();
  const rules = WD.WORLDS[w];
  const tw = rules.twist;
  const t = (s: string) => <Text variant="muted" style={{ color: colors.text }}>{s}</Text>;
  return (
    <View style={{ gap: space.s }}>
      <Row sign="+" bg={colors.good}>{t(rules.plus)}</Row>
      <Row sign="−" bg={colors.danger}>{t(rules.minus)}</Row>
      {tw && LV.TWISTS[w] && (
        <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center', paddingVertical: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low') }}>
          <KindIcon kind={LV.TWISTS[w].kind} size={32} />
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ color: colors.accent, fontFamily: fonts.display }}>{tr`Dès le niveau ${M.TRIAL_LEVEL + 1} : ${tw.name}`}</Text>
            {t(tw.text)}
          </View>
        </View>
      )}
    </View>
  );
}

function Sign({ sign, bg }: { sign: string; bg: string }) {
  return (
    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: 16, lineHeight: 20 }}>{sign}</Text>
    </View>
  );
}

export function RulesFold({ w, open, onToggle }: { w: string; open: boolean; onToggle: () => void }) {
  const colors = useColors();
  const tw = WD.WORLDS[w].twist;
  return (
    <View style={{ gap: space.s }}>
      <ListRow title={tr('Règles du monde')} sub={tw && LV.TWISTS[w] ? tr`Dès le niveau ${M.TRIAL_LEVEL + 1} : ${tw.name}` : undefined}
        icon={<View style={{ flexDirection: 'row', gap: space.xxs }}><Sign sign="+" bg={colors.good} /><Sign sign="−" bg={colors.danger} /></View>}
        right={<View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="chevDown" size={16} color={colors.muted} /></View>}
        onPress={onToggle} role="button" state={{ expanded: open }} />
      {open && <Animated.View entering={FadeIn.duration(180)}><Rules w={w} /></Animated.View>}
    </View>
  );
}
