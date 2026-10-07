import test from 'node:test';
import assert from 'node:assert/strict';
import { createSingleFlight } from '../src/single-flight.mjs';
test('prefetch and user tap share one in-flight file write', async () => {
  const run = createSingleFlight(); let writes = 0, finish;
  const load = async () => { writes++; await new Promise(r => { finish = r; }); return 'file-uri'; };
  const background = run('2026-10-08', load), tap = run('2026-10-08', load);
  assert.equal(background, tap); await Promise.resolve(); assert.equal(writes, 1);
  finish(); assert.deepEqual(await Promise.all([background, tap]), ['file-uri', 'file-uri']);
});
test('a failed download permits a later retry', async () => {
  const run = createSingleFlight();
  await assert.rejects(run('date', () => { throw new Error('offline'); }), /offline/);
  assert.equal(await run('date', () => 'retried'), 'retried');
});
