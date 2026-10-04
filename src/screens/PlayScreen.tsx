// Jouer tab (legacy #menu): Continuer, the Aventure card, Défi du jour and Puzzles tiles, the free
// game row (mode and level, Jouer), Missions with their pips, and the wallet.
import { useMemo, useRef, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M, LV, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { freeInProgress, guardFree, inProgress, LEVEL_NAMES, MODE_NAMES, modeLabel, modeSub } from '../game/modes';
import { tileSub } from '../game/daily';
import { puzzleInProgress, puzzleTileSub } from '../game/puzzle';
import { missionStatus, restartRun, resumeParked } from '../game/run';
import { cuboLookFor } from '../mascot/looks';
import { cuboLine } from '../mascot/say';
import { haptic } from '../platform/haptics';
import { CuboPose } from '../ui/CuboPose';
import { boardTheme } from '../render/board-themes';
import { sfx } from '../audio/engine';
import { today } from '../state/persist';
import { lastOpenWorld } from '../game/levelend';
import { levelName, nextAdventure } from '../state/progress';
import { useGame } from '../state/store';
import type { RootParams, TabParams } from '../navigation/types';
import { radius } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { fonts } from '../theme/fonts';
import { BoardPreview } from '../ui/BoardPreview';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ask } from '../ui/dialog';
import { FreePickSheet } from '../ui/FreePickSheet';
import { Flame, Icon, Star } from '../ui/Icon';
import { Pips } from '../ui/Missions';
import { MissionsSheet } from '../ui/MissionsSheet';
import { Screen } from '../ui/Screen';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

// A tappable block that shrinks a little under the finger.
function Tap({ onPress, style, children, label }: { onPress: () => void; style?: StyleProp<ViewStyle>; children: React.ReactNode; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { sfx.turn(); onPress(); }}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}>
      {children}
    </Pressable>
  );
}

const Small = ({ children, style }: { children: React.ReactNode; style?: object }) => (
  <Text variant="muted" style={[{ fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', fontFamily: fonts.bold }, style]}>{children}</Text>
);

// Cubo and his line of the day; a tap makes him pull the theme's faces in turn and hop.
function CuboSay() {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const line = useMemo(() => cuboLine(profile, today()), [profile]);
  const look = useMemo(() => cuboLookFor(profile.equipped.boards, profile.equipped.cubo), [profile.equipped.boards, profile.equipped.cubo]);
  const [mood, setMood] = useState<string | null>(null);
  const taps = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hop = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * hop.value }, { scaleX: 1 + 0.04 * hop.value }, { scaleY: 1 - 0.04 * hop.value }] }));
  const onTap = () => {
    sfx.pop();
    haptic('pick');
    setMood(look.taps[taps.current++ % look.taps.length]);
    hop.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 270 }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMood(null), 900);
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cubo" onPress={onTap} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -6 }}>
      <Animated.View style={[{ transformOrigin: 'bottom' }, style]}><CuboPose width={76} lw={152} lh={160} s={100} foot={9} look={look} mood={mood ?? line.mood} /></Animated.View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 6, paddingVertical: 10, paddingHorizontal: 13, borderRadius: 16, backgroundColor: colors.panel2 }}>
        <View style={{ position: 'absolute', left: -7, top: '50%', marginTop: -7, borderTopWidth: 7, borderBottomWidth: 7, borderRightWidth: 7, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.panel2 }} />
        <Text style={{ fontSize: 15, lineHeight: 20 }}>{line.text}</Text>
      </View>
    </Pressable>
  );
}

export function PlayScreen() {
  const colors = useColors();
  const tile = tileStyle(colors);
  const nav = useNavigation<NavigationProp<RootParams & TabParams>>();
  const profile = useGame((s) => s.profile);
  const prefs = useGame((s) => s.saved.prefs);
  const parked = useGame((s) => s.saved.parked);
  useGame((s) => s.saved.state.stats); // missions progress with the run
  const playing = useGame((s) => freeInProgress(s.saved.state));
  const playingLabel = useGame((s) => `${modeLabel(s.saved.state)} · ${fmt(s.saved.state.score)} pts`);
  const pickRef = useRef<BottomSheetModal>(null);
  const missionsRef = useRef<BottomSheetModal>(null);

  // A level in progress resumes from the hero card; else the next level to play (legacy home.js renderMenu).
  const levelKey = useGame((s) => (inProgress(s.saved.state) && s.saved.state.stage && !s.saved.state.stage.daily && !s.saved.state.stage.event ? `${s.saved.state.stage.world}:${s.saved.state.stage.n}` : ''));
  const level = useMemo(() => (levelKey ? ([levelKey.split(':')[0], +levelKey.split(':')[1]] as [string, number]) : null), [levelKey]);
  const levelGoal = useGame((s) => (s.saved.state.stage ? LV.goalText(s.saved.state.stage.goal) : ''));
  const next = level || nextAdventure(profile);
  const stars = M.totalStars(profile);
  const maxStars = M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3;
  const heroWorld = next ? next[0] : lastOpenWorld(profile);
  const preview = useMemo(() => boardTheme(heroWorld, profile.equipped.blocks), [heroWorld, profile.equipped.blocks]);
  const day = today();
  const daily = M.dailyOf(profile, day);
  const streak = M.streakNow(profile, day);
  const dailySub = useGame((s) => tileSub(s.profile, s.saved.state, day));
  const puzzleGoing = useGame((s) => puzzleInProgress(s.saved.state));
  const puzzleSub = useGame((s) => puzzleTileSub(s.profile, s.saved.state));
  const status = missionStatus();
  const done = status.filter((m) => m.done).length;
  const freeSub = parked ? tr`${fmt(parked.score)} pts` : modeSub(prefs.mode);

  const play = () => nav.navigate('Game');
  const playFree = () => {
    const g = guardFree(useGame.getState().saved.state, useGame.getState().saved.parked);
    const go = () => { restartRun({ mode: prefs.mode, level: prefs.level }); play(); };
    if (!g.needed) { go(); return; }
    ask({ title: tr('Abandonner ?'), text: g.text, ok: tr('Abandonner'), danger: true }).then((yes) => { if (yes) go(); });
  };
  const onFreePlay = () => {
    if (!parked) { playFree(); return; }
    const go = () => { resumeParked(); play(); };
    if (!inProgress(useGame.getState().saved.state)) { go(); return; }
    ask({ title: tr('Reprendre ?'), text: tr('Le niveau en cours s’arrête pour reprendre ta partie libre. Les pièces gagnées sont gardées.'), ok: tr('Reprendre') })
      .then((yes) => { if (yes) go(); });
  };

  return (
    <Screen>
      <Card style={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ flex: 1, fontFamily: fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: 1.4, textTransform: 'uppercase' }} numberOfLines={1} adjustsFontSizeToFit>Cubo Blocks</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Pièces : ouvrir la Boutique')} onPress={() => { sfx.turn(); nav.navigate('Shop'); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.panel2, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
            <Coin size={19} />
            <Text variant="title" style={{ fontSize: 22, lineHeight: 28 }}>{fmt(profile.coins)}</Text>
          </Pressable>
        </View>

        <CuboSay />

        {playing && (
          <Button label={tr('Continuer')} sub={playingLabel} onPress={() => { sfx.turn(); play(); }} />
        )}

        <View>
          <Tap onPress={() => { if (level) play(); else nav.navigate('Adventure'); }}
            label={level ? tr`Aventure : reprendre ${WD.WORLDS[level[0]].name}, ${levelName(level[1])}` : next ? tr`Aventure : jouer ${WD.WORLDS[next[0]].name}, ${levelName(next[1])}` : tr('Aventure : carte des mondes')}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card, backgroundColor: playing ? colors.panel2 : colors.accent, borderBottomWidth: playing ? 0 : 5, borderBottomColor: 'rgba(0,0,0,0.2)' }}>
            <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: playing ? 0 : 3, borderColor: 'rgba(255,255,255,0.4)' }}>
              <BoardPreview th={preview} width={86} radius={11} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Small style={{ color: playing ? colors.muted : colors.onAccent, opacity: 0.85 }}>{tr('Aventure')}</Small>
              <Text variant="title" numberOfLines={2} adjustsFontSizeToFit style={{ fontSize: 22, lineHeight: 24, color: playing ? colors.text : colors.onAccent }}>
                {next ? `${WD.WORLDS[next[0]].name} · ${levelName(next[1])}` : tr('Carte des mondes')}
              </Text>
              {level ? <Text numberOfLines={1} style={{ fontSize: 13, color: playing ? colors.muted : colors.onAccent }}>{levelGoal}</Text> : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Star size={14} />
                  <Text style={{ fontSize: 13, color: playing ? colors.muted : colors.onAccent }}>{fmt(stars)} / {maxStars}</Text>
                </View>
              )}
            </View>
            <View style={{ alignSelf: 'flex-end', paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: playing ? colors.accent : colors.onAccent }}>
              <Text variant="title" style={{ fontSize: 15, lineHeight: 20, textTransform: 'uppercase', color: playing ? colors.onAccent : colors.accent }}>{level ? tr('Reprendre') : next ? tr('Jouer') : tr('Voir')}</Text>
            </View>
          </Tap>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Carte')} onPress={() => { sfx.turn(); nav.navigate('Adventure'); }} hitSlop={8}
            style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 32, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: playing ? colors.panel : 'rgba(255,255,255,0.22)' }}>
            <Icon name="map" size={16} color={playing ? colors.text : colors.onAccent} />
            <Text style={{ fontSize: 13, color: playing ? colors.text : colors.onAccent }}>{tr('Carte')}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Tap onPress={() => nav.navigate('Defis')} style={[tile, daily.stars !== undefined && { borderWidth: 2, borderColor: colors.good }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', marginBottom: 4 }}>
              <Icon name="defis" size={24} color={colors.accent} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }} accessibilityLabel={tr`Série de ${streak} jour${streak > 1 ? 's' : ''}`}>
                <Flame size={18} on={streak > 0} color={colors.text} />
                <Text style={{ fontSize: 15 }}>{streak}</Text>
              </View>
            </View>
            <Text variant="title" style={{ fontSize: 19, lineHeight: 21 }}>{tr('Défi du jour')}</Text>
            <Text variant="muted" style={{ fontSize: 13, lineHeight: 16 }}>{dailySub}</Text>
          </Tap>
          <Tap onPress={() => { if (puzzleGoing) nav.navigate('Game'); else nav.navigate('Puzzles'); }} style={tile}>
            <View style={{ alignSelf: 'stretch', marginBottom: 4 }}><Icon name="puzzle" size={24} color={colors.accent} /></View>
            <Text variant="title" style={{ fontSize: 19, lineHeight: 21 }}>{tr('Puzzles')}</Text>
            <Text variant="muted" style={{ fontSize: 13, lineHeight: 16 }}>{puzzleSub}</Text>
          </Tap>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tap onPress={() => pickRef.current?.present()} label={tr('Choisir le mode de la partie libre')}
            style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 10, paddingLeft: 14, paddingRight: 34, borderRadius: radius.card - 2, backgroundColor: colors.panel2 }}>
            <Small>{parked ? tr('Partie en cours') : tr('Partie libre')}</Small>
            <Text variant="title" style={{ fontSize: 18, lineHeight: 21 }} numberOfLines={1}>
              {parked ? modeLabel(parked) : `${MODE_NAMES[prefs.mode]} · ${LEVEL_NAMES[prefs.level]}`}
            </Text>
            <Text variant="muted" style={{ fontSize: 13 }}>{freeSub}</Text>
            <View style={{ position: 'absolute', right: 12, top: '50%', marginTop: -8 }}><Icon name="chevDown" size={16} color={colors.muted} /></View>
          </Tap>
          <Pressable accessibilityRole="button" onPress={onFreePlay}
            style={({ pressed }) => ({ width: 104, alignItems: 'center', justifyContent: 'center', borderRadius: radius.card - 2, backgroundColor: parked && !playing ? colors.accent : colors.panel2, borderBottomWidth: 4, borderBottomColor: parked && !playing ? 'rgba(0,0,0,0.22)' : colors.hairline, transform: [{ translateY: pressed ? 2 : 0 }] })}>
            <Text variant="title" style={{ fontSize: 20, textTransform: 'uppercase', color: parked && !playing ? colors.onAccent : colors.accent }}>{parked ? tr('Reprendre') : tr('Jouer')}</Text>
          </Pressable>
        </View>

        <Tap onPress={() => missionsRef.current?.present()} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card - 2, backgroundColor: colors.panel2 }}>
          <Icon name="target" size={24} color={colors.accent} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title" style={{ fontSize: 22, lineHeight: 24, textTransform: 'uppercase' }}>{tr('Missions')}</Text>
            <Text variant="muted" style={{ fontSize: 13 }} numberOfLines={1}>{done === status.length ? tr('Toutes faites') : tr`${done}/${status.length} faites aujourd’hui`}</Text>
          </View>
          <Pips status={status} />
          <Icon name="chevRight" size={16} color={colors.muted} />
        </Tap>
      </Card>
      <FreePickSheet ref={pickRef} parked={!!parked} onPlay={onFreePlay} />
      <MissionsSheet ref={missionsRef} />
    </Screen>
  );
}

const tileStyle = (colors: ReturnType<typeof useColors>): ViewStyle => ({ flex: 1, minWidth: 0, padding: 12, paddingHorizontal: 14, gap: 2, borderRadius: radius.card - 2, backgroundColor: colors.panel2 });
