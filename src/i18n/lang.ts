// Cubo Blocks — Picks the language: the player's choice (Paramètres > Langue), else the device's.
// Runs before any core module is imported (index.ts): core tables call tr() as they load, so a
// change saves the choice and reloads the app.
import { DevSettings } from 'react-native';
import { reloadAppAsync } from 'expo';
import { getLocales } from 'expo-localization';
import { detect, setLang } from '../core/i18n';
import { bootKv } from '../platform/kv';
import './en';

export type LangPref = 'auto' | 'fr' | 'en';
const KEY = 'cuboblocks.lang';

export const langPref = (): LangPref => {
  const p = bootKv.get(KEY);
  return p === 'fr' || p === 'en' ? p : 'auto';
};
export const deviceLang = () => detect(getLocales().map((l) => l.languageTag));

export function bootLang(): void {
  const pref = langPref();
  setLang(pref === 'auto' ? deviceLang() : pref);
}

export function setLangPref(pref: LangPref): void {
  if (pref === langPref()) return;
  bootKv.set(KEY, pref);
  if (__DEV__) DevSettings.reload();
  else reloadAppAsync().catch(() => {});
}
