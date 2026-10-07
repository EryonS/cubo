// Test mode (Paramètres > Développeur): a second profile on its own store (platform/kv.ts), every
// world, level and puzzle open (profile.dev), TEST_COINS to spend, never synced. The real profile
// waits untouched in the main store; leaving test mode brings it back.
import { DevSettings } from 'react-native';
import { reloadAppAsync } from 'expo';
import { tr } from '../core/i18n';
import { clearTestStore, setTestMode, testMode } from '../platform/kv';
import { TEST_COINS, useGame } from '../state/store';
import { ask } from '../ui/dialog';
import { toast } from '../ui/Toast';

const reload = () => {
  if (__DEV__) DevSettings.reload();
  else reloadAppAsync().catch(() => {});
};

export async function switchTestMode() {
  const on = !testMode;
  const sure = await ask(on
    ? { title: tr('Passer en mode test ?'), text: tr('L’app redémarre sur un profil de test séparé : tout est ouvert, sans synchro. Ta vraie progression ne bouge pas.'), ok: tr('Activer') }
    : { title: tr('Quitter le mode test ?'), text: tr('L’app redémarre sur ta vraie progression. Le profil de test est gardé pour la prochaine fois.'), ok: tr('Quitter') });
  if (!sure) return;
  setTestMode(on);
  reload();
}

export function addTestCoins() {
  const { profile, setProfile } = useGame.getState();
  setProfile({ ...profile, coins: profile.coins + TEST_COINS });
  toast('+' + tr`${TEST_COINS} pièces`);
}

export async function resetTestProfile() {
  const sure = await ask({ title: tr('Réinitialiser le profil de test ?'), text: tr('Il repart de zéro, tout ouvert. Ta vraie progression ne bouge pas.'), ok: tr('Réinitialiser'), danger: true });
  if (!sure) return;
  clearTestStore();
  reload();
}
