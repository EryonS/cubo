// A row: optional icon, title and sub line, then a chevron, a switch or anything on the right.
// On the screen background it is a small card; inside a card pass `inset`.
import type { ReactNode } from 'react';
import { View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';
import { lip, radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { Tap } from './Tap';
import { Text } from './Text';

type Props = {
  title: string;
  sub?: string;
  icon?: ReactNode;
  right?: ReactNode | 'chevron';
  onPress?: () => void;
  inset?: boolean;
  done?: boolean; // a green ring (a finished mission, a solved day)
  big?: boolean; // title one step up (headline instead of body)
  role?: AccessibilityRole;
  state?: { checked?: boolean; selected?: boolean; disabled?: boolean };
  label?: string;
  disabled?: boolean;
  quiet?: boolean;
  children?: ReactNode; // extra content under the text (a progress bar)
  style?: StyleProp<ViewStyle>;
};

export function ListRow({ title, sub, icon, right, onPress, inset, done, big, role, state, label, disabled, quiet, children, style }: Props) {
  const colors = useColors();
  const box: StyleProp<ViewStyle> = [{
    flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: TOUCH + space.s, paddingVertical: space.m, paddingHorizontal: space.l,
    borderRadius: radius.tile, backgroundColor: inset ? colors.panel2 : colors.panel,
    borderBottomWidth: inset ? 0 : lip.tile, borderBottomColor: colors.edge,
  }, done && { borderWidth: 2, borderColor: colors.good, borderBottomWidth: inset ? 2 : lip.tile, borderBottomColor: colors.good }, style];
  const body = (
    <>
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant={big ? 'headline' : 'body'}>{title}</Text>
        {sub ? <Text variant="muted">{sub}</Text> : null}
        {children}
      </View>
      {right === 'chevron' ? <Icon name="chevRight" size={16} color={colors.muted} /> : right}
    </>
  );
  if (!onPress) return <View style={box} accessible={!!label} accessibilityLabel={label}>{body}</View>;
  return (
    <Tap onPress={onPress} style={box} label={label ?? title} disabled={disabled} quiet={quiet} accessibilityRole={role} accessibilityState={state}>
      {body}
    </Tap>
  );
}
