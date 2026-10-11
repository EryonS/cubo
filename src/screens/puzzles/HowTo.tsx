// How puzzles work, folded into one row on the Puzzles screen (like the Aventure world rules): the goal,
// turning a shape, moving a placed one, free undo, hints and stars.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { M } from '../../core';
import { tr } from '../../core/i18n';
import { space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Group } from '../../ui/Group';
import { Icon, type IconName } from '../../ui/Icon';
import { ListRow } from '../../ui/ListRow';
import { LStar } from '../../ui/Stars';
import { Text } from '../../ui/Text';

function Row({ icon, children }: { icon: ReactNode; children: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: space.m, alignItems: 'center', paddingVertical: space.m, paddingHorizontal: space.l }}>
      <View style={{ width: 24, alignItems: 'center' }}>{icon}</View>
      <Text variant="muted" style={{ flex: 1, color: colors.text }}>{children}</Text>
    </View>
  );
}

export function HowTo({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const colors = useColors();
  const icon = (name: IconName) => <Icon name={name} size={22} color={colors.accent} />;
  return (
    <View style={{ gap: space.s }}>
      <ListRow title={tr('Comment jouer')} sub={tr('Remplis le dessin, touche une forme pour la tourner')}
        icon={<Icon name="puzzle" size={24} color={colors.accent} />}
        right={<View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}><Icon name="chevDown" size={16} color={colors.muted} /></View>}
        onPress={onToggle} role="button" state={{ expanded: open }} />
      {open && (
        <Animated.View entering={FadeIn.duration(180)}>
          <Group>
            <Row icon={icon('puzzle')}>{tr('Chaque puzzle est un dessin à remplir. Pose toutes les formes du bas pour couvrir chaque case vide. Pas de lignes effacées, pas de bonus.')}</Row>
            <Row icon={icon('turn')}>{tr('Touche une forme du bas pour la faire pivoter d’un quart de tour.')}</Row>
            <Row icon={icon('move')}>{tr('Reprends une forme déjà posée pour la déplacer, ou touche-la pour la renvoyer en bas.')}</Row>
            <Row icon={icon('undo')}>{tr('Annuler est gratuit, autant de fois que tu veux.')}</Row>
            <Row icon={<LStar size={22} on />}>{tr`Trois étoiles sans aide. Un indice (${M.PUZZLE_HINT} pièces) pose une forme à sa place et coûte une étoile.`}</Row>
          </Group>
        </Animated.View>
      )}
    </View>
  );
}
