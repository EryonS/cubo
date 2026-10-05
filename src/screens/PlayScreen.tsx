// Jouer tab (legacy #menu): Continuer, the Aventure card, Défi du jour and Puzzles tiles, the free
// game row (mode and level, Jouer), Missions with their pips, and the wallet.
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M, LV, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { freeInProgress, guardFree, inProgress, LEVEL_NAMES, MODE_NAMES, modeLabel, modeSub } from '../game/modes';
import { tileSub } from '../game/daily';
import { eventRows } from '../game/events';
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
import { lip, radius, space } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { BoardPreview } from '../ui/BoardPreview';
import { Button, darker } from '../ui/Button';
import { Card } from '../ui/Card';
import { Counter } from '../ui/Counter';
import { ListRow } from '../ui/ListRow';
import { ask } from '../ui/dialog';
import { FreePickSheet } from '../ui/FreePickSheet';
import { Flame, Icon, Star } from '../ui/Icon';
import { KindIcon } from '../ui/KindIcon';
import { Pips } from '../ui/Missions';
import { MissionsSheet } from '../ui/MissionsSheet';
import { Screen } from '../ui/Screen';
import { Tap } from '../ui/Tap';
import { Text } from '../ui/Text';
import { Coin } from '../ui/Wallet';

const fmt = (n: number) => n.toLocaleString(locale());

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
    <Pressable accessibilityRole="button" accessibilityLabel="Cubo" onPress={onTap} style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
      <Animated.View style={[{ transformOrigin: 'bottom' }, style]}><CuboPose width={76} lw={152} lh={160} s={100} foot={9} look={look} mood={mood ?? line.mood} /></Animated.View>
      <View style={{ flex: 1, minWidth: 0, paddingVertical: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, borderBottomWidth: lip.tile, borderBottomColor: colors.edge }}>
        <View style={{ position: 'absolute', left: -8, top: '50%', marginTop: -8, borderTopWidth: 8, borderBottomWidth: 8, borderRightWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: colors.panel }} />
        <Text>{line.text}</Text>
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
  const run = useGame((s) => s.saved.state);
  const day = today();
  const events = eventRows(profile, run, day);
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

  const heroInk = playing ? colors.text : colors.onAccent;
  const heroSub = playing ? colors.muted : colors.onAccent;
  const freeHot = !!parked && !playing;

  return (
    <Screen title="Cubo Blocks" right={<Counter icon={<Coin size={20} />} value={fmt(profile.coins)} label={tr('Pièces : ouvrir la Boutique')} onPress={() => nav.navigate('Shop')} />}>
      <CuboSay />

      {playing && <Button label={tr('Continuer')} sub={playingLabel} onPress={() => { sfx.turn(); play(); }} />}

      <Tap onPress={() => { if (level) play(); else nav.navigate('Adventure'); }}
        label={level ? tr`Aventure : reprendre ${WD.WORLDS[level[0]].name}, ${levelName(level[1])}` : next ? tr`Aventure : jouer ${WD.WORLDS[next[0]].name}, ${levelName(next[1])}` : tr('Aventure : carte des mondes')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, borderRadius: radius.card, backgroundColor: playing ? colors.panel : colors.accent, borderBottomWidth: lip.card, borderBottomColor: playing ? colors.edge : darker(colors.accent) }}>
        <View style={{ borderRadius: radius.tile, overflow: 'hidden', borderWidth: 3, borderColor: playing ? colors.panel2 : 'rgba(255,255,255,0.4)' }}>
          <BoardPreview th={preview} width={92} radius={13} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
          <Text variant="label" numberOfLines={1} style={{ color: heroSub, opacity: 0.9 }}>{next ? `${tr('Aventure')} · ${WD.WORLDS[next[0]].name}` : tr('Aventure')}</Text>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: heroInk }}>{next ? levelName(next[1]) : tr('Carte des mondes')}</Text>
          {level ? <Text variant="caption" numberOfLines={1} style={{ color: heroSub }}>{levelGoal}</Text> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Star size={14} />
              <Text variant="caption" style={{ color: heroSub }}>{fmt(stars)} / {maxStars}</Text>
            </View>
          )}
        </View>
        <View style={{ alignSelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-end', gap: space.s }}>
          <Tap label={tr('Carte')} onPress={() => nav.navigate('Adventure')} hitSlop={4}
            style={{ width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: playing ? colors.panel2 : 'rgba(255,255,255,0.22)' }}>
            <Icon name="map" size={18} color={heroInk} />
          </Tap>
          <View style={{ height: 36, justifyContent: 'center', paddingHorizontal: space.m, borderRadius: radius.pill, backgroundColor: playing ? colors.accent : colors.onAccent }}>
            <Text variant="headline" style={{ color: playing ? colors.onAccent : colors.accent }}>{level ? tr('Reprendre') : next ? tr('Jouer') : tr('Voir')}</Text>
          </View>
        </View>
      </Tap>

      {events.map((row) => (
        <ListRow key={row.id} title={row.name} sub={row.sub} icon={<KindIcon kind={row.icon} size={32} />} right="chevron"
          onPress={() => { if (row.playing) nav.navigate('Game'); else nav.navigate('Event', { id: row.id }); }} />
      ))}

      <View style={{ flexDirection: 'row', gap: space.m }}>
        <Tap onPress={() => nav.navigate('Defis')} label={`${tr('Défi du jour')}, ${dailySub}`} style={[tile, daily.stars !== undefined && { borderWidth: 2, borderColor: colors.good, borderBottomColor: colors.good }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' }}>
            <Icon name="defis" size={24} color={colors.accent} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }} accessibilityLabel={tr`Série de ${streak} jour${streak > 1 ? 's' : ''}`}>
              <Flame size={18} on={streak > 0} color={colors.text} />
              <Text variant="headline">{streak}</Text>
            </View>
          </View>
          <Text variant="headline" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ marginTop: space.s }}>{tr('Défi du jour')}</Text>
          <Text variant="muted" numberOfLines={2}>{dailySub}</Text>
        </Tap>
        <Tap onPress={() => { if (puzzleGoing) nav.navigate('Game'); else nav.navigate('Puzzles'); }} label={`${tr('Puzzles')}, ${puzzleSub}`} style={tile}>
          <Icon name="puzzle" size={24} color={colors.accent} />
          <Text variant="headline" numberOfLines={1} style={{ marginTop: space.s }}>{tr('Puzzles')}</Text>
          <Text variant="muted" numberOfLines={2}>{puzzleSub}</Text>
        </Tap>
      </View>

      <Card small style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingVertical: space.s }}>
        <Tap onPress={() => pickRef.current?.present()} label={tr('Choisir le mode de la partie libre')} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.s, paddingVertical: space.xs }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="label">{parked ? tr('Partie en cours') : tr('Partie libre')}</Text>
            <Text variant="headline" numberOfLines={1}>{parked ? modeLabel(parked) : `${MODE_NAMES[prefs.mode]} · ${LEVEL_NAMES[prefs.level]}`}</Text>
            <Text variant="muted" numberOfLines={1}>{freeSub}</Text>
          </View>
          <Icon name="chevDown" size={16} color={colors.muted} />
        </Tap>
        <Button size="s" kind={freeHot ? 'primary' : 'ghost'} label={parked ? tr('Reprendre') : tr('Jouer')} onPress={() => { sfx.turn(); onFreePlay(); }} />
      </Card>

      <ListRow big title={tr('Missions')} sub={done === status.length ? tr('Toutes faites') : tr`${done}/${status.length} faites aujourd’hui`}
        icon={<Icon name="target" size={26} color={colors.accent} />}
        right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}><Pips status={status} /><Icon name="chevRight" size={16} color={colors.muted} /></View>}
        onPress={() => missionsRef.current?.present()} />

      <FreePickSheet ref={pickRef} parked={!!parked} onPlay={onFreePlay} />
      <MissionsSheet ref={missionsRef} />
    </Screen>
  );
}

const tileStyle = (colors: ReturnType<typeof useColors>) => ({ flex: 1, minWidth: 0, padding: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, borderBottomWidth: lip.tile, borderBottomColor: colors.edge });
