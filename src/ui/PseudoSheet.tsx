// The pseudo sheet: first pick (Communauté, signed in without a pseudo) and the weekly rename.
import { forwardRef, useState } from 'react';
import { BottomSheetTextInput, type BottomSheetModal } from '@gorhom/bottom-sheet';
import { View } from 'react-native';
import { tr } from '../core/i18n';
import * as C from '../core/social';
import { createMe, flagged, renameMe, useSocial } from '../game/social';
import { fonts } from '../theme/fonts';
import { radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Button } from './Button';
import { Sheet, SheetHeader } from './Sheet';
import { Text } from './Text';

export const PseudoSheet = forwardRef<BottomSheetModal, object>(function PseudoSheet(_, ref) {
  const colors = useColors();
  const me = useSocial((s) => s.me);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  const submit = async () => {
    const check = C.checkName(text);
    if (!check.ok) { setError(check.error); return; }
    setBusy(true);
    const res = me ? await renameMe(text) : await createMe(text);
    setBusy(false);
    if (res.error) setError(res.error); else close();
  };
  const forced = flagged(me);
  const wait = me && !forced ? C.renameWait(me.nameChangedAt, Date.now()) : 0;
  return (
    <Sheet ref={ref} onOpen={() => { setText(forced ? '' : me?.name ?? ''); setError(''); }}>
      <View style={{ gap: space.m }}>
        <SheetHeader title={me ? tr('Changer de pseudo') : tr('Ton pseudo')} onClose={close} />
        {forced && <Text variant="body" style={{ color: colors.danger }}>{tr('Ton pseudo a été signalé, choisis-en un autre.')}</Text>}
        <Text variant="muted">
          {forced ? tr('Le nouveau pseudo remplace l’ancien, sans attendre.') : me ? tr('Tu peux le changer une fois par semaine.') : tr('Choisis un pseudo : tes amis le verront.')}
        </Text>
        {wait > 0 ? (
          <Text variant="body">{tr`Tu pourras changer de pseudo ${C.waitText(wait)}.`}</Text>
        ) : (
          <>
            <BottomSheetTextInput
              value={text}
              onChangeText={(v) => { setText(v); setError(''); }}
              maxLength={C.NAME_MAX}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={tr('Pseudo')}
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              onSubmitEditing={() => { void submit(); }}
              accessibilityLabel={tr('Pseudo')}
              style={{ minHeight: TOUCH + space.s, borderRadius: radius.tile, paddingHorizontal: space.l, backgroundColor: colors.panel2, color: colors.text, fontFamily: fonts.bold, fontSize: 18 }}
            />
            <Text variant="caption" style={error ? { color: colors.danger } : undefined}>
              {error || tr`${C.NAME_MIN} à ${C.NAME_MAX} caractères : lettres, chiffres, espace, - et _.`}
            </Text>
            <Button label={tr('Valider')} onPress={() => { void submit(); }} disabled={busy || text.trim().length === 0} />
          </>
        )}
      </View>
    </Sheet>
  );
});
