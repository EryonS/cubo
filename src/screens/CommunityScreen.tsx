// Communauté (Profil > Communauté): my head (Cubo, pseudo, title, mood) and its rows, the friend codes (mine, add one), the friends list.
// Needs the cloud account; the first open signed in asks for a pseudo. Rules: core/social.ts, glue: game/social.ts.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { locale, tr } from '../core/i18n';
import { tierName, tierOf } from '../core/league';
import * as C from '../core/social';
import * as T from '../core/titles';
import { accountInfo, subscribeAccount } from '../game/account';
import { addByCode, flagged, loadMe, mineMood, mineTitle, myLook, refreshFriends, removeFriend, shareCode, useSocial, type Friend } from '../game/social';
import type { RootParams } from '../navigation/types';
import { available } from '../platform/cloud';
import { useGame } from '../state/store';
import { fonts } from '../theme/fonts';
import { radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { SignInRows } from '../ui/AccountBlock';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Group } from '../ui/Group';
import { ListRow } from '../ui/ListRow';
import { usePlayerSheet } from '../ui/PlayerSheet';
import { PseudoSheet } from '../ui/PseudoSheet';
import { Screen } from '../ui/Screen';
import { MoodSheet, TitleSheet } from '../ui/StatusSheets';
import { Section } from '../ui/SectionLabel';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';
import { LeagueBadge } from '../ui/LeagueBadge';
import { Tap } from '../ui/Tap';

function useInputStyle() {
  const colors = useColors();
  return { flex: 1, minHeight: TOUCH + space.s, borderRadius: radius.tile, paddingHorizontal: space.l, backgroundColor: colors.panel2, color: colors.text, fontFamily: fonts.bold, fontSize: 18 } as const;
}

// The head on the screen background, no card: Cubo, pseudo, title, mood.
function MyHead() {
  const colors = useColors();
  const me = useSocial((s) => s.me);
  const title = useGame((s) => mineTitle(s.profile));
  const mood = useGame((s) => mineMood(s.profile));
  const tier = useGame((s) => tierOf(s.profile));
  if (!me) return null;
  return (
    <View style={{ alignItems: 'center', gap: space.xxs, paddingVertical: space.s }}>
      <View>
        <Avatar look={myLook(me)} size={88} mood={mood} />
        <View style={{ position: 'absolute', right: -space.s, bottom: 0 }} accessible accessibilityLabel={tr`Ligue ${tierName(tier)}`}>
          <LeagueBadge tier={tier} size={32} />
        </View>
      </View>
      <Text variant="title" numberOfLines={1} style={{ marginTop: space.s }}>{me.name}</Text>
      {!!title && <Text variant="muted" numberOfLines={1}>{T.titleName(title)}</Text>}
      {!!mood && (
        <View style={{ marginTop: space.xs, paddingHorizontal: space.s, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.panel2 }}>
          <Text variant="caption" numberOfLines={1}>{T.moodText(mood)}</Text>
        </View>
      )}
    </View>
  );
}

function MyRows({ onEdit, onTitle, onMood }: { onEdit: () => void; onTitle: () => void; onMood: () => void }) {
  const me = useSocial((s) => s.me);
  const title = useGame((s) => mineTitle(s.profile));
  const mood = useGame((s) => mineMood(s.profile));
  if (!me) return null;
  return (
    <Group>
      <ListRow title={tr('Pseudo')} sub={me.name} onPress={onEdit} right="chevron" />
      <ListRow title={tr('Titre')} sub={title ? T.titleName(title) : tr('Aucun')} onPress={onTitle} right="chevron" />
      <ListRow title={tr('Humeur')} sub={mood ? T.moodText(mood) : tr('Aucune')} onPress={onMood} right="chevron" />
    </Group>
  );
}

// What the field shows while typing or pasting: capitals, code letters only, the dash after three.
function typedCode(v: string) {
  const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, C.CODE_LEN);
  return raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw;
}

// One card for both codes: mine to share on top, a friend's to add below a hairline.
function Codes() {
  const colors = useColors();
  const input = useInputStyle();
  const me = useSocial((s) => s.me);
  const full = useSocial((s) => s.friends.length >= C.MAX_FRIENDS);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me) return null;
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const res = await addByCode(text);
    setBusy(false);
    if (res.error) setError(res.error); else { setText(''); setError(''); }
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Tap onPress={shareCode} label={tr`Ton code ami, ${C.showCode(me.code).split('').join(' ')}, partager`} style={{ flex: 1, minWidth: 0 }}>
          <Text variant="label">{tr('Ton code ami')}</Text>
          <Text variant="big" style={{ letterSpacing: 2, color: colors.text }}>{C.showCode(me.code)}</Text>
        </Tap>
        {/* The system share sheet has Copier. */}
        <Button kind="ghost" size="s" label={tr('Partager')} icon={<Icon name="share" size={16} color={colors.text} />} onPress={shareCode} />
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.hairline }} />
      <Text variant="label">{tr('Ajouter un ami')}</Text>
      {full ? <Text variant="muted">{tr`Tu as déjà ${C.MAX_FRIENDS} amis.`}</Text> : (
        <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <TextInput
            value={text}
            onChangeText={(v) => { setText(typedCode(v)); setError(''); }}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="K7Q-4MP"
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            onSubmitEditing={() => { void submit(); }}
            accessibilityLabel={tr('Code ami')}
            style={input}
          />
          <Button size="s" label={tr('Ajouter')} onPress={() => { void submit(); }} disabled={busy || !C.parseCode(text)} />
        </View>
        {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : <Text variant="caption">{tr('Le code de ton ami, il te voit aussi tout de suite.')}</Text>}
        </>
      )}
    </Card>
  );
}

// A friend: Cubo, pseudo, title (else mood), and their Classic record on the right.
function FriendRow({ f, onOpen }: { f: Friend; onOpen: () => void }) {
  const colors = useColors();
  const icon = useMemo(() => <Avatar look={f.look} size={44} mood={f.mood} />, [f.look, f.mood]);
  const best = f.bestClassic.toLocaleString(locale());
  const right = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
      {f.bestClassic > 0 && <Text variant="headline" style={{ color: colors.muted }}>{best}</Text>}
      <Icon name="chevRight" size={16} color={colors.muted} />
    </View>
  );
  return <ListRow title={f.label} sub={T.titleName(f.title) || T.moodText(f.mood) || undefined} icon={icon} onPress={onOpen}
    label={f.bestClassic > 0 ? tr`${f.label}, record ${best}, options` : tr`${f.label}, options`} right={right} />;
}

export function CommunityScreen() {
  const info = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  const colors = useColors();
  const nav = useNavigation<NavigationProp<RootParams>>();
  const { me, status, friends, listing } = useSocial();
  const ranked = useMemo(() => [...friends].sort((a, b) => b.bestClassic - a.bestClassic), [friends]);
  const pseudo = useRef<BottomSheetModal>(null);
  const titles = useRef<BottomSheetModal>(null);
  const moods = useRef<BottomSheetModal>(null);
  const [openPlayer, playerSheet] = usePlayerSheet();
  const asked = useRef(false);
  const uid = info?.uid;

  useEffect(() => {
    if (!uid) return;
    void loadMe().then(() => refreshFriends());
  }, [uid]);
  // First open signed in without a pseudo, or a pseudo the owner hid: the sheet comes by itself, once.
  const mustRename = flagged(me);
  useEffect(() => {
    if (uid && status === 'ready' && (!me || mustRename) && !asked.current) { asked.current = true; pseudo.current?.present(); }
  }, [uid, status, me, mustRename]);

  if (!available()) return <Screen title={tr('Communauté')} back><Text variant="muted">{tr('Connexion impossible, réessaie plus tard.')}</Text></Screen>;
  if (!info) {
    return (
      <Screen title={tr('Communauté')} back>
        <SignInRows hint={tr('Connecte-toi pour avoir un pseudo et des amis.')} />
      </Screen>
    );
  }
  return (
    <Screen title={tr('Communauté')} back refreshing={listing && friends.length > 0} onRefresh={me ? () => { void refreshFriends(); } : undefined}>
      {!me && status === 'loading' && <Text variant="muted">{tr('Chargement…')}</Text>}
      {!me && status === 'error' && (
        <Card>
          <Text variant="muted">{tr('Connexion impossible, réessaie plus tard.')}</Text>
          <Button kind="secondary" label={tr('Réessayer')} onPress={() => { void loadMe(); }} />
        </Card>
      )}
      {!me && status === 'ready' && (
        <Card>
          <Text variant="headline">{tr('Choisis ton pseudo')}</Text>
          <Text variant="muted">{tr('Il te faut un pseudo pour avoir un code ami et ajouter des amis.')}</Text>
          <Button label={tr('Choisir mon pseudo')} onPress={() => pseudo.current?.present()} />
        </Card>
      )}
      {me && (
        <>
          {mustRename && (
            <Card>
              <Text variant="headline">{tr('Ton pseudo a été signalé, choisis-en un autre.')}</Text>
              <Button label={tr('Choisir un autre pseudo')} onPress={() => pseudo.current?.present()} />
            </Card>
          )}
          <MyHead />
          <MyRows onEdit={() => pseudo.current?.present()} onTitle={() => titles.current?.present()} onMood={() => moods.current?.present()} />
          <Section title={tr('Code ami')}>
            <Codes />
          </Section>
          <Section title={friends.length ? tr`Amis · ${friends.length} / ${C.MAX_FRIENDS}` : tr('Amis')}
            right={friends.length > 0 ? (
              <Tap onPress={() => nav.navigate('Ranking', { scope: 'friends' })} label={tr('Voir le classement')} hitSlop={12} style={{ marginRight: space.xs }}>
                <Text variant="label" style={{ color: colors.accent }}>{tr('Classement')}</Text>
              </Tap>
            ) : undefined}>
            {friends.length > 0 ? (
              <Group>{ranked.map((f) => <FriendRow key={f.uid} f={f} onOpen={() => openPlayer({ uid: f.uid, name: f.name, label: f.label, look: f.look, title: f.title, mood: f.mood, onRemove: () => { void removeFriend(f); } })} />)}</Group>
            ) : (
              <Card>
                <Text variant="muted">{listing ? tr('Chargement…') : tr('Pas encore d’amis. Partage ton code ou ajoute celui d’un ami.')}</Text>
                {!listing && <Button label={tr('Partager mon code')} icon={<Icon name="share" size={18} color={colors.onAccent} />} onPress={shareCode} />}
              </Card>
            )}
          </Section>
        </>
      )}
      <PseudoSheet ref={pseudo} />
      <TitleSheet ref={titles} />
      <MoodSheet ref={moods} />
      {playerSheet}
    </Screen>
  );
}
