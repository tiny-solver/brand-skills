// local-similar@1 시험 — 스킬 폴더에서 node --test measures/local-similar/measure.test.mjs
// vectors.json 은 실행기와 같은 규칙(out 에 적힌 칸이 JCS 로 같으면 통과)으로 본다. 브라우저가 없으면 굽는 시험은 건너뛴다(이유 출력).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import measure, { dhash, hamming, hexOf, phash } from './measure.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

const vectors = JSON.parse(fs.readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));
const jcs = (x) => (Array.isArray(x) ? `[${x.map(jcs).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${jcs(x[k])}`).join(',')}}` : JSON.stringify(x ?? null));

vectors.forEach((v, i) => {
  test(`vectors [${i}]`, async (t) => {
    const out = await measure(structuredClone(v.in), {});
    if (out.unavailable) return t.skip(out.unavailable);
    for (const [k, want] of Object.entries(v.out)) assert.equal(jcs(out[k]), jcs(want), `${k}`);
  });
});


test('같은 모양 — 어두운 바탕 판 · 흰 그림 투명 판 · 반 크기 판은 가깝고, 다른 모양은 멀다', async (t) => {
  const r = await measure({ files: { mark: 'fixtures/shape.svg' }, roles: ['mark'], compare: 'fixtures/compare', k: 10 }, {});
  if (r.unavailable) return t.skip(r.unavailable);
  const by = Object.fromEntries(r.top.map((x) => [x.file.split('/').pop(), x]));
  assert.equal(r.count, 6, 'notes.txt 는 그림이 아니라 안 본다');
  for (const f of ['shape-dark.svg', 'shape-white.svg', 'shape-small.svg']) assert.ok(by[f].dhash <= 4 && by[f].phash <= 4, `${f} ${by[f].dhash} · ${by[f].phash}`);
  for (const f of ['bars.svg', 'cross.svg']) assert.ok(by[f].dhash >= 20 && by[f].phash >= 20, `${f} ${by[f].dhash} · ${by[f].phash}`);
  assert.deepEqual(r.top.map((x) => x.score), [...r.top.map((x) => x.score)].sort((a, b) => b - a), '가까운 순');
  assert.match(r.mine[0].dhash, /^[0-9a-f]{16}$/);
});

test('비교 폴더의 끊긴 링크 — 던지지 않고 missing 에 적는다', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'local-similar-'));
  fs.copyFileSync(path.join(HERE, 'fixtures/compare/cross.svg'), path.join(tmp, 'a.svg'));
  fs.symlinkSync(path.join(tmp, 'nowhere.svg'), path.join(tmp, 'b.svg'));
  const r = await measure({ files: { mark: 'fixtures/shape.svg' }, roles: ['mark'], compare: tmp }, {});
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.unavailable) return t.skip(r.unavailable);
  assert.equal(r.count, 1);
  assert.deepEqual(r.missing, [`${tmp}/b.svg 없음`]);
});

test('해시 — 비트 · 16진 · 해밍 거리', () => {
  const flat = new Array(9 * 8).fill(255), ramp = Array.from({ length: 72 }, (_, i) => 255 - (i % 9) * 10);
  assert.equal(hexOf(dhash(flat)), '0000000000000000');
  assert.equal(hexOf(dhash(ramp)), 'ffffffffffffffff');
  assert.equal(hamming(dhash(flat), dhash(ramp)), 64);
  const cells = Array.from({ length: 1024 }, (_, i) => ((i >> 5) < 16 ? 0 : 255));
  const p = phash(cells);
  assert.equal(p.length, 64);
  assert.ok(p.reduce((a, b) => a + b, 0) <= 32, '가운데 값보다 큰 것만 1 — 1 은 많아야 32');
  const flipped = Array.from({ length: 1024 }, (_, i) => cells[1023 - i]);
  assert.ok(hamming(p, phash(flipped)) > 0, '위아래를 뒤집으면 달라진다');
  assert.equal(hexOf(phash(cells)), hexOf(p), '같은 칸 → 같은 해시');
});
