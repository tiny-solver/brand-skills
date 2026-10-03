// glyph-coverage@1 시험 — 스킬 폴더에서 node --test measures/glyph-coverage/measure.test.mjs
// vectors.json 은 실행기와 같은 규칙(out 에 적힌 칸이 JCS 로 같으면 통과)으로 본다. 시험 글꼴은 처음에 fixtures/make.mjs 로 만든다(opentype.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import measure, { charsOf } from './measure.mjs';

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

test('찾을 글자 — NFC · 빈칸 빼고 · 처음 나온 순서로 한 번씩', () => {
  assert.deepEqual(charsOf(['hello world', 'hello\n작은']), ['h', 'e', 'l', 'o', 'w', 'r', 'd', '작', '은']);
  // 보이지 않는 조절 문자(ZWJ · 변이 선택자 · 소프트 하이픈)는 찾지 않는다 · 이은 이모지는 글자마다 · NFC 뒤 남은 결합 문자는 찾는다
  assert.deepEqual(charsOf(['\u{1f469}‍\u{1f4bb} ☀️ soft­ly']), ['\u{1f469}', '\u{1f4bb}', '☀', 's', 'o', 'f', 't', 'l', 'y']);
  assert.deepEqual(charsOf(['é', 'q́']), ['é', 'q', '́']);
  assert.deepEqual(charsOf(['작']), ['작']);
});

test('실제 글꼴(있으면) — Pretendard 의 cmap 이 opentype.js 와 같다', async (t) => {
  const dir = pkgDir('pretendard') && path.join(pkgDir('pretendard'), 'dist', 'public');
  const files = ['static/Pretendard-Regular.otf', 'variable/PretendardVariable.ttf'].map((f) => path.join(dir ?? '', f));
  let opentype;
  try { const m = await import('opentype.js'); opentype = m.default ?? m; } catch { return t.skip('opentype.js 없음 — 견줄 구현이 없어 건너뜀'); }
  if (!dir || !files.every((f) => fs.existsSync(f))) return t.skip('실제 글꼴(pretendard 패키지) 없음 — 건너뜀');
  const texts = ['작은 상자를 열었다.', 'sample — hello, world.', '𝔸 😀 ꙮ'];
  const r = await measure({ fonts: files, texts }, {});
  const want = new Set();
  for (const f of files) {
    const font = opentype.parse(fs.readFileSync(f).buffer);
    for (const c of charsOf(texts)) if (!font.charToGlyphIndex(c)) want.add(c);
  }
  assert.equal(r.missing_chars, [...want].join(''));
  assert.equal(r.missing_count, want.size);
  assert.ok(want.size >= 1, '없는 글자도 섞어 본다');
});
