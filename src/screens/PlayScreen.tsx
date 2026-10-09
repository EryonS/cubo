// Jouer tab (legacy #menu): Continuer, the Aventure card, the event rows, the free game row (mode and
// level, Jouer), Défi du jour and Puzzles tiles, Missions with their pips, and the wallet.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { M, WD } from '../core';
import { locale, tr } from '../core/i18n';
import { guardFree, inProgress, LEVEL_NAMES, MODE_NAMES, modeLabel } from '../game/modes';
import { tileSub } from '../game/daily';
import { eventRows } from '../game/events';
import { resumeOf } from '../game/home';
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
import { radius, space } from '../theme/tokens';
import { raised } from '../theme/elevation';
import { darkBg, useColors } from '../theme/useColors';
import { BoardPreview } from '../ui/BoardPreview';
import { Button } from '../ui/Button';
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
      <View style={{ flex: 1, minWidth: 0, paddingVertical: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low') }}>
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
  const pickRef = useRef<BottomSheetModal>(null);
  const missionsRef = useRef<BottomSheetModal>(null);

  // The run on the board is resumed from the Continuer hero (any kind); the Aventure card shows the next level.
  const run = useGame((s) => s.saved.state);
  const resume = useMemo(() => resumeOf(run), [run]);
  const playing = !!resume;
  const next = nextAdventure(profile);
  const stars = M.totalStars(profile);
  const maxStars = M.WORLD_ORDER.length * M.LEVELS_PER_WORLD * 3;
  const heroWorld = next ? next[0] : lastOpenWorld(profile);
  const preview = useMemo(() => boardTheme(heroWorld, profile.equipped.blocks), [heroWorld, profile.equipped.blocks]);
  const day = today();
  const events = eventRows(profile, run, day);
  const daily = M.dailyOf(profile, day);
  const streak = M.streakNow(profile, day);
  const dailySub = useGame((s) => tileSub(s.profile, s.saved.state, day));
  const puzzleGoing = useGame((s) => puzzleInProgress(s.saved.state));
  const puzzleSub = useGame((s) => puzzleTileSub(s.profile, s.saved.state));
  const status = missionStatus();
  const done = status.filter((m) => m.done).length;

  const play = () => nav.navigate('Game');
  // theme: the one picked on the Partie libre sheet (else the equipped one).
  const playFree = (theme?: string) => {
    const g = guardFree(useGame.getState().saved.state, useGame.getState().saved.parked);
    const go = () => { restartRun({ mode: prefs.mode, level: prefs.level, theme }); play(); };
    if (!g.needed) { go(); return; }
    ask({ title: tr('Abandonner ?'), text: g.text, ok: tr('Abandonner'), danger: true }).then((yes) => { if (yes) go(); });
  };
  const resumeFree = () => {
    const go = () => { resumeParked(); play(); };
    if (!inProgress(useGame.getState().saved.state)) { go(); return; }
    ask({ title: tr('Reprendre ?'), text: tr('Le niveau en cours s’arrête pour reprendre ta partie libre. Les pièces gagnées sont gardées.'), ok: tr('Reprendre') })
      .then((yes) => { if (yes) go(); });
  };

  const toMap = () => nav.navigate('Adventure', next ? { world: next[0] } : undefined);
  const heroInk = playing ? colors.text : colors.onAccent;
  const heroSub = playing ? colors.muted : colors.onAccent;

  return (
    <Screen title="Cubo Blocks" right={<Counter icon={<Coin size={20} />} value={fmt(profile.coins)} label={tr('Pièces : ouvrir la Boutique')} onPress={() => nav.navigate('Shop')} />}>
      <CuboSay />

      {resume && (
        <View style={{ gap: space.xs }}>
          <Button label={tr('Continuer')} sub={resume.kind === 'free' || resume.kind === 'puzzle' ? `${resume.title} · ${resume.sub}` : resume.title} onPress={() => { sfx.turn(); play(); }} />
          {resume.kind !== 'free' && resume.kind !== 'puzzle' && <Text variant="muted" numberOfLines={1} style={{ textAlign: 'center' }}>{resume.sub}</Text>}
        </View>
      )}

      <Tap onPress={toMap} label={next ? `${tr('Aventure')}, ${WD.WORLDS[next[0]].name}, ${levelName(next[1])}` : tr('Aventure : carte des mondes')}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, padding: space.m, paddingRight: space.l, borderRadius: radius.card, backgroundColor: playing ? colors.panel : colors.accent, ...(playing ? raised(colors) : { shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } }) }}>
        <View style={{ borderRadius: radius.tile, overflow: 'hidden', borderWidth: 3, borderColor: playing ? colors.panel2 : 'rgba(255,255,255,0.4)' }}>
          <BoardPreview th={preview} width={92} radius={13} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
          <Text variant="label" numberOfLines={1} style={{ color: heroSub, opacity: 0.9 }}>{next ? `${tr('Aventure')} · ${WD.WORLDS[next[0]].name}` : tr('Aventure')}</Text>
          <Text variant="title" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: heroInk }}>{next ? levelName(next[1]) : tr('Carte des mondes')}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <Star size={14} edge={playing || darkBg(colors.accent) ? undefined : heroInk} />
            <Text variant="caption" style={{ color: heroSub }}>{fmt(stars)} / {maxStars}</Text>
          </View>
        </View>
        <Icon name="chevRight" size={18} color={heroInk} />
      </Tap>

      {events.map((row) => (
        <ListRow big key={row.id} title={row.name} sub={row.sub} icon={<RowIcon><KindIcon kind={row.icon} size={32} /></RowIcon>} right="chevron"
          onPress={() => { if (row.playing) nav.navigate('Game'); else nav.navigate('Event', { id: row.id }); }} />
      ))}

      <ListRow big title={parked ? tr('Partie en cours') : tr('Partie libre')} right="chevron" onPress={() => pickRef.current?.present()}
        sub={parked ? `${modeLabel(parked)} · ${tr`${fmt(parked.score)} pts`}` : `${MODE_NAMES[prefs.mode]} · ${LEVEL_NAMES[prefs.level]}`}
        icon={<RowIcon><Icon name="play" size={26} color={colors.accent} /></RowIcon>} />

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

      <ListRow big title={tr('Missions')} sub={done === status.length ? tr('Toutes faites') : tr`${done}/${status.length} faites aujourd’hui`}
        icon={<RowIcon><Icon name="target" size={26} color={colors.accent} /></RowIcon>}
        right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}><Pips status={status} /><Icon name="chevRight" size={16} color={colors.muted} /></View>}
        onPress={() => missionsRef.current?.present()} />

      <FreePickSheet ref={pickRef} onPlay={playFree} onResume={parked ? resumeFree : undefined} />
      <MissionsSheet ref={missionsRef} />
    </Screen>
  );
}

// The home rows' icons share one column, so their titles line up whatever the icon's size.
const RowIcon = ({ children }: { children: ReactNode }) => <View style={{ width: 32, alignItems: 'center' }}>{children}</View>;

const tileStyle = (colors: ReturnType<typeof useColors>) => ({ flex: 1, minWidth: 0, padding: space.m, paddingHorizontal: space.l, borderRadius: radius.tile, backgroundColor: colors.panel, ...raised(colors, 'low') });
