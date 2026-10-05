// A short message at the bottom of the screen (legacy .ad-toast). One at a time.
import { useEffect } from 'react';
import { View } from 'react-native';
import { create } from 'zustand';
import { useColors } from '../theme/useColors';
import { Text } from './Text';

const useToast = create<{ text: string | null }>(() => ({ text: null }));
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(text: string) {
  if (timer) clearTimeout(timer);
  useToast.setState({ text });
  timer = setTimeout(() => { useToast.setState({ text: null }); timer = null; }, 2600);
}

export function ToastHost() {
  const colors = useColors();
  const text = useToast((s) => s.text);
  useEffect(() => () => { if (timer) clearTimeout(timer); }, []);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: 48, alignItems: 'center' }}>
      <View style={{ maxWidth: 340, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, backgroundColor: colors.text }}>
        <Text style={{ color: colors.panel, fontSize: 15, textAlign: 'center' }}>{text}</Text>
      </View>
    </View>
  );
}
