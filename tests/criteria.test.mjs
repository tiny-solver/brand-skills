// tests/criteria.test.mjs — 기준 팩 실행기 시험 · 저장소 루트에서 node --test (Node 22+)
// 시험 값 정본: skills/brand-criteria/tests/conformance.json · 측정기마다 measures/<id>/vectors.json
// 측정기 시험 글꼴은 저장소에 없다 — 시작할 때 measures/<id>/fixtures/make.mjs 로 만든다(opentype.js · 목록 · sha256 은 made.json)
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as C from '../skills/brand-criteria/scripts/criteria.mjs';

const REPO = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const RUNNER = path.join(C.SKILL, 'scripts', 'criteria.mjs');
const conf = JSON.parse(fs.readFileSync(path.join(C.SKILL, 'tests', 'conformance.json'), 'utf8'));
const run = (script, args, cwd = REPO) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd });
const cli = (...a) => run(RUNNER, a);
const ctx = C.context();
const M = (id) => ctx.measures.get(id).code;
const must = (ref, opts = {}) => { const r = C.resolvePack(ref, { ctx, from: REPO, ...opts }); assert.deepEqual(r.errors, []); return r.pack; };
const jsonHas = (x, s) => JSON.stringify(x).includes(`"${s}"`);
const byId = (p, id) => p.factors.find((f) => f.id === id);
const cellsOf = (gates, scores) => ({ gates: Object.fromEntries(Object.entries(gates).map(([k, v]) => [k, [v, '']])), scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, [v, '']])) });
const W = (root, rel, front, body = '') => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, typeof front === 'string' ? front : `---\n${JSON.stringify(front, null, 2)}\n---\n${body}\n`); };
// 임시 폴더 — 시험이 중간에 실패해도 파일이 끝나면 지운다
const TMPS = [];
after(() => { for (const d of TMPS) fs.rmSync(d, { recursive: true, force: true }); });
const mktmp = (prefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); TMPS.push(d); return d; };
const tmp = (name) => { const d = mktmp(`brand-criteria-${name}-`); fs.mkdirSync(path.join(d, '.git')); return d; };
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const judgeBody = '## 받는 것\n- 심볼\n\n## 하는 일\n1. 본다\n\n## 근거 한 줄\n본 것\n\n## 하지 않는 것\n- 없음';
// 지어낸 토큰(conformance contrast 1 – 4)
const TOKENS = { light: { bg: '#d9fed1', ink: '#16241a', accent: '#0e7490' }, dark: { bg: '#0d1f12', ink: '#dcedd4', accent: '#5ba0b4' } };
const KIDS = path.join(C.SKILL, 'examples/kids-app/packs/example/kids-logo');
// 시험 글꼴 — 측정기 시험 값(validate)이 쓰기 전에 만든다. opentype.js 가 없으면 못 만들고 그 시험 값은 건너뛴다(CONTRIBUTING '고치기 전후')
const shaFile = (p) => { try { return `sha256:${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}`; } catch { return null; } };
function makeFixtures(skill = C.SKILL) {
  const left = [];
  for (const id of fs.readdirSync(path.join(skill, 'measures'))) {
    const dir = path.join(skill, 'measures', id, 'fixtures'), list = path.join(dir, 'made.json');
    if (!fs.existsSync(list)) continue;
    const { files } = readJ(list);
    const stale = () => Object.entries(files).filter(([f, h]) => shaFile(path.join(dir, f)) !== h).map(([f]) => `${id}/fixtures/${f}`);
    if (stale().length) spawnSync(process.execPath, [path.join(dir, 'make.mjs')], { encoding: 'utf8' });
    left.push(...stale());
  }
  return left;
}
const UNMADE = makeFixtures();
// 스킬 사본에서 make.mjs 가 원본 자리와 같은 패키지를 찾게 — 원본 make.mjs 자리에서 Node 가 찾는 자리(위로 node_modules · NODE_PATH)의 그 패키지를
// 사본 뿌리 node_modules/<이름> 으로 잇는다(needs 의 패키지만). 이은 패키지 수
function linkNeeds(copy, from, needs) {
  let n = 0;
  for (const need of needs) {
    const name = need.replace(/(?!^)@[^@/]*$/, '');
    for (const dir of createRequire(from).resolve.paths(name) || []) {
      const pkg = path.join(dir, name);
      if (!fs.existsSync(path.join(pkg, 'package.json'))) continue;
      const to = path.join(copy, 'node_modules', name);
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.symlinkSync(pkg, to, process.platform === 'win32' ? 'junction' : 'dir');
      n++;
      break;
    }
  }
  return n;
}

test('validate — 기본 팩 · 예시 팩 · 시험 팩 · 측정기 · 참조 묶음 · 시험 값이 모두 통과', async () => {
  const r = await C.validateAll();
  assert.deepEqual(r.errors, []);
  const refs = r.packs.map((p) => `${p.id}@${p.version}`);
  for (const ref of ['tinysolver/logo@3', 'tinysolver/icon@3', 'tinysolver/color@3', 'tinysolver/type@2', 'example/kids-logo@1', 'lineup/logo@1']) assert.ok(refs.includes(ref), ref);
  assert.ok(r.vectors >= 40);
  if (!UNMADE.length) assert.deepEqual(r.skipped.filter((x) => /시험 파일 없음/.test(x)), [], '시험 글꼴을 만든 뒤에는 그 시험 값을 건너뛰지 않는다');
  const out = cli('validate');
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^문제 없음/);
});

test('측정기 — measures/<id>/measure.mjs 를 불러 쓴다 · 대비 비율 열(시험 값 1) · 반올림 표시', async () => {
  for (const id of ['contrast', 'dark-variant', 'color-distance']) assert.ok(ctx.measures.get(id).file.endsWith(path.join('measures', id, 'measure.mjs')), id);
  for (const id of ['similar-logos', 'trademark']) assert.equal(ctx.measures.get(id).code, null, `${id} — api 측정기는 코드가 없다`);
  for (const { fg, bg, ratio } of conf.contrast) {
    const o = await M('contrast')({ pairs: [{ fg, bg, role: 'shape' }] });
    assert.equal(o.shape_min, ratio, `${fg} / ${bg}`);
  }
  assert.equal((await M('contrast')({ pairs: [{ fg: '#0e7490', bg: '#d9fed1' }] })).text, '#0e7490 / #d9fed1 4.86:1');
  assert.equal((await M('dark-variant')({ hex: '#0e7490', dark: '#5ba0b4', ink: '#0d1f12' })).text, '#5ba0b4 / #0d1f12 5.8:1');
  assert.equal((await M('dark-variant')({ hex: '#34447b' })).text, '#8d96b5(만듦) / #000000 7.2:1', 'ink 가 없으면 검정 바탕');
  assert.equal((await M('color-distance')({ hex: '#34447b', colors: ['#004ea1'] })).de_min.toFixed(1), '8.1');
  const ref = await M('color-distance')({ hex: '#34447b', ref: 'common-blues@2026-10' }, { ref: (id) => ctx.refs.get(id) ?? null });
  assert.deepEqual([ref.de_min, ref.nearest], [8.1133, '#004ea1']);
  const none = await M('contrast')({ pairs: [{ fg: '#0e7490', bg: null }] });
  assert.equal(none.pass, null, '입력이 모자라면 던지지 않고 null + missing');
  assert.ok(none.missing.length);
});

test('측정기 계약 — needs 가 없으면 부르지 않음 · 코드 오류는 unavailable · api 는 부르지 않음 · ctx 에 dir · out · ref', async () => {
  const skill = mktmp('brand-criteria-skill-');
  fs.cpSync(C.SKILL, skill, { recursive: true, filter: (s) => !s.includes(`${path.sep}measures${path.sep}`) || /contrast/.test(s) || s.endsWith('measures') });
  const front = (id, extra = {}) => `---\n${JSON.stringify({ id, version: 1, access: 'open', in: { x: '입력' }, out: { y: { type: 'string' } }, ...extra })}\n---\n시험 측정기\n`;
  W(skill, 'measures/needy/MEASURE.md', front('needy', { needs: ['no-such-package-xyz'] }));
  W(skill, 'measures/needy/measure.mjs', 'export default async () => ({ y: "x" });\n');
  W(skill, 'measures/broken/MEASURE.md', front('broken'));
  W(skill, 'measures/broken/measure.mjs', 'export default async () => { throw new Error("깨짐"); };\n');
  W(skill, 'measures/where/MEASURE.md', front('where'));
  W(skill, 'measures/where/measure.mjs', 'import path from "node:path";\nexport default async (input, ctx) => ({ y: [path.basename(ctx.dir || ""), path.basename(ctx.out || ""), typeof ctx.ref].join(" ") });\n');
  const c2 = C.context({ skill });
  assert.deepEqual(await c2.measures.get('needy').code({}, {}), { unavailable: 'no-such-package-xyz 없음' });
  assert.match((await c2.measures.get('broken').code({}, {})).unavailable, /^측정기 오류 — 깨짐/);
  assert.equal((await c2.measures.get('where').code({}, { dir: '/a/ring', out: '/a/.criteria', ref: () => null })).y, 'ring .criteria function');
  W(skill, 'measures/needy/vectors.json', '[{"in":{},"out":{"y":"x"}}]');
  // needs 는 있지만 브라우저가 없는 측정기 — 그 시험 값만 건너뛰고, 브라우저 없이 도는 시험 값은 본다
  W(skill, 'measures/nobrowser/MEASURE.md', front('nobrowser', { needs: ['node:fs'] }));
  W(skill, 'measures/nobrowser/measure.mjs', 'export default async (input) => (input.x ? { unavailable: "브라우저 없음 — 시험" } : { y: "ok" });\n');
  W(skill, 'measures/nobrowser/vectors.json', '[{"in":{},"out":{"y":"ok"}},{"in":{"x":1},"out":{"y":"z"}},{"in":{"x":2},"out":{"y":"z"}}]');
  const c3 = C.context({ skill });
  const errs = [], skipped = [];
  const ran = await C.runVectors(c3, errs, skipped);
  assert.deepEqual(skipped, ['needy@1: no-such-package-xyz 없음', 'nobrowser@1: 브라우저 없음 — 시험 — 시험 값 2개'], 'needs 가 없거나 환경 때문에 못 재면 건너뛴다');
  assert.ok(!errs.some((e) => /nobrowser/.test(e)), errs.join('\n'));
  assert.ok(ran >= 1);
  assert.ok(errs.some((e) => /broken: 코드가 있는 측정기는 vectors\.json/.test(e)));
  fs.rmSync(skill, { recursive: true, force: true });
  // api 측정기 — 스킬은 부르지 않고 unavailable 을 남긴다(판정 재료 · 판정지)
  const pack = must('tinysolver/logo@3');
  const inputs = await C.judgeInputs(pack, { files: { mark: 'mark.svg' }, context: { name: '예시', industry: '예시 업계' } }, { ctx });
  assert.deepEqual(inputs.owned.unavailable.filter((u) => /^(similar-logos|trademark)@1/.test(u)), [`similar-logos@1: ${C.API_UNAVAILABLE}`, `trademark@1: ${C.API_UNAVAILABLE}`]);
  for (const id of ['similar-logos', 'trademark']) assert.match(fs.readFileSync(path.join(C.SKILL, 'measures', id, 'MEASURE.md'), 'utf8'), /부르지 않음 — API 가 열리면 `--api`/);
  assert.match(C.factorSheet(pack, byId(pack, 'owned')), /\*\*측정기를 못 쓰면\*\* 같은 업계 로고 10개 비교판/);
});

test('color@3 — 색 여덟(시험 값 2) · 바탕 흰색 · 검정 · 판 3 · 측정 못 하면 안 봄', async () => {
  const pack = must('tinysolver/color');
  assert.deepEqual([pack.version, pack.format, pack.license], ['3', '3', 'Apache-2.0']);
  assert.deepEqual([byId(pack, 'light-contrast').params.paper, byId(pack, 'dark-variant').params.ink], ['#ffffff', '#000000']);
  for (const f of pack.factors) assert.ok(!C.judgeFills(f, pack.format), `${f.id} — 판정으로 채우지 않는다`);
  for (const c of conf.color) {
    const cells = await C.measureCells(pack, { color: { hex: c.hex, ...(c.dark ? { dark: c.dark } : {}) } }, { ctx });
    assert.deepEqual(Object.fromEntries(Object.entries(cells).map(([id, cell]) => [id, cell[0]])), c.scores, c.hex);
    assert.equal(cells['light-contrast'][2].measured['c.shape_min'], c.light, `${c.hex} 밝은 대비`);
    assert.equal(cells['dark-variant'][2].measured['d.ratio'], c.dark_ratio, `${c.hex} 어두운 판 대비`);
    assert.equal(cells['dark-variant'][2].measured['d.dark'], c.dark_out, `${c.hex} 어두운 판`);
    assert.equal(cells['dark-variant'][2].measured['d.made'], c.made, `${c.hex} 만듦`);
    assert.equal(cells['common-distance'][2].measured['blue.de_min'], c.common, `${c.hex} 흔한 파랑`);
    assert.equal(cells['trend-distance'][2].measured['trend.de_min'], c.trend, `${c.hex} 유행 보라`);
  }
  const blue = await C.measureCells(pack, { color: { hex: '#34447b' } }, { ctx });
  assert.equal(blue['common-distance'][1], '흔한 파랑 #004ea1 까지 ΔE 8.1');
  assert.equal(blue['dark-variant'][1], '#8d96b5(만듦) / #000000 7.2:1');
  for (const f of pack.factors) assert.equal(blue[f.id][1], f.evidence.example, `${f.id} — 근거 예는 #34447b 를 잰 글`);
  const none = await C.measureCells(pack, { color: {} }, { ctx });
  assert.equal(none['light-contrast'][0], null, '색이 없으면 안 봄');
  assert.match(none['light-contrast'][1], /^측정 못 함 — contrast@1: /, '잴 색을 못 받음(missing) — 측정 못 함');
});

test('측정 null 셀 근거 — 측정기를 못 쓰거나 잴 것을 못 받으면(missing) 측정 못 함 · 쟀지만 정하지 않으면(undecided 만) 정하지 않음', async () => {
  const logo = must('tinysolver/logo@3');
  const half = await C.measureCells(logo, { tokens: { light: { bg: '#ffffff' } } }, { ctx });
  assert.equal(half.contrast[0], null);
  assert.match(half.contrast[1], /^측정 못 함 — contrast@1: /, '토큰이 빠짐 — 잴 것을 못 받음');
  const swap = (code) => ({ ...ctx, measures: new Map([...ctx.measures].map(([k, m]) => [k, k === 'contrast' ? { ...m, code } : m])) });
  const none = await C.measureCells(logo, { tokens: TOKENS }, { ctx: swap(null) });
  assert.deepEqual(none.contrast.slice(0, 2), [null, '측정 못 함 — contrast@1: 코드 없음']);
  const und = await C.measureCells(logo, { tokens: TOKENS }, { ctx: swap(async () => ({ pass: null, missing: [], undecided: ['a.svg circle 밖 3px — 정하지 않음'] })) });
  assert.deepEqual(und.contrast.slice(0, 2), [null, '정하지 않음 — contrast@1: a.svg circle 밖 3px — 정하지 않음']);
  const mix = await C.measureCells(logo, { tokens: TOKENS }, { ctx: swap(async () => ({ pass: null, missing: ['b.svg 없음'], undecided: ['a.svg circle 밖 3px — 정하지 않음'] })) });
  assert.deepEqual(mix.contrast.slice(0, 2), [null, '측정 못 함 — contrast@1: b.svg 없음 · a.svg circle 밖 3px — 정하지 않음'], '판 하나라도 못 받았으면 측정 못 함');
  assert.deepEqual(C.NULL_HEADS, { lost: '측정 못 함', undecided: '정하지 않음' });
});

test('시험 글꼴 — 저장소에 없다(.gitignore) · make.mjs 가 made.json 의 바이트를 만든다 · 없으면 validate 는 그 시험 값만 건너뛴다', async (t) => {
  const listed = [];
  for (const id of ['font-license', 'glyph-coverage']) {
    const dir = path.join(C.SKILL, 'measures', id, 'fixtures');
    for (const f of Object.keys(readJ(path.join(dir, 'made.json')).files)) listed.push(path.relative(REPO, path.join(dir, f)).split(path.sep).join('/'));
  }
  const git = (...a) => spawnSync('git', ['-C', REPO, ...a], { encoding: 'utf8' });
  if (git('rev-parse', '--git-dir').status === 0) {
    assert.deepEqual(git('check-ignore', '--no-index', ...listed).stdout.trim().split('\n').sort(), [...listed].sort(), '만든 시험 파일은 모두 .gitignore 에 걸린다');
    assert.deepEqual(git('ls-files').stdout.split('\n').filter((f) => /\.(?:otf|ttf|ttc|woff2?)$/i.test(f)), [], '저장소에 글꼴 파일이 없다');
  }
  if (UNMADE.length) return t.skip(`시험 글꼴을 만들지 못함(opentype.js 없음) — ${UNMADE.length}개`);
  const skill = mktmp('brand-criteria-unmade-');
  fs.cpSync(C.SKILL, skill, { recursive: true, filter: (s) => !/\.(?:otf|ttc)$|with-file\/OFL\.txt$/.test(s) });
  // 사본은 임시 폴더라 위로 node_modules 가 없다 — 원본(저장소 루트에 깐 opentype.js)을 사본에 잇는다
  const made = readJ(path.join(C.SKILL, 'measures/font-license/fixtures/made.json'));
  assert.deepEqual(made.needs, ['opentype.js@2.0.0'], '같은 바이트는 opentype.js 판에 달려 있다 — 판까지 적는다');
  assert.equal(linkNeeds(skill, path.join(C.SKILL, 'measures/font-license/fixtures/make.mjs'), made.needs), 1, '원본 자리에서 찾은 opentype.js');
  const errs = [], skipped = [];
  await C.runVectors(C.context({ skill }), errs, skipped);
  assert.deepEqual(errs, []);
  for (const id of ['font-license', 'glyph-coverage']) assert.ok(skipped.some((x) => x.startsWith(`${id}@1: 시험 파일 없음 — node <스킬>/measures/${id}/fixtures/make.mjs`)), skipped.join('\n'));
  for (const id of ['glyph-coverage', 'font-license']) assert.equal(spawnSync(process.execPath, [path.join(skill, 'measures', id, 'fixtures/make.mjs')], { encoding: 'utf8' }).status, 0, id);
  assert.deepEqual(makeFixtures(skill), [], '같은 바이트');
  fs.rmSync(skill, { recursive: true, force: true });
});

test('contrast — 시험 토큰이면 통과 · 근거 글 글자까지 · 타일 대비', async () => {
  const want = [true, '#0e7490 / #d9fed1 4.86:1 · #5ba0b4 / #0d1f12 5.84:1 · #16241a / #d9fed1 14.64:1 · #dcedd4 / #0d1f12 14.00:1'];
  assert.deepEqual((await C.measureCells(must('tinysolver/logo@3'), { tokens: TOKENS }, { ctx })).contrast.slice(0, 2), want);
  const tiles = await C.measureCells(must('tinysolver/icon@3'), { tiles: [{ id: 'a', fg: '#ffffff', bg: '#ec79ec' }, { id: 'b', fg: '#ffffff', bg: '#4b8f3d' }] }, { ctx });
  assert.deepEqual(tiles.contrast.slice(0, 2), [false, 'a #ffffff / #ec79ec 2.47:1 · b #ffffff / #4b8f3d 3.97:1']);
});

test('셈 — 지어낸 라운드 셋 · 아홉 방향(시험 값 3)을 풀린 팩으로 다시 센다', () => {
  assert.equal(conf.tally.length, 9);
  for (const x of conf.tally) {
    const want = { total: x.total, max: x.max, blocked: x.blocked, unseen: x.unseen, below: x.below, confirm: x.confirm, state: x.state };
    assert.deepEqual(C.tally(must(x.pack), cellsOf(x.gates, x.scores)), want, `${x.round} ${x.direction}`);
  }
});

test('판 3 — icon@3 = logo@3 + 볼 판 · 아이콘 글 + intuitive · license · 근거 규칙 · crop fallback', () => {
  const logo = must('tinysolver/logo@3'), icon = must('tinysolver/icon');
  assert.deepEqual([logo.format, icon.format, logo.license, icon.license], ['3', '3', 'Apache-2.0', 'Apache-2.0']);
  assert.deepEqual(icon.chain, ['tinysolver/logo@3', 'tinysolver/icon@3']);
  assert.deepEqual(icon.factors.map((f) => f.id), [...logo.factors.map((f) => f.id), 'intuitive']);
  assert.deepEqual(icon.rules, logo.rules, '규칙은 물려받는다');
  assert.ok(logo.rules.some((r) => /근거 없는 문턱 통과는 안 봄\(null\)/.test(r)), '규칙에 근거 없는 통과 → 안 봄');
  assert.deepEqual(byId(icon, 'contrast').params.pairs, []);
  assert.deepEqual(byId(icon, 'small').params, { min_px: 20, roles: ['icon', 'icon_small'] });
  assert.match(byId(logo, 'small').pass, /^16px/);
  assert.match(byId(icon, 'small').pass, /^20px/);
  for (const id of ['simple', 'fit', 'one', 'lasting']) assert.equal(byId(icon, id).hash, byId(logo, id).hash, `${id} — 안 바꾼 기준은 같은 해시`);
  assert.deepEqual(['small', 'contrast', 'mono', 'distinct', 'family'].map((id) => byId(icon, id).origin), ['set', 'set', 'override', 'override', 'override']);
  assert.match(byId(icon, 'distinct').body, /같은 분야 앱 아이콘 10개 사이에 섞어/, '본문 글 틀은 물려받은 params 로 채운다');
  for (const f of logo.factors) for (const k of ['ask', 'pass', 'two', 'zero', 'body']) assert.doesNotMatch(f[k] || '', /로고: |아이콘: |아이콘이면 |아이콘은 \d|아이콘은 그림과/, `logo ${f.id}.${k} — 두 갈래 글이 없다`);
  const withOf = (p, id, use) => byId(p, id).measure.find((m) => m.use === use).with;
  for (const id of ['small', 'mono', 'culture', 'owned', 'crop']) assert.ok(!jsonHas(withOf(icon, id, byId(icon, id).measure[0].use), 'mark'), `${id} — 아이콘 팩이 mark 판을 보지 않는다`);
  // crop — safe-area 정의(108 캔버스 지름 66 원 · maskable 지름 80%)와 같은 글 · 측정 못 하면 fallback 대로
  const crop = byId(logo, 'crop');
  assert.ok(C.judgeFills(crop, logo.format));
  assert.match(crop.pass, /108 캔버스 가운데 지름 66 원/);
  assert.match(crop.pass, /지름 80% 원/);
  // crop — 자리마다 판을 놓는 비율(fit)로 잰다 · 아이콘은 적응형 · maskable 만 fit, iOS 모서리는 파일 그대로, 원형은 정하지 않음
  assert.deepEqual(crop.params.fit, { circle: 0.6, 'ios-corner': 0.68, 'android-adaptive': 0.46, maskable: 0.54 });
  assert.deepEqual(crop.measure[0].with.fit, crop.params.fit);
  assert.deepEqual([byId(icon, 'crop').params.fit, byId(icon, 'crop').params.as_is], [{ 'android-adaptive': 0.48, maskable: 0.64 }, ['ios-corner']]);
  // 근거 모양 — 판정이 채운 crop · culture 는 정한 머리로 시작해야 통과가 산다
  assert.equal(C.judgeCell(crop, [true, '(측정 못 함 — 마스크 판) mark.svg — 넷 다 안 잘림'], null, '3')[0], true);
  assert.equal(C.judgeCell(crop, [true, '(정하지 않음 — 마스크 판) 원형에서 그림이 다 남는다'], null, '3')[0], true);
  assert.equal(C.judgeCell(crop, [true, '(측정기 없음 — 마스크 판) mark.svg — 넷 다 안 잘림'], null, '3')[0], null, '머리는 셀 근거와 같은 낱말 — 옛 머리는 정한 모양이 아니다');
  assert.equal(C.judgeCell(crop, [true, '마스크 판 넷 다 안 잘림'], null, '3')[0], null);
  assert.equal(C.judgeCell(crop, [false, '적응형에서 잘린다'], null, '3')[0], false, '막힘은 깎지 않는다');
  assert.match(crop.evidence.example, new RegExp(crop.evidence.pattern, 'u'));
  const culture = byId(logo, 'culture');
  assert.match(culture.evidence.example, new RegExp(culture.evidence.pattern, 'u'));
  assert.equal(C.judgeCell(culture, [[true, 'KR 없음 · JP 없음'], [true, '(에이전트 판단 · 현지 확인 전) b'], [true, '(에이전트 판단 · 현지 확인 전) c']], null, '3')[0], null, '머리 없는 통과 한 번 → 합쳐도 안 봄');
  assert.ok(!C.judgeFills(byId(logo, 'contrast'), logo.format), '판 3 — fallback 없는 contrast 는 측정 못 하면 안 봄');
  assert.equal(C.resolvePack('tinysolver/icon', { from: REPO }).pack.hash, icon.hash, '해시는 결정적');
});

test('커스텀 팩 — example/kids-logo: logo@3 을 물려받아 trace 문턱을 더하고 lasting 을 끈다', () => {
  const kid = must(KIDS), logo = must('tinysolver/logo@3');
  assert.deepEqual(kid.chain, ['tinysolver/logo@3', 'example/kids-logo@1']);
  assert.equal(kid.format, '3', '규격 판은 상속 차례 맨 앞 팩을 따른다');
  assert.ok(kid.disabled.lasting);
  const gates = kid.factors.filter((f) => f.type === 'gate').map((f) => f.id);
  assert.deepEqual(gates, ['small', 'mono', 'contrast', 'culture', 'owned', 'crop', 'trace']);
  assert.deepEqual(kid.factors.filter((f) => f.type === 'score').map((f) => f.id), ['simple', 'distinct', 'fit', 'one', 'family']);
  assert.equal(byId(kid, 'trace').ask, '6살 아이가 보고 따라 그릴 수 있나?');
  for (const f of kid.factors.filter((x) => x.id !== 'trace')) assert.equal(f.hash, byId(logo, f.id).hash, f.id);
  const t = C.tally(kid, { gates: Object.fromEntries(gates.map((g) => [g, [true, '']])), scores: { simple: [2, ''], distinct: [2, ''], fit: [2, ''], one: [2, ''], family: [1, ''], lasting: [0, ''] } });
  assert.deepEqual(t, { total: 9, max: 10, blocked: [], unseen: [], below: [], confirm: ['culture', 'owned', 'trace'], state: 'ok' });
  const out = cli('resolve', KIDS, '--json');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(JSON.parse(out.stdout).hash, kid.hash);
});

test('상속 — 시험 팩 lineup/logo@1 · 기준 13 · 만점 14 · 같은 셈(시험 값 4)', () => {
  const x = conf.inherit;
  const u = readJ(path.join(C.SKILL, x.use));
  const gp = must(u.logo, { from: path.dirname(path.join(C.SKILL, x.use)) }), logo = must('tinysolver/logo@3');
  assert.equal(`${gp.id}@${gp.version}`, x.pack);
  assert.deepEqual(gp.chain, x.chain);
  assert.deepEqual(gp.factors.filter((f) => f.type === 'gate').map((f) => f.id), x.gates);
  assert.deepEqual(gp.factors.filter((f) => f.type === 'score').map((f) => f.id), x.scores);
  assert.deepEqual(Object.fromEntries(gp.factors.filter((f) => f.weight > 1).map((f) => [f.id, f.weight])), x.weights);
  assert.deepEqual(gp.factors.filter((f) => byId(logo, f.id) && byId(logo, f.id).hash !== f.hash).map((f) => f.id), x.changed);
  assert.deepEqual(gp.factors.filter((f) => f.origin === 'add').map((f) => f.id), x.added);
  assert.match(byId(gp, 'family').body, /\n## 이 팩에서 덧붙임\n/);
  assert.ok(byId(gp, 'family').body.startsWith(byId(logo, 'family').body), '기본 본문은 그대로 따라 받는다');
  for (const d of x.directions) assert.deepEqual(C.tally(gp, cellsOf(d.gates, d.scores)), { total: d.total, max: d.max, blocked: d.blocked, unseen: d.unseen, below: d.below, confirm: d.confirm, state: d.state }, d.direction);
});

test('커스텀 팩 — override(본문 · 글 · 무게) · disable · recommend 가 셈을 바꾼다', () => {
  const root = tmp('nook');
  W(root, 'packs/nook/logo/PACK.md', { id: 'nook/logo', version: '1', name: 'nook 로고 기준', description: '가게 하나 — 늘릴 계획 없음', kind: 'logo', extends: 'tinysolver/logo@3', disable: { family: '가게 하나 — 늘릴 계획이 없다' }, recommend: { total_ratio: 0.8 } }, '## 규칙\n- 가게 하나라 가족은 보지 않는다.');
  W(root, 'packs/nook/logo/factors/fit.md', { id: 'fit', override: true, two: "아이와 부모 둘 다에게 '책을 함께 읽는 앱'이 한 문장으로 이어진다.", weight: 2 }, judgeBody);
  const nook = must(path.join(root, 'packs/nook/logo')), logo = must('tinysolver/logo@3');
  fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(nook.recommend, { score_min: 1, total_ratio: 0.8 });
  assert.deepEqual(nook.rules, ['가게 하나라 가족은 보지 않는다.']);
  const fit = byId(nook, 'fit');
  assert.deepEqual([fit.origin, fit.weight, fit.body], ['override', 2, judgeBody]);
  assert.equal(fit.zero, byId(logo, 'fit').zero, '덮지 않은 칸은 물려받는다');
  assert.notEqual(fit.hash, byId(logo, 'fit').hash);
  const gates = Object.fromEntries(nook.factors.filter((f) => f.type === 'gate').map((f) => [f.id, true]));
  const cells = cellsOf(gates, { simple: 2, distinct: 2, fit: 1, one: 2, lasting: 1, family: 0 });
  assert.deepEqual(C.tally(nook, cells), { total: 9, max: 12, blocked: [], unseen: [], below: [], confirm: ['culture', 'owned'], state: 'below' });
  assert.equal(C.tally({ ...nook, recommend: { score_min: 1, total_ratio: 0.75 } }, cells).state, 'ok');
});

test('셈 — 사람 확인: 값이 있고 확인 · 뒤집기 전인 셀만 남는다 · state 는 바꾸지 않는다', () => {
  const logo = must('tinysolver/logo@3');
  const all = Object.fromEntries(logo.factors.filter((f) => f.type === 'gate').map((f) => [f.id, [true, '']]));
  const scores = Object.fromEntries(logo.factors.filter((f) => f.type === 'score').map((f) => [f.id, [2, '']]));
  assert.deepEqual(C.tally(logo, { gates: all, scores }).confirm, ['culture', 'owned']);
  const done = { ...all, culture: [true, '', { confirm: { status: 'confirmed' } }], owned: [true, '', { confirm: { status: 'pending' } }] };
  assert.deepEqual(C.tally(logo, { gates: done, scores }), { total: 12, max: 12, blocked: [], unseen: [], below: [], confirm: ['owned'], state: 'ok' });
  assert.deepEqual(C.tally(logo, { gates: { ...all, owned: [null, ''] }, scores }).confirm, ['culture'], '안 본 셀은 확인할 것이 없다');
});

test('판정 셀 — 근거 검사(판 3: 근거 없는 2점 → 1점 · 근거 없는 통과 → 안 봄) · trials 합치기', () => {
  const l3 = must('tinysolver/logo@3');
  const simple = byId(l3, 'simple'), culture = byId(l3, 'culture'), contrast = byId(l3, 'contrast'), small = byId(l3, 'small');
  assert.deepEqual(C.judgeCell(simple, [2, ''], null, '3').slice(0, 2), [1, ''], '근거 없는 2점은 1점');
  assert.equal(C.judgeCell(simple, [2, ''], null, '3')[2].cut, '근거 없는 2점 → 1점');
  assert.equal(C.judgeCell(simple, [2, '요소 둘 · 색 하나'], null, '3')[0], 2);
  assert.equal(C.judgeCell(simple, [3, '요소 둘'], null)[0], null, '허용 밖 값은 null');
  assert.equal(C.judgeCell(simple, ['2', '요소 둘'], null)[0], null, '글자 "2" 는 값이 아니다');
  const s3 = C.judgeCell(small, [true, ''], null, l3.format);
  assert.deepEqual([s3[0], s3[2].cut], [null, '근거 없는 문턱 통과 → 안 봄(null)']);
  assert.equal(C.judgeCell(small, [true, '16px 에서 고리 + 점이 보인다'], null, '3')[0], true);
  assert.equal(C.judgeCell(small, [false, ''], null, '3')[0], false, '막힘은 근거가 없어도 막힘');
  assert.equal(C.judgeCell(contrast, [true, '보기에 또렷'], null, '3')[0], null, '판 3 — 정한 모양(pattern)이 아닌 근거의 통과는 안 봄');
  const c = C.judgeCell(culture, [[true, '(에이전트 판단 · 현지 확인 전) a'], [false, '(에이전트 판단 · 현지 확인 전) 닫기 X 로 읽힌다'], [true, '(에이전트 판단 · 현지 확인 전) c']], null, '3');
  assert.deepEqual([c[0], c[1], c[2].trials], [false, '(에이전트 판단 · 현지 확인 전) 닫기 X 로 읽힌다', [true, false, true]], 'any_false — 한 번의 나쁜 읽힘으로 막는다');
  assert.deepEqual(c[2].confirm, { need: 'KR · JP · CN · US 현지 사람이 한 줄씩 확인', status: 'pending' });
  assert.equal(C.judgeCell(culture, [[true, 'a'], [true, ''], [true, 'c']], null, '3')[0], null, 'any_false — 근거 없는 한 번이 안 봄이면 합쳐도 안 봄');
  assert.equal(C.judgeCell(culture, [null, '볼 그림 없음'], null)[2].confirm, undefined, '안 본 셀은 사람 확인이 없다');
  assert.equal(C.judgeCell(culture, [true, '(에이전트 판단 · 현지 확인 전) a'], null, '3')[2].trials_short, '1/3', 'trials 3 인데 한 번만 매기면 남긴다');
  assert.equal(c[2].trials_short, undefined);
  assert.equal(C.aggregate('median', 'score', [2, 0, 1]), 1);
  assert.equal(C.aggregate('median', 'score', [2, 1]), 1, '짝수면 낮은 쪽');
  assert.equal(C.aggregate('majority', 'gate', [true, false]), null, '동률이면 null');
  assert.equal(C.aggregate('majority', 'gate', [true, true, false]), true);
  assert.equal(C.aggregate('min', 'score', [2, 1, null]), 1);
  assert.match(C.factorSheet(l3, small), /문턱 통과\(true\)는 안 봄\(null\)으로 깎인다/);
});

test('라운드 — prepare → answers → finish → confirm → verify (예시 kids-app)', async () => {
  const root = tmp('round');
  fs.cpSync(path.join(C.SKILL, 'examples/kids-app'), path.join(root, 'brand'), { recursive: true });
  const round = path.join(root, 'brand/rounds/01'), c = path.join(round, '.criteria');
  const p = run(RUNNER, ['prepare', 'brand/rounds/01'], root);
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /팩 example\/kids-logo@1/);
  const measured = readJ(path.join(c, 'measured.json'));
  const cropMeasured = measured.ring.cells.crop[0] !== null; // 측정이 값을 내면 측정이 정한다 — playwright-core 가 없으면 null(fallback)
  if (cropMeasured) assert.deepEqual([measured.ring.cells.crop[0], measured.star.cells.crop[0]], [true, true], '자리마다 놓는 비율(fit)로 놓으면 ring · star 모두 안 잘린다');
  for (const f of ['resolved/logo.json', 'measured.json', 'answers.json', 'board.html', 'tasks/logo/culture.md', 'tasks/logo/trace.md']) assert.ok(fs.existsSync(path.join(c, f)), f);
  assert.equal(fs.existsSync(path.join(c, 'tasks/logo/crop.md')), !cropMeasured, '측정 못 한 crop 만 판정 과제(fallback)');
  assert.ok(!fs.existsSync(path.join(c, 'tasks/logo/contrast.md')), '측정이 정한 기준은 과제가 없다');
  assert.ok(!fs.existsSync(path.join(c, 'tasks/logo/lasting.md')), '끈 기준은 과제가 없다');
  if (!cropMeasured) assert.match(fs.readFileSync(path.join(c, 'tasks/logo/crop.md'), 'utf8'), /(측정 못 함|정하지 않음) — '측정기를 못 쓰면' 대로 채운다/);
  const board = fs.readFileSync(path.join(c, 'board.html'), 'utf8');
  assert.match(board, /src="\.\.\/directions\/ring\/mark\.svg"/);
  assert.match(board, /src="\.\.\/directions\/ring\/mark-dark\.svg"/, '어두운 바탕에는 어두운 판');
  for (const css of ['filter:grayscale(1)', 'border-radius:50%', 'border-radius:22.5%', 'clip-path:circle(30.56% at 50% 50%)', 'clip-path:circle(40% at 50% 50%)']) assert.ok(board.includes(css), css);
  for (const cap of ['원형 · 0.6', 'iOS 모서리 · 0.68', '안드로이드 적응형 · 0.46', 'maskable · 0.54']) assert.ok(board.includes(`<figcaption>${cap}</figcaption>`), `비교판 마스크 판은 crop fit 비율로 — ${cap}`);
  assert.match(fs.readFileSync(path.join(c, 'tasks/logo/distinct.md'), 'utf8'), /blue\.de_min = 38\.8353/, '판정 재료 — 색 거리');
  assert.match(fs.readFileSync(path.join(c, 'tasks/logo/small.md'), 'utf8'), /근거가 비었거나 정한 모양\(pattern\)이 아니면 2점은 1점, 문턱 통과\(true\)는 안 봄\(null\)/);
  assert.equal(measured.ring.cells.contrast[0], true);
  assert.deepEqual(readJ(path.join(c, 'answers.json')), { ring: {}, star: {} });
  fs.writeFileSync(path.join(c, 'answers.json'), JSON.stringify({
    ring: { small: [true, 'mark 16 · 20px — 고리 + 점'], mono: [false, '한 색 판 없음'], contrast: [false, '내 눈엔 흐림'], culture: [[true, '(에이전트 판단 · 현지 확인 전) 걸리지 않음']], owned: [null, '비교판 아직'], crop: [false, '(측정 못 함 — 마스크 판) 적응형에서 고리가 잘린다'], simple: [2, ''], distinct: [2, '흔한 파랑과 ΔE 38.8'], fit: [1, '하루 한 장과 약하게 이어진다'], one: [2, '점 하나 = 하루 한 장'], family: [0, '규칙 없음'], trace: [true, '(판정하는 쪽의 가늠) 동그라미 + 점'] },
    star: { small: [true, ''], mono: [true, '한 색 판에서도 별 윤곽이 남는다'] },
    nope: { simple: [1, 'x'] },
  }));
  const f = run(RUNNER, ['finish', 'brand/rounds/01', '--judge', '시험'], root);
  assert.equal(f.status, 0, f.stderr);
  assert.match(f.stderr, /방향 'nope' 는 이 라운드에 없다/);
  assert.match(f.stderr, /ring 의 'contrast' — 측정값이 있어 답을 쓰지 않았다/);
  assert.match(f.stdout, /ring simple — 근거 없는 2점 → 1점/);
  assert.match(f.stdout, /star small — 근거 없는 문턱 통과 → 안 봄\(null\)/);
  const s = readJ(path.join(round, 'score.json'));
  assert.equal(s.criteria, undefined, '커스텀 팩이면 criteria 칸을 쓰지 않는다');
  assert.match(s.$comment, /규격 3/);
  assert.deepEqual([s.packs.logo.ref, s.runner.by, s.runner.judge, s.runner.independent], ['example/kids-logo@1', 'skill', '시험', false]);
  assert.equal(s.runner.core, `brand-criteria ${C.VERSION}`);
  assert.match(s.date, /^\d{4}-\d{2}-\d{2}$/);
  const ring = s.directions.ring, crop = cropMeasured ? measured.ring.cells.crop[0] : false;
  assert.equal(ring.scores.simple[0], 1);
  assert.equal(ring.gates.contrast[0], true, '측정이 정한 셀은 답이 덮지 못한다');
  assert.equal(ring.gates.contrast[2].by, 'measure');
  assert.equal(ring.gates.crop[0], crop);
  if (!cropMeasured) assert.deepEqual([ring.gates.crop[2].by, ring.gates.crop[2].unavailable.length > 0], ['judge', true], '측정 못 한 crop 은 fallback 대로 판정이 채운다');
  assert.equal(ring.scores.lasting, undefined, '끈 기준은 셀이 없다');
  assert.deepEqual(ring.tally, { total: 6, max: 10, blocked: ['mono', ...(crop === false ? ['crop'] : [])], unseen: crop === null ? ['owned', 'crop'] : ['owned'], below: ['family'], confirm: ['culture', 'trace'], state: 'blocked' });
  assert.equal(s.directions.star.gates.small[0], null);
  assert.equal(s.directions.star.tally.state, measured.star.cells.crop[0] === false ? 'blocked' : 'unseen');
  // 맞추기 — 방금 낸 결과는 같다
  const v = run(RUNNER, ['verify', 'brand/rounds/01'], root);
  assert.equal(v.status, 0, v.stderr + v.stdout);
  assert.match(v.stdout, /다시 낸 것과 같다/);
  // 사람 확인 · 뒤집기 → 다음 finish 가 덮지 않는다
  const cf = run(RUNNER, ['confirm', 'brand/rounds/01', 'ring', 'trace', '--by', '부모', '--value', 'false'], root);
  assert.equal(cf.status, 0, cf.stderr);
  const s2 = readJ(path.join(round, 'score.json'));
  assert.deepEqual([s2.directions.ring.gates.trace[0], s2.directions.ring.gates.trace[2].confirm.status, s2.directions.ring.gates.trace[2].confirm.was], [false, 'overturned', true]);
  assert.match(s2.directions.ring.gates.trace[2].confirm.at, /Z$/, '기록 시각은 UTC');
  assert.ok(s2.directions.ring.tally.blocked.includes('trace'));
  const nomeasure = run(RUNNER, ['confirm', 'brand/rounds/01', 'ring', 'contrast', '--by', '부모', '--value', 'false'], root);
  assert.equal(nomeasure.status, 1, '측정이 정한 셀은 뒤집지 않는다');
  assert.match(nomeasure.stderr, /측정이 정한 셀은 뒤집지 않는다/);
  assert.equal(run(RUNNER, ['confirm', 'brand/rounds/01', 'ring', 'culture', '--by', '현지 확인자'], root).status, 0);
  const withNote = readJ(path.join(round, 'score.json'));
  withNote.summary = '사람이 쓴 요약';
  withNote.share = { consent: 'none' };
  withNote.directions.ring.picked_note = '방향에 사람이 쓴 칸';
  fs.writeFileSync(path.join(round, 'score.json'), JSON.stringify(withNote));
  assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
  const s3 = readJ(path.join(round, 'score.json'));
  assert.equal(s3.directions.ring.gates.trace[0], false, '사람이 뒤집은 셀은 덮지 않는다');
  assert.equal(s3.directions.ring.gates.culture[2].confirm.status, 'confirmed');
  assert.deepEqual(s3.directions.ring.tally.confirm, []);
  assert.deepEqual([s3.summary, s3.share, s3.directions.ring.picked_note], ['사람이 쓴 요약', { consent: 'none' }, '방향에 사람이 쓴 칸'], '모르는 칸은 남긴다');
  assert.equal(s3.runner.judge, '시험', '판정 모델 이름은 남긴다');
  assert.equal(run(RUNNER, ['verify', 'brand/rounds/01'], root).status, 0, '사람 확인 뒤에도 같다');
  // 맞추기 — 고친 결과는 다르다
  const bad = readJ(path.join(round, 'score.json'));
  bad.directions.ring.gates.contrast[1] = '#9b2c2c / #ffffe5 9.99:1';
  bad.directions.star.gates.mono = [true, '', { by: 'judge', factor: bad.directions.star.gates.mono[2].factor }];
  bad.directions.star.scores.simple = [2, '', { by: 'judge', factor: bad.directions.star.scores.simple?.[2]?.factor ?? byId(must(KIDS), 'simple').hash }];
  fs.writeFileSync(path.join(round, 'score.json'), JSON.stringify(bad));
  const vb = run(RUNNER, ['verify', 'brand/rounds/01', '--json'], root);
  assert.equal(vb.status, 1);
  const vj = JSON.parse(vb.stdout);
  assert.equal(vj.same, false);
  assert.ok(vj.diffs.some((d) => /^ring contrast: 측정 셀이 다르다/.test(d)), vj.diffs.join('\n'));
  assert.ok(vj.diffs.some((d) => /^star mono: 근거 검사와 다르다 — 근거 없는 문턱 통과 → 안 봄/.test(d)), vj.diffs.join('\n'));
  assert.ok(vj.diffs.some((d) => /^star simple: 근거 검사와 다르다 — 근거 없는 2점 → 1점/.test(d)), vj.diffs.join('\n'));
  assert.ok(vj.diffs.some((d) => /^star: 셈이 다르다/.test(d)), vj.diffs.join('\n'));
  const pk = readJ(path.join(round, 'score.json'));
  pk.packs.logo.hash = 'sha256:0';
  fs.writeFileSync(path.join(round, 'score.json'), JSON.stringify(pk));
  assert.match(run(RUNNER, ['verify', 'brand/rounds/01'], root).stderr, /팩 해시가 다르다/);
  // 확인 명령의 막는 것
  assert.equal(run(RUNNER, ['confirm', 'brand/rounds/01', 'ring', 'simple', '--by', 'x', '--value', '3'], root).status, 1);
  assert.equal(run(RUNNER, ['confirm', 'brand/rounds/01', 'ring', 'simple'], root).status, 1, '--by 가 없으면 막는다');
  fs.rmSync(root, { recursive: true, force: true });
});

test('판 3 — 이미 있던 셀 · 고친 셀 메타도 근거 검사(answers.json 을 거치지 않아도) · 사람 확인은 by · at 이 있어야', () => {
  const root = tmp('strict');
  fs.cpSync(path.join(C.SKILL, 'examples/kids-app'), path.join(root, 'brand'), { recursive: true });
  const round = path.join(root, 'brand/rounds/01'), sj = path.join(round, 'score.json'), ans = path.join(round, '.criteria/answers.json');
  assert.equal(run(RUNNER, ['prepare', 'brand/rounds/01'], root).status, 0);
  const kid = must(KIDS), H = (id) => byId(kid, id).hash;
  // ① 손으로 쓴 셀(메타 없음 · by 를 measure 로 꾸밈 · 사람 확인을 꾸밈)을 finish 가 답처럼 다시 검사한다
  fs.writeFileSync(sj, JSON.stringify({ directions: { ring: { kind: 'logo',
    gates: { small: [true, ''], mono: [true, '', { by: 'measure', factor: H('mono') }], culture: [true, '', { by: 'judge', factor: H('culture'), confirm: { status: 'overturned' } }], trace: [true, '(판정하는 쪽의 가늠) 동그라미 + 점', { by: 'judge', factor: H('trace'), confirm: { need: 'x', status: 'confirmed', by: '부모', at: '2026-10-02T00:00:00.000Z' } }] },
    scores: { simple: [2, ''], fit: [2, '하루 한 장과 이어진다'] } } } }));
  const f = run(RUNNER, ['finish', 'brand/rounds/01'], root);
  assert.equal(f.status, 0, f.stderr);
  for (const [k, cut] of [['small', '근거 없는 문턱 통과'], ['mono', '근거 없는 문턱 통과'], ['culture', '근거 없는 문턱 통과'], ['simple', '근거 없는 2점']]) assert.match(f.stdout, new RegExp(`ring ${k} — ${cut}`), k);
  const s = readJ(sj).directions.ring;
  assert.deepEqual([s.gates.small[0], s.gates.mono[0], s.gates.culture[0], s.scores.simple[0], s.scores.fit[0]], [null, null, null, 1, 2]);
  assert.deepEqual([s.gates.mono[2].by, s.gates.culture[2].confirm], ['judge', undefined], 'by 는 기준이 정한다 · by · at 없는 뒤집기는 사람 확인이 아니다');
  assert.deepEqual([s.gates.trace[0], s.gates.trace[2].confirm.status], [true, 'confirmed'], '근거가 있는 사람 확인 셀은 그대로');
  assert.notEqual(s.tally.state, 'ok');
  assert.equal(run(RUNNER, ['verify', 'brand/rounds/01'], root).status, 0, '다시 검사해 낸 결과는 같다');
  // 셀 · 메타가 바뀌지 않으면 매긴 날도 그대로
  const dated = readJ(sj); dated.date = '2026-01-01'; fs.writeFileSync(sj, JSON.stringify(dated));
  assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
  assert.equal(readJ(sj).date, '2026-01-01', '바뀐 셀이 없으면 date 를 올리지 않는다');
  // ② 근거 있는 답으로 매긴 뒤, 올린 결과를 고쳐도 verify 가 잡는다
  fs.writeFileSync(ans, JSON.stringify({ ring: { small: [true, 'mark 16 · 20px — 고리 + 점'], mono: [true, '한 색 판에서 고리 + 점'], culture: [[true, '(에이전트 판단 · 현지 확인 전) a'], [true, '(에이전트 판단 · 현지 확인 전) b'], [true, '(에이전트 판단 · 현지 확인 전) c']], simple: [2, '요소 둘'] } }));
  fs.writeFileSync(sj, JSON.stringify({}));
  assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
  assert.equal(run(RUNNER, ['verify', 'brand/rounds/01'], root).status, 0);
  const good = readJ(sj);
  // 이미 있는 score.json 은 그 들여쓰기를 따른다 — 셀이 그대로면 파일도 그대로
  fs.writeFileSync(sj, `${JSON.stringify(good, null, 1)}\n`);
  assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
  assert.equal(fs.readFileSync(sj, 'utf8'), `${JSON.stringify(good, null, 1)}\n`, '들여쓰기 한 칸 파일은 한 칸으로 · 바뀐 것 없음');
  const tamper = (fn) => { const x = JSON.parse(JSON.stringify(good)); fn(x.directions.ring); fs.writeFileSync(sj, JSON.stringify(x)); const v = run(RUNNER, ['verify', 'brand/rounds/01', '--json'], root); assert.equal(v.status, 1, v.stdout); return JSON.parse(v.stdout).diffs.join('\n'); };
  assert.match(tamper((d) => { d.gates.small = [true, '']; }), /ring small: 셀 메타\(by · factor\)가 없다/);
  const fake = tamper((d) => { d.gates.mono = [true, '', { by: 'measure', factor: H('mono') }]; delete d.tally; });
  assert.match(fake, /ring mono: 근거 검사와 다르다 — 근거 없는 문턱 통과 → 안 봄/);
  assert.match(fake, /ring: 셈\(tally\)이 없다/);
  const turned = tamper((d) => { d.gates.culture = [true, '', { by: 'judge', factor: H('culture'), confirm: { status: 'overturned' } }]; });
  assert.match(turned, /ring culture: 사람 확인\(overturned\)에 by · at 이 없다/);
  assert.match(tamper((d) => { d.scores.simple = [2, '', { by: 'measure', factor: H('simple') }]; d.tally = C.tally(kid, d); }), /ring simple: 근거 검사와 다르다 — 근거 없는 2점 → 1점/);
  assert.match(tamper((d) => { d.gates.contrast = [false, '#000000 / #ffffff 1.00:1', { by: 'judge', factor: H('contrast') }]; d.tally = C.tally(kid, d); }), /ring contrast: 측정 셀이 다르다/);
  // trials 합치기 다시 — 셀 메타 trials 를 합친 값 · trials_short
  assert.deepEqual([good.directions.ring.gates.culture[0], good.directions.ring.gates.culture[2].trials], [true, [true, true, true]]);
  assert.match(tamper((d) => { d.gates.culture[2].trials = [false, false, false]; }), /ring culture: trials 를 합친 값과 다르다 — 결과 true · 다시 합침\(any_false\) false/);
  assert.match(tamper((d) => { delete d.gates.culture[2].trials; }), /ring culture: trials_short 가 다르다 — 결과 null · 다시 셈 "1\/3"/);
  assert.match(tamper((d) => { d.gates.culture[2].trials_short = '2/3'; }), /ring culture: trials_short 가 다르다 — 결과 "2\/3" · 다시 셈 null/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('라운드 — 측정으로 정하는 기준은 측정 못 하면 안 봄 · 손으로 쓴 사람 표시도 채우지 못한다', () => {
  const root = tmp('nofallback');
  W(root, 'brand/rounds/01/directions/a/direction.json', JSON.stringify({ id: 'a', kind: 'logo', tokens: { light: { bg: '#ffffff' } } }));
  W(root, 'brand/rounds/01/directions/a/mark.svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"/>');
  const p = run(RUNNER, ['prepare', 'brand/rounds/01'], root);
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /측정 못 해 안 봄\(null\)으로 남는 기준/);
  assert.match(p.stdout, /logo\/contrast — a/);
  assert.ok(!fs.existsSync(path.join(root, 'brand/rounds/01/.criteria/tasks/logo/contrast.md')));
  W(root, 'brand/rounds/01/.criteria/answers.json', JSON.stringify({ a: { contrast: [true, '#000000 / #ffffff 21.00:1'] } }));
  const f = run(RUNNER, ['finish', 'brand/rounds/01'], root);
  assert.equal(f.status, 0, f.stderr);
  assert.match(f.stderr, /측정으로 정하는 기준이라 측정 못 하면 안 봄\(null\)/);
  const sj = path.join(root, 'brand/rounds/01/score.json');
  const s = readJ(sj);
  assert.equal(s.directions.a.gates.contrast[0], null);
  assert.equal(s.directions.a.gates.contrast[2].by, 'measure');
  assert.equal(s.criteria, '3', '기본 로고 팩만 썼으면 criteria 는 그 판');
  const logo = must('tinysolver/logo'), hc = byId(logo, 'contrast').hash;
  const forge = (cell) => { const x = readJ(sj); x.directions.a.gates.contrast = cell; x.directions.a.tally = C.tally(logo, x.directions.a); fs.writeFileSync(sj, JSON.stringify(x)); };
  const turned = { status: 'overturned', by: '사람', at: '2026-10-02T00:00:00.000Z', was: null };
  for (const [cell, re] of [
    [[true, '손으로 봄', { by: 'judge', factor: hc, confirm: turned }], /^a contrast: 측정으로 정하는 기준을 판정으로 채웠다/],
    [[true, '#000000 / #ffffff 21.00:1', { by: 'measure', factor: hc, measured: {}, confirm: turned }], /^a contrast: 남긴 측정값\(measured\)으로 다시 낸 셀과 다르다/],
  ]) {
    forge(cell);
    const v = run(RUNNER, ['verify', 'brand/rounds/01', '--json'], root);
    assert.equal(v.status, 1, v.stdout);
    assert.ok(JSON.parse(v.stdout).diffs.some((x) => re.test(x)), v.stdout);
    assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
    const back = readJ(sj).directions.a.gates.contrast;
    assert.deepEqual([back[0], back[2].by, back[2].confirm], [null, 'measure', undefined], '사람 표시가 있어도 측정 못 한 측정 기준은 안 봄');
    assert.equal(run(RUNNER, ['verify', 'brand/rounds/01'], root).status, 0);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('라운드 — 색 라운드 · --kind · --pack', () => {
  const root = tmp('color');
  W(root, 'brand/rounds/01/directions/a/direction.json', JSON.stringify({ id: 'a', color: { hex: '#0e7490', dark: '#5ba0b4' } }));
  W(root, 'brand/rounds/01/directions/b/direction.json', JSON.stringify({ id: 'b', color: { hex: '#9536fa', dark: '#d8b4fe' } }));
  const nokind = run(RUNNER, ['prepare', 'brand/rounds/01'], root);
  assert.equal(nokind.status, 1);
  assert.match(nokind.stderr, /kind 를 모른다/);
  const p = run(RUNNER, ['prepare', 'brand/rounds/01', '--kind', 'color'], root);
  assert.equal(p.status, 0, p.stderr);
  assert.match(p.stdout, /판정할 기준 0/);
  assert.equal(run(RUNNER, ['finish', 'brand/rounds/01'], root).status, 0);
  const c = readJ(path.join(root, 'brand/rounds/01/score.json'));
  assert.equal(c.criteria, undefined);
  assert.deepEqual(Object.values(c.directions.a.scores).map((x) => x[0]), [2, 2, 2, 2]);
  assert.deepEqual(Object.values(c.directions.b.scores).map((x) => x[0]), [2, 2, 2, 0]);
  assert.deepEqual([c.directions.a.tally.state, c.directions.b.tally.state], ['ok', 'below']);
  assert.equal(run(RUNNER, ['verify', 'brand/rounds/01'], root).status, 0);
  assert.equal(run(RUNNER, ['prepare', 'brand/rounds/01'], root).status, 0, '한 번 매긴 라운드는 score.json 에서 kind 를 안다');
  const wrong = run(RUNNER, ['prepare', 'brand/rounds/01', '--kind', 'color', '--pack', 'color=tinysolver/logo'], root);
  assert.equal(wrong.status, 1);
  assert.match(wrong.stderr, /kind 'logo'/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('measure · resolve --factor 명령', () => {
  const m = cli('measure', path.join(C.SKILL, 'examples/kids-app/rounds/01/directions/ring'));
  assert.equal(m.status, 0, m.stderr);
  const k = JSON.parse(m.stdout);
  assert.deepEqual([k.kind, k.pack], ['logo', 'example/kids-logo@1']);
  assert.deepEqual(k.gates.contrast.slice(0, 2), [true, '#9b2c2c / #ffffe5 7.41:1 · #f36868 / #231710 5.82:1 · #281815 / #ffffe5 16.80:1 · #f6f2cb / #231710 15.38:1']);
  assert.equal(k.inputs.distinct.measured['blue.de_min'], 38.8353);
  const s = cli('resolve', 'tinysolver/logo', '--factor', 'simple');
  assert.equal(s.status, 0, s.stderr);
  assert.match(s.stdout, /^# 단순 — `simple` · 점수 · tinysolver\/logo@3/);
  assert.match(s.stdout, /`1` 그럭저럭 — 약점이 보인다/);
  assert.equal(cli('resolve', 'tinysolver/logo', '--factor', 'nope').status, 1);
  assert.equal(cli('resolve', 'nobody/x').status, 1);
  assert.match(cli('resolve', 'tinysolver/logo').stdout, /규격 3 · Apache-2\.0 · 팩 해시/);
  const c3 = cli('resolve', 'tinysolver/logo', '--factor', 'contrast').stdout;
  assert.match(c3, /판정으로 채우지 않는다/);
  assert.match(c3, /## 답 — 쓰지 않는다/);
});

test('글꼴 팩 type@2 — 초안 · 판 3 · license 판정 + 사람 확인 · glyphs 측정', async () => {
  const type = must('tinysolver/type');
  assert.deepEqual([type.status, type.version, type.format, type.license], ['draft', '2', '3', 'Apache-2.0']);
  assert.deepEqual(C.judgeCell(byId(type, 'license'), [true, ''], null, type.format).slice(0, 1), [null], '근거 없는 라이선스 통과는 안 봄');
  assert.deepEqual(type.factors.map((f) => [f.id, f.type, f.decide.by]), [['license', 'gate', 'judge'], ['glyphs', 'gate', 'measure']]);
  assert.equal(byId(type, 'license').confirm.need, '로고 · 윤곽 변환 · 상업 사용을 글꼴 제조사 약관에서 확인');
  assert.ok(!C.judgeFills(byId(type, 'glyphs'), type.format), 'glyphs 는 측정 못 하면 안 봄');
  const cells = await C.measureCells(type, { files: { fonts: ['fonts/a.ttf'] }, context: { name: '예시' } }, { ctx });
  assert.equal(cells.glyphs[2].by, 'measure');
  const out = cli('resolve', 'tinysolver/type');
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /^초안 팩/);
});

test('format 을 안 적은 팩은 판 3 — 근거 없는 문턱 통과는 안 봄', () => {
  const root = tmp('nofmt');
  W(root, 'brand/packs/acme/logo/PACK.md', { id: 'acme/logo', version: '1', name: '시험 팩', description: '시험', kind: 'logo', factors: ['x'] });
  W(root, 'brand/packs/acme/logo/factors/x.md', { id: 'x', type: 'gate', name: '시험 문턱', ask: '묻는 말?', pass: '통과 정의', how: '본다', decide: { by: 'judge' }, evidence: { must: ['본 것'] } }, judgeBody);
  const r = C.resolvePack(path.join(root, 'brand/packs/acme/logo'), { ctx });
  assert.deepEqual(r.errors, []);
  assert.equal(C.FORMAT_DEFAULT, '3');
  assert.equal(r.pack.format, '3');
  assert.equal(C.judgeCell(byId(r.pack, 'x'), [true, ''], null, r.pack.format)[0], null);
  fs.rmSync(root, { recursive: true, force: true });
});

test('깨진 팩 — validate · resolve 가 막는다', async (t) => {
  const root = tmp('bad');
  const Wb = (rel, front, body = '') => W(root, rel, front, body);
  const gate = (id, extra = {}) => ({ id, type: 'gate', name: '시험 문턱', ask: '묻는 말?', pass: '통과 정의', how: '본다', decide: { by: 'judge' }, evidence: { must: ['본 것'] }, ...extra });
  const pack = (id, extra = {}) => ({ id, version: '1', name: '시험 팩', description: '시험', kind: 'logo', extends: 'tinysolver/logo@3', ...extra });
  const cases = {
    schema: [/칸 two .*쓸 수 없다/, () => { Wb('packs/bad/schema/PACK.md', pack('bad/schema', { add: ['x'] })); Wb('packs/bad/schema/factors/x.md', gate('x', { two: '2점' }), judgeBody); }],
    'ring-a': [/extends 고리/, () => { Wb('packs/bad/ring-a/PACK.md', pack('bad/ring-a', { extends: 'bad/ring-b@1' })); Wb('packs/bad/ring-b/PACK.md', pack('bad/ring-b', { extends: 'bad/ring-a@1' })); }],
    measure: [/측정기 'nope' 가 없다/, () => { Wb('packs/bad/measure/PACK.md', pack('bad/measure', { add: ['x'] })); Wb('packs/bad/measure/factors/x.md', gate('x', { measure: [{ use: 'nope@1', as: 'n' }] }), judgeBody); }],
    fence: [/shape_min = 2 — 허용 범위\(3 이상\) 밖이다/, () => Wb('packs/bad/fence/PACK.md', pack('bad/fence', { set: { contrast: { params: { shape_min: 2 } } } }))],
    dup: [/'small' 가 물려받은 기준과 겹친다/, () => { Wb('packs/bad/dup/PACK.md', pack('bad/dup', { add: ['small'] })); Wb('packs/bad/dup/factors/small.md', gate('small'), judgeBody); }],
    param: [/선언 안 된 param 'nope'/, () => Wb('packs/bad/param/PACK.md', pack('bad/param', { set: { small: { params: { nope: 1 } } } }))],
    tmpl: [/모르는 \{\{nothing\}\}/, () => { Wb('packs/bad/tmpl/PACK.md', pack('bad/tmpl', { add: ['x'] })); Wb('packs/bad/tmpl/factors/x.md', gate('x', { ask: '{{nothing}} 인가?' }), judgeBody); }],
    d4: [/extends 가 세 번을 넘는다 — 상속 차례/, () => { Wb('packs/bad/d1/PACK.md', pack('bad/d1')); Wb('packs/bad/d2/PACK.md', pack('bad/d2', { extends: 'bad/d1@1' })); Wb('packs/bad/d3/PACK.md', pack('bad/d3', { extends: 'bad/d2@1' })); Wb('packs/bad/d4/PACK.md', pack('bad/d4', { extends: 'bad/d3@1' })); }],
    api: [/api 측정기 similar-logos@1 를 부르면 fallback/, () => { Wb('packs/bad/api/PACK.md', pack('bad/api', { add: ['x'] })); Wb('packs/bad/api/factors/x.md', gate('x', { measure: [{ use: 'similar-logos@1', as: 's' }] }), judgeBody); }],
    type: [/칸 'type' 는 여기서 쓸 수 없다/, () => Wb('packs/bad/type/PACK.md', pack('bad/type', { set: { small: { type: 'score' } } }))],
    weight: [/문턱 — weight 를 쓸 수 없다/, () => Wb('packs/bad/weight/PACK.md', pack('bad/weight', { set: { small: { weight: 2 } } }))],
    lost: [/팩을 찾지 못함: nobody\/x@1/, () => Wb('packs/bad/lost/PACK.md', pack('bad/lost', { extends: 'nobody/x@1' }))],
    heads: [/판정 기준 본문의 제목은/, () => { Wb('packs/bad/heads/PACK.md', pack('bad/heads', { add: ['x'] })); Wb('packs/bad/heads/factors/x.md', gate('x'), '## 하는 일\n본다'); }],
    disable: [/disable — 물려받은 기준에 'nope' 가 없다/, () => Wb('packs/bad/disable/PACK.md', pack('bad/disable', { disable: { nope: '이유' } }))],
    format: [/format/, () => Wb('packs/bad/format/PACK.md', pack('bad/format', { format: '3' }))],
    pattern: [/evidence\.pattern 이 정규식이 아니다\('u' 플래그\)/, () => { Wb('packs/bad/pattern/PACK.md', pack('bad/pattern', { add: ['x'] })); Wb('packs/bad/pattern/factors/x.md', gate('x', { evidence: { must: ['본 것'], pattern: '\\d+\\:' } }), judgeBody); }],
  };
  for (const [, [, make]] of Object.entries(cases)) make();
  Wb('packs/tinysolver/mine/PACK.md', pack('tinysolver/mine'));
  for (const [name, [re]] of Object.entries(cases)) {
    await t.test(name, () => {
      const r = C.resolvePack(path.join(root, 'packs', 'bad', name), { ctx: C.context() });
      assert.equal(r.pack, null);
      assert.ok(r.errors.some((e) => re.test(e)), `${re} — 나온 것:\n${r.errors.join('\n')}`);
    });
  }
  await t.test('owner tinysolver 를 사용자 프로젝트에 둠', () => {
    const r = C.resolvePack(path.join(root, 'packs', 'tinysolver', 'mine'), { ctx: C.context() });
    assert.ok(r.errors.some((e) => /기본 팩 자리/.test(e)), r.errors.join('\n'));
  });
  await t.test('validate 명령이 끝 코드 1', () => {
    const out = cli('validate', root);
    assert.equal(out.status, 1);
    assert.match(out.stderr, /extends 고리/);
  });
  fs.rmSync(root, { recursive: true, force: true });
});

test('팩 고르기 — 그 kind 를 적은 가장 가까운 use.json · 적지 않은 kind 는 더 위로 · 없으면 tinysolver/<kind> · --pack 이 먼저(시험 값 pick)', () => {
  const x = conf.pick, root = tmp('pick');
  for (const [p, v] of Object.entries(x.use)) W(root, p, JSON.stringify(v));
  for (const k of x.cases) {
    fs.mkdirSync(path.join(root, k.from), { recursive: true });
    assert.equal(C.packFor(k.kind, path.join(root, k.from), k.pack), k.want, `${k.from} ${k.kind}`);
  }
  fs.rmSync(root, { recursive: true, force: true });
});

test('파일 역할 — 이름으로 찾기(<역할>_dark 짝 · fonts/ 의 TTC)', () => {
  const dir = tmp('roles');
  for (const f of ['mark.svg', 'mark-small.svg', 'mark-small-dark.svg', 'lockup.svg', 'lockup-dark.png', 'fonts/a.otf', 'fonts/b.ttc', 'fonts/c.woff2']) W(dir, f, 'x');
  assert.deepEqual(C.filesOf(dir), { mark: 'mark.svg', mark_small: 'mark-small.svg', mark_small_dark: 'mark-small-dark.svg', lockup: 'lockup.svg', lockup_dark: 'lockup-dark.png', fonts: ['fonts/a.otf', 'fonts/b.ttc'] });
  assert.deepEqual(C.filesOf(dir, { files: { mark: 'other.svg' } }).mark, 'other.svg', 'direction.json files 가 이긴다');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('심볼릭 링크로 불러도 명령이 돈다 — npx skills 설치 · 링크로 둔 설정 폴더', () => {
  const root = tmp('link');
  const link = path.join(root, 'skills', 'brand-criteria');
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(C.SKILL, link, process.platform === 'win32' ? 'junction' : 'dir');
  const via = (args, cwd = root) => run(path.join(link, 'scripts', 'criteria.mjs'), args, cwd);
  const v = via(['validate']);
  assert.equal(v.status, 0, v.stderr);
  assert.match(v.stdout, /^문제 없음/, '링크로 불러도 출력이 있다(조용히 끝나지 않는다)');
  fs.cpSync(path.join(C.SKILL, 'examples/kids-app'), path.join(root, 'brand'), { recursive: true });
  assert.equal(via(['prepare', 'brand/rounds/01']).status, 0);
  assert.ok(fs.existsSync(path.join(root, 'brand/rounds/01/.criteria/measured.json')), 'prepare 가 실행 기록을 쓴다');
  assert.equal(via(['finish', 'brand/rounds/01']).status, 0);
  assert.equal(readJ(path.join(root, 'brand/rounds/01/score.json')).packs.logo.ref, 'example/kids-logo@1');
  const vv = via(['verify', 'brand/rounds/01']);
  assert.equal(vv.status, 0, vv.stderr);
  assert.equal(via(['no-such-command']).status, 2, '모르는 명령은 사용법과 끝 코드 2');
  const fileLink = path.join(root, 'criteria-link.mjs');
  fs.symlinkSync(RUNNER, fileLink);
  const f = run(fileLink, ['resolve', 'tinysolver/color'], root);
  assert.equal(f.status, 0, f.stderr);
  assert.match(f.stdout, /^tinysolver\/color@3/, '파일 하나를 링크로 불러도 돈다');
  assert.equal(C.ranDirectly(new URL('../skills/brand-criteria/scripts/criteria.mjs', import.meta.url).href, path.join(link, 'scripts', 'criteria.mjs')), true);
  assert.equal(C.ranDirectly(import.meta.url, ''), false, '부른 파일이 없으면 아니다');
  fs.rmSync(root, { recursive: true, force: true });
});
