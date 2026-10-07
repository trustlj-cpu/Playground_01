import test from 'node:test';
import assert from 'node:assert/strict';
import { readPreference } from '../src/preferences.mjs';
test('a lost native reply is retried without losing the saved value', async () => {
  let calls = 0;
  const value = await readPreference('saved', { timeoutMs: 10, get: async ({ key }) => {
    assert.equal(key, 'saved');
    if (++calls === 1) return new Promise(() => {});
    return { value: '["2026-10-07"]' };
  }});
  assert.deepEqual(value, { value: '["2026-10-07"]' });
  assert.equal(calls, 2);
});
test('two missing replies terminate instead of blocking startup forever', async () => {
  await assert.rejects(readPreference('saved', { timeoutMs: 10, get: () => new Promise(() => {}) }), /timed out/);
});
test('an explicit plugin error is preserved', async () => {
  await assert.rejects(readPreference('saved', { get: async () => { throw new Error('storage unavailable'); } }), /storage unavailable/);
});
