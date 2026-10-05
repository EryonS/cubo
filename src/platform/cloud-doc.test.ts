import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeDoc, encodeDoc } from './cloud-doc';

test('a cloud document packs the profile as text and reads it back', () => {
  const doc = { v: 1, profile: { coins: 3, owned: { blocks: ['a'] } }, settings: { sfx: true }, bests: { classic: 10 }, lang: 'fr', updatedAt: 5 };
  const packed = encodeDoc(doc);
  assert.equal(typeof packed.profile, 'string');
  const back = decodeDoc(packed);
  assert.deepEqual(back.profile, doc.profile);
  assert.deepEqual(back.bests, doc.bests);
  assert.equal(back.updatedAt, 5);
});
