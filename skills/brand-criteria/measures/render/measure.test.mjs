// render@1 시험 — 스킬 폴더에서 node --test measures/render/measure.test.mjs
// vectors.json 은 실행기와 같은 규칙(out 에 적힌 칸이 JCS 로 같으면 통과)으로 본다. 브라우저가 없으면 굽는 시험은 건너뛴다(이유 출력).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import measure from './measure.mjs';
import { rasterSize } from './raster.mjs';

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

test('굽기 — .criteria/renders/<방향>/ 에 PNG · 크기 · sha256 · 같은 입력이면 같은 그림', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const input = { files: { mark: 'fixtures/square.svg', lockup: 'fixtures/lockup.svg' }, roles: ['mark', 'lockup'], sizes: [24], bgs: ['light'], gray: true, tokens: { light: { bg: '#d9fed1' } } };
  const ctx = { dir: HERE, out: tmp };
  const a = await measure(structuredClone(input), ctx);
  if (a.unavailable) return t.skip(a.unavailable);
  assert.equal(a.count, 4);
  const lockup = a.images.find((x) => x.role === 'lockup' && !x.gray);
  assert.equal(lockup.width, 48, '가로 로고는 높이 = 크기 · 너비 = 크기 × 비율(200:100)');
  assert.equal(lockup.height, 24);
  for (const img of a.images) {
    const buf = fs.readFileSync(path.join(tmp, img.path));
    assert.equal(crypto.createHash('sha256').update(buf).digest('hex'), img.sha256);
    assert.equal(buf.readUInt32BE(16), img.width);
    assert.equal(buf.readUInt32BE(20), img.height);
    assert.ok(img.path.startsWith(`renders/${path.basename(ctx.dir)}/`));
  }
  const b = await measure(structuredClone(input), {});
  assert.deepEqual(b.images.map((x) => x.sha256), a.images.map((x) => x.sha256), '같은 브라우저 · 같은 입력 → 같은 PNG');
  assert.ok(b.images.every((x) => x.path === null), 'ctx.out 이 없으면 쓰지 않는다');
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('쓰지 못하면 — 그림은 path 없이 내고 missing 에 적는다(던지지 않는다)', async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'render-'));
  const notDir = path.join(tmp, 'file');
  fs.writeFileSync(notDir, 'x');
  const r = await measure({ files: { mark: 'fixtures/square.svg' }, roles: ['mark'], sizes: [16], bgs: ['none'] }, { dir: HERE, out: notDir });
  fs.rmSync(tmp, { recursive: true, force: true });
  if (r.unavailable) return t.skip(r.unavailable);
  assert.equal(r.count, 1);
  assert.equal(r.images[0].path, null);
  assert.deepEqual(r.missing, [`renders/${path.basename(HERE)} 에 쓰지 못함 — 그림 자리(path) 없이 냄`]);
});

test('그림 파일 비율 — PNG 밖의 형식(JPG · WebP)도 머리에서 읽어 가로 로고를 넓게 굽는다', async (t) => {
  const fx = (f) => fs.readFileSync(path.join(HERE, 'fixtures', f));
  assert.deepEqual(rasterSize(fx('lockup-wide.webp'), 'image/webp'), { w: 200, h: 100 });
  assert.deepEqual(rasterSize(fx('lockup-wide.jpg'), 'image/jpeg'), { w: 200, h: 100 });
  assert.deepEqual(rasterSize(fx('raster.webp'), 'image/webp'), { w: 16, h: 16 });
  // GIF 논리 화면 · WebP VP8L · VP8(손으로 만든 머리)
  const gif = Buffer.from('474946383961c8006400000000', 'hex');
  assert.deepEqual(rasterSize(gif, 'image/gif'), { w: 200, h: 100 });
  const vp8l = Buffer.alloc(30); vp8l.write('RIFF', 0, 'latin1'); vp8l.write('WEBPVP8L', 8, 'latin1'); vp8l[20] = 0x2f; vp8l.writeUInt32LE((199 & 0x3fff) | ((99 & 0x3fff) << 14), 21);
  assert.deepEqual(rasterSize(vp8l, 'image/webp'), { w: 200, h: 100 });
  const vp8 = Buffer.alloc(30); vp8.write('RIFF', 0, 'latin1'); vp8.write('WEBPVP8 ', 8, 'latin1'); vp8.writeUInt16LE(200, 26); vp8.writeUInt16LE(100, 28);
  assert.deepEqual(rasterSize(vp8, 'image/webp'), { w: 200, h: 100 });
  assert.equal(rasterSize(Buffer.from('not an image'), 'image/jpeg'), null);
  const r = await measure({ files: { lockup: ['fixtures/lockup-wide.webp', 'fixtures/lockup-wide.jpg'] }, roles: ['lockup'], sizes: [24], bgs: ['none'] }, {});
  if (r.unavailable) return t.skip(r.unavailable);
  assert.deepEqual(r.images.map((x) => [x.file, x.width, x.height]), [['fixtures/lockup-wide.webp', 48, 24], ['fixtures/lockup-wide.jpg', 48, 24]]);
});
