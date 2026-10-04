// Lists every text to translate: tr('…') / tr`…` in www/src, and the static text of www/index.html.
// `node tools/i18n-keys.js` prints the keys missing from the English dictionary (www/src/i18n/en.js).
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const walk = require('acorn-walk');

const WWW = path.join(__dirname, '..', 'www');

function jsFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : jsFiles(p);
    return e.name.endsWith('.js') ? [p] : [];
  });
}

// { key: ['file:line', ...] } plus `dynamic`: tr() calls whose text is not a literal (cannot be checked).
function codeKeys() {
  const keys = {};
  const dynamic = [];
  const add = (k, where) => (keys[k] = keys[k] || []).push(where);
  for (const file of jsFiles(path.join(WWW, 'src'))) {
    const src = fs.readFileSync(file, 'utf8');
    const rel = path.relative(WWW, file);
    walk.simple(acorn.parse(src, { ecmaVersion: 'latest', locations: true }), {
      CallExpression(n) {
        if (n.callee.type !== 'Identifier' || n.callee.name !== 'tr') return;
        const a = n.arguments[0];
        if (a && a.type === 'Literal' && typeof a.value === 'string') add(a.value, `${rel}:${n.loc.start.line}`);
        else if (!(a && a.type === 'TemplateLiteral' && a.expressions.length === 0)) dynamic.push(`${rel}:${n.loc.start.line}`);
        else add(a.quasis[0].value.cooked, `${rel}:${n.loc.start.line}`);
      },
      TaggedTemplateExpression(n) {
        if (n.tag.type !== 'Identifier' || n.tag.name !== 'tr') return;
        add(n.quasi.quasis.map((q) => q.value.cooked).join('{}'), `${rel}:${n.loc.start.line}`);
      },
    });
  }
  return { keys, dynamic };
}

// Text nodes and label attributes of index.html (what i18n/setup.js translates at start-up).
function htmlKeys() {
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8')
    .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const body = html.slice(html.indexOf('<body'));
  const keys = {};
  for (const m of body.matchAll(/>([^<>]+)</g)) {
    const t = m[1].trim();
    if (/[A-Za-zÀ-ÿ]/.test(t)) keys[decode(t)] = ['index.html'];
  }
  for (const m of body.matchAll(/\s(?:aria-label|title|alt|placeholder)="([^"]+)"/g)) keys[decode(m[1])] = ['index.html'];
  return keys;
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

// Texts that read the same in every language: no translation needed.
const SAME = new Set(['Auto', 'Français', 'English', 'Cubo', 'Cubo Blocks', 'OK', 'Menu', '✕', '?']);

function allKeys() {
  const { keys, dynamic } = codeKeys();
  for (const [k, v] of Object.entries(htmlKeys())) keys[k] = (keys[k] || []).concat(v);
  for (const k of SAME) delete keys[k];
  return { keys, dynamic };
}

function loadDict(code) {
  const I = require(path.join(WWW, 'src/core/i18n.js'));
  global.self = { CuboBlocksI18n: I };
  require(path.join(WWW, 'src/i18n', code + '.js'));
  delete global.self;
  return I.dict(code) || {};
}

module.exports = { allKeys, loadDict, SAME };

if (require.main === module) {
  const { keys, dynamic } = allKeys();
  const en = loadDict('en');
  const missing = Object.keys(keys).filter((k) => !(k in en));
  const unused = Object.keys(en).filter((k) => !(k in keys));
  for (const k of missing) console.log('missing', JSON.stringify(k), keys[k][0]);
  for (const k of unused) console.log('unused ', JSON.stringify(k));
  for (const d of dynamic) console.log('dynamic', d);
  console.log(`${Object.keys(keys).length} keys, ${missing.length} missing, ${unused.length} unused`);
}
