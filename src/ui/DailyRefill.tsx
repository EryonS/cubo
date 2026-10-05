// Out of tries on today's level (not won): an ad gives the tries back once, coins buy one more
// (legacy refillHtml / bindRefill).
import { Pressable, View } from 'react-native';
import { M } from '../core';
import { tr } from '../core/i18n';
import { sfx } from '../audio/engine';
import { haptic } from '../platform/haptics';
import { showRewarded } from '../platform/ads';
import { today } from '../state/persist';
import { useGame } from '../state/store';
import { radius } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { Text } from './Text';
import { Coin } from './Wallet';

function Row({ label, disabled, onPress, children, plain }: { label: string; disabled?: boolean; onPress: () => void; children: React.ReactNode; plain?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 14, borderRadius: radius.card - 6, backgroundColor: plain ? colors.panel : colors.panel2, opacity: disabled ? 0.45 : 1 }}>
      <Text style={{ fontSize: 15, flex: 1 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>{children}</View>
    </Pressable>
  );
}

export function DailyRefill({ day, plain }: { day: string; plain?: boolean }) {
  const profile = useGame((s) => s.profile);
  const t = today();
  if (!M.canRefillDaily(profile, day, t)) return null;
  const cost = M.dailyTryCost(profile, day);
  const buy = () => {
    const { profile: p, setProfile } = useGame.getState();
    const next = M.buyDailyTry(p, day, t);
    if (!next) { sfx.nope(); haptic('nope'); return; }
    setProfile(next);
    sfx.buy();
  };
  const ad = async () => {
    const ok = await showRewarded();
    if (!ok) return; // no ad, or closed early: the ad layer says so when none could be shown
    const { profile: p, setProfile } = useGame.getState();
    const next = M.adDailyRefill(p, day, t);
    if (!next) return;
    setProfile(next);
    sfx.buy();
  };
  return (
    <View style={{ alignSelf: 'stretch' }}>
      {M.dailyAdReady(profile, day, t) && (
        <Row plain={plain} label={tr`Regarde une pub : ${M.DAILY_ATTEMPTS} essais de plus`} onPress={ad}>
          <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{tr('Pub')}</Text>
        </Row>
      )}
      <Row plain={plain} label={tr('Un essai de plus pour sauver ta série')} disabled={profile.coins < cost} onPress={buy}>
        <Text variant="title" style={{ fontSize: 17, lineHeight: 22 }}>{cost}</Text><Coin size={16} />
      </Row>
    </View>
  );
}
