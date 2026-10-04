/*
 * Cubo Blocks — translations. Pure. French is the source language: the code keeps its
 * French text, wrapped in tr('…') or tr`… ${x} …`, and that text is the key into the active
 * dictionary. Without a dictionary (French, or node tests) tr returns the text unchanged.
 *
 * Template keys write each ${…} as {}: tr`Efface ${n} lignes` looks up 'Efface {} lignes'.
 * A dictionary value is a string ({} filled in order, {0} {1}… by index) or a function of the
 * values, for plurals or word order the string form cannot express.
 *
 * Core tables call tr() as their module loads: the language is set (i18n/lang.ts) before any
 * other core module is imported, and a language change reloads the app.
 */

export type Lang = 'fr' | 'en';
export type Entry = string | ((...args: any[]) => string); // eslint-disable-line @typescript-eslint/no-explicit-any
export type Dict = Record<string, Entry>;

export const LANGS: Lang[] = ['fr', 'en'];
const LOCALES: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US' };
const dicts: Partial<Record<Lang, Dict>> = {};
let current: Lang = 'fr';
let active: Dict | null = null;

export function fill(value: Entry, args: unknown[]): string {
  if (typeof value === 'function') return value(...args);
  let i = 0;
  return value.replace(/\{(\d*)\}/g, (_, n: string) => String(args[n === '' ? i++ : Number(n)]));
}

// tr('text') or tr`text ${x}`.
export function tr(first: string | TemplateStringsArray, ...args: unknown[]): string {
  if (typeof first !== 'string') {
    const key = first.join('{}');
    const value = active && active[key];
    if (value != null) return fill(value, args);
    let out = first[0];
    for (let i = 0; i < args.length; i++) out += String(args[i]) + first[i + 1];
    return out;
  }
  const value = active && active[first];
  return value != null ? fill(value, []) : first;
}

// Picks a supported language from a list like ['en-GB', 'fr'...].
export function detect(list: readonly string[] | null | undefined): Lang {
  for (const tag of list || []) {
    const code = String(tag).toLowerCase().split('-')[0] as Lang;
    if (LANGS.includes(code)) return code;
  }
  return 'en';
}

export function add(code: Lang, entries: Dict): void {
  dicts[code] = Object.assign(dicts[code] || {}, entries);
}
export const dict = (code: Lang): Dict | null => dicts[code] || null;
export function setLang(code: string): void {
  current = LANGS.includes(code as Lang) ? (code as Lang) : 'fr';
  active = current === 'fr' ? null : dicts[current] || null;
}
export const lang = (): Lang => current;
// Plural rule: French counts 0 and 1 as singular, English only 1.
export const many = (n: number): boolean => (current === 'fr' ? n > 1 : n !== 1);
export const locale = (): string => LOCALES[current];
