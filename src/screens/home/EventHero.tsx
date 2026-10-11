// The season event on the home screen: a card wearing the event's own world (its menu colors, its background
// painted on the banner, Cubo in the event's hat), with the days left, the progress through the 10 levels, the three
// rewards and the next level to play. Tapping the card opens the event; the button goes straight to the level.
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { M } from '../../core';
import { tr } from '../../core/i18n';
import { eventLevelName, hatName, nextTrophyText, trophyIn } from '../../game/events';
import { eventNext } from '../../game/home';
import { cuboLookFor } from '../../mascot/looks';
import { boardTheme } from '../../render/board-themes';
import { paintBackground } from '../../render/draw';
import { drawPreview } from '../../render/preview';
import { useGame } from '../../state/store';
import { fonts } from '../../theme/fonts';
import { radius, space } from '../../theme/tokens';
import { raised } from '../../theme/elevation';
import { PlayedTheme, useColors } from '../../theme/useColors';
import { Button } from '../../ui/Button';
import { CuboPose } from '../../ui/CuboPose';
import { DrawCanvas } from '../../ui/DrawCanvas';
import { Icon, Star } from '../../ui/Icon';
import { ProgressBar } from '../../ui/ProgressBar';
import { Trophy } from '../../ui/StickerArt';
import { Tap } from '../../ui/Tap';
import { Text } from '../../ui/Text';

const BANNER_H = 112;

type Props = { id: string; day: string; playing: number; onOpen: () => void; onPlay: (n: number) => void; onResume: () => void };

export function EventHero(props: Props) {
  const ev = M.eventById(props.id);
  if (!ev) return null;
  // The whole card wears the event's world, whatever theme is equipped.
  return <PlayedTheme value={ev.theme}><Card {...props} /></PlayedTheme>;
}

// "Encore 12 jours", "Dernier jour !".
export function eventWhen(id: string, day: string) {
  if (!M.eventActive(day, id)) return tr('Terminé');
  const left = M.dayDiff(day, M.eventEnd(id, day));
  return left === 0 ? tr('Dernier jour !') : left === 1 ? tr('Encore 1 jour') : tr`Encore ${left} jours`;
}

// Text drawn over the painted background keeps a soft halo of the screen color.
export const halo = (colors: ReturnType<typeof useColors>) => ({ textShadowColor: colors.bg, textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } });

// A small label pill on the banner: accent ("ÉVÉNEMENT") or a panel one, with a clock for the time left.
export function Pill({ accent, clock, children }: { accent?: boolean; clock?: boolean; children: string }) {
  const colors = useColors();
  const ink = accent ? colors.onAccent : colors.text;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs, paddingHorizontal: space.s, paddingVertical: space.xxs, borderRadius: radius.pill, backgroundColor: accent ? colors.accent : colors.panel }}>
      {clock && <Icon name="clock" size={12} color={ink} />}
      <Text variant="label" style={{ color: ink }}>{children}</Text>
    </View>
  );
}

// Running text on the banner (the halo keeps it readable over the painting).
export function BannerText({ children }: { children: string }) {
  const colors = useColors();
  return <Text numberOfLines={2} style={[{ color: colors.text }, halo(colors)]}>{children}</Text>;
}

// The event's world painted edge to edge, Cubo in the event's hat on the right, the children on the left.
// Drawn in the event's colors: render it inside <PlayedTheme value={ev.theme}>.
export function EventBanner({ id, children, rounded }: { id: string; children: React.ReactNode; rounded?: boolean }) {
  const blocks = useGame((s) => s.profile.equipped.blocks);
  const ev = M.eventById(id)!;
  const [w, setW] = useState(0);
  const th = useMemo(() => boardTheme(ev.theme, blocks), [ev.theme, blocks]);
  const look = useMemo(() => cuboLookFor(ev.theme, ev.hat), [ev.theme, ev.hat]);
  return (
    <View style={{ height: BANNER_H, borderRadius: rounded ? radius.card : 0, overflow: 'hidden' }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w > 0 && <DrawCanvas width={w} height={BANNER_H} radius={0} deps={[ev.theme, blocks]} draw={(g, cw, ch) => paintBackground(g, th, cw, ch)} />}
      <View style={{ position: 'absolute', left: space.l, right: 100, top: space.m, bottom: space.m, justifyContent: 'center', gap: space.xs }}>{children}</View>
      <View style={{ position: 'absolute', right: space.s, bottom: -6 }} pointerEvents="none">
        <CuboPose width={88} lw={152} lh={160} s={100} foot={9} look={look} mood="happy" />
      </View>
    </View>
  );
}

function Card({ id, day, playing, onOpen, onPlay, onResume }: Props) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const blocks = profile.equipped.blocks;
  const ev = M.eventById(id)!;
  const th = useMemo(() => boardTheme(ev.theme, blocks), [ev.theme, blocks]);
  const look = useMemo(() => cuboLookFor(ev.theme, ev.hat), [ev.theme, ev.hat]);

  const active = M.eventActive(day, id);
  const cleared = M.eventCleared(profile, id, day);
  const stars = M.eventTotalStars(profile, id, day);
  const next = eventNext(profile, id, day);
  const trophy = M.seasonTrophy(profile, id, M.eventYear(day));
  const hasTheme = profile.owned.boards.includes(ev.theme);
  const hasHat = (profile.owned.cubo || []).includes(ev.hat);
  const when = eventWhen(id, day);
  const action = playing ? tr`Continuer : ${eventLevelName(playing)}`
    : next === ev.levels ? tr('Affronter le boss') : next ? tr`Jouer le niveau ${next}` : null;

  return (
    <Tap onPress={onOpen} label={`${tr('Événement')} ${ev.name}, ${when}, ${cleared} / ${ev.levels}`}
      style={{ borderRadius: radius.card, backgroundColor: colors.panel, ...raised(colors) }}>
      <View style={{ borderRadius: radius.card, overflow: 'hidden' }}>
        <EventBanner id={id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
            <Pill accent>{tr('Événement')}</Pill>
            <Pill clock>{when}</Pill>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[{ fontFamily: fonts.display, fontSize: 28, lineHeight: 36, color: colors.text }, halo(colors)]}>{ev.name}</Text>
        </EventBanner>

        <View style={{ padding: space.l, gap: space.m }}>
          <Text variant="muted">{tr`${ev.levels} niveaux ${ev.blurb}`}</Text>
          <View style={{ gap: space.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="caption" style={{ color: colors.text }}>{tr`${cleared} / ${ev.levels} niveaux`}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
                <Star size={13} />
                <Text variant="caption" style={{ color: colors.text }}>{stars} / {ev.levels * 3}</Text>
              </View>
            </View>
            <ProgressBar value={cleared / ev.levels} />
          </View>
          <Text variant="label">{tr('À gagner')}</Text>
          <View style={{ flexDirection: 'row', gap: space.s, marginTop: -space.s }}>
            <Reward got={hasTheme} label={tr`Thème ${ev.name}`} sub={tr`Au niveau ${ev.mid}`}>
              <DrawCanvas width={44} radius={8} deps={[ev.theme, blocks]} draw={(g, cw, ch) => drawPreview(g, th, cw, ch)} />
            </Reward>
            <Reward got={hasHat} label={hatName(ev.hat)} sub={tr`Au niveau ${ev.levels}`}>
              <CuboPose width={34} lw={152} lh={160} s={100} foot={9} look={look} mood="happy" />
            </Reward>
            <Reward got={!!trophy} label={trophy ? `${tr('Trophée')} ${trophyIn(trophy)}` : tr`Trophée ${M.eventYear(day)}`}
              sub={nextTrophyText(stars, ev.levels * 3) ?? undefined}>
              <Trophy kind={trophy} size={30} />
            </Reward>
          </View>
          {action && active && (
            <Button label={action} onPress={() => { if (playing) onResume(); else onPlay(next!); }} />
          )}
        </View>
      </View>
    </Tap>
  );
}

// sub: where it is won (the level, the next trophy's stars).
function Reward({ got, label, sub, children }: { got: boolean; label: string; sub?: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`${label}${sub ? `, ${sub}` : ''}${got ? `, ${tr('Gagné')}` : ''}`}
      style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: space.xxs, paddingVertical: space.s, paddingHorizontal: space.xs, borderRadius: radius.tile, backgroundColor: colors.panel2 }}>
      <View style={{ height: 40, justifyContent: 'center' }}>{children}</View>
      <Text variant="caption" numberOfLines={2} style={{ color: colors.text, textAlign: 'center' }}>{label}</Text>
      {sub ? <Text variant="caption" numberOfLines={2} style={{ fontSize: 11, lineHeight: 14, textAlign: 'center', marginTop: 'auto' }}>{sub}</Text> : null}
      {got && (
        <View style={{ position: 'absolute', top: space.xs, right: space.xs, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.good, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={12} color="#ffffff" />
        </View>
      )}
    </View>
  );
}
