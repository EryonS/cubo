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
import { radius } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';

const fmt = (n: number) => n.toLocaleString(locale());

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, padding: 8, paddingHorizontal: 10, borderRadius: radius.card - 6, backgroundColor: colors.panel }}>
      <Text variant="muted" style={{ fontSize: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>{children}</View>
    </View>
  );
}

export function Endless({ w, onPlay }: { w: string; onPlay: () => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const best = useGame((s) => s.saved.bests['worlds-' + w] || 0);
  const open = M.worldFreeOpen(profile, w);
  const rules = WD.WORLDS[w];
  const box = { marginTop: 18, padding: 12, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, gap: 4 } as const;
  if (!open) {
    return (
      <View style={box}>
        <Text variant="title" style={{ fontSize: 19, lineHeight: 24 }}>{tr('Partie sans fin')}</Text>
        <Text variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>{tr`Réussis l'épreuve (niveau ${M.TRIAL_LEVEL}) pour jouer ici sans limite de coups, avec une prime en pièces.`}</Text>
      </View>
    );
  }
  const rate = M.worldPrimeRate(w);
  const note = rules.free && rules.free.note ? ' ' + rules.free.note : '';
  return (
    <View style={box}>
      <Text variant="title" style={{ fontSize: 19, lineHeight: 24 }}>{tr('Partie sans fin')}</Text>
      <Text variant="muted" style={{ fontSize: 13, lineHeight: 18 }}>{tr`Les règles de ${rules.name}, sans limite de coups. Chaque point rapporte une prime en pièces.` + note}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
        <Fact label={tr('Record')}><Text style={{ fontSize: 18 }}>{fmt(best)}</Text></Fact>
        <Fact label={tr('Prime')}>
          <Text style={{ fontSize: 18 }}>{fmt(Math.round(rate * 5))}</Text><Coin size={15} />
          <Text variant="muted" style={{ fontSize: 11 }}>{tr('par 1 000 pts')}</Text>
        </Fact>
      </View>
      <Button kind="ghost" label={tr('Jouer sans fin')} onPress={() => { sfx.turn(); onPlay(); }} />
    </View>
  );
}
