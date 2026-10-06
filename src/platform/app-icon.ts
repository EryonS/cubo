// Cubo Blocks — The home-screen icon (expo-alternate-app-icons): one per theme, chosen in Paramètres.
// The system keeps the choice. Builds without the native module (an older dev client) have no choice.
import { requireOptionalNativeModule } from 'expo';
import { APP_ICONS, appIconName } from '../render/app-icon';

interface Native { supportsAlternateIcons: boolean; getAppIconName(): string | null; setAlternateAppIcon(name: string | null): Promise<string | null> }
const native = requireOptionalNativeModule<Native>('ExpoAlternateAppIcons');

export const canChangeAppIcon = !!native?.supportsAlternateIcons;

// The theme id of the icon in use (Jouet for the app's own).
export function appIcon(): string {
  const name = native?.getAppIconName() ?? null;
  return Object.keys(APP_ICONS).find((id) => appIconName(id) === name) ?? 'toy';
}

// iOS shows its "You have changed the icon" alert right after. Resolves false when the system refused.
export async function setAppIcon(id: string): Promise<boolean> {
  if (!native) return false;
  try {
    await native.setAlternateAppIcon(appIconName(id));
    return true;
  } catch {
    return false;
  }
}
