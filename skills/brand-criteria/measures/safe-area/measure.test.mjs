// safe-area@1 시험 — 스킬 폴더에서 node --test measures/safe-area/measure.test.mjs
// vectors.json 은 실행기와 같은 규칙(out 에 적힌 칸이 JCS 로 같으면 통과)으로 본다. 브라우저가 없으면 굽는 시험은 건너뛴다(이유 출력).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import measure, { MASKS } from './measure.mjs';
import { bgDepth, bgModel, paintedOf } from '../render/raster.mjs';

const vectors = JSON.parse(fs.readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));
const jcs = (x) => (Array.isArray(x) ? `[${x.map(jcs).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${jcs(x[k])}`).join(',')}}` : JSON.stringify(x ?? null));

vectors.forEach((v, i) => {
  test(`vectors [${i}]`, async (t) => {
    const out = await measure(structuredClone(v.in), {});
    if (out.unavailable) return t.skip(out.unavailable);
    for (const [k, want] of Object.entries(v.out)) assert.equal(jcs(out[k]), jcs(want), `${k}`);
  });
});


test('타일 바탕색은 세지 않는다 — 같은 그림을 바탕 없이 · 바탕까지 칠해 재면 같다', async (t) => {
  const a = await measure({ files: { mark: 'fixtures/center.svg' }, roles: ['mark'], size: 500 }, {});
  if (a.unavailable) return t.skip(a.unavailable);
  const b = await measure({ files: { mark: 'fixtures/tile.svg' }, roles: ['mark'], size: 500 }, {});
  assert.deepEqual(b.masks, a.masks);
  assert.equal(b.files[0].bg, '#6f6f00');
  assert.equal(a.files[0].bg, null);
});

test('fit 은 1 에서 끊기지 않는다 — 숫자 fit 은 늘 투명 둘레를 잘라 놓는다', async (t) => {
  const at = async (fit) => (await measure({ files: { mark: 'fixtures/center.svg' }, roles: ['mark'], masks: ['circle'], fit, size: 500 }, {})).masks?.circle;
  const one = await at(1);
  if (!one) return t.skip('브라우저 없음');
  const near = await at(0.99);
  assert.ok(one.outside_px > 0 && near.outside_px > 0, '1 · 0.99 모두 가운데 사각을 캔버스 가득 놓아 원 밖으로 나간다');
  assert.ok(Math.abs(one.margin - near.margin) < 0.02, `여백이 이어진다 — ${one.margin} · ${near.margin}`);
  assert.deepEqual(await at(undefined), { outside_px: 0, margin: 0.72, decides: false }, 'fit 이 없으면 파일 그대로 — as_is 가 없어 정하지 않는 마스크');
});

test('둥근 모서리 타일 — 모서리 안티에일리어싱 픽셀은 바탕으로 본다', async (t) => {
  const r = await measure({ files: { mark: 'fixtures/tile-corner.svg' }, roles: ['mark'], masks: ['ios-corner'], size: 500 }, {});
  if (r.unavailable) return t.skip(r.unavailable);
  assert.equal(r.outside_px, 0);
  assert.equal(r.margin_min, 0.0993, '조각(80–90) 바깥 모서리에서 iOS 둥근 모서리까지 — 24.8px / 250px');
});

test('마스크 기하 — 원 · 모서리 · 적응형 · maskable 반지름', () => {
  const S = 1080;
  assert.equal(MASKS.circle(S).norm, 540);
  assert.equal(MASKS.maskable(S).norm, 432);
  assert.equal(MASKS['android-adaptive'](S).norm, 330);
  const ios = MASKS['ios-corner'](S);
  assert.equal(ios.norm, 540);
  assert.ok(Math.abs(ios.sd(540, 0)) < 1e-9, '변 가운데는 경계');
  assert.ok(ios.sd(539, 539) > 0, '모서리 끝은 밖');
  const k = 540 - 0.225 * S; // 모서리 원 가운데
  assert.ok(Math.abs(ios.sd(k + 0.225 * S * Math.SQRT1_2, k + 0.225 * S * Math.SQRT1_2)) < 1e-9, '모서리 원 위는 경계');
});

// 픽셀 판 만들기 — fn(x, y) → [r, g, b, a]
const canvas = (W, fn) => {
  const px = new Uint8Array(W * W * 4);
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) px.set(fn(x, y), (y * W + x) * 4);
  return px;
};

test('바탕 모델 — 한 색 · 선형 그라데이션 · 그 밖(mixed) · 투명 바탕(null)', () => {
  const W = 40, inBox = (x, y) => x >= 15 && x < 25 && y >= 15 && y < 25;
  const flat = bgModel(canvas(W, (x, y) => (inBox(x, y) ? [255, 255, 255, 255] : [111, 111, 0, 255])), W, W);
  assert.deepEqual([flat.flat, flat.label], [[111, 111, 0], '#6f6f00']);
  // 대각선 그라데이션 + 둘레에 닿는 그림(둘레의 5%) — 평면을 맞춘다
  const grad = (x, y) => [Math.round(51 + (153 * (x + y)) / 78), 102, Math.round(204 - (153 * (x + y)) / 78), 255];
  const lin = canvas(W, (x, y) => (inBox(x, y) || (y === 0 && x < 8) ? [255, 255, 255, 255] : grad(x, y)));
  const m = bgModel(lin, W, W);
  assert.ok(m.linear, '선형');
  assert.match(m.label, /^#3[0-9a-f]66c[0-9a-f]→#c[0-9a-f]66[0-9a-f]{2}$/);
  const p = paintedOf(lin, W, W, m);
  assert.equal(p.reduce((a, b) => a + b, 0), 100 + 8, '그림(10×10)과 둘레에 닿은 8px 만 칠한 픽셀');
  // 원형 그라데이션 — 평면이 맞지 않는다
  const radial = canvas(W, (x, y) => { const d = Math.hypot(x - 20, y - 20); return [Math.round(255 - d * 4), Math.round(255 - d * 3), 255, 255]; });
  assert.deepEqual(bgModel(radial, W, W), { mixed: true });
  assert.equal(bgModel(canvas(W, (x, y) => (inBox(x, y) ? [0, 0, 0, 255] : [0, 0, 0, 0])), W, W), null, '투명 바탕 — 타일 아님');
});

test('바탕 깊이 — 테두리 띠는 얕고 그림이 가운데 있는 타일은 깊다', () => {
  const W = 50;
  const ring = canvas(W, (x, y) => (Math.min(x, y, W - 1 - x, W - 1 - y) < 2 ? [34, 34, 34, 255] : [111, 111, 0, 255]));
  const rm = bgModel(ring, W, W);
  assert.equal(bgDepth(paintedOf(ring, W, W, rm), ring, W, W), 1, '띠 두 줄 — 깊이 1');
  const tile = canvas(W, (x, y) => (x >= 20 && x < 30 && y >= 20 && y < 30 ? [255, 255, 255, 255] : [111, 111, 0, 255]));
  const tm = bgModel(tile, W, W);
  assert.equal(bgDepth(paintedOf(tile, W, W, tm), tile, W, W), 19, '바탕이 그림 바로 바깥(19px 안쪽)까지');
});

test('그라데이션 타일 — 바탕 이름표는 두 끝 색', async (t) => {
  const r = await measure({ files: { icon: ['fixtures/tile-gradient.svg'] }, roles: ['icon'], masks: ['circle'], size: 500 }, {});
  if (r.unavailable) return t.skip(r.unavailable);
  assert.match(r.files[0].bg, /^#6[0-9a-f]6[0-9a-f]0[0-9a-f]→#c[0-9a-f]3[0-9a-f]6[0-9a-f]$/);
});
