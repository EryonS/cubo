import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from './social';

const ok = (s: string) => assert.equal(C.checkName(s).ok, true, s);
const no = (s: string) => assert.equal(C.checkName(s).ok, false, s);

test('pseudo: length, characters, trim and spaces', () => {
  no('ab'); no('a'.repeat(17)); no('Bob!'); no('Bob<3'); no('---'); no('123');
  ok('Bob'); ok('Léa-Rose'); ok('Cubo_42'); ok('a'.repeat(16));
  assert.deepEqual(C.checkName('  Mimi   la  souris '), { ok: true, name: 'Mimi la souris' });
  no('  ab  ');
});

test('pseudo: blocklist sees through case, accents, leetspeak, repeats and separators', () => {
  for (const bad of ['PUTAIN', 'pütain', 'Pu7a1n', 'puuuutain', 'f u c k', 'F.u.c.k', 'sh1t', 'xX_connard_Xx', 'N1gg3r', 'Hitler42', 'p0rn', 'ntm', 'fdp', 'Sexe', 'le sex', 'pd']) no(bad);
});

test('pseudo: innocent names stay allowed', () => {
  for (const good of ['Essex', 'Grape', 'Peacock', 'Classe', 'Assia', 'Cocotte', 'Cucu', 'Constance', 'Dickens', 'Habite', 'Titouan', 'Analyse', 'Cubo Fan', 'Paul', 'Mina']) ok(good);
});

test('rename delay: first pick free, then once a week', () => {
  const now = 10 * 86400000;
  assert.equal(C.renameWait(0, now), 0);
  assert.equal(C.renameWait(now - 3 * 86400000, now), 4 * 86400000);
  assert.equal(C.renameWait(now - 8 * 86400000, now), 0);
});

test('friend code: alphabet, format, tolerant parse', () => {
  let n = 1;
  const rand = () => { n = (n * 16807) % 2147483647; return n / 2147483647; };
  for (let i = 0; i < 200; i++) {
    const code = C.makeCode(rand);
    assert.equal(code.length, 6);
    assert.ok([...code].every((c) => C.CODE_ALPHABET.includes(c)));
    assert.equal(C.parseCode(C.showCode(code)), code);
  }
  assert.ok(!/[01OI]/.test(C.CODE_ALPHABET));
  assert.equal(C.showCode('K7Q4MP'), 'K7Q-4MP');
  assert.equal(C.parseCode('k7q-4mp'), 'K7Q4MP');
  assert.equal(C.parseCode(' k7q 4mp '), 'K7Q4MP');
  assert.equal(C.parseCode('K7Q4MP'), 'K7Q4MP');
  assert.equal(C.parseCode('K7Q-4M'), null);
  assert.equal(C.parseCode('K7Q-4M0'), null);
  assert.equal(C.parseCode(''), null);
});

test('labels: the code shows only on equal pseudos', () => {
  const l = C.labels([
    { uid: 'a', name: 'Lou', code: 'K7Q4MP' },
    { uid: 'b', name: 'lou', code: 'XYZ234' },
    { uid: 'c', name: 'Max', code: 'AAA222' },
  ]);
  assert.deepEqual(l, { a: 'Lou#K7Q', b: 'lou#XYZ', c: 'Max' });
});

test('block list: added once, capped, undefined-safe', () => {
  assert.deepEqual(C.withBlocked(undefined, 'a'), ['a']);
  assert.deepEqual(C.withBlocked(['a', 'b'], 'a'), ['b', 'a']);
  assert.deepEqual(C.withoutBlocked(['a', 'b'], 'a'), ['b']);
  assert.equal(C.isBlocked(undefined, 'a'), false);
  assert.equal(C.isBlocked(['a'], 'a'), true);
  let list: string[] = [];
  for (let i = 0; i < C.MAX_BLOCKED + 5; i++) list = C.withBlocked(list, 'u' + i);
  assert.equal(list.length, C.MAX_BLOCKED);
});

test('moderation: a pseudo is hidden only while it equals the owner\'s hidden string', () => {
  assert.equal(C.isHidden('Mauvais', 'Mauvais'), true);
  assert.equal(C.isHidden('Autre', 'Mauvais'), false); // renamed: shown again
  assert.equal(C.isHidden('Mauvais', ''), false);
  assert.equal(C.isHidden('Mauvais', undefined), false);
  assert.deepEqual([...C.REPORT_REASONS], ['insult', 'inappropriate', 'other']); // firestore.rules lists the same
});
