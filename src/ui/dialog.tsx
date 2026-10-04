// Styled confirmation dialog (legacy ui/dialog.js #ask): replaces the system Alert. `ask()` returns
// a promise that resolves true when the player agrees; <AskHost/> is mounted once at the root, over
// the navigator, so it also covers the native tab bar.
import { Modal, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { create } from 'zustand';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { colors, radius, space } from '../theme/tokens';
import { Button } from './Button';
import { Text } from './Text';

export interface AskOpts { title: string; text: string; ok: string; danger?: boolean; single?: boolean }

interface AskStore { opts: AskOpts | null; done: ((v: boolean) => void) | null }
const useAsk = create<AskStore>(() => ({ opts: null, done: null }));

export function ask(opts: AskOpts): Promise<boolean> {
  useAsk.getState().done?.(false); // a dialog already open is dismissed
  return new Promise((resolve) => {
    useAsk.setState({
      opts,
      done: (v) => { useAsk.setState({ opts: null, done: null }); resolve(v); },
    });
  });
}

// A message with one OK button.
export const notice = (title: string, text: string) => ask({ title, text, ok: tr('OK'), single: true });

// True while a dialog is open (the game timers wait).
export const asking = () => useAsk.getState().opts !== null;
export const useAsking = () => useAsk((s) => s.opts !== null);

export function AskHost() {
  const opts = useAsk((s) => s.opts);
  if (!opts) return null;
  const done = (v: boolean) => useAsk.getState().done?.(v);
  // A native Modal so the dialog also covers the bottom sheets (they live in a portal under the host).
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => done(false)}>
    <Animated.View
      entering={FadeIn.duration(150)}
      accessibilityViewIsModal
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center', padding: space.xl }}
    >
      <Animated.View
        entering={ZoomIn.duration(220)}
        accessibilityRole="alert"
        style={{ width: '100%', maxWidth: 320, backgroundColor: colors.panel, borderRadius: radius.card + 8, padding: space.xl, borderBottomWidth: 6, borderBottomColor: colors.edge, gap: space.m }}
      >
        <Text variant="title" style={{ textAlign: 'center', textTransform: 'uppercase' }}>{opts.title}</Text>
        <Text variant="muted" style={{ textAlign: 'center', fontSize: 15, lineHeight: 20 }}>{opts.text}</Text>
        <View style={{ flexDirection: 'row', gap: space.m, marginTop: space.s }}>
          {!opts.single && <Button kind="ghost" label={tr('Annuler')} style={{ flex: 1, paddingHorizontal: space.m }} onPress={() => { sfx.turn(); done(false); }} />}
          <Button kind={opts.danger ? 'danger' : 'primary'} label={opts.ok} style={{ flex: 1.2, paddingHorizontal: space.m }} onPress={() => done(true)} />
        </View>
      </Animated.View>
    </Animated.View>
    </Modal>
  );
}
