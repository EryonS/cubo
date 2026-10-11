// "…" on another player's line: report his pseudo (Insultant / Inapproprié / Autre) or block him. Friends can also be
// removed (Communauté). Apple 1.2: report + block next to every pseudo. One sheet per screen: usePlayerSheet().
import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import * as C from '../core/social';
import { blockPlayer, reportPlayer } from '../game/social';
import { space } from '../theme/tokens';
import { Button } from './Button';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

// name: the raw pseudo (what a report says); label: what the row shows.
export interface PlayerTarget { uid: string; name: string; label: string; onRemove?: () => void }

export function usePlayerSheet(): [(t: PlayerTarget) => void, ReactNode] {
  const ref = useRef<BottomSheetModal>(null);
  const [target, setTarget] = useState<PlayerTarget | null>(null);
  const [step, setStep] = useState<'menu' | 'reasons'>('menu');
  const close = () => ref.current?.dismiss();
  const open = (t: PlayerTarget) => { setTarget(t); setStep('menu'); ref.current?.present(); };
  const node = (
    <Sheet ref={ref} onClose={() => setTarget(null)}>
      <View style={{ gap: space.m }}>
        <SheetHeader title={target?.label ?? ''} onClose={close} />
        {step === 'menu' ? (
          <>
            {target?.onRemove && <Button kind="secondary" label={tr('Retirer de mes amis')} onPress={() => { const t = target; close(); t?.onRemove?.(); }} />}
            <Button kind="secondary" label={tr('Signaler ce pseudo')} onPress={() => setStep('reasons')} />
            <Button kind="danger" label={tr('Bloquer ce joueur')} onPress={() => { const t = target; close(); if (t) void blockPlayer(t.uid, t.label); }} />
          </>
        ) : (
          <>
            <Text variant="muted">{tr('Pourquoi signales-tu ce pseudo ?')}</Text>
            {C.REPORT_REASONS.map((r) => (
              <Button key={r} kind="secondary" label={C.reasonText(r)} onPress={() => { const t = target; close(); if (t) void reportPlayer(t.uid, t.name, r); }} />
            ))}
          </>
        )}
      </View>
    </Sheet>
  );
  return [open, node];
}
