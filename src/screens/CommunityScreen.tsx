// Communauté (Profil > Communauté): my card (Cubo, pseudo, friend code), add a friend by code, the friends list.
// Needs the cloud account; the first open signed in asks for a pseudo. Rules: core/social.ts, glue: game/social.ts.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { tr } from '../core/i18n';
import * as C from '../core/social';
import { accountInfo, subscribeAccount } from '../game/account';
import { addByCode, blockFriend, loadMe, myLook, refreshFriends, removeFriend, shareCode, useSocial, type Friend } from '../game/social';
import { available } from '../platform/cloud';
import { fonts } from '../theme/fonts';
import { radius, space, TOUCH } from '../theme/tokens';
import { useColors } from '../theme/useColors';
import { SignInRows } from '../ui/AccountBlock';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Group } from '../ui/Group';
import { ListRow } from '../ui/ListRow';
import { PseudoSheet } from '../ui/PseudoSheet';
import { Screen } from '../ui/Screen';
import { SectionLabel } from '../ui/SectionLabel';
import { Sheet, SheetHeader } from '../ui/Sheet';
import { Text } from '../ui/Text';
import { Icon } from '../ui/Icon';

function useInputStyle() {
  const colors = useColors();
  return { flex: 1, minHeight: TOUCH + space.s, borderRadius: radius.tile, paddingHorizontal: space.l, backgroundColor: colors.panel2, color: colors.text, fontFamily: fonts.bold, fontSize: 18 } as const;
}

function MyCard({ onEdit }: { onEdit: () => void }) {
  const colors = useColors();
  const me = useSocial((s) => s.me);
  if (!me) return null;
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m }}>
        <Avatar look={myLook(me)} size={64} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="title" numberOfLines={1}>{me.name}</Text>
          <Text variant="muted">{tr('Ton pseudo')}</Text>
        </View>
        <Button kind="ghost" size="s" label={tr('Changer')} onPress={onEdit} />
      </View>
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
  const icon = useMemo(() => <Avatar look={f.look} size={44} />, [f.look]);
  return <ListRow title={f.label} icon={icon} onPress={onOpen} label={tr`${f.label}, options`} right={<Icon name="chevRight" size={16} color={colors.muted} />} />;
}

export function CommunityScreen() {
  const info = useSyncExternalStore(subscribeAccount, accountInfo, accountInfo);
  const { me, status, friends, listing } = useSocial();
  const pseudo = useRef<BottomSheetModal>(null);
  const options = useRef<BottomSheetModal>(null);
  const [picked, setPicked] = useState<Friend | null>(null);
  const asked = useRef(false);
  const uid = info?.uid;

  useEffect(() => {
    if (!uid) return;
    void loadMe().then(() => refreshFriends());
  }, [uid]);
  // First open signed in without a pseudo: the sheet comes by itself, once.
  useEffect(() => {
    if (uid && status === 'ready' && !me && !asked.current) { asked.current = true; pseudo.current?.present(); }
  }, [uid, status, me]);

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
          <MyCard onEdit={() => pseudo.current?.present()} />
          <AddFriend />
          <SectionLabel>{friends.length ? tr`Amis · ${friends.length} / ${C.MAX_FRIENDS}` : tr('Amis')}</SectionLabel>
          {friends.length > 0 ? (
            <Group>{friends.map((f) => <FriendRow key={f.uid} f={f} onOpen={() => { setPicked(f); options.current?.present(); }} />)}</Group>
          ) : (
            <Card>
              <Text variant="muted">{listing ? tr('Chargement…') : tr('Pas encore d’amis. Partage ton code ou ajoute celui d’un ami.')}</Text>
            </Card>
          )}
        </>
      )}
      <PseudoSheet ref={pseudo} />
      <Sheet ref={options} onClose={() => setPicked(null)}>
        <View style={{ gap: space.m }}>
          <SheetHeader title={picked?.label ?? ''} onClose={() => options.current?.dismiss()} />
          <Button kind="secondary" label={tr('Retirer de mes amis')} onPress={() => { const f = picked; options.current?.dismiss(); if (f) void removeFriend(f); }} />
          <Button kind="danger" label={tr('Bloquer')} onPress={() => { const f = picked; options.current?.dismiss(); if (f) void blockFriend(f); }} />
        </View>
      </Sheet>
    </Screen>
  );
}
