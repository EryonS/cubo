const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// The app is plain <script> / <link> tags (no bundler): each file must be linked once, exist,
// and be cached by the service worker, or the game breaks offline.
const WWW = path.join(__dirname, '..', 'www');
const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(WWW, 'sw.js'), 'utf8');
const linked = [...html.matchAll(/(?:src|href)="((?:src|css)\/[^"]+)"/g)].map((m) => m[1]);
const cached = new Set([...sw.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));

function walk(dir) {
  return fs.readdirSync(path.join(WWW, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

test('every linked script and stylesheet exists and is cached by the service worker', () => {
  assert.equal(new Set(linked).size, linked.length, 'a file is linked twice');
  for (const f of linked) {
    assert.ok(fs.existsSync(path.join(WWW, f)), f + ' is linked but missing');
    assert.ok(cached.has(f), f + ' is missing from ASSETS in sw.js');
  }
});

test('every app file is linked from index.html', () => {
  const files = [...walk('src'), ...walk('css')].map((f) => f.split(path.sep).join('/'));
  for (const f of files) assert.ok(linked.includes(f), f + ' is not linked from index.html');
});

test('boot.js runs last among app scripts', () => {
  const scripts = linked.filter((f) => f.endsWith('.js') && f !== 'src/platform/sw-register.js');
  assert.equal(scripts[scripts.length - 1], 'src/boot.js');
});
