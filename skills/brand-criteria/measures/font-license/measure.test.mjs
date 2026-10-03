// font-license@1 시험 — 스킬 폴더에서 node --test measures/font-license/measure.test.mjs
// vectors.json 은 실행기와 같은 규칙(out 에 적힌 칸이 JCS 로 같으면 통과)으로 본다. 시험 글꼴은 처음에 fixtures/make.mjs 로 만든다(opentype.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import measure, { judgeText } from './measure.mjs';
import { cmap, names, parseFont } from './sfnt.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// 시험 글꼴 — git 에 두지 않고 fixtures/make.mjs 로 만든다(목록 · sha256 은 fixtures/made.json). 없거나 바이트가 다르면 먼저 만든다
// opentype.js 가 없어 못 만들면 그 파일을 쓰는 시험만 건너뛴다(이유 출력)
const MADE = JSON.parse(fs.readFileSync(new URL('./fixtures/made.json', import.meta.url), 'utf8'));
const shaOf = (f) => { try { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(path.join(HERE, 'fixtures', f))).digest('hex')}`; } catch { return null; } };
const stale = () => Object.entries(MADE.files).filter(([f, h]) => shaOf(f) !== h).map(([f]) => f);
let makeErr = '';
if (stale().length) { const r = spawnSync(process.execPath, [path.join(HERE, 'fixtures', 'make.mjs')], { encoding: 'utf8' }); makeErr = r.status === 0 ? '' : (r.stderr || '').trim().split('\n').find((l) => /Error|Cannot/.test(l)) || `끝 코드 ${r.status}`; }
const UNMADE = stale().some((f) => shaOf(f) === null) ? `시험 글꼴 없음 — node fixtures/make.mjs 로 만든다(${MADE.needs.join(' · ')} 필요)${makeErr ? `: ${makeErr}` : ''}` : null;
const usesMade = (x) => Object.keys(MADE.files).some((f) => JSON.stringify(x).includes(`"fixtures/${f}"`));
// 패키지 자리 — 이 폴더에서 Node 가 찾는 대로(위로 node_modules · NODE_PATH). 없으면 null
const pkgDir = (name) => { try { return path.dirname(createRequire(import.meta.url).resolve(`${name}/package.json`)); } catch { return null; } };

const vectors = JSON.parse(fs.readFileSync(new URL('./vectors.json', import.meta.url), 'utf8'));
const jcs = (x) => (Array.isArray(x) ? `[${x.map(jcs).join(',')}]` : x && typeof x === 'object' ? `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${jcs(x[k])}`).join(',')}}` : JSON.stringify(x ?? null));

vectors.forEach((v, i) => {
  test(`vectors [${i}]`, async (t) => {
    if (UNMADE && usesMade(v.in)) return t.skip(UNMADE);
    const out = await measure(structuredClone(v.in), {});
    if (out.unavailable) return t.skip(out.unavailable);
    for (const [k, want] of Object.entries(v.out)) assert.equal(jcs(out[k]), jcs(want), `${k}`);
  });
});

test('시험 글꼴 — fixtures/make.mjs 가 made.json 의 바이트를 그대로 만든다', (t) => {
  if (UNMADE) return t.skip(UNMADE);
  assert.deepEqual(stale(), [], 'made.json 의 sha256 과 다른 파일 — opentype.js 판이 바뀌면 바이트가 달라질 수 있다(made.json 을 다시 적는다)');
});

test('SPDX 후보 · 금지 문구 — 라이선스 글 하나', () => {
  const cases = [
    ['Copyright 2020 The Noto Project Authors. This Font Software is licensed under the SIL Open Font License, Version 1.1.', 'OFL-1.1', [true, true, true]],
    ['SIL OPEN FONT LICENSE Version 1.0', 'OFL-1.0', [true, true, true]],
    ['Licensed under the Apache License, Version 2.0', 'Apache-2.0', [true, true, true]],
    ['https://creativecommons.org/licenses/by-nc/4.0/', 'CC-BY-NC-4.0', [false, null, null]],
    ['https://creativecommons.org/licenses/by/4.0/', 'CC-BY-4.0', [true, true, true]],
    ['This font may not be used in logos without a commercial license.', null, [null, false, null]],
    ['본 서체는 개인 사용만 허락합니다. 상업적 이용 불가.', null, [false, null, null]],
    ['GNU General Public License with font exception', 'GPL-2.0-or-later WITH Font-exception-2.0', [true, null, null]],
    // 함께 허락하는 말은 금지가 아니다
    ['100% free for commercial and non-commercial use', null, [null, null, null]],
    ['free for personal use and commercial use', null, [null, null, null]],
    ['Free for both personal and commercial use.', null, [null, null, null]],
    ['상업적, 비상업적 용도 구분 없이 무료로 사용', null, [null, null, null]],
    ['SIL Open Font License 1.1. 상업적 · 비상업적 이용 모두 가능', 'OFL-1.1', [true, true, true]],
    ['개인 및 상업적 용도 모두 무료', null, [null, null, null]],
    // 한정 · 금지는 그대로 잡는다
    ['Free for personal use only.', null, [false, null, null]],
    ['For non-commercial use.', null, [false, null, null]],
    ['Free for personal use. Commercial license available.', null, [false, null, null]],
    ['Commercial use is not permitted.', null, [false, null, null]],
    ['비상업적 용도로만 사용할 수 있습니다.', null, [false, null, null]],
    ['개인 및 상업적 용도로 사용할 수 없습니다.', null, [false, null, null]],
    // 한국어 금지는 같은 절 안에서만 — 허락 문장 뒤에 오는 다른 금지에 걸리지 않는다
    ['로고 사용 가능, 재판매 불가', null, [null, null, null]],
    ['로고 사용 가능 · 재판매 불가', null, [null, null, null]],
    ['CI 사용 가능. 재배포 불가', null, [null, null, null]],
    ['상업적 이용 가능하나 재배포 불가', null, [null, null, null]],
    ['상업적 · 비상업적 제한 없음', null, [null, null, null]],
    ['로고 사용 불가능', null, [null, false, null]],
    ['무료로 쓸 수 있으나 로고(CI · BI) 사용은 불가합니다.', null, [null, false, null]],
    ['윤곽 변환 가능, 판매 금지', null, [null, null, null]],
    ['아웃라인 변환 금지', null, [null, null, false]],
    // 이름 — 한글 OFL · GPL 판을 font exception 보다 먼저
    ['SIL 오픈 폰트 라이선스 1.1', 'OFL-1.1', [true, true, true]],
    ['GNU General Public License version 3 with font exception', 'GPL-3.0-or-later WITH Font-exception-2.0', [true, null, null]],
    ['', null, [null, null, null]],
  ];
  for (const [text, guess, allows] of cases) assert.deepEqual(judgeText(text), { guess, allows }, text);
});

test('실제 글꼴(있으면) — Pretendard OTF · TTF 는 OFL-1.1(name 13) · 주소 name 14', async (t) => {
  const dir = pkgDir('pretendard') && path.join(pkgDir('pretendard'), 'dist', 'public');
  const files = ['static/Pretendard-Regular.otf', 'variable/PretendardVariable.ttf'].map((f) => path.join(dir ?? '', f));
  if (!dir || !files.every((f) => fs.existsSync(f))) return t.skip('실제 글꼴(pretendard 패키지) 없음 — 건너뜀');
  const r = await measure({ fonts: files }, {});
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.fonts.map((x) => [x.guess, x.source, x.fs_type]), [['OFL-1.1', 'name 13', 0], ['OFL-1.1', 'name 13', 0]]);
  assert.match(r.license_url, /scripts\.sil\.org\/OFL/i);
  assert.equal(r.allowed, true);
});

test('깨진 글꼴 — 읽기는 {error} 를 내거나 \'글꼴 표가 깨졌다\' 를 던지고, 측정기는 던지지 않는다', async (t) => {
  if (UNMADE) return t.skip(UNMADE);
  const good = fs.readFileSync(path.join(HERE, 'fixtures/ofl/ofl.otf'));
  const cases = [
    Buffer.concat([Buffer.from('ttcf'), Buffer.alloc(10)]),                                   // TTC 머리만
    Buffer.concat([Buffer.from('ttcf'), Buffer.from([0, 1, 0, 0, 0, 0, 0, 1, 0xff, 0xff, 0, 0])]), // 첫 글꼴이 파일 밖
    good.subarray(0, 40),                                                                     // 표 목록 중간에서 잘림
  ];
  for (const buf of cases) assert.match(parseFont(buf).error, /^글꼴 표가 깨졌다 — /);
  // cmap 하위 표 자리가 파일 밖
  const bad = Buffer.from(good), n = bad.readUInt16BE(4);
  for (let i = 0; i < n; i++) { const r = 12 + i * 16; if (bad.toString('latin1', r, r + 4) === 'cmap') bad.writeUInt32BE(0xfffffff0, bad.readUInt32BE(r + 8) + 8); }
  const f = parseFont(bad);
  assert.equal(f.error, undefined);
  assert.throws(() => cmap(f), /글꼴 표가 깨졌다 — cmap/);
  assert.ok(names(f)[13], 'name 표는 그대로 읽힌다');
});

test('라이선스 파일 — FAQ 는 뒤로 · 형식 글은 TTF · OTF · TTC', async (t) => {
  if (UNMADE) return t.skip(UNMADE);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'font-license-'));
  fs.copyFileSync(new URL('./fixtures/with-file/plain.otf', import.meta.url), path.join(tmp, 'plain.otf'));
  fs.writeFileSync(path.join(tmp, 'OFL-FAQ.txt'), 'Frequently asked questions. Can I use the font in a logo? This FAQ is not the license. GNU General Public License');
  fs.writeFileSync(path.join(tmp, 'OFL.txt'), 'SIL OPEN FONT LICENSE Version 1.1');
  const r = await measure({ fonts: ['plain.otf', 'a.woff2'] }, { dir: tmp });
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.deepEqual([r.fonts[0].guess, r.fonts[0].source], ['OFL-1.1', 'OFL.txt']);
  assert.deepEqual(r.missing, ['a.woff2 형식 — TTF · OTF · TTC 만']);
});
