// "Nouveau titre !" banner: a title earned for the first time is announced once (profile.titlesSeen, like stickers).
// <TitleBannerHost/> is mounted once at the root: it watches the profile (so every place that can earn one counts: a
// run, a level, a puzzle, a league claim), marks the new ids seen and shows them one after another over the screens.
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeOut, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { tr } from '../core/i18n';
import { freshTitles } from '../core/titles';
import { sfx } from '../audio/engine';
import { cuboLookFor } from '../mascot/looks';
import { haptic } from '../platform/haptics';
import { useGame } from '../state/store';
import { raised } from '../theme/elevation';
import { radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Avatar } from './Avatar';
import { Text } from './Text';

const SHOW_MS = 2400;
const MAX_AT_ONCE = 3; // an old save that earned many titles at once: three banners, all marked seen
const useBanners = create<{ queue: { id: string; name: string }[] }>(() => ({ queue: [] }));

export function TitleBannerHost() {
  const profile = useGame((s) => s.profile);
  const bests = useGame((s) => s.saved.bests);
  const head = useBanners((s) => s.queue[0]);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  useEffect(() => {
    if (profile.dev) return; // test mode: nothing is saved for real
    const { profile: next, fresh } = freshTitles(profile, bests);
    if (!fresh.length) return;
    useGame.getState().setProfile(next);
    const shown = fresh.filter((t) => t.id !== 'newbie').slice(0, MAX_AT_ONCE); // the starter title is silent
    if (!shown.length) return;
    sfx.mission();
    haptic('mission');
    useBanners.setState((s) => ({ queue: [...s.queue, ...shown.map((t) => ({ id: t.id, name: t.name }))] }));
  }, [profile, bests]);
  useEffect(() => {
    if (!head) return;
    const id = setTimeout(() => useBanners.setState((s) => ({ queue: s.queue.slice(1) })), SHOW_MS);
    return () => clearTimeout(id);
  }, [head]);
  if (!head) return null;
  const look = cuboLookFor(profile.equipped.boards, profile.equipped.cubo);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + space.l, left: space.l, right: space.l, alignItems: 'center' }}>
      <Animated.View
        key={head.id}
        entering={ZoomIn.duration(260)}
        exiting={FadeOut.duration(200)}
        accessibilityRole="alert"
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: 8, paddingHorizontal: 16, paddingRight: 20, borderRadius: radius.card, backgroundColor: colors.panel, ...raised(colors) }}
      >
        <Avatar look={look} size={44} mood="combo" />
        <View style={{ flexShrink: 1 }}>
          <Text variant="label">{tr('Nouveau titre !')}</Text>
          <Text variant="title" numberOfLines={1} style={{ color: colors.accent }}>{head.name}</Text>
        </View>
      </Animated.View>
    </View>
  );
}
