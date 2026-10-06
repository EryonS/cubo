// Level sheet (legacy openStage): goal, budget, best stars, then Jouer / paid skip / starting Bombe.
import { forwardRef, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { LV, M, WD } from '../../core';
import { tr } from '../../core/i18n';
import { sfx } from '../../audio/engine';
import { startLevel } from '../../game/run';
import { levelName } from '../../state/progress';
import { guardFree, inProgress, isFree } from '../../game/modes';
import { useGame } from '../../state/store';
import { radius, space } from '../../theme/tokens';
import { useColors } from '../../theme/useColors';
import { Button } from '../../ui/Button';
import { ask } from '../../ui/dialog';
import { KindIcon } from '../../ui/KindIcon';
import { Sheet, SheetHeader } from '../../ui/Sheet';
import { StarRow } from '../../ui/Stars';
import { Text } from '../../ui/Text';
import { Coin } from '../../ui/Wallet';

function Opt({ label, price, on, disabled, onPress }: { label: string; price: React.ReactNode; on?: boolean; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on, disabled }} disabled={disabled} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: colors.panel2, opacity: disabled ? 0.45 : 1, borderWidth: 2.5, borderColor: on ? colors.accent : 'transparent' }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>{price}</View>
    </Pressable>
  );
}

const Price = ({ children }: { children: React.ReactNode }) => <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{children}</Text>;

function Content({ w, n, onClose, onPlay }: { w: string; n: number; onClose: () => void; onPlay: (bomb: boolean) => void }) {
  const colors = useColors();
  const profile = useGame((s) => s.profile);
  const [bomb, setBomb] = useState(false);
  useEffect(() => setBomb(false), [w, n]);
  const stage = LV.level(w, n);
  if (!stage) return null;
  const best = M.levelStars(profile, w, n);
  const rules = WD.WORLDS[w];
  const free = M.freeBombs(profile);
  const bombOff = !free && profile.coins < M.START_BONUS_COST;
  const budget = stage.clock ? tr`${Math.round(stage.clock / 1000)} secondes (les lignes rajoutent du temps)` : tr`${stage.maxMoves} coups`;
  // Stars: 1 for the win, 2 with 15 % of the budget left, 3 with 30 %.
  const keep = (k: number) => (stage.clock ? `${Math.ceil((stage.clock / 1000) * k)} s` : tr`${Math.ceil(stage.maxMoves * k)} coups`);
  const starRule = tr`1 étoile en réussissant, 2 s'il te reste ${keep(0.15)}, 3 s'il t'en reste ${keep(0.3)}.`;
  const sub = rules.name + (n === M.TRIAL_LEVEL || n === M.LEVELS_PER_WORLD ? tr(' · niveau ') + n : '');
  const note = (s: string) => <Text variant="muted" style={{ fontSize: 13, lineHeight: 18, textAlign: 'center', marginTop: 8, maxWidth: 290 }}>{s}</Text>;
  const canSkip = M.canSkip(profile, w, n);
  const skip = async () => {
    if (!(await ask({ title: tr('Passer le niveau ?'), text: tr`Il coûte ${M.SKIP_COST} pièces et ne rapporte aucune étoile.`, ok: tr('Passer') }))) return;
    const { profile: p, setProfile } = useGame.getState();
    const next = M.skipLevel(p, w, n);
    if (!next) { sfx.nope(); return; }
    setProfile(next);
    sfx.buy();
    onClose();
  };
  return (
    <View style={{ alignItems: 'stretch' }}>
      <SheetHeader title={levelName(n)} onClose={onClose} closeLabel={tr('Retour au monde')} />
      <View style={{ alignItems: 'center', marginTop: 4 }}>
        <Text variant="muted">{sub}</Text>
        <Text style={{ fontFamily: 'Baloo2-ExtraBold', fontSize: 18, marginTop: 6, marginBottom: 2, textAlign: 'center' }}>{LV.goalText(stage.goal)}</Text>
        {typeof stage.boss === 'object' && note(tr`Il a ${stage.goal.target} PV : chaque ligne qui le traverse lui en retire 2. Tous les ${stage.boss.every} coups, il riposte en posant ${stage.boss.count > 1 ? stage.boss.count + ' ' + LV.KIND_NAMES[stage.boss.kind] : tr('un obstacle')}.`)}
        {n === M.TRIAL_LEVEL && note(tr('Un niveau plus dur au milieu du monde. Il rapporte plus de pièces.'))}
        {stage.twist && rules.twist && (
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 10, maxWidth: 300, padding: 9, paddingHorizontal: 11, borderRadius: radius.card - 6, backgroundColor: colors.panel2 }}>
            <KindIcon kind={stage.twist.kind} size={28} />
            <Text style={{ flex: 1, fontSize: 13, lineHeight: 18 }}><Text style={{ fontSize: 13, color: colors.accent, fontFamily: 'Baloo2-ExtraBold' }}>{rules.twist.name} </Text>{rules.twist.text}</Text>
          </View>
        )}
        <Text variant="muted" style={{ marginTop: 10 }}>{budget}</Text>
        <View style={{ marginTop: 14, marginBottom: 6 }}><StarRow n={best || 0} size={34} gap={6} /></View>
        {note(starRule)}
      </View>
      <Opt label={tr('Partir avec une Bombe')} on={bomb && !bombOff} disabled={bombOff} onPress={() => { sfx.turn(); setBomb(!bomb); }}
        price={free ? <Price>{tr`Offerte (×${free})`}</Price> : <><Price>{M.START_BONUS_COST}</Price><Coin size={16} /></>} />
      {canSkip && (
        <Opt label={tr('Passer le niveau (sans étoile)')} disabled={profile.coins < M.SKIP_COST} onPress={skip}
          price={<><Price>{M.SKIP_COST}</Price><Coin size={16} /></>} />
      )}
      <Button label={tr('Jouer')} onPress={() => onPlay(bomb && !bombOff)} style={{ marginTop: space.l }} />
    </View>
  );
}

export const LevelSheet = forwardRef<BottomSheetModal, { pick: { w: string; n: number } | null; onGame: () => void }>(function LevelSheet({ pick, onGame }, ref) {
  const close = () => (ref as React.RefObject<BottomSheetModal>).current?.dismiss();
  return (
    <Sheet ref={ref}>
      {pick && <Content w={pick.w} n={pick.n} onClose={close} onPlay={async (bomb) => {
        // Another level in progress is dropped (a free run is parked, not dropped), as on Défis.
        const { saved } = useGame.getState();
        if (inProgress(saved.state) && !isFree(saved.state) && !(await ask({ title: tr('Abandonner ?'), text: guardFree(saved.state, saved.parked).text, ok: tr('Abandonner'), danger: true }))) return;
        if (!startLevel(pick.w, pick.n, { bomb })) return;
        close();
        onGame();
      }} />}
    </Sheet>
  );
});
