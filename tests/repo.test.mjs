// tests/repo.test.mjs — 배포 모양 시험: 매니페스트 · 라이선스 · SKILL.md 표준 칸 · 의존성 0 · 공개 글 일반 규칙(메일 · 사설 IP · 절대 경로)
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { VERSION, FORMAT_DEFAULT, readFront } from '../skills/brand-criteria/scripts/criteria.mjs';

const REPO = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKILL = path.join(REPO, 'skills', 'brand-criteria');
const read = (p) => fs.readFileSync(path.join(REPO, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const SKILLS = fs.readdirSync(path.join(REPO, 'skills')).filter((d) => fs.existsSync(path.join(REPO, 'skills', d, 'SKILL.md'))).sort();
const URL_HOME = 'https://github.com/tiny-solver/brand-skills';
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.criteria'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) out.push({ p, link: true });
    else if (e.isDirectory()) walk(p, out);
    else out.push({ p });
  }
  return out;
}
const TEXT = /\.(?:md|json|mjs|js|svg|html|txt|ya?ml|css)$|(?:^|\/)(?:LICENSE|NOTICE|\.gitignore)$/;
const BINARY = /\.(?:otf|ttf|ttc|woff2?|webp|png|jpe?g|gif|ico)$/i;
// SKILL.md 프런트매터 — 표준 칸(name · description · license · compatibility · metadata · allowed-tools)만 쓰는 작은 YAML 부분집합
function frontOf(text) {
  const lines = text.split('\n');
  assert.equal(lines[0], '---');
  const end = lines.indexOf('---', 1);
  const front = {};
  let nest = null;
  for (const l of lines.slice(1, end)) {
    const m = l.match(/^([a-z-]+):(?: (.*))?$/), n = l.match(/^ {2}([a-z0-9-]+): "(.*)"$/);
    if (m) { nest = m[2] === undefined ? (front[m[1]] = {}) : null; if (m[2] !== undefined) front[m[1]] = m[2]; }
    else if (n && nest) nest[n[1]] = n[2];
    else assert.fail(`읽지 못한 프런트매터 줄: ${l}`);
  }
  return { front, body: lines.slice(end + 1) };
}

test('매니페스트 — 마켓플레이스 tinysolver · 플러그인 brand-skills · 판 · 라이선스 · 주소', () => {
  const m = json('.claude-plugin/marketplace.json'), p = json('.claude-plugin/plugin.json');
  assert.equal(m.name, 'tinysolver');
  assert.equal(p.name, 'brand-skills');
  assert.equal(m.plugins.length, 1);
  assert.equal(m.plugins[0].name, p.name, '카탈로그 항목 이름 = plugin.json 이름');
  assert.equal(m.plugins[0].source, './');
  assert.ok(m.description && m.owner?.name && m.plugins[0].description);
  assert.match(p.version, /^\d+\.\d+\.\d+$/);
  assert.equal(p.version, VERSION, 'plugin.json version = 실행기 VERSION');
  assert.match(p.version, /^0\./, '첫 공개는 0.x');
  assert.deepEqual([p.license, p.homepage, p.repository, p.author?.name], ['Apache-2.0', URL_HOME, URL_HOME, 'tinysolver']);
  for (const n of [m.name, p.name]) assert.match(n, /^[a-z0-9][a-z0-9._-]*$/);
  assert.ok(!/^(claude-|anthropic-|anthropics-|cc-plugin-)/.test(p.name));
  assert.ok(!fs.existsSync(path.join(REPO, 'bin')), '플러그인 루트에 bin/ 을 두지 않는다');
});

test('라이선스 — Apache-2.0 전문 · NOTICE · TRADEMARK · 기본 팩 license 칸', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, 'LICENSE'))).digest('hex');
  assert.equal(sha, 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30', 'LICENSE = apache.org 의 LICENSE-2.0.txt 그대로');
  assert.match(read('NOTICE'), /Apache License, Version 2\.0/);
  assert.match(read('NOTICE'), /TRADEMARK\.md/);
  assert.match(read('NOTICE'), /^Copyright 2026 Tinysolver Inc\. \(주식회사 타이니솔버\)$/m, '권리 주체 = Tinysolver Inc.');
  assert.match(read('TRADEMARK.md'), /Tinysolver Inc\.\(주식회사 타이니솔버\)/);
  assert.match(read('README.md').slice(read('README.md').indexOf('## 결과물')), /Tinysolver Inc\.\(주식회사 타이니솔버/, 'README 결과물 절의 권리 주체');
  assert.match(read('TRADEMARK.md'), /tinysolver 이름과 로고는 이 라이선스에 들어가지 않는다/);
  assert.match(read('CONTRIBUTING.md'), /Signed-off-by/);
  for (const k of ['logo', 'icon', 'color', 'type']) {
    const { front } = readFront(path.join(SKILL, 'packs', 'tinysolver', k, 'PACK.md'));
    assert.equal(front.license, 'Apache-2.0', `tinysolver/${k}`);
  }
});

test('SKILL.md — 표준 칸만 · name = 폴더 · 설명 1024자 이하 · 본문 200줄 이하 · 판이 맞다 · 링크한 파일이 있다', () => {
  assert.deepEqual(SKILLS, ['brand-criteria'], '설치되는 스킬은 하나');
  for (const s of SKILLS) {
    const text = read(`skills/${s}/SKILL.md`), { front, body } = frontOf(text);
    for (const k of Object.keys(front)) assert.ok(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'].includes(k), `${s}: 표준 밖 칸 ${k}`);
    assert.equal(front.name, s);
    assert.match(front.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(front.description.length >= 1 && front.description.length <= 1024, `${s}: description ${front.description.length}자`);
    assert.match(front.description, /[가-힣].*\. [A-Z][^가-힣]+\.$/, `${s}: description 은 한국어 + 영어 한 문장`);
    assert.equal(front.license, 'Apache-2.0');
    assert.ok(!front.compatibility || front.compatibility.length <= 500);
    assert.equal(front.metadata?.version, VERSION, `${s}: metadata.version`);
    assert.equal(front.metadata?.['pack-format'], FORMAT_DEFAULT, `${s}: metadata.pack-format`);
    assert.ok(body.length <= 200, `${s}: 본문 ${body.length}줄`);
    for (const [, href] of text.matchAll(/\]\(([^)#:]+)\)/g)) assert.ok(fs.existsSync(path.join(REPO, 'skills', s, href)), `${s}: 링크 ${href}`);
  }
  const oa = read('skills/brand-criteria/agents/openai.yaml');
  assert.match(oa, /^interface:\n {2}display_name: "/m);
  assert.match(oa, /default_prompt: "[^"]*\$brand-skills:brand-criteria\b/, 'Codex 플러그인 설치에서 부르는 이름 = <플러그인>:<스킬>');
  assert.match(oa, /allow_implicit_invocation: true/);
});

test('스크립트 — 의존성 0(node: 와 상대 경로) · 그림 측정기만 needs 에 적은 패키지를 있으면 쓴다 · 네트워크 모듈 없음', () => {
  const files = walk(SKILL).map((f) => f.p).filter((p) => p.endsWith('.mjs'));
  assert.ok(files.length >= 5);
  for (const f of files) {
    const rel = path.relative(REPO, f), t = fs.readFileSync(f, 'utf8');
    const dev = /\.test\.mjs$/.test(f) || f.includes(`${path.sep}fixtures${path.sep}`); // 시험 · 시험 값 만들기 — 설치 뒤 돌지 않는다
    for (const [, spec] of t.matchAll(/(?:^|\s)from\s+'([^']+)'/gm)) {
      if (dev && !spec.startsWith('node:') && !spec.startsWith('.')) continue;
      assert.ok(spec.startsWith('node:') || spec.startsWith('./') || spec.startsWith('../'), `${rel}: ${spec}`);
    }
    for (const [, spec] of t.matchAll(/import\(\s*'([^']+)'\s*\)/g)) {
      if (dev) continue;
      assert.equal(spec, 'playwright-core', `${rel}: 동적으로 부르는 패키지 ${spec} — 측정기 needs 에 적은 것만`);
    }
    for (const spec of ['node:http', 'node:https', 'node:net', 'node:dgram', 'node:tls', 'node:dns', 'node:http2']) assert.ok(!t.includes(`'${spec}'`), `${rel}: 네트워크 모듈 ${spec}`);
    assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket\(/.test(t), `${rel}: 네트워크 호출`);
  }
  for (const id of ['render', 'safe-area', 'local-similar']) {
    const { front } = readFront(path.join(SKILL, 'measures', id, 'MEASURE.md'));
    assert.deepEqual(front.needs, ['playwright-core'], id);
  }
  assert.ok(!fs.existsSync(path.join(REPO, 'package.json')), '설치되는 플러그인은 의존성 0 — package.json 을 두지 않는다');
});

test('설치 단위 — 스킬 하나 · 스킬 폴더에는 정한 자리만 · 실행기 파일 하나 · 기본 팩 넷', () => {
  for (const f of walk(REPO).map((x) => path.relative(REPO, x.p)).filter((p) => path.basename(p) === 'SKILL.md')) {
    assert.ok(f.startsWith(`skills${path.sep}brand-criteria${path.sep}`), `${f}: SKILL.md 는 skills/brand-criteria/ 에만`);
  }
  assert.ok(!fs.existsSync(path.join(REPO, '.agents')), 'Codex 전용 스킬 자리는 두지 않는다 — 카탈로그는 .claude-plugin/ 하나');
  const top = fs.readdirSync(SKILL).filter((x) => !x.startsWith('.')).sort();
  assert.deepEqual(top, ['SKILL.md', 'agents', 'examples', 'measures', 'packs', 'references', 'refs', 'schema', 'scripts', 'tests']);
  assert.deepEqual(fs.readdirSync(path.join(SKILL, 'scripts')), ['criteria.mjs'], '실행기는 파일 하나');
  assert.deepEqual(fs.readdirSync(path.join(SKILL, 'references')), ['spec.md']);
  for (const d of fs.readdirSync(path.join(SKILL, 'packs', 'tinysolver'))) assert.match(d, /^(?:logo|icon|color|type)(?:@\d+)?$/, `packs/tinysolver/${d}`);
  for (const id of ['similar-logos', 'trademark']) assert.deepEqual(fs.readdirSync(path.join(SKILL, 'measures', id)), ['MEASURE.md'], `${id} — api 측정기는 선언만`);
});

test('공개 글 — 심볼릭 링크 없음 · 모르는 확장자 없음 · .criteria/ 는 git 밖', () => {
  for (const f of walk(REPO)) {
    const rel = path.relative(REPO, f.p).split(path.sep).join('/');
    assert.ok(!f.link, `심볼릭 링크: ${rel}`);
    assert.ok(TEXT.test(rel) || BINARY.test(rel), `${rel}: 글도 아는 바이너리도 아닌 파일`);
  }
  assert.match(read('.gitignore'), /^\.criteria\/$/m);
});

// 공개 글 일반 규칙 — 글 · 파일 이름 · 바이너리 안 글자. 회사 고유 말 점검은 정본 쪽(내보내기 · push 전 저장소 점검)이 한다
const RULES = [
  [/[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9-]*(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g, (m) => m !== 'contact@tinysolver.me', '메일 주소 — 공개 글의 연락처는 contact@tinysolver.me 하나'],
  [/\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})\b/g, () => true, '사설 IP'],
  [/(?:^|[\s"'`(=:])(?:\/(?:Users|home|root|private|Volumes|var\/folders|tmp|opt|srv|mnt)\/[^\s"'`)]*|[A-Za-z]:\\(?:Users|Documents and Settings)\\[^\s"'`)]*)/g, () => true, '절대 경로 — 스킬 폴더 · 프로젝트 기준 상대 경로로'],
];
test('공개 글 — contact@ 밖의 메일 주소 · 사설 IP · 절대 경로가 없다(글 · 파일 이름 · 바이너리 안 글자)', () => {
  const hits = [];
  const look = (where, text) => { for (const [re, keep, why] of RULES) for (const m of text.matchAll(re)) if (keep(m[0].trim())) hits.push(`${where}: '${m[0].trim()}' — ${why}`); };
  for (const f of walk(REPO)) {
    const rel = path.relative(REPO, f.p).split(path.sep).join('/');
    look(`${rel} (경로)`, rel);
    if (BINARY.test(rel)) { look(`${rel} (바이너리 안)`, fs.readFileSync(f.p).toString('latin1')); continue; }
    fs.readFileSync(f.p, 'utf8').split('\n').forEach((line, i) => look(`${rel}:${i + 1}`, line));
  }
  assert.deepEqual(hits, []);
});

test('규격 §10-6 의 SKILL.md 프런트매터 예가 실제 파일과 같다', () => {
  const skill = read('skills/brand-criteria/SKILL.md').split('\n'), front = skill.slice(0, skill.indexOf('---', 1) + 1).join('\n');
  const spec = read('skills/brand-criteria/references/spec.md'), at = spec.indexOf('### 10-6.');
  const block = spec.slice(spec.indexOf('```yaml\n', at) + 8, spec.indexOf('\n```', spec.indexOf('```yaml\n', at)));
  assert.equal(block, front);
});

test('README — 설치 셋(Claude Code · Codex · npx skills) · 팀 저장소 두 줄 · 데이터 · 결과물 · 라이선스 · 영어 요약', () => {
  const r = read('README.md');
  assert.match(r, /claude plugin marketplace add tiny-solver\/brand-skills\n/);
  assert.match(r, /claude plugin install brand-skills@tinysolver\n/);
  assert.match(r, /claude plugin marketplace add tiny-solver\/brand-skills --scope project/);
  assert.match(r, /claude plugin install brand-skills@tinysolver --scope project/);
  assert.match(r, /codex plugin marketplace add tiny-solver\/brand-skills\n/);
  assert.match(r, /codex plugin add brand-skills@tinysolver\n/);
  assert.match(r, /npx skills add tiny-solver\/brand-skills/);
  // Codex 에서 부르는 이름 — 플러그인 설치는 $<플러그인>:<스킬>, npx skills · 복사 설치는 $<스킬>
  const codex = r.slice(r.indexOf('### Codex'), r.indexOf('### 다른 에이전트')), other = r.slice(r.indexOf('### 다른 에이전트'), r.indexOf('### 그림 측정 켜기'));
  assert.match(codex, /`\$brand-skills:brand-criteria`/);
  assert.match(other, /`\$brand-criteria`/);
  for (const h of ['## 데이터', '## 결과물', '## 라이선스', '## English summary']) assert.ok(r.includes(h), h);
  // 데이터 약속은 규격 §9-3 과 같은 길 둘 — share 명령 · --api
  const data = r.slice(r.indexOf('## 데이터'), r.indexOf('## 결과물'));
  assert.match(data, /`share` 명령과 `--api`/);
  assert.match(r.slice(r.indexOf('## English summary')), /`share` command and `--api`/);
  // 결과 권리는 규격 §9-4 와 같은 목록 — 내 기준 팩은 결과가 아니다(물려받거나 복사한 기본 팩 글은 Apache-2.0 그대로)
  const res = r.slice(r.indexOf('## 결과물'), r.indexOf('## 라이선스'));
  assert.match(res, /결과\(`score\.json` · 비교판 · 고른 이유\)/);
  assert.match(res, /기본 팩 글은 Apache-2\.0 그대로/);
  const s94 = read('skills/brand-criteria/references/spec.md').split('### 9-4')[1].split('### 9-5')[0];
  assert.match(s94, /결과\(score\.json · 비교판 · 고른 이유\)/);
  assert.match(s94, /기본 팩 글은 Apache-2\.0 그대로/);
  assert.match(r.slice(r.indexOf('## English summary')), /Outputs \(`score\.json`, the board and your reasons for the pick\)[\s\S]*default pack text you inherit or copy stays under Apache-2\.0/);
  assert.match(r, /법률 자문이 아니다/);
  assert.doesNotMatch(r, /결정 전|가안|이름 미정/, '공개 글에 정하지 않은 표시를 남기지 않는다');
  for (const [, href] of r.matchAll(/\]\(([^)#:]+)(?:#[^)]*)?\)/g)) assert.ok(fs.existsSync(path.join(REPO, href)), `README 링크 ${href}`);
});

test('판 — 마지막 태그 뒤 skills/ 가 바뀌었으면 plugin.json version 도 바뀌었다(안 올리면 Claude Code 사용자에게 가지 않는다)', (t) => {
  const git = (...a) => spawnSync('git', a, { cwd: REPO, encoding: 'utf8' });
  const tag = git('describe', '--tags', '--abbrev=0');
  if (tag.status !== 0) { t.diagnostic('태그 없음(첫 공개 전) 또는 git 저장소가 아님 — 견줄 판이 없다'); return; }
  const T = tag.stdout.trim();
  if (git('diff', '--quiet', T, '--', 'skills/').status === 0) return;
  const old = JSON.parse(git('show', `${T}:.claude-plugin/plugin.json`).stdout).version;
  assert.notEqual(json('.claude-plugin/plugin.json').version, old, `${T} 뒤 skills/ 가 바뀌었다 — plugin.json · criteria.mjs VERSION · SKILL.md metadata.version 을 올린다`);
});
