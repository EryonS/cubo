// Communauté (Profil > Communauté): my card (Cubo, pseudo, friend code), add a friend by code, the friends list.
// Needs the cloud account; the first open signed in asks for a pseudo. Rules: core/social.ts, glue: game/social.ts.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import * as C from '../core/social';
import * as T from '../core/titles';
import { accountInfo, subscribeAccount } from '../game/account';
import { addByCode, flagged, loadMe, mineMood, mineTitle, myLook, refreshFriends, removeFriend, shareCode, useSocial, type Friend } from '../game/social';
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
import { SectionLabel } from '../ui/SectionLabel';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';

function useInputStyle() {
  const colors = useColors();
  return { flex: 1, minHeight: TOUCH + space.s, borderRadius: radius.tile, paddingHorizontal: space.l, backgroundColor: colors.panel2, color: colors.text, fontFamily: fonts.bold, fontSize: 18 } as const;
}

function MyCard({ onEdit, onTitle, onMood }: { onEdit: () => void; onTitle: () => void; onMood: () => void }) {
  const colors = useColors();
  const me = useSocial((s) => s.me);
  const title = useGame((s) => mineTitle(s.profile));
  const mood = useGame((s) => mineMood(s.profile));
  if (!me) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Avatar look={myLook(me)} size={64} mood={mood} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="title" numberOfLines={1}>{me.name}</Text>
          <Text variant="muted" numberOfLines={1}>{title ? T.titleName(title) : tr('Ton pseudo')}</Text>
          {!!mood && (
            <View style={{ alignSelf: 'flex-start', marginTop: space.xs, paddingHorizontal: space.s, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.panel2 }}>
              <Text variant="caption" numberOfLines={1}>{T.moodText(mood)}</Text>
            </View>
          )}
        </View>
        <Button kind="ghost" size="s" label={tr('Changer')} onPress={onEdit} />
      </View>
      <Group>
        <ListRow title={tr('Titre')} sub={title ? T.titleName(title) : tr('Aucun')} onPress={onTitle} right="chevron" />
        <ListRow title={tr('Humeur')} sub={mood ? T.moodText(mood) : tr('Aucune')} onPress={onMood} right="chevron" />
      </Group>
      <Card inset>
        <Text variant="label">{tr('Ton code ami')}</Text>
        <Text variant="big" accessibilityLabel={C.showCode(me.code).split('').join(' ')} style={{ letterSpacing: 2, color: colors.text }}>{C.showCode(me.code)}</Text>
        {/* The system share sheet has Copier. */}
        <Button kind="secondary" size="s" label={tr('Partager ou copier')} icon={<Icon name="share" size={16} color={colors.text} />} onPress={shareCode} />
      </Card>
    </Card>
  );
}

function AddFriend() {
  const colors = useColors();
  const input = useInputStyle();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const res = await addByCode(text);
    setBusy(false);
    if (res.error) setError(res.error); else { setText(''); setError(''); }
  };
  return (
    <Card>
      <Text variant="headline">{tr('Ajouter un ami')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        <TextInput
          value={text}
          onChangeText={(v) => { setText(v); setError(''); }}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          placeholder="K7Q-4MP"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          onSubmitEditing={() => { void submit(); }}
          accessibilityLabel={tr('Code ami')}
          style={input}
        />
        <Button size="s" label={tr('Ajouter')} onPress={() => { void submit(); }} disabled={busy || text.trim().length === 0} />
      </View>
      {error ? <Text variant="caption" style={{ color: colors.danger }}>{error}</Text> : <Text variant="caption">{tr('Le code de ton ami, il te voit aussi tout de suite.')}</Text>}
    </Card>
  );
}

function FriendRow({ f, onOpen }: { f: Friend; onOpen: () => void }) {
  const colors = useColors();
  const icon = useMemo(() => <Avatar look={f.look} size={44} mood={f.mood} />, [f.look, f.mood]);
  return <ListRow title={f.label} sub={T.titleName(f.title) || undefined} icon={icon} onPress={onOpen} label={tr`${f.label}, options`} right={<Icon name="chevRight" size={16} color={colors.muted} />} />;
}

export function CommunityScreen() {
  const info = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  const { me, status, friends, listing } = useSocial();
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
    <Screen title={tr('Communauté')} back>
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
          <MyCard onEdit={() => pseudo.current?.present()} onTitle={() => titles.current?.present()} onMood={() => moods.current?.present()} />
          <AddFriend />
          <SectionLabel>{friends.length ? tr`Amis · ${friends.length} / ${C.MAX_FRIENDS}` : tr('Amis')}</SectionLabel>
          {friends.length > 0 ? (
            <Group>{friends.map((f) => <FriendRow key={f.uid} f={f} onOpen={() => openPlayer({ uid: f.uid, name: f.name, label: f.label, look: f.look, title: f.title, mood: f.mood, onRemove: () => { void removeFriend(f); } })} />)}</Group>
          ) : (
            <Card>
              <Text variant="muted">{listing ? tr('Chargement…') : tr('Pas encore d’amis. Partage ton code ou ajoute celui d’un ami.')}</Text>
            </Card>
          )}
        </>
      )}
      <PseudoSheet ref={pseudo} />
      <TitleSheet ref={titles} />
      <MoodSheet ref={moods} />
      {playerSheet}
    </Screen>
  );
}
