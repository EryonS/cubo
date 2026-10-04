// Lists every text to translate: tr('…') / tr`…` in src/ (.ts and .tsx, i18n/ itself excluded).
// `npm run i18n` prints the keys missing from the English dictionary (src/i18n/en.ts).
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as I from '../src/core/i18n';
import '../src/i18n/en';

const SRC = path.join(__dirname, '..', 'src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : sourceFiles(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [p] : [];
  });
}

// { key: ['file:line', ...] } plus `dynamic`: tr() calls whose text is not a literal (cannot be checked).
export function allKeys(): { keys: Record<string, string[]>; dynamic: string[] } {
  const keys: Record<string, string[]> = {};
  const dynamic: string[] = [];
  const add = (k: string, where: string) => (keys[k] = keys[k] || []).push(where);
  for (const file of sourceFiles(SRC)) {
    const src = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const rel = path.relative(SRC, file);
    const at = (n: ts.Node) => `${rel}:${src.getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
    const visit = (n: ts.Node): void => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'tr') {
        const a = n.arguments[0];
        if (a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a))) add(a.text, at(n));
        else dynamic.push(at(n));
      } else if (ts.isTaggedTemplateExpression(n) && ts.isIdentifier(n.tag) && n.tag.text === 'tr') {
        const t = n.template;
        add(ts.isNoSubstitutionTemplateLiteral(t) ? t.text : [t.head.text, ...t.templateSpans.map((s) => s.literal.text)].join('{}'), at(n));
      }
      ts.forEachChild(n, visit);
    };
    visit(src);
  }
  for (const k of SAME) delete keys[k];
  return { keys, dynamic };
}

// Texts that read the same in every language: no translation needed.
export const SAME = new Set(['Auto', 'Français', 'English', 'Cubo', 'Cubo Blocks', 'OK', 'Menu', '?']);

export const loadDict = (): I.Dict => I.dict('en') || {};

if (require.main === module) {
  const { keys, dynamic } = allKeys();
  const en = loadDict();
  const missing = Object.keys(keys).filter((k) => !(k in en));
  const unused = Object.keys(en).filter((k) => !(k in keys));
  for (const k of missing) console.log('missing', JSON.stringify(k), keys[k][0]);
  for (const d of dynamic) console.log('dynamic', d);
  console.log(`${Object.keys(keys).length} keys, ${missing.length} missing, ${unused.length} not used yet`);
}
