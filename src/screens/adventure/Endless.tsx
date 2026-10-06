// "Partie sans fin" (legacy renderEndless, the former Mondes mode): the world's rules without a move limit,
// opened by the world's trial; record, prime and Play.
import { View } from 'react-native';
import { M, WD } from '../../core';
import { locale, tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { Button } from '../../ui/Button';
import { Text } from '../../ui/Text';
import { Coin } from '../../ui/Wallet';
import { useGame } from '../../state/store';
import { radius, space } from '../../theme/tokens';
import { Card } from '../../ui/Card';
import { useColors } from '../../theme/useColors';

const fmt = (n: number) => n.toLocaleString(locale());

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, padding: space.m, borderRadius: radius.tile, backgroundColor: colors.panel2 }}>
      <Text variant="label">{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' }}>{children}</View>
    </View>
  );
}

export function Endless({ w, onPlay }: { w: string; onPlay: () => void }) {
  const profile = useGame((s) => s.profile);
  const best = useGame((s) => s.saved.bests['worlds-' + w] || 0);
  const open = M.worldFreeOpen(profile, w);
  const rules = WD.WORLDS[w];
  if (!open) {
    return (
      <Card style={{ gap: space.xs, marginTop: space.s }}>
        <Text variant="headline">{tr('Partie sans fin')}</Text>
        <Text variant="muted">{tr`Réussis l'épreuve (niveau ${M.TRIAL_LEVEL}) pour jouer ici sans limite de coups, avec une prime en pièces.`}</Text>
      </Card>
    );
  }
  const rate = M.worldPrimeRate(w);
  const note = rules.free && rules.free.note ? ' ' + rules.free.note : '';
  return (
    <Card style={{ gap: space.xs, marginTop: space.s }}>
      <Text variant="headline">{tr('Partie sans fin')}</Text>
      <Text variant="muted">{tr`Les règles de ${rules.name}, sans limite de coups. Plus tu marques, plus la prime en pièces grossit.` + note}</Text>
      <View style={{ flexDirection: 'row', gap: space.s, marginVertical: space.s }}>
        <Fact label={tr('Record')}><Text variant="headline">{fmt(best)}</Text></Fact>
        <Fact label={tr('Prime')}>
          <Text variant="headline">{fmt(Math.round(rate * 5))}</Text><Coin size={15} />
          <Text variant="caption">{tr('par 1 000 pts')}</Text>
        </Fact>
      </View>
      <Button kind="ghost" label={tr('Jouer sans fin')} onPress={() => { sfx.turn(); onPlay(); }} />
    </Card>
  );
}
