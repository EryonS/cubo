// A world's rules (legacy .rules): what helps, what hurts, and its second obstacle from level 11.
import { View } from 'react-native';
import { LV, M, WD } from '../../core';
import { tr } from '../../core/i18n';
import { radius } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { KindIcon } from '../../ui/KindIcon';
import { Text } from '../../ui/Text';

function Row({ sign, bg, children }: { sign: string; bg: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, paddingHorizontal: 11, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 17, lineHeight: 22 }}>{sign}</Text>
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export function Rules({ w }: { w: string }) {
  const colors = useColors();
  const rules = WD.WORLDS[w];
  const tw = rules.twist;
  const t = (s: string) => <Text style={{ fontSize: 14, lineHeight: 18 }}>{s}</Text>;
  return (
    <View style={{ gap: 6, marginBottom: 14 }}>
      <Row sign="+" bg={colors.good}>{t(rules.plus)}</Row>
      <Row sign="−" bg="#ff5d7a">{t(rules.minus)}</Row>
      {tw && LV.TWISTS[w] && (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 9, paddingHorizontal: 11, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
          <KindIcon kind={LV.TWISTS[w].kind} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, lineHeight: 18, color: colors.accent, fontFamily: 'Baloo2-ExtraBold' }}>{tr`Dès le niveau ${M.TRIAL_LEVEL + 1} : ${tw.name}`}</Text>
            {t(tw.text)}
          </View>
        </View>
      )}
    </View>
  );
}
