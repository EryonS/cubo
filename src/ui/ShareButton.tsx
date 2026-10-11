// The end cards' "Partager" pill: draws the share picture and opens the share sheet (platform/share.ts).
import { useState } from 'react';
import { Pressable } from 'react-native';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { shareCard } from '../platform/share';
import type { ShareCard } from '../render/share-card';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Icon } from './Icon';
import { Text } from './Text';

export function ShareButton({ card, style }: { card: () => ShareCard; style?: object }) {
  const colors = useColors();
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const press = async () => {
    if (busy) return;
    sfx.turn();
    setBusy(true);
    const ok = await shareCard(card());
    setBusy(false);
    if (!ok) { setFlash(tr('Partage impossible ici')); setTimeout(() => setFlash(null), 1800); }
  };
  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void press(); }}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingVertical: space.xs + 2, paddingHorizontal: space.m, borderRadius: radius.pill, backgroundColor: colors.panel2, opacity: busy ? 0.6 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}>
      <Icon name="share" size={16} color={colors.text} />
      <Text style={{ fontSize: 14 }}>{flash ?? tr('Partager')}</Text>
    </Pressable>
  );
}
