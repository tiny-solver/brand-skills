#!/usr/bin/env node
// criteria.mjs — 기준 팩 실행기 · Node 22+ · 의존성 0 · 네트워크를 쓰지 않는다
//   validate [폴더…]                         팩 · 상속 · 측정기 · 참조 묶음 · 시험 값 검사 — 문제가 있으면 끝 코드 1
//   resolve <팩 ref | 팩 폴더> [--json] [--factor <id>]
//                                            상속을 푼 기준 목록 · 풀린 팩 JSON · 기준 하나의 판정지
//   measure <방향 폴더> [--kind k] [--pack ref]   방향 하나의 측정 셀 + 판정 재료
//   prepare <라운드 폴더> [--kind k] [--pack kind=ref]…
//                                            측정 → .criteria/(풀린 팩 · measured.json · 판정 과제 · answers.json · board.html)
//   finish <라운드 폴더> [--judge <모델 이름>] [--independent]
//                                            answers.json 근거 검사 · trials 합치기 · 셈 → score.json
//   confirm <라운드 폴더 | score.json> <방향> <기준> --by <이름> [--value <값>]
//                                            사람 확인 · 뒤집기(사람만)
//   verify <라운드 폴더 | score.json> [--json]  팩 해시 · 측정 셀 다시 재기 · trials 합치기 · 근거 검사 · 셈 다시 — 다르면 끝 코드 1
// 측정기 코드는 스킬 폴더 measures/<id>/measure.mjs — 있으면 불러 쓴다. 규격 references/spec.md · 스키마 schema/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// 스킬 폴더 — 이 파일의 한 단계 위(scripts/..)
export const SKILL = path.resolve(HERE, '..');
export const VERSION = '0.1.1';
// 규격 판 — 기본 팩 PACK.md format 이 없으면 3. 판 3 은 근거 없는 문턱 통과를 안 봄으로 · 측정 기준은 fallback 이 있을 때만 판정이 채운다. 판 2 팩은 format "2" 를 적는다
export const FORMAT_DEFAULT = '3';
export const isStrict = (format) => Number(format || FORMAT_DEFAULT) >= 3;
// api 측정기 — 실행기는 부르지 않는다. API 가 열리면 --api 로 부른다(규격 §6-4)
export const API_UNAVAILABLE = '부르지 않음 — API 가 열리면 --api';

// 규격이 고정하는 것(§4-2) — 팩이 바꾸지 않는다
export const SCALE = { 0: '못 미침', 1: '그럭저럭 — 약점이 보인다', 2: '분명함 — 따로 설명이 필요 없다' };
export const GATE_VALUES = { true: '통과', false: '막힘 — 고치기 전엔 권장안이 될 수 없다', null: '아직 안 봄 — 권장하기 전에 본다' };
const RECOMMEND = { score_min: 1, total_ratio: 0.75 };
const JUDGE_HEADS = ['## 받는 것', '## 하는 일', '## 근거 한 줄', '## 하지 않는 것'];
const MEASURE_HEADS = ['## 하는 일', '## 하지 않는 것'];
const TARGET_ROOTS = ['tokens', 'tiles', 'color', 'files', 'context'];
const BODY_MAX = 80;
const CHAIN_MAX = 4; // extends 세 번까지 = 상속 차례에 팩 넷

// ── 작은 도구 ──
const kindOf = (x) => (x === null ? 'null' : Array.isArray(x) ? 'array' : typeof x === 'number' ? (Number.isInteger(x) ? 'integer' : 'number') : typeof x);
const isObj = (x) => kindOf(x) === 'object';
const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const inside = (p, dir) => { const r = path.relative(dir, p); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
// 보이는 경로 — 지금 폴더 안이면 상대 경로, 스킬 폴더 안이면 brand-criteria/…, 아니면 그대로
export const rel = (p) => (inside(p, process.cwd()) ? path.relative(process.cwd(), p) || '.' : inside(p, SKILL) ? path.join('brand-criteria', path.relative(SKILL, p)) : p);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
// 숫자 비교 · 근거 글 — 측정기가 반올림해 낸 값(소수 넷째)을 다시 표시 자리로 반올림해 고정 소수로 쓴다
export const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
export const fixed = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? round(x, d).toFixed(d) : '—');

// RFC 8785(JCS) — 키는 UTF-16 순, 문자열 · 숫자는 ECMAScript JSON 직렬화
export function jcs(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jcs(v[k])}`).join(',')}}`;
}
const sha = (v) => `sha256:${crypto.createHash('sha256').update(jcs(v), 'utf8').digest('hex')}`;
// 해시에 넣는 글 — NFC · 줄 끝 LF · 줄 끝 빈칸 지움 · 앞뒤 빈 줄 지움
export const normText = (s) => (typeof s === 'string' ? s.normalize('NFC').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n').replace(/^\n+/, '').replace(/\n+$/, '') : s);

// '---' · JSON 객체 하나 · '---' · 마크다운 본문
export function readFront(file) {
  const t = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = t.split('\n');
  if (lines[0] !== '---') throw new Error(`${rel(file)}: 첫 줄이 '---' 가 아니다`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${rel(file)}: 프런트매터를 닫는 '---' 줄이 없다`);
  let front;
  try { front = JSON.parse(lines.slice(1, end).join('\n')); } catch (e) { throw new Error(`${rel(file)}: 프런트매터가 JSON 이 아니다 — ${e.message}`); }
  if (!isObj(front)) throw new Error(`${rel(file)}: 프런트매터는 JSON 객체 하나여야 한다`);
  return { front, body: lines.slice(end + 1).join('\n').replace(/^\n+/, '').replace(/\s+$/, '') };
}
// 본문의 '## <제목>' 아래 '- ' 줄
function sectionItems(body, title) {
  const lines = body.split('\n');
  const i = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (i < 0) return null;
  const out = [];
  for (let j = i + 1; j < lines.length && !/^#{1,2} /.test(lines[j]); j++) { const m = lines[j].match(/^- (.+)$/); if (m) out.push(m[1].trim()); }
  return out;
}
const headsOf = (body) => body.split('\n').filter((l) => /^## /.test(l)).map((l) => l.trim());

// ── JSON Schema 2020-12 — 두 스키마가 쓰는 키워드만(의존성 0) ──
export function loadSchemas(skill = SKILL) {
  const dir = path.join(skill, 'schema');
  return { 'factor.schema.json': readJson(path.join(dir, 'factor.schema.json')), 'pack.schema.json': readJson(path.join(dir, 'pack.schema.json')) };
}
const notMsg = (s) => {
  const keys = [];
  const walk = (x) => { if (!isObj(x)) return; (x.required || []).forEach((k) => keys.push(k)); (x.anyOf || []).forEach(walk); (x.oneOf || []).forEach(walk); };
  walk(s);
  return keys.length ? `칸 ${keys.join(' · ')} 를 여기에 쓸 수 없다` : '허용하지 않는 모양이다';
};
export function schemaErrors(schemas, docName, data) {
  const at = (doc, frag) => frag.split('/').slice(1).reduce((o, k) => (o == null ? undefined : o[k.replace(/~1/g, '/').replace(/~0/g, '~')]), doc);
  const deref = (ref, doc) => {
    const [f, frag = ''] = ref.split('#');
    const name = f || doc;
    const s = frag ? at(schemas[name], frag) : schemas[name];
    if (s === undefined) throw new Error(`스키마 참조를 못 찾음: ${ref}`);
    return [s, name];
  };
  const P = (p) => p || '(맨 위)';
  const best = (rs) => rs.reduce((a, b) => (b.errs.length < a.errs.length ? b : a));
  const v = (s, x, p, doc) => {
    const errs = [], props = new Set();
    if (s === true) return { errs, props };
    if (s === false) return { errs: [`${P(p)} 여기에 값이 올 수 없다`], props };
    const take = (r) => { r.props.forEach((k) => props.add(k)); };
    if (s.$ref) { const [t, d] = deref(s.$ref, doc); const r = v(t, x, p, d); errs.push(...r.errs); if (!r.errs.length) take(r); }
    if (s.type) {
      const ts = [].concat(s.type), k = kindOf(x);
      if (!ts.some((t) => t === k || (t === 'number' && k === 'integer'))) return { errs: [...errs, `${P(p)} 종류가 ${ts.join(' | ')} 여야 한다(지금 ${k})`], props };
    }
    if ('const' in s && jcs(s.const) !== jcs(x)) errs.push(`${P(p)} 값이 ${JSON.stringify(s.const)} 여야 한다`);
    if (s.enum && !s.enum.some((e) => jcs(e) === jcs(x))) errs.push(`${P(p)} 값이 ${s.enum.map((e) => JSON.stringify(e)).join(' · ')} 가운데 하나여야 한다(지금 ${JSON.stringify(x)})`);
    if (typeof x === 'string') {
      const n = [...x].length;
      if (s.minLength != null && n < s.minLength) errs.push(`${P(p)} 글이 ${s.minLength}자 이상이어야 한다`);
      if (s.maxLength != null && n > s.maxLength) errs.push(`${P(p)} 글이 ${s.maxLength}자 이하여야 한다(지금 ${n}자)`);
      if (s.pattern && !new RegExp(s.pattern, 'u').test(x)) errs.push(`${P(p)} ${JSON.stringify(x)} 가 /${s.pattern}/ 모양이 아니다`);
    }
    if (typeof x === 'number') {
      if (s.minimum != null && x < s.minimum) errs.push(`${P(p)} ${s.minimum} 이상이어야 한다(지금 ${x})`);
      if (s.maximum != null && x > s.maximum) errs.push(`${P(p)} ${s.maximum} 이하여야 한다(지금 ${x})`);
    }
    if (Array.isArray(x)) {
      if (s.minItems != null && x.length < s.minItems) errs.push(`${P(p)} 항목이 ${s.minItems}개 이상이어야 한다`);
      if (s.maxItems != null && x.length > s.maxItems) errs.push(`${P(p)} 항목이 ${s.maxItems}개 이하여야 한다`);
      if (s.uniqueItems && new Set(x.map(jcs)).size !== x.length) errs.push(`${P(p)} 같은 항목이 겹친다`);
      const pre = s.prefixItems || [];
      pre.forEach((ps, i) => { if (i < x.length) errs.push(...v(ps, x[i], `${p}[${i}]`, doc).errs); });
      if (s.items !== undefined) for (let i = pre.length; i < x.length; i++) errs.push(...v(s.items, x[i], `${p}[${i}]`, doc).errs);
    }
    if (isObj(x)) {
      const keys = Object.keys(x);
      for (const k of s.required || []) if (!(k in x)) errs.push(`${P(p)} 칸 '${k}' 가 없다`);
      if (s.minProperties != null && keys.length < s.minProperties) errs.push(`${P(p)} 칸이 ${s.minProperties}개 이상이어야 한다`);
      if (s.maxProperties != null && keys.length > s.maxProperties) errs.push(`${P(p)} 칸이 ${s.maxProperties}개 이하여야 한다`);
      if (s.propertyNames) for (const k of keys) errs.push(...v(s.propertyNames, k, `${p}{${k}}`, doc).errs);
      const known = s.properties || {};
      for (const k of keys) {
        if (k in known) { errs.push(...v(known[k], x[k], (p ? `${p}.${k}` : k), doc).errs); props.add(k); }
        else if (s.additionalProperties !== undefined) {
          if (s.additionalProperties === false) errs.push(`${P(p)} 모르는 칸 '${k}'`);
          else errs.push(...v(s.additionalProperties, x[k], (p ? `${p}.${k}` : k), doc).errs);
          props.add(k);
        }
      }
    }
    for (const a of s.allOf || []) { const r = v(a, x, p, doc); errs.push(...r.errs); if (!r.errs.length) take(r); }
    if (s.anyOf) {
      const rs = s.anyOf.map((a) => v(a, x, p, doc)), ok = rs.filter((r) => !r.errs.length);
      if (!ok.length) errs.push(...best(rs).errs); else ok.forEach(take);
    }
    if (s.oneOf) {
      const rs = s.oneOf.map((a) => v(a, x, p, doc)), ok = rs.filter((r) => !r.errs.length);
      if (ok.length === 1) take(ok[0]);
      else if (!ok.length) errs.push(...best(rs).errs);
      else errs.push(`${P(p)} 모양 둘 이상에 맞는다`);
    }
    if (s.not && !v(s.not, x, p, doc).errs.length) errs.push(`${P(p)} ${notMsg(s.not)}`);
    if (s.if) {
      const r = v(s.if, x, p, doc);
      const branch = r.errs.length ? s.else : s.then;
      if (!r.errs.length) take(r);
      if (branch !== undefined) { const b = v(branch, x, p, doc); errs.push(...b.errs); if (!b.errs.length) take(b); }
    }
    if (s.unevaluatedProperties !== undefined && isObj(x)) {
      for (const k of Object.keys(x)) {
        if (props.has(k)) continue;
        if (s.unevaluatedProperties === false) errs.push(`${P(p)} 칸 '${k}' 는 여기서 쓸 수 없다`);
        else errs.push(...v(s.unevaluatedProperties, x[k], (p ? `${p}.${k}` : k), doc).errs);
        props.add(k);
      }
    }
    return { errs, props };
  };
  return [...new Set(v(schemas[docName], data, '', docName).errs)];
}

// ── 측정기 · 참조 묶음 ──
const OUT_TYPES = ['string', 'number', 'boolean', 'array', 'object'];
function loadMeasures(skill, errs) {
  const map = new Map(), dir = path.join(skill, 'measures');
  for (const id of isDir(dir) ? fs.readdirSync(dir).sort() : []) {
    const file = path.join(dir, id, 'MEASURE.md');
    if (!isFile(file)) continue;
    let fm;
    try { fm = readFront(file); } catch (e) { errs.push(e.message); continue; }
    const m = fm.front, where = rel(file), bad = (msg) => errs.push(`${where}: ${msg}`);
    for (const k of Object.keys(m)) if (!['id', 'version', 'access', 'needs', 'in', 'out', 'endpoint'].includes(k)) bad(`모르는 칸 '${k}'`);
    if (m.id !== id) bad(`id '${m.id}' 가 폴더 이름 '${id}' 와 다르다`);
    if (!Number.isInteger(m.version) || m.version < 1) bad('version 은 1 이상 정수');
    if (!['open', 'api'].includes(m.access)) bad("access 는 'open' 또는 'api'");
    if (m.needs !== undefined && !(Array.isArray(m.needs) && m.needs.every((x) => typeof x === 'string'))) bad('needs 는 글 목록');
    if (!isObj(m.in)) bad('in 은 객체(입력 칸 → 설명)');
    if (!isObj(m.out)) bad('out 은 객체(출력 칸 → {type, digits?, display?})');
    else for (const [k, o] of Object.entries(m.out)) {
      if (!isObj(o) || !OUT_TYPES.includes(o.type)) bad(`out.${k}.type 은 ${OUT_TYPES.join(' · ')} 가운데 하나`);
      else for (const d of ['digits', 'display']) if (o[d] !== undefined && !(Number.isInteger(o[d]) && o[d] >= 0)) bad(`out.${k}.${d} 는 0 이상 정수`);
    }
    if (m.access === 'api' && m.endpoint !== `/v1/measure/${id}`) bad(`api 측정기는 endpoint '/v1/measure/${id}'`);
    if (m.access === 'open' && m.endpoint !== undefined) bad('open 측정기에는 endpoint 가 없다');
    const mdir = path.join(dir, id), code = path.join(mdir, 'measure.mjs');
    if (m.access === 'api' && isFile(code)) bad('api 측정기에는 코드(measure.mjs)를 두지 않는다 — 서비스 안에만 있다');
    const meas = { ...m, ref: `${m.id}@${m.version}`, dir: mdir, file: m.access === 'open' && isFile(code) ? code : null };
    meas.code = meas.file ? codeOf(meas) : null;
    map.set(id, meas);
  }
  return map;
}
// needs(예 playwright-core)를 측정기 폴더에서 위로 찾는다 — 없으면 그 측정기는 부르지 않는다
const canResolve = (name, from) => { try { createRequire(from).resolve(name); return true; } catch { return false; } };
export const missingNeeds = (m) => (m.needs || []).filter((n) => !canResolve(n, m.file || path.join(m.dir, 'MEASURE.md')));
// 측정기 코드 — measures/<id>/measure.mjs 의 default export: async (input, {dir, out, ref}) → 출력. 처음 부를 때 불러온다.
// 던지지 않는다 — 못 부르면 {unavailable: 이유}(needs 없음 · 코드를 읽지 못함 · 측정기 오류)
function codeOf(m) {
  let mod = null;
  return async (input, mctx) => {
    const lack = missingNeeds(m);
    if (lack.length) return { unavailable: `${lack.join(' · ')} 없음` };
    try { mod ??= await import(pathToFileURL(m.file).href); } catch (e) { return { unavailable: `코드를 읽지 못함 — ${e.message}` }; }
    if (typeof mod.default !== 'function') return { unavailable: 'measure.mjs 에 default export 함수가 없다' };
    try { return (await mod.default(input, mctx)) ?? { unavailable: '출력 없음' }; } catch (e) { return { unavailable: `측정기 오류 — ${e.message}` }; }
  };
}
function loadRefs(skill, errs) {
  const map = new Map(), dir = path.join(skill, 'refs');
  for (const f of isDir(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort() : []) {
    const file = path.join(dir, f), where = rel(file), id = f.slice(0, -5);
    let r;
    try { r = readJson(file); } catch (e) { errs.push(`${where}: JSON 이 아니다 — ${e.message}`); continue; }
    for (const k of Object.keys(r)) if (!['id', 'access', 'about', 'colors'].includes(k)) errs.push(`${where}: 모르는 칸 '${k}'`);
    if (r.id !== id) errs.push(`${where}: id '${r.id}' 가 파일 이름 '${id}' 와 다르다`);
    if (!/^[a-z][a-z0-9-]*@\d{4}-\d{2}$/.test(id)) errs.push(`${where}: 이름은 <이름>@<YYYY-MM> — @live 는 서비스 안에만 있다`);
    if (r.access !== 'open') errs.push(`${where}: access 는 'open'`);
    if (typeof r.about !== 'string' || !r.about) errs.push(`${where}: about 한 줄이 없다`);
    if (!Array.isArray(r.colors) || !r.colors.length || !r.colors.every((c) => /^#[0-9a-f]{6}$/.test(c))) errs.push(`${where}: colors 는 소문자 #rrggbb 목록`);
    map.set(id, r);
  }
  return map;
}
// 측정기 시험 값 — out 에 적힌 칸이 같으면 통과. needs 가 없는 측정기는 건너뛰고 skipped 에 이유를 남긴다
// needs 가 있는 측정기가 환경 때문에 unavailable(브라우저 없음 등)을 내면 그 시험 값도 건너뛴다 — 코드 오류(측정기 오류 · 코드를 읽지 못함)는 실패다
// ctx.dir = 측정기 폴더(시험 그림 · 글꼴은 그 폴더 기준 경로) · ctx.out = 다 돌면 지우는 임시 폴더
const CODE_FAULT = /^(측정기 오류|코드를 읽지 못함|measure\.mjs 에|출력 없음)/;
// 만들어 쓰는 시험 파일 — measures/<id>/fixtures/made.json {needs, files: {<fixtures 기준 경로>: "sha256:…"}}. fixtures/make.mjs 가 같은 바이트로 만들고 git 에는 두지 않는다
// 없는 파일을 쓰는 시험 값은 건너뛰고 만드는 명령을 알린다(설치한 스킬에는 시험 글꼴이 없다)
export function madeFixtures(m) {
  const file = path.join(m.dir, 'fixtures', 'made.json');
  if (!isFile(file)) return null;
  let j;
  try { j = readJson(file); } catch (e) { return { error: `${rel(file)}: JSON 이 아니다 — ${e.message}` }; }
  if (!isObj(j.files) || !Object.values(j.files).every((h) => /^sha256:[0-9a-f]{64}$/.test(h))) return { error: `${rel(file)}: files 는 {<fixtures 기준 경로>: "sha256:<hex 64자>"}` };
  const files = Object.keys(j.files);
  return { make: `node <스킬>/measures/${m.id}/fixtures/make.mjs`, needs: Array.isArray(j.needs) ? j.needs : [], files, lack: files.filter((f) => !isFile(path.join(m.dir, 'fixtures', f))) };
}
export async function runVectors(ctx, errs, skipped = []) {
  let n = 0, tmp = null;
  const outDir = () => (tmp ??= fs.mkdtempSync(path.join(os.tmpdir(), 'criteria-vectors-')));
  for (const m of ctx.measures.values()) {
    const file = path.join(m.dir, 'vectors.json');
    const has = isFile(file);
    if (m.code && !has) { errs.push(`${rel(m.dir)}: 코드가 있는 측정기는 vectors.json 이 있어야 한다`); continue; }
    if (!has) continue;
    if (!m.code) { errs.push(`${rel(file)}: 시험 값이 있는데 ${m.ref} 코드가 없다`); continue; }
    const lack = missingNeeds(m);
    if (lack.length) { skipped.push(`${m.ref}: ${lack.join(' · ')} 없음`); continue; }
    let list;
    try { list = readJson(file); } catch (e) { errs.push(`${rel(file)}: JSON 이 아니다 — ${e.message}`); continue; }
    const made = madeFixtures(m);
    if (made?.error) { errs.push(made.error); continue; }
    const unbuilt = (made?.lack || []).map((f) => `"fixtures/${f}"`);
    let gone = 0, why = null, unmade = 0;
    for (const [i, t] of list.entries()) {
      if (unbuilt.length && unbuilt.some((f) => JSON.stringify(t.in).includes(f))) { unmade++; continue; }
      const out = await m.code(clone(t.in), { dir: m.dir, out: outDir(), ref: (id) => ctx.refs.get(id) ?? null });
      if (m.needs?.length && typeof out?.unavailable === 'string' && !('unavailable' in t.out) && !CODE_FAULT.test(out.unavailable)) { gone++; why ??= out.unavailable; continue; }
      n++;
      for (const [k, want] of Object.entries(t.out)) if (jcs(out?.[k] ?? null) !== jcs(want)) errs.push(`${rel(file)} [${i}]: ${k} = ${JSON.stringify(out?.[k])} — 기대 ${JSON.stringify(want)}`);
    }
    if (gone) skipped.push(`${m.ref}: ${why} — 시험 값 ${gone}개`);
    if (unmade) skipped.push(`${m.ref}: 시험 파일 없음 — ${made.make}${made.needs.length ? `(${made.needs.join(' · ')} 필요)` : ''} 로 만든다 — 시험 값 ${unmade}개`);
  }
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  return n;
}

export function context(opts = {}) {
  const skill = path.resolve(opts.skill || SKILL), errs = [];
  const ctx = { skill, schemas: loadSchemas(skill), errs, packs: new Map() };
  ctx.measures = loadMeasures(skill, errs);
  ctx.refs = loadRefs(skill, errs);
  return ctx;
}

// ── 기준 파일 하나 — 모양 밖의 검사 ──
function walkStrings(x, fn, at = '') {
  if (typeof x === 'string') fn(x, at);
  else if (Array.isArray(x)) x.forEach((y, i) => walkStrings(y, fn, `${at}[${i}]`));
  else if (isObj(x)) for (const [k, y] of Object.entries(x)) walkStrings(y, fn, at ? `${at}.${k}` : k);
}
function checkHeads(f, body, where, errs) {
  const hs = headsOf(body);
  if (f.decide.by === 'judge') {
    if (jcs(hs) !== jcs(JUDGE_HEADS)) errs.push(`${where}: 판정 기준 본문의 제목은 ${JUDGE_HEADS.join(' · ')} 순서(지금 ${hs.join(' · ') || '없음'})`);
  } else if (hs.some((h) => !MEASURE_HEADS.includes(h)) || jcs(hs) !== jcs(MEASURE_HEADS.filter((h) => hs.includes(h)))) {
    errs.push(`${where}: 측정 기준 본문은 ${MEASURE_HEADS.join(' · ')} 만(지금 ${hs.join(' · ')})`);
  }
  if (body.split('\n').length > BODY_MAX) errs.push(`${where}: 본문이 ${BODY_MAX}줄을 넘는다`);
}
function checkParamDecl(name, d, where, errs) {
  if ((d.min !== undefined || d.max !== undefined) && typeof d.default !== 'number') errs.push(`${where}: params.${name} 허용 범위(min · max)는 숫자 값에만`);
  if (typeof d.default === 'number' && ((d.min !== undefined && d.default < d.min) || (d.max !== undefined && d.default > d.max))) errs.push(`${where}: params.${name} 기본값 ${d.default} 가 허용 범위(min · max) 밖이다`);
  walkStrings(d.default, (s, at) => checkDollar(s, `${where}: params.${name}${at ? '.' + at : ''}`, errs));
}
function checkDollar(s, where, errs) {
  if (!s.startsWith('$') || s.startsWith('$$')) return;
  const root = s.slice(1).split('.')[0];
  if (!TARGET_ROOTS.includes(root)) errs.push(`${where}: 대상 경로 '${s}' — $${TARGET_ROOTS.join(' · $')} 만 쓴다('$' 글자는 '$$')`);
}
function checkFactor(f, where, ctx, errs) {
  const decls = f.params || {};
  for (const [n, d] of Object.entries(decls)) checkParamDecl(n, d, where, errs);
  const as = new Map();
  for (const [i, m] of (f.measure || []).entries()) {
    const [id, ver] = m.use.split('@');
    const meas = ctx.measures.get(id);
    if (!meas) errs.push(`${where}: measure[${i}] 측정기 '${id}' 가 없다(measures/${id}/MEASURE.md)`);
    else if (String(meas.version) !== ver) errs.push(`${where}: measure[${i}] '${m.use}' — 있는 판은 ${meas.ref}`);
    if (as.has(m.as)) errs.push(`${where}: measure as '${m.as}' 가 겹친다`);
    as.set(m.as, meas || null);
    if (meas?.access === 'api') {
      if (f.decide.by !== 'judge') errs.push(`${where}: api 측정기 ${m.use} 는 판정(judge) 기준에서만 부른다`);
      if (!f.fallback) errs.push(`${where}: api 측정기 ${m.use} 를 부르면 fallback 이 있어야 한다`);
    }
    walkStrings(m.with || {}, (s, at) => {
      const w = `${where}: measure[${i}].with.${at}`;
      const whole = s.match(/^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/);
      if (whole) { if (!(whole[1] in decls)) errs.push(`${w} — 선언 안 된 param '${whole[1]}'`); }
      else if (s.includes('{{')) errs.push(`${w} — with 안의 {{…}} 는 문자열 전체여야 한다`);
      checkDollar(s, w, errs);
    });
  }
  const checkM = (c, w) => {
    if (c.all || c.any) return (c.all || c.any).forEach((x) => checkM(x, w));
    const [a, field] = c.m.split('.');
    if (!as.has(a)) errs.push(`${w}: '${c.m}' — 측정 as '${a}' 가 없다`);
    else if (as.get(a) && !(field in (as.get(a).out || {}))) errs.push(`${w}: '${c.m}' — ${as.get(a).ref} 출력에 '${field}' 가 없다`);
    if ('p' in c && !(c.p in decls)) errs.push(`${w}: 선언 안 된 param '${c.p}'`);
  };
  if (f.decide.pass) checkM(f.decide.pass, `${where}: decide.pass`);
  for (const [i, b] of (f.decide.bands || []).entries()) if (b.when) checkM(b.when, `${where}: decide.bands[${i}]`);
  if (!(f.decide.trials > 1) && f.decide.aggregate) errs.push(`${where}: aggregate 는 trials > 1 일 때만`);
  // 근거 검사와 같은 'u' 플래그로 본다 — 여기서 통과한 모양만 근거 검사가 쓴다
  if (f.evidence?.pattern) { try { new RegExp(f.evidence.pattern, 'u'); } catch (e) { errs.push(`${where}: evidence.pattern 이 정규식이 아니다('u' 플래그) — ${e.message}`); } }
  return as;
}

// ── 팩 읽기 ──
function loadPack(dir, ctx, errs) {
  dir = path.resolve(dir);
  if (ctx.packs.has(dir)) { const c = ctx.packs.get(dir); errs.push(...c.errs); return c.pack; }
  const mine = [];
  const pack = loadPackRaw(dir, ctx, mine);
  ctx.packs.set(dir, { pack: mine.length ? null : pack, errs: mine });
  errs.push(...mine);
  return mine.length ? null : pack;
}
function loadPackRaw(dir, ctx, errs) {
  const file = path.join(dir, 'PACK.md');
  if (!isFile(file)) { errs.push(`${rel(dir)}: PACK.md 가 없다`); return null; }
  let fm;
  try { fm = readFront(file); } catch (e) { errs.push(e.message); return null; }
  const where = rel(file);
  const se = schemaErrors(ctx.schemas, 'pack.schema.json', fm.front);
  if (se.length) { se.forEach((m) => errs.push(`${where}: ${m}`)); return null; }
  const P = fm.front, [owner, name] = P.id.split('/'), ref = `${P.id}@${P.version}`;
  const base = path.basename(dir), up = path.basename(path.dirname(dir));
  if (up !== owner || (base !== name && base !== `${name}@${P.version}`)) errs.push(`${where}: 폴더가 packs/${owner}/${name}/ 또는 packs/${owner}/${name}@${P.version}/ 이어야 한다`);
  const inSkill = inside(dir, path.join(ctx.skill, 'packs'));
  if (inSkill && owner !== 'tinysolver') errs.push(`${where}: 스킬 폴더 packs/ 에는 기본 팩(tinysolver)만 둔다 — 커스텀 팩은 사용자 프로젝트 packs/ 에`);
  if (!inSkill && owner === 'tinysolver') errs.push(`${where}: owner 'tinysolver' 는 기본 팩 자리 — 사용자 프로젝트 팩은 다른 owner 를 쓴다`);
  const fdir = path.join(dir, 'factors'), factors = new Map(), broken = new Set();
  for (const f of isDir(fdir) ? fs.readdirSync(fdir).filter((x) => x.endsWith('.md')).sort() : []) {
    const ffile = path.join(fdir, f), fw = rel(ffile), id = f.slice(0, -3);
    let ff;
    try { ff = readFront(ffile); } catch (e) { errs.push(e.message); broken.add(id); continue; }
    const fe = schemaErrors(ctx.schemas, 'factor.schema.json', ff.front);
    if (fe.length) { fe.forEach((m) => errs.push(`${fw}: ${m}`)); broken.add(id); continue; }
    if (ff.front.id !== id) { errs.push(`${fw}: id '${ff.front.id}' 가 파일 이름 '${id}' 와 다르다`); broken.add(id); continue; }
    const override = ff.front.override === true;
    if (!override) { checkFactor(ff.front, fw, ctx, errs); checkHeads(ff.front, ff.body, fw, errs); }
    factors.set(id, { front: ff.front, body: ff.body, file: ffile, override });
  }
  if (P.factors) {
    for (const id of P.factors) {
      if (!factors.has(id)) { if (!broken.has(id)) errs.push(`${where}: factors/${id}.md 가 없다`); }
      else if (factors.get(id).override) errs.push(`${rel(factors.get(id).file)}: 기본 팩 기준은 override 를 쓸 수 없다`);
    }
    for (const id of factors.keys()) if (!P.factors.includes(id)) errs.push(`${rel(factors.get(id).file)}: PACK.md factors 에 없는 기준 파일`);
  } else {
    const add = new Set(P.add || []);
    for (const id of add) {
      if (!factors.has(id)) { if (!broken.has(id)) errs.push(`${where}: add 한 '${id}' 의 factors/${id}.md 가 없다`); }
      else if (factors.get(id).override) errs.push(`${rel(factors.get(id).file)}: add 한 기준은 full 모양이어야 한다(override 아님)`);
    }
    for (const [id, f] of factors) if (!add.has(id) && !f.override) errs.push(`${rel(f.file)}: add 에 없고 override 도 아니다`);
  }
  return { dir, file, front: P, body: fm.body, rules: sectionItems(fm.body, '규칙'), factors, ref, inSkill };
}

// ── 팩 찾기(§2-3) ──
const REF_RE = /^([a-z0-9][a-z0-9-]{0,31})\/([a-z0-9][a-z0-9-]{0,31})(?:@([1-9][0-9]{0,3}))?$/;
const versionAt = (dir) => { try { return String(readFront(path.join(dir, 'PACK.md')).front.version); } catch { return null; } };
function lookIn(base, owner, name, ver) {
  const od = path.join(base, 'packs', owner);
  if (!isDir(od)) return null;
  if (ver) {
    const a = path.join(od, `${name}@${ver}`);
    if (isFile(path.join(a, 'PACK.md'))) return a;
    const b = path.join(od, name);
    return isFile(path.join(b, 'PACK.md')) && versionAt(b) === ver ? b : null;
  }
  const cands = fs.readdirSync(od).filter((d) => d === name || d.startsWith(`${name}@`)).map((d) => path.join(od, d)).filter((d) => isFile(path.join(d, 'PACK.md')));
  return cands.map((d) => [d, Number(versionAt(d)) || 0]).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}
function gitTop(dir) { for (let d = dir; ; d = path.dirname(d)) { if (fs.existsSync(path.join(d, '.git'))) return d; if (path.dirname(d) === d) return null; } }
export function findPack(ref, fromDir, ctx, errs) {
  const m = ref.match(REF_RE);
  if (!m) { errs.push(`팩 ref 모양이 아니다: '${ref}' — <owner>/<name>[@<판>]`); return null; }
  const [, owner, name, ver] = m;
  const start = path.resolve(fromDir), top = gitTop(start);
  for (let d = start; ; d = path.dirname(d)) {
    if (d !== ctx.skill) {
      const hit = lookIn(d, owner, name, ver);
      if (hit) {
        if (owner === 'tinysolver') { errs.push(`${rel(hit)}: 사용자 프로젝트에서 찾은 팩의 owner 가 'tinysolver' — 그 이름공간은 기본 팩 자리다`); return null; }
        return hit;
      }
    }
    if (d === top || path.dirname(d) === d) break;
  }
  const hit = lookIn(ctx.skill, owner, name, ver);
  if (hit) return hit;
  errs.push(`팩을 찾지 못함: ${ref}`);
  return null;
}

// ── 풀기(§5) — 부모 → disable → set → override 파일 → add → recommend → 글 틀 → 해시 ──
const fromFull = (entry, pack, origin) => {
  const { params, ...rest } = clone(entry.front);
  const decls = params || {};
  return { ...rest, decls, values: Object.fromEntries(Object.entries(decls).map(([k, d]) => [k, clone(d.default)])), body: entry.body, origin, from: pack.ref, file: entry.file };
};
const sameShape = (a, b) => (typeof a === 'number' ? typeof b === 'number' : Array.isArray(a) ? Array.isArray(b) : isObj(a) ? isObj(b) : typeof a === typeof b);
function setFields(f, fields, where, errs) {
  for (const [k, val] of Object.entries(fields)) {
    if (k === 'params') {
      for (const [n, x] of Object.entries(val)) {
        const d = f.decls[n];
        if (!d) { errs.push(`${where}: '${f.id}' 에 선언 안 된 param '${n}'`); continue; }
        if (!sameShape(d.default, x)) { errs.push(`${where}: '${f.id}' params.${n} 종류가 기본값과 다르다`); continue; }
        if (typeof x === 'number' && ((d.min !== undefined && x < d.min) || (d.max !== undefined && x > d.max))) {
          errs.push(`${where}: '${f.id}' params.${n} = ${x} — 허용 범위(${[d.min !== undefined ? `${d.min} 이상` : '', d.max !== undefined ? `${d.max} 이하` : ''].filter(Boolean).join(' · ')}) 밖이다`);
          continue;
        }
        walkStrings(x, (s, at) => checkDollar(s, `${where}: '${f.id}' params.${n}${at ? '.' + at : ''}`, errs));
        f.values[n] = clone(x);
      }
    } else if (k === 'weight' && f.type === 'gate') errs.push(`${where}: '${f.id}' 은 문턱 — weight 를 쓸 수 없다`);
    else if (k === 'pass' && f.type === 'score') errs.push(`${where}: '${f.id}' 은 점수 — pass 를 쓸 수 없다`);
    else if (['two', 'one', 'zero'].includes(k) && f.type === 'gate') errs.push(`${where}: '${f.id}' 은 문턱 — ${k} 를 쓸 수 없다`);
    else f[k] = clone(val);
  }
}
function buildState(dir, ctx, errs, stack = []) {
  const p = loadPack(dir, ctx, errs);
  if (!p) return null;
  if (stack.includes(p.ref)) { errs.push(`extends 고리: ${[...stack, p.ref].join(' → ')}`); return null; }
  const where = rel(p.file), P = p.front;
  if (!P.extends) {
    return { pack: p, chain: [p.ref], format: P.format || FORMAT_DEFAULT, factors: P.factors.filter((id) => p.factors.has(id)).map((id) => fromFull(p.factors.get(id), p, 'base')), disabled: {}, recommend: { ...RECOMMEND, ...P.recommend }, rules: p.rules || [] };
  }
  const pdir = findPack(P.extends, dir, ctx, errs);
  if (!pdir) return null;
  const parent = buildState(pdir, ctx, errs, [...stack, p.ref]);
  if (!parent) return null;
  if (parent.pack.ref !== P.extends) { errs.push(`${where}: extends ${P.extends} 자리에서 ${parent.pack.ref} 를 찾았다`); return null; }
  const st = { pack: p, chain: [...parent.chain, p.ref], format: parent.format, factors: parent.factors.map(clone), disabled: { ...parent.disabled }, recommend: { ...parent.recommend }, rules: p.rules?.length ? p.rules : parent.rules };
  if (st.chain.length > CHAIN_MAX) errs.push(`${where}: extends 가 세 번을 넘는다 — 상속 차례 ${st.chain.join(' → ')}`);
  const has = (id) => st.factors.some((f) => f.id === id);
  const get = (id) => st.factors.find((f) => f.id === id);
  for (const [id, why] of Object.entries(P.disable || {})) {
    if (!has(id)) { errs.push(`${where}: disable — 물려받은 기준에 '${id}' 가 없다`); continue; }
    if (P.set?.[id]) errs.push(`${where}: '${id}' 를 disable 하고 set 할 수 없다`);
    st.disabled[id] = why;
    st.factors = st.factors.filter((f) => f.id !== id);
  }
  for (const [id, fields] of Object.entries(P.set || {})) {
    if (id in (P.disable || {})) continue;
    const f = get(id);
    if (!f) { errs.push(`${where}: set — 물려받은 기준에 '${id}' 가 없다`); continue; }
    setFields(f, fields, where, errs);
    f.origin = 'set'; f.from = p.ref;
  }
  for (const [id, e] of p.factors) {
    if (!e.override) continue;
    const fw = rel(e.file);
    if (id in (P.disable || {})) { errs.push(`${fw}: 끈 기준은 override 할 수 없다`); continue; }
    const f = get(id);
    if (!f) { errs.push(`${fw}: override — 물려받은 기준에 '${id}' 가 없다`); continue; }
    const { id: _i, override: _o, $schema: _s, ...fields } = e.front;
    setFields(f, fields, fw, errs);
    if (e.body.trim()) { f.body = e.body; checkHeads(f, e.body, fw, errs); }
    f.origin = 'override'; f.from = p.ref;
  }
  for (const id of P.add || []) {
    const e = p.factors.get(id);
    if (!e) continue;
    if (has(id) || id in st.disabled) { errs.push(`${rel(e.file)}: add — '${id}' 가 물려받은 기준과 겹친다(새 id 를 쓴다)`); continue; }
    st.factors.push(fromFull(e, p, 'add'));
  }
  if (P.recommend) Object.assign(st.recommend, P.recommend);
  return st;
}

// 글 틀(§3-3) — {{param}}: 문자열 그대로 · 숫자 String() · 배열 " · " 로 잇기
const textOf = (x) => (typeof x === 'string' ? x : typeof x === 'number' ? String(x) : Array.isArray(x) && x.every((y) => typeof y === 'string' || typeof y === 'number') ? x.map(String).join(' · ') : undefined);
function fill(s, f, where, errs, outs = null) {
  if (typeof s !== 'string') return s;
  return s.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (all, k) => {
    if (outs && k.includes('.')) {
      const [a, field] = k.split('.');
      if (!outs.has(a)) errs.push(`${where}: {{${k}}} — 측정 as '${a}' 가 없다`);
      else if (outs.get(a) && !(field in (outs.get(a).out || {}))) errs.push(`${where}: {{${k}}} — ${outs.get(a).ref} 출력에 '${field}' 가 없다`);
      return all;
    }
    if (!(k in f.values)) { errs.push(`${where}: 모르는 {{${k}}}`); return all; }
    const t = textOf(f.values[k]);
    if (t === undefined) { errs.push(`${where}: {{${k}}} — 글에 쓸 수 없는 값(객체)`); return all; }
    return t;
  });
}
function fillWith(x, f) {
  if (typeof x === 'string') { const m = x.match(/^\{\{\s*([a-z][a-z0-9_]*)\s*\}\}$/); return m && m[1] in f.values ? clone(f.values[m[1]]) : x; }
  if (Array.isArray(x)) return x.map((y) => fillWith(y, f));
  if (isObj(x)) return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, fillWith(y, f)]));
  return x;
}
function finalize(st, ctx, errs) {
  const p = st.pack, P = p.front;
  const factors = st.factors.map((f) => {
    const where = rel(f.file || p.file) + ` (${f.id} · ${p.ref})`;
    const outs = new Map((f.measure || []).map((m) => [m.as, ctx.measures.get(m.use.split('@')[0]) || null]));
    const T = (s) => fill(s, f, where, errs);
    const body0 = f.note ? `${f.body}\n\n## 이 팩에서 덧붙임\n${f.note}` : f.body;
    const ev = f.evidence || {};
    const out = { id: f.id, type: f.type };
    for (const k of ['name', 'ask', 'pass', 'two', 'one', 'zero', 'how']) if (f[k] !== undefined) out[k] = T(f[k]);
    if (f.type === 'score') out.weight = f.weight ?? 1;
    out.params = clone(f.values);
    if (f.measure) out.measure = f.measure.map((m) => ({ use: m.use, as: m.as, with: fillWith(m.with || {}, f) }));
    out.decide = clone(f.decide);
    if (f.fallback !== undefined) out.fallback = T(f.fallback);
    out.evidence = {};
    if (ev.template !== undefined) out.evidence.template = fill(ev.template, f, where, errs, outs);
    if (ev.must) out.evidence.must = ev.must.map(T);
    if (ev.pattern !== undefined) out.evidence.pattern = ev.pattern;
    if (ev.example !== undefined) out.evidence.example = ev.example;
    if (f.confirm) out.confirm = { need: T(f.confirm.need) };
    if (f.sources) out.sources = clone(f.sources);
    if (f.note !== undefined) out.note = T(f.note);
    out.body = T(body0);
    // 기준 해시(§3-6) — 결과를 바꾸는 칸만 · 이름 · how · weight · confirm · sources · example 은 뺀다
    const N = normText;
    out.hash = sha({
      id: out.id, type: out.type, ask: N(out.ask), pass: N(out.pass), two: N(out.two), one: N(out.one), zero: N(out.zero),
      params: out.params, measure: out.measure, decide: out.decide,
      evidence: { must: out.evidence.must?.map(N), pattern: out.evidence.pattern, template: N(out.evidence.template) },
      fallback: N(out.fallback), body: N(out.body),
    });
    out.origin = f.origin;
    out.from = f.from;
    return out;
  });
  const lang = P.lang || 'ko';
  // 팩 해시 — 규격 판(format)은 근거 검사 규칙을 바꾸므로 넣는다
  const hash = sha({ id: P.id, version: P.version, kind: P.kind, lang, format: st.format, recommend: st.recommend, disabled: st.disabled, factors: factors.map((f) => ({ id: f.id, hash: f.hash, name: f.name, how: f.how, weight: f.weight, confirm: f.confirm })) });
  return {
    id: P.id, version: P.version, kind: P.kind, lang, status: P.status || 'stable', name: P.name, description: P.description, date: P.date, license: P.license,
    format: st.format, chain: st.chain, hash, recommend: st.recommend, disabled: st.disabled, rules: st.rules, factors,
  };
}

// 팩 ref(<owner>/<name>[@<판>]) 또는 팩 폴더 → 풀린 팩. 문제가 있으면 pack null · errors 에 이유
export function resolvePack(target, opts = {}) {
  const ctx = opts.ctx || context(opts);
  const errs = [...(opts.ctx ? [] : ctx.errs)];
  const dir = isDir(target) ? path.resolve(target) : findPack(target, opts.from || process.cwd(), ctx, errs);
  const st = dir && buildState(dir, ctx, errs);
  const pack = st && !errs.length ? finalize(st, ctx, errs) : null;
  return { pack: errs.length ? null : pack, errors: [...new Set(errs)] };
}

// ── 검사 전부 ──
function findPackDirs(dir) {
  const out = [];
  const walk = (d) => {
    if (isFile(path.join(d, 'PACK.md'))) { out.push(d); return; }
    for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !['node_modules', '.git', '.criteria'].includes(e.name)) walk(path.join(d, e.name));
  };
  if (isDir(dir)) walk(path.resolve(dir));
  return out.sort();
}
function findUseFiles(dir) {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && !['node_modules', '.git', '.criteria'].includes(e.name)) walk(p); else if (e.name === 'use.json' && path.basename(d) === 'packs') out.push(p); } };
  if (isDir(dir)) walk(path.resolve(dir));
  return out.sort();
}
export async function validateAll(dirs = [], opts = {}) {
  const ctx = context(opts), errs = [...ctx.errs];
  const all = !dirs.length, skipped = [];
  const vectors = all ? await runVectors(ctx, errs, skipped) : 0;
  const roots = all ? [path.join(ctx.skill, 'packs'), path.join(ctx.skill, 'examples'), path.join(ctx.skill, 'tests', 'fixtures')] : dirs.map((d) => path.resolve(d));
  for (const d of roots) if (!all && !isDir(d)) errs.push(`폴더가 없다: ${d}`);
  const packDirs = roots.flatMap(findPackDirs);
  const packs = [];
  for (const d of packDirs) { const r = resolvePack(d, { ctx }); errs.push(...r.errors); if (r.pack) packs.push(r.pack); }
  for (const f of roots.flatMap(findUseFiles)) {
    let use;
    try { use = readJson(f); } catch (e) { errs.push(`${rel(f)}: JSON 이 아니다 — ${e.message}`); continue; }
    for (const [kind, ref] of Object.entries(use)) {
      const r = resolvePack(ref, { ctx, from: path.dirname(path.dirname(f)) });
      errs.push(...r.errors.map((m) => `${rel(f)} ${kind}: ${m}`));
      if (r.pack && r.pack.kind !== kind) errs.push(`${rel(f)}: '${kind}' 에 kind '${r.pack.kind}' 팩(${ref})`);
    }
  }
  return { errors: [...new Set(errs)], packs, measures: ctx.measures.size, refs: ctx.refs.size, vectors, skipped };
}

// ── 측정 셀(decide.by measure) — 세 값 논리 · bands · 근거 글(§3-4 · §7-5) ──
export function bindTarget(x, target) {
  if (typeof x === 'string') {
    if (x.startsWith('$$')) return x.slice(1);
    if (x.startsWith('$')) return x.slice(1).split('.').reduce((o, k) => (o == null ? undefined : o[k]), target) ?? null;
    return x;
  }
  if (Array.isArray(x)) return x.map((y) => bindTarget(y, target));
  if (isObj(x)) return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, bindTarget(y, target)]));
  return x;
}
export function evalCond(c, outs, params) {
  if (c.all) { const r = c.all.map((x) => evalCond(x, outs, params)); return r.includes(false) ? false : r.includes(null) ? null : true; }
  if (c.any) { const r = c.any.map((x) => evalCond(x, outs, params)); return r.includes(true) ? true : r.includes(null) ? null : false; }
  const [as, field] = c.m.split('.');
  const a = outs[as]?.[field] ?? null, b = 'p' in c ? params[c.p] ?? null : c.v;
  if (a === null || b === null) return null;
  switch (c.op) {
    case '==': return a === b;
    case '>=': return a >= b;
    case '>': return a > b;
    case '<=': return a <= b;
    case '<': return a < b;
    default: return null;
  }
}
export function evalBands(bands, outs, params) {
  for (const b of bands) {
    if (!b.when) return b.score;
    const r = evalCond(b.when, outs, params);
    if (r === true) return b.score;
    if (r === null) return null;
  }
  return null;
}
// 기준 하나가 부르는 측정기를 돌린다 — 코드가 없으면 unavailable. api 측정기는 부르지 않는다(API 가 열리면 --api)
// mctx = {dir: 방향 폴더, out: .criteria 폴더, ref(id): 참조 묶음} — 측정기 계약(규격 §6-1)
async function runMeasures(f, target, ctx, where = {}) {
  const outs = {}, measured = {}, why = [], images = [];
  const mctx = { dir: where.dir ?? null, out: where.out ?? null, ref: (id) => ctx.refs.get(id) ?? null };
  for (const m of f.measure || []) {
    const meta = ctx.measures.get(m.use.split('@')[0]);
    let out = meta?.code ? await meta.code(bindTarget(m.with, target), mctx) : { unavailable: meta?.access === 'api' ? API_UNAVAILABLE : '코드 없음' };
    if (!isObj(out)) out = { unavailable: '출력이 객체가 아니다' };
    out = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, typeof v === 'number' ? round(v, meta?.out?.[k]?.digits ?? 4) : v]));
    outs[m.as] = out;
    for (const [k, v] of Object.entries(out)) if (!['text', 'unavailable'].includes(k) && ['number', 'string', 'boolean'].includes(typeof v)) measured[`${m.as}.${k}`] = v;
    // 볼 그림 — 그림을 굽는 측정기의 images[].path · path
    for (const im of Array.isArray(out.images) ? out.images : []) if (typeof im?.path === 'string') images.push(im.path);
    if (typeof out.path === 'string') images.push(out.path);
    // 못 잰 것(missing) 다음에 재고도 정하지 않은 까닭(undecided)
    const lines = [...(Array.isArray(out.missing) ? out.missing : []), ...(Array.isArray(out.undecided) ? out.undecided : [])];
    if (out.unavailable) why.push(`${m.use}: ${out.unavailable}`);
    else if (lines.length) why.push(`${m.use}: ${[...new Set(lines)].join(' · ')}`);
  }
  return { outs, measured, why, images: [...new Set(images)] };
}
// 측정 셀의 값 · 근거 글 — 측정기 출력(outs)에서. 근거 = evidence.template 을 채운 글
const TEMPLATE_RE = /\{\{\s*([a-z][a-z0-9_]*)\.([a-z][a-z0-9_]*)\s*\}\}/g;
const measuredValue = (f, outs) => (f.type === 'gate' ? evalCond(f.decide.pass, outs, f.params) : evalBands(f.decide.bands, outs, f.params));
function measuredText(f, outs, ctx) {
  return f.evidence.template.replace(TEMPLATE_RE, (all, a, k) => {
    const v = outs[a]?.[k], meta = ctx.measures.get(f.measure.find((m) => m.as === a)?.use.split('@')[0]);
    return typeof v === 'number' ? fixed(v, meta?.out?.[k]?.display ?? meta?.out?.[k]?.digits ?? 4) : v == null ? '—' : String(v);
  });
}
// 측정 null 셀의 근거 머리
// - '측정 못 함' — 측정기를 못 썼거나(코드 없음 · needs 없음 · 측정기 오류 · api) 잴 것을 못 받았다(missing — 입력 없음 · 파일 없음 · 그리지 못함 · 칠한 것 없음)
// - '정하지 않음' — 재기는 했는데 정하지 않았다(undecided — 놓일 자리를 모르는 마스크의 밖 픽셀 · 바탕을 가르지 못한 타일)
export const NULL_HEADS = { lost: '측정 못 함', undecided: '정하지 않음' };
export const nullHead = (f, outs) => ((f.measure || []).some((m) => outs[m.as]?.unavailable || (Array.isArray(outs[m.as]?.missing) && outs[m.as].missing.length)) ? NULL_HEADS.lost : NULL_HEADS.undecided);
// 측정으로 정하는 기준의 셀 — [값, 근거, 메타]. 측정이 null 이면 셀도 null(안 봄)
export async function measureCells(pack, target, opts = {}) {
  const ctx = opts.ctx || context(opts), cells = {};
  for (const f of pack.factors) {
    if (f.decide.by !== 'measure') continue;
    const { outs, measured, why } = await runMeasures(f, target, ctx, opts);
    const value = measuredValue(f, outs);
    const evidence = value === null ? `${nullHead(f, outs)} — ${why.join(' · ') || '값 없음'}` : measuredText(f, outs, ctx);
    cells[f.id] = [value, evidence, { by: 'measure', factor: f.hash, measured, ...(why.length ? { unavailable: why } : {}) }];
  }
  return cells;
}
// 다시 재지 못한 측정 셀 — 셀 메타 measured(`{"as.칸": 값}`)로 값을 다시 낸다. 근거 글은 글 틀이 부르는 칸이 measured 에 다 있을 때만(text 칸은 measured 에 없다)
export function fromMeasured(f, measured, ctx) {
  const outs = {};
  for (const [k, v] of Object.entries(isObj(measured) ? measured : {})) { const i = k.indexOf('.'); if (i > 0) (outs[k.slice(0, i)] ??= {})[k.slice(i + 1)] = v; }
  const value = measuredValue(f, outs);
  const refs = [...(f.evidence.template || '').matchAll(TEMPLATE_RE)];
  const evidence = value !== null && refs.every(([, a, k]) => outs[a] && k in outs[a]) ? measuredText(f, outs, ctx) : null;
  return { value, evidence };
}
// 판정 기준의 판단 재료 — 측정기 출력(숫자 · 글 · 참거짓) · 볼 그림 · 못 쓴 측정기
export async function judgeInputs(pack, target, opts = {}) {
  const ctx = opts.ctx || context(opts), inputs = {};
  for (const f of pack.factors) {
    if (f.decide.by !== 'judge' || !f.measure?.length) continue;
    const { measured, why, images } = await runMeasures(f, target, ctx, opts);
    inputs[f.id] = { measured, ...(images.length ? { images } : {}), ...(why.length ? { unavailable: why } : {}) };
  }
  return inputs;
}
// 측정 못 한 측정 셀을 판정하는 쪽이 채울 수 있나 — 판 2 는 측정 기준 모두(fallback, 없으면 그 기준 본문 '## 하는 일' 대로),
// 판 3 은 fallback 이 있는 측정 기준만(없으면 안 봄)
const hasFallback = (f) => typeof f.fallback === 'string' && f.fallback.length > 0;
export const judgeFills = (f, format = FORMAT_DEFAULT) => f.decide.by === 'measure' && (!isStrict(format) || hasFallback(f));

// ── 대상(§7-1) — direction.json + round.json context · 파일 역할 ──
// 역할 → 방향 폴더의 파일 이름(확장자 빼고). <역할>_dark 는 render@1 이 dark 바탕 짝으로 쓴다
const ROLE_FILES = { mark: 'mark', mark_small: 'mark-small', mark_1c: 'mark-1c', mark_reverse: 'mark-reverse', mark_dark: 'mark-dark', mark_small_dark: 'mark-small-dark', lockup: 'lockup', lockup_dark: 'lockup-dark', profile: 'profile' };
export function filesOf(dir, dj = {}) {
  const files = { ...(isObj(dj.files) ? dj.files : {}) };
  for (const [role, base] of Object.entries(ROLE_FILES)) {
    if (role in files) continue;
    const hit = ['svg', 'png'].map((e) => `${base}.${e}`).find((f) => isFile(path.join(dir, f)));
    if (hit) files[role] = hit;
  }
  if (!('fonts' in files)) {
    const fd = path.join(dir, 'fonts');
    const list = isDir(fd) ? fs.readdirSync(fd).filter((f) => /\.(ttf|otf|ttc)$/i.test(f)).sort().map((f) => `fonts/${f}`) : [];
    if (list.length) files.fonts = list;
  }
  return files;
}
const readIf = (p) => (isFile(p) ? readJson(p) : null);
// 방향 폴더 하나 → {id, kind, target, from(라운드 폴더)} — kind: direction.json kind → --kind → 라운드 score.json 의 kind
export function directionOf(input, kindFlag) {
  const dir = path.resolve(isFile(input) ? path.dirname(input) : input);
  const dj = readIf(path.join(dir, 'direction.json'));
  if (!dj) throw new Error(`${rel(dir)}: direction.json 이 없다`);
  const id = dj.id || path.basename(dir), round = path.dirname(path.dirname(dir));
  const rj = readIf(path.join(round, 'round.json')) || {}, sj = readIf(path.join(round, 'score.json')) || {};
  const kind = dj.kind || kindFlag || sj.directions?.[id]?.kind;
  if (!kind) throw new Error(`${rel(dir)}: kind 를 모른다 — direction.json kind 또는 --kind <logo | icon | color | type>`);
  const target = { tokens: dj.tokens ?? null, tiles: dj.tiles ?? null, color: dj.color ?? null, files: filesOf(dir, dj), context: { ...(isObj(rj.context) ? rj.context : {}), ...(isObj(dj.context) ? dj.context : {}) } };
  return { dir, id, kind, round, target };
}
// kind 마다 쓸 팩(§2-3) — --pack → 위로 그 kind 를 적은 가장 가까운 packs/use.json(적지 않은 kind 는 더 위로) → tinysolver/<kind>
export function packFor(kind, fromDir, flag) {
  if (flag) return flag;
  const top = gitTop(fromDir);
  for (let d = path.resolve(fromDir); ; d = path.dirname(d)) {
    const use = readIf(path.join(d, 'packs', 'use.json'));
    if (use?.[kind]) return use[kind];
    if (d === top || path.dirname(d) === d) break;
  }
  return `tinysolver/${kind}`;
}

// ── 셈(§7-6) — 끈 기준은 이미 빠져 있다 ──
// confirm = 사람 확인이 있는 기준 가운데 값이 매겨졌고 아직 확인 · 뒤집기 전인 셀(메타가 없는 옛 셀도 남은 것으로 본다) — state 는 바꾸지 않는다
const CONFIRM_DONE = ['confirmed', 'overturned'];
export function tally(pack, dir) {
  const rec = pack.recommend, blocked = [], unseen = [], below = [], confirm = [];
  let total = 0, max = 0;
  for (const f of pack.factors) {
    const cell = (f.type === 'gate' ? dir.gates : dir.scores)?.[f.id];
    const v = cell?.[0] ?? null;
    if (f.confirm && v !== null && !CONFIRM_DONE.includes(cell?.[2]?.confirm?.status)) confirm.push(f.id);
    if (f.type === 'gate') { if (v === false) blocked.push(f.id); else if (v !== true) unseen.push(f.id); continue; }
    const w = f.weight ?? 1;
    max += 2 * w;
    if (![0, 1, 2].includes(v)) { unseen.push(f.id); continue; }
    total += w * v;
    if (v < rec.score_min) below.push(f.id);
  }
  const state = blocked.length ? 'blocked' : unseen.length ? 'unseen' : below.length || total < rec.total_ratio * max - 1e-9 ? 'below' : 'ok';
  return { total, max, blocked, unseen, below, confirm, state };
}
// ── 라운드 — prepare → 판정(answers.json) → finish (§7-2 · §7-3) ──
// 사람에게 보이는 날짜는 KST, 기록 시각은 UTC — 서버 로컬 시간대에 기대지 않는다
const kstDate = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const utcNow = () => new Date().toISOString();
// 이미 있는 파일은 그 파일의 들여쓰기(칸 수 · 탭)를 따른다 — 셀이 그대로면 파일 diff 도 없게. 새 파일은 두 칸
const indentOf = (p) => { try { const m = fs.readFileSync(p, 'utf8').match(/^[[{]\r?\n([ \t]+)\S/); return m ? (m[1][0] === '\t' ? '\t' : m[1].length) : 2; } catch { return 2; } };
const writeJson = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, `${JSON.stringify(v, null, indentOf(p))}\n`); };
const TYPE_WORD = { gate: '문턱', score: '점수' };
const ALLOWED = { gate: [true, false, null], score: [0, 1, 2, null] };
const toPosix = (p) => p.split(path.sep).join('/');

export function directionDirs(roundDir) {
  const dd = path.join(path.resolve(roundDir), 'directions');
  if (!isDir(dd)) throw new Error(`${rel(path.resolve(roundDir))}: directions/ 폴더가 없다`);
  return fs.readdirSync(dd).sort().map((n) => path.join(dd, n)).filter((d) => isFile(path.join(d, 'direction.json')));
}
function packsFor(kinds, round, flags, ctx, errs) {
  const packs = {};
  for (const kind of kinds) {
    const ref = packFor(kind, round, flags?.[kind]);
    const r = resolvePack(ref, { ctx, from: round });
    if (r.errors.length) { errs.push(...r.errors.map((e) => `${kind} → ${ref}: ${e}`)); continue; }
    if (r.pack.kind !== kind) { errs.push(`${ref} 는 kind '${r.pack.kind}' — 방향은 '${kind}'`); continue; }
    packs[kind] = r.pack;
  }
  return packs;
}

// 판정지 — 기준 하나를 판정할 때 읽는 글(과제 파일 · resolve --factor)
function scaleLines(f) {
  if (f.type === 'gate') return [`- \`true\` 통과 — ${f.pass}`, `- \`false\` ${GATE_VALUES.false}`, `- \`null\` ${GATE_VALUES.null}`];
  return [`- \`2\` ${f.two}`, `- \`1\` ${f.one ?? SCALE[1]}`, `- \`0\` ${f.zero}`, '- `null` 볼 것이 모자라 못 매김'];
}
// 근거 검사(§7-5) — 규격 판마다
const evidenceRule = (format) => (isStrict(format) ? '근거가 비었거나 정한 모양(pattern)이 아니면 2점은 1점, 문턱 통과(true)는 안 봄(null)으로 깎인다.' : '근거가 비었거나 정한 모양(pattern)이 아니면 2점은 1점으로 깎인다.');
export function factorSheet(pack, f, rows = []) {
  const L = [`# ${f.name} — \`${f.id}\` · ${TYPE_WORD[f.type]} · ${pack.id}@${pack.version}`, ''];
  if (pack.status === 'draft') L.push('> 초안 팩이다 — 결과를 말할 때 "초안 팩"이라고 먼저 말한다.', '');
  L.push(`**묻는 말** ${f.ask}`, '', '**값**', ...scaleLines(f), '', `**어떻게** ${f.how}`);
  if (f.type === 'score' && f.weight !== 1) L.push('', `**무게** ${f.weight}`);
  const fills = judgeFills(f, pack.format);
  if (f.decide.by === 'measure') L.push('', `**정하는 쪽** 측정 ${f.measure.map((m) => m.use).join(' · ')} — 측정값이 있으면 뒤집지 않는다. ${!fills ? '측정을 못 하면 안 봄(null)이다 — 판정으로 채우지 않는다.' : hasFallback(f) ? "측정을 못 한 방향만 아래 '측정기를 못 쓰면' 대로 판정하는 쪽이 채운다." : "측정을 못 한 방향만 아래 본문 '## 하는 일' 대로 판정하는 쪽이 채운다."}`);
  else if (f.decide.trials > 1) L.push('', `**판정 횟수** ${f.decide.trials}번(${f.decide.aggregate || (f.type === 'gate' ? 'majority' : 'median')}) — 되도록 서로 다른 맥락(새 세션)에서 따로 매긴다`);
  const ev = f.evidence || {};
  if (ev.must?.length) L.push('', '**근거에 꼭 넣을 것**', ...ev.must.map((m) => `- ${m}`));
  if (ev.example) L.push('', `**근거 예** ${ev.example}`);
  if (f.fallback) L.push('', `**측정기를 못 쓰면** ${f.fallback}`);
  if (f.confirm) L.push('', `**사람 확인(판정 뒤 · 판정하는 쪽은 쓰지 않는다)** ${f.confirm.need}`);
  L.push('', '---', '', f.body);
  if (rows.length) {
    L.push('', '---', '', '## 방향마다', '', '라운드 글(brief · core · context)은 라운드 폴더 `round.json` 에 있다.');
    for (const r of rows) {
      L.push('', `### ${r.id} — ${r.dir}/`);
      const files = Object.entries(r.files || {}).map(([k, v]) => `${k} ${[].concat(v).join(', ')}`);
      L.push(`- 파일: ${files.join(' · ') || '없음'}`);
      if (r.measured && Object.keys(r.measured).length) L.push(`- 측정값: ${Object.entries(r.measured).map(([k, v]) => `${k} = ${v}`).join(' · ')}`);
      if (r.images?.length) L.push(`- 볼 그림(실제 크기로): ${r.images.join(' · ')}`);
      if (r.unavailable?.length) L.push(`- 못 쓴 측정기: ${r.unavailable.join(' · ')}`);
      if (r.note) L.push(`- ${r.note}`);
    }
  }
  if (f.decide.by === 'measure' && !fills) {
    L.push('', '## 답 — 쓰지 않는다', '', '측정으로 정하는 기준이다. 측정을 못 한 방향은 안 봄(null)으로 남고, `.criteria/answers.json` 에 쓴 답은 finish 가 쓰지 않는다.');
    return `${L.join('\n')}\n`;
  }
  const n = f.decide.trials > 1 ? f.decide.trials : 1;
  L.push('', '## 답 — `.criteria/answers.json`', '',
    n > 1 ? `\`{"<방향>": {"${f.id}": [[값, "근거"], …]}}\` — ${n}번 매겨 ${n}쌍. 모자라면 셀 메타 \`trials_short\` 에 남고 finish 가 알린다` : `\`{"<방향>": {"${f.id}": [값, "근거"]}}\``,
    '', `값은 ${ALLOWED[f.type].map(String).join(' · ')}. ${evidenceRule(pack.format)}`);
  return `${L.join('\n')}\n`;
}

// 비교판 — 같은 크기로 나란히 · 밝은 · 어두운 바탕 · 실제 크기(확대 없음) · 회색조 · 마스크
const BOARD_SIZES = [16, 20, 24, 32, 48, 64, 256];
const BOARD_BG = { light: '#ffffff', dark: '#000000' }; // 토큰 bg 가 없을 때 — render@1 과 같은 바탕
const MASKS = [['원형', 'circle', 'border-radius:50%'], ['iOS 모서리', 'ios-corner', 'border-radius:22.5%'], ['안드로이드 적응형', 'android-adaptive', 'clip-path:circle(30.56% at 50% 50%)'], ['maskable', 'maskable', 'clip-path:circle(40% at 50% 50%)']];
// 마스크 판을 놓는 비율 — 팩에서 safe-area 를 부르는 기준(crop)의 fit(숫자 · {마스크: 비율}). 없으면 파일 그대로
export const maskFit = (pack) => pack.factors.flatMap((f) => (f.measure || []).filter((m) => m.use.startsWith('safe-area@')).map((m) => m.with?.fit)).find((x) => x != null) ?? null;
const fitAt = (fit, mask) => { const v = typeof fit === 'number' ? fit : isObj(fit) ? fit[mask] : undefined; return typeof v === 'number' && v >= 0.1 && v <= 1 ? v : null; };
export function boardHtml(title, rows) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const src = (r, file) => esc(`../${toPosix(r.dir)}/${file}`);
  const img = (r, file, px, style = '') => `<img src="${src(r, file)}" width="${px}" height="${px}" alt="${esc(file)}" style="object-fit:contain;${style}">`;
  const sections = rows.map((r) => {
    const bg = { light: r.tokens?.light?.bg || BOARD_BG.light, dark: r.tokens?.dark?.bg || BOARD_BG.dark };
    const head = `<h2>${esc(r.id)} <small>${esc(r.kind)} · ${esc(r.pack)}</small></h2>`;
    if (r.kind === 'color') {
      const c = r.color || {};
      const chip = (fill, back, label) => `<div class="chip" style="background:${esc(back)}"><span style="background:${esc(fill)}"></span><code style="color:${esc(fill)}">${esc(label)}</code></div>`;
      return `<section>${head}<div class="row">${chip(c.hex, bg.light, c.hex)}${chip(c.dark || c.hex, bg.dark, c.dark ? c.dark : `${c.hex} (어두운 판 없음)`)}</div></section>`;
    }
    const f = r.files || {};
    const mains = [].concat(r.kind === 'icon' ? f.icon || [] : f.mark || f.lockup || []).filter(Boolean);
    const smalls = [].concat(r.kind === 'icon' ? f.icon_small || f.icon || [] : f.mark_small || f.mark || f.lockup || []).filter(Boolean);
    if (!mains.length) return `<section>${head}<p>볼 판 없음 — ${r.kind === 'icon' ? 'direction.json files.icon' : 'mark.svg'} 이 없다</p></section>`;
    const lines = mains.map((main, i) => {
      const small = smalls[i] || smalls[0] || main;
      const onDark = (file) => (r.kind !== 'icon' && f.mark_dark && file === [].concat(f.mark || [])[0] ? [].concat(f.mark_dark)[0] : file); // 어두운 바탕 판이 있으면 그 판
      const sizes = ['light', 'dark'].map((t) => `<div class="tile" style="background:${esc(bg[t])}">${BOARD_SIZES.map((px) => { const file = px <= 32 ? small : main; return `<figure>${img(r, t === 'dark' ? onDark(file) : file, px)}<figcaption>${px}</figcaption></figure>`; }).join('')}</div>`).join('');
      const gray = ['light', 'dark'].map((t) => `<div class="tile" style="background:${esc(bg[t])}"><figure>${img(r, main, 64, 'filter:grayscale(1)')}<figcaption>회색조</figcaption></figure></div>`).join('');
      const profile = r.kind === 'icon' ? main : [].concat(f.profile || main)[0];
      const masks = `<div class="tile" style="background:${esc(bg.light)}">${MASKS.map(([name, id, css]) => { const k = fitAt(r.fit, id); return `<figure><div class="mask" style="${css};background:${esc(bg.light)}">${img(r, profile, k === null ? 128 : Math.round(128 * k))}</div><figcaption>${name}${k === null ? '' : ` · ${k}`}</figcaption></figure>`; }).join('')}</div>`;
      return `<h3>${esc(main)}</h3><div class="row">${sizes}</div><div class="row">${gray}${masks}</div>`;
    });
    const extra = r.kind !== 'icon' ? ['mark_1c', 'mark_reverse', 'lockup'].filter((k) => f[k]).map((k) => `<figure>${`<img src="${src(r, [].concat(f[k])[0])}" height="64" alt="${esc(k)}">`}<figcaption>${k}</figcaption></figure>`).join('') : '';
    return `<section>${head}${lines.join('')}${extra ? `<div class="row"><div class="tile" style="background:${esc(bg.light)}">${extra}</div></div>` : ''}</section>`;
  });
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
body{margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif;background:#ffffff;color:#111111}
h1{font-size:18px}h2{font-size:16px;margin:24px 0 8px}h2 small{font-weight:400;color:#666}h3{font-size:13px;font-weight:500;color:#555;margin:12px 0 6px}
.row{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.tile{display:flex;align-items:flex-end;gap:14px;padding:14px;border-radius:8px;border:1px solid #0002}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:4px}figcaption{font-size:11px;color:#888}
.chip{display:flex;align-items:center;gap:10px;padding:16px 20px;border-radius:8px}.chip span{width:48px;height:48px;border-radius:8px;display:block}
.mask{width:128px;height:128px;display:flex;align-items:center;justify-content:center;outline:1px dashed #9998}
</style></head><body>
<h1>${esc(title)}</h1>
<p>그림은 실제 크기다(확대 없음). 화면 배율이 100% 일 때 본다. 작은 크기(32px 이하)는 작은 판이 있으면 그 판이다. 마스크 판은 잘림 기준이 정한 비율(fit · 이름 옆 숫자)의 상자에 판 파일을 놓았다 — 투명 둘레는 자르지 않아 측정보다 조금 작게 보일 수 있다.</p>
${sections.join('\n')}
</body></html>
`;
}

export async function prepare(roundDir, opts = {}) {
  const round = path.resolve(roundDir), out = path.join(round, '.criteria');
  const ctx = context(), errs = [...ctx.errs];
  let dirs;
  try { dirs = directionDirs(round).map((d) => directionOf(d, opts.kind)); } catch (e) { return { errors: [e.message] }; }
  if (!dirs.length) return { errors: [`${rel(round)}: directions/<방향>/direction.json 이 하나도 없다`] };
  const packs = packsFor([...new Set(dirs.map((d) => d.kind))], round, opts.packs, ctx, errs);
  if (errs.length) return { errors: [...new Set(errs)] };
  const measured = {};
  for (const d of dirs) {
    const pack = packs[d.kind];
    measured[d.id] = {
      kind: d.kind, pack: `${pack.id}@${pack.version}`, dir: toPosix(path.relative(round, d.dir)), files: d.target.files,
      cells: await measureCells(pack, d.target, { ctx, dir: d.dir, out }), inputs: await judgeInputs(pack, d.target, { ctx, dir: d.dir, out }),
    };
  }
  const written = [];
  const put = (p, text) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, text); written.push(p); };
  for (const [kind, p] of Object.entries(packs)) put(path.join(out, 'resolved', `${kind}.json`), `${JSON.stringify(p, null, 1)}\n`);
  put(path.join(out, 'measured.json'), `${JSON.stringify(measured, null, 2)}\n`);
  fs.rmSync(path.join(out, 'tasks'), { recursive: true, force: true });
  const todo = [], unseen = [];
  for (const [kind, p] of Object.entries(packs)) {
    const ids = Object.keys(measured).filter((id) => measured[id].kind === kind);
    for (const f of p.factors) {
      const nulls = f.decide.by === 'measure' ? ids.filter((id) => measured[id].cells[f.id]?.[0] === null) : [];
      // 측정이 null 인 셀 — 판정이 채울 수 있는 기준(판 2 · fallback)만 판정 과제로, 나머지는 안 봄(null)으로 남는다
      const fills = judgeFills(f, p.format);
      if (nulls.length && !fills) unseen.push({ kind, id: f.id, dirs: nulls, why: [...new Set(nulls.flatMap((id) => measured[id].cells[f.id][2].unavailable || []))] });
      const need = f.decide.by === 'judge' ? ids : fills ? nulls : [];
      if (!need.length) continue;
      const rows = need.map((id) => {
        const m = measured[id], input = f.decide.by === 'judge' ? m.inputs[f.id] : { measured: m.cells[f.id][2].measured, unavailable: m.cells[f.id][2].unavailable };
        const head = f.decide.by === 'measure' ? String(m.cells[f.id][1]).split(' — ')[0] : null;
        return { id, dir: m.dir, files: m.files, measured: input?.measured, images: input?.images, unavailable: input?.unavailable, note: !head ? null : hasFallback(f) ? `${head} — '측정기를 못 쓰면' 대로 채운다` : `${head} — 본문 '## 하는 일' 대로 채운다` };
      });
      put(path.join(out, 'tasks', kind, `${f.id}.md`), factorSheet(p, f, rows));
      todo.push({ kind, id: f.id, dirs: need, trials: f.decide.trials || 1 });
    }
  }
  const ans = path.join(out, 'answers.json');
  if (!isFile(ans)) put(ans, `${JSON.stringify(Object.fromEntries(Object.keys(measured).map((id) => [id, {}])), null, 2)}\n`);
  const rows = Object.entries(measured).map(([id, m]) => ({ id, ...m, tokens: dirs.find((d) => d.id === id).target.tokens, color: dirs.find((d) => d.id === id).target.color, fit: maskFit(packs[m.kind]) }));
  put(path.join(out, 'board.html'), boardHtml(`비교판 — ${path.basename(round)}`, rows));
  return { errors: [], packs, measured, todo, unseen, written, out };
}

// 근거 검사(§7-5) — 값이 허용 밖이면 null · 근거가 비었거나 모양(pattern)이 틀린 2점은 1점
// 규격 3 팩(format 3)은 근거가 비었거나 모양이 틀린 문턱 통과(true)도 안 봄(null)
export function checkOne(f, ans, format = FORMAT_DEFAULT) {
  if (!Array.isArray(ans) || ans.length < 1) return { v: null, ev: '', cut: '답 모양이 [값, "근거"] 가 아니다' };
  const v = ans[0], ev = typeof ans[1] === 'string' ? ans[1] : '';
  if (!ALLOWED[f.type].includes(v)) return { v: null, ev, cut: `값이 틀림(${JSON.stringify(v)})` };
  const empty = !ev.trim();
  let bad = false;
  // 모양을 못 읽으면(정규식 오류) 맞지 않는 것으로 본다 — validate 가 먼저 막는다
  if (!empty && f.evidence?.pattern) { try { bad = !new RegExp(f.evidence.pattern, 'u').test(ev); } catch { bad = true; } }
  if (f.type === 'score' && v === 2 && (empty || bad)) return { v: 1, ev, cut: empty ? '근거 없는 2점 → 1점' : '근거가 정한 모양(pattern)이 아니다 → 1점' };
  if (isStrict(format) && f.type === 'gate' && v === true && (empty || bad)) return { v: null, ev, cut: empty ? '근거 없는 문턱 통과 → 안 봄(null)' : '근거가 정한 모양(pattern)이 아니다 → 안 봄(null)' };
  return { v, ev, cut: null };
}
// trials 합치기(§3-4)
export function aggregate(how, type, vals) {
  how = how || (type === 'gate' ? 'majority' : 'median');
  if (how === 'any_false') return vals.includes(false) ? false : vals.length && vals.every((v) => v === true) ? true : null;
  if (how === 'majority') {
    const n = new Map();
    for (const v of vals) n.set(JSON.stringify(v), (n.get(JSON.stringify(v)) || 0) + 1);
    const top = [...n.entries()].sort((a, b) => b[1] - a[1]);
    return !top.length || (top[1] && top[1][1] === top[0][1]) ? null : JSON.parse(top[0][0]);
  }
  const nums = vals.filter((v) => typeof v === 'number').sort((a, b) => a - b);
  if (!nums.length) return null;
  return how === 'min' ? nums[0] : nums[Math.floor((nums.length - 1) / 2)]; // median — 짝수면 낮은 쪽
}
export function judgeCell(f, ans, input, format = FORMAT_DEFAULT) {
  const list = Array.isArray(ans) && ans.length && ans.every(Array.isArray) ? ans : [ans];
  const checked = list.map((a) => checkOne(f, a, format)), vals = checked.map((c) => c.v);
  const v = checked.length > 1 ? aggregate(f.decide.aggregate, f.type, vals) : vals[0];
  const pick = checked.find((c) => c.v === v && c.ev.trim()) || checked.find((c) => c.v === v) || checked[0];
  const meta = { by: 'judge', factor: f.hash };
  if (input?.measured && Object.keys(input.measured).length) meta.measured = input.measured;
  if (input?.unavailable?.length) meta.unavailable = input.unavailable;
  if (checked.length > 1) meta.trials = vals;
  if (f.decide.trials > 1 && checked.length < f.decide.trials) meta.trials_short = `${checked.length}/${f.decide.trials}`;
  const cuts = [...new Set(checked.map((c) => c.cut).filter(Boolean))];
  if (cuts.length) meta.cut = cuts.join(' · ');
  if (f.confirm && v !== null) meta.confirm = { need: f.confirm.need, status: 'pending' };
  return [v, pick.ev, meta];
}

// 사람 확인 — confirm 칸이 confirmed · overturned 이고 by · at 이 있을 때만 사람이 한 것으로 본다
const personMark = (c) => (isObj(c) && CONFIRM_DONE.includes(c.status) && typeof c.by === 'string' && c.by && typeof c.at === 'string' && c.at ? c.status : null);
// 판 3 — 이미 있던 판정 셀을 답처럼 다시 근거 검사한다. 값이 그대로면 사람 확인도 남기고, 바뀌면 확인은 다시 남은 것으로
function recheckCell(f, oc, format) {
  const k = checkOne(f, [oc[0], oc[1]], format);
  const was = isObj(oc[2]) ? oc[2] : {}, same = jcs(k.v) === jcs(oc[0]);
  if (same && was.by === 'judge' && typeof was.factor === 'string') return oc;
  const { by: _b, factor, cut: _c, confirm, ...keep } = was;
  const meta = { by: 'judge', factor: typeof factor === 'string' ? factor : f.hash, ...keep };
  if (k.cut) meta.cut = k.cut;
  if (same && personMark(confirm)) meta.confirm = confirm;
  else if (f.confirm && k.v !== null) meta.confirm = { need: f.confirm.need, status: 'pending' };
  return [k.v, k.ev, meta];
}
// 판 3 — 이미 있던 셀을 다시 본다. 셀이 적은 by 는 믿지 않고 기준의 decide.by 로 가른다 — 남기지 않으면 null
function recheckOld(f, oc, format, ctx) {
  if (oc[0] === null) return oc;
  if (f.decide.by === 'measure' && oc[2]?.by === 'measure') { // 다른 곳에서 잰 셀 — 남긴 measured 로 같은 값 · 근거 글이 나와야 남긴다
    const re = fromMeasured(f, oc[2].measured, ctx);
    return jcs(re.value) === jcs(oc[0]) && (re.evidence === null || re.evidence === oc[1]) ? oc : null;
  }
  if (f.decide.by === 'measure' && !judgeFills(f, format)) return null; // fallback 없는 측정 기준을 판정으로 채운 셀은 버린다
  return recheckCell(f, oc, format);
}

export function finish(roundDir, opts = {}) {
  const round = path.resolve(roundDir), cdir = path.join(round, '.criteria');
  let measured, answers, old;
  try {
    measured = readIf(path.join(cdir, 'measured.json'));
    answers = readIf(path.join(cdir, 'answers.json')) || {};
    old = readIf(path.join(round, 'score.json')) || {};
  } catch (e) { return { errors: [`JSON 이 아니다 — ${e.message}`] }; }
  if (!measured) return { errors: [`${rel(cdir)}/measured.json 이 없다 — 먼저 prepare 를 돌린다`] };
  const ctx = context(), errs = [...ctx.errs], packs = {};
  for (const m of Object.values(measured)) {
    if (packs[m.kind]) continue;
    const r = resolvePack(m.pack, { ctx, from: round });
    if (r.errors.length) errs.push(...r.errors.map((e) => `${m.kind} → ${m.pack}: ${e}`)); else packs[m.kind] = r.pack;
  }
  if (errs.length) return { errors: [...new Set(errs)] };
  const warn = [];
  for (const [id, a] of Object.entries(answers)) {
    if (!measured[id]) { warn.push(`answers.json: 방향 '${id}' 는 이 라운드에 없다`); continue; }
    for (const fid of Object.keys(a || {})) {
      const f = packs[measured[id].kind].factors.find((x) => x.id === fid);
      if (!f) warn.push(`answers.json: ${id} 의 '${fid}' 는 ${measured[id].pack} 기준이 아니다`);
      else if (f.decide.by === 'measure' && measured[id].cells[fid]?.[0] !== null) warn.push(`answers.json: ${id} 의 '${fid}' — 측정값이 있어 답을 쓰지 않았다`);
      else if (f.decide.by === 'measure' && !judgeFills(f, packs[measured[id].kind].format)) warn.push(`answers.json: ${id} 의 '${fid}' — 측정으로 정하는 기준이라 측정 못 하면 안 봄(null) · 답을 쓰지 않았다`);
      else if (f.decide.trials > 1 && !(Array.isArray(a[fid]) && a[fid].length >= f.decide.trials && a[fid].every(Array.isArray))) warn.push(`answers.json: ${id} 의 '${fid}' — ${f.decide.trials}번 매기는 기준인데 답이 모자란다(셀 메타 trials_short)`);
    }
  }
  const directions = {}, cuts = [];
  let changed = false;
  for (const [id, m] of Object.entries(measured)) {
    const pack = packs[m.kind], od = old.directions?.[id] || {}, a = answers[id] || {}, strict = isStrict(pack.format);
    const cells = { gates: {}, scores: {} };
    for (const f of pack.factors) {
      const b = f.type === 'gate' ? 'gates' : 'scores', mc = m.cells[f.id], oc = Array.isArray(od[b]?.[f.id]) ? od[b][f.id] : undefined;
      const was = oc?.[2]?.confirm, person = personMark(was);
      const fills = f.decide.by === 'judge' || judgeFills(f, pack.format), answered = a[f.id] !== undefined && a[f.id] !== null;
      // 측정이 정한 셀 — confirm 이 뒤집지 못하게 막는 셀과 같은 기준(§7-5). 셀에 사람이 뒤집었다는 표시가 있어도 지키지 않고 다시 본다
      const measuredCell = f.decide.by === 'measure' && (oc?.[2]?.by === 'measure' || !judgeFills(f, pack.format));
      const none = () => mc ?? [null, '안 봄 — 답 없음', { by: 'judge', factor: f.hash }];
      let cell;
      if (mc && mc[0] !== null) cell = mc; // 측정값이 있으면 측정이 정한다
      // 사람이 뒤집은 셀 · 확인한 셀은 답이 덮지 않는다 — 다시 매기려면 score.json 에서 그 셀을 지운다. 판 3 은 확인한 셀도 근거 검사를 다시 한다
      else if (person === 'overturned' && !measuredCell) cell = oc;
      else if (person === 'confirmed' && !strict) cell = oc;
      else if (person) cell = recheckOld(f, oc, pack.format, ctx) ?? none(); // 확인한 셀(판 3) · 측정이 정하는 셀에 적힌 뒤집기
      else if (fills && answered) cell = judgeCell(f, a[f.id], f.decide.by === 'judge' ? m.inputs?.[f.id] : { unavailable: mc?.[2]?.unavailable }, pack.format);
      else if (oc && !strict) cell = oc; // 판 2 — 이미 있던 셀(메타 없는 옛 셀 포함)은 다시 검사하지 않는다
      else if (oc) cell = recheckOld(f, oc, pack.format, ctx) ?? none(); // 판 3 — 이미 있던 셀도 답처럼 검사한다
      else cell = none();
      if (cell !== oc && person && jcs(oc[0]) === jcs(cell[0]) && !cell[2]?.confirm) cell = [cell[0], cell[1], { ...(cell[2] || {}), confirm: was }]; // 값이 그대로면 확인도 남긴다
      if (cell[2]?.cut && cell !== oc) cuts.push(`${id} ${f.id} — ${cell[2].cut}`);
      cells[b][f.id] = cell;
    }
    if (jcs({ k: od.kind, g: od.gates, s: od.scores }) !== jcs({ k: m.kind, g: cells.gates, s: cells.scores })) changed = true;
    const { kind: _k, gates: _g, scores: _s, tally: _t, ...rest } = od;
    directions[id] = { ...rest, kind: m.kind, gates: cells.gates, scores: cells.scores, tally: tally(pack, cells) };
  }
  const packMeta = Object.fromEntries(Object.entries(packs).map(([k, p]) => [k, {
    ref: `${p.id}@${p.version}`, chain: p.chain, hash: p.hash, recommend: p.recommend,
    weights: Object.fromEntries(p.factors.filter((f) => f.type === 'score' && f.weight !== 1).map((f) => [f.id, f.weight])), disabled: p.disabled,
  }]));
  // criteria 칸 — 모든 kind 를 기본 로고 · 아이콘 팩의 같은 판으로 매겼을 때만 그 판을 쓴다(커스텀 팩 · 색이면 쓰지 않는다 — 판 하나만 아는 화면이 잘못 세지 않게)
  const baseVers = Object.values(packMeta).map((p) => p.ref.match(/^tinysolver\/(?:logo|icon)@(\d+)$/)?.[1] ?? null);
  const basePlain = baseVers.length && baseVers.every(Boolean) && new Set(baseVers).size === 1 ? baseVers[0] : null;
  const { $comment, criteria: _c, packs: _p, runner: _r, date: oldDate, directions: _dd, ...rest } = old;
  // 매긴 날 — 셀 · 팩이 하나라도 바뀌었을 때만 오늘(KST)로 올린다
  if (jcs(old.packs ?? null) !== jcs(packMeta)) changed = true;
  const out = {
    $comment: $comment ?? 'brand-criteria 로 매긴 점수 — 셀은 [값, 근거, 메타]. 기준 팩 규격 3.',
    ...(basePlain ? { criteria: basePlain } : {}),
    packs: packMeta,
    runner: { by: 'skill', core: `brand-criteria ${VERSION}`, judge: opts.judge ?? old.runner?.judge ?? null, independent: !!opts.independent },
    date: changed || !oldDate ? kstDate() : oldDate,
    ...rest,
    directions: { ...(old.directions || {}), ...directions },
  };
  const file = path.join(round, 'score.json');
  writeJson(file, out);
  return { errors: [], warn, cuts, score: out, packs, file };
}

// 사람 확인 · 뒤집기 — 사람이 직접 친다(판정하는 쪽은 쓰지 않는다)
export function confirmCell(target, dirId, factorId, opts = {}) {
  const file = isFile(target) ? path.resolve(target) : path.join(path.resolve(target), 'score.json');
  let s;
  try { s = readJson(file); } catch (e) { return { errors: [`${rel(file)}: 읽지 못함 — ${e.message}`] }; }
  const d = s.directions?.[dirId];
  if (!d) return { errors: [`방향 '${dirId}' 가 없다`] };
  const ref = s.packs?.[d.kind]?.ref;
  if (!ref) return { errors: [`score.json packs.${d.kind} 가 없다 — finish 로 만든 score.json 에만 쓴다`] };
  const r = resolvePack(ref, { from: path.dirname(file) });
  if (r.errors.length) return { errors: r.errors };
  const f = r.pack.factors.find((x) => x.id === factorId);
  if (!f) return { errors: [`${ref} 에 기준 '${factorId}' 가 없다`] };
  if (!opts.by) return { errors: ['--by <이름> — 확인한 사람 이름이 필요하다'] };
  const b = f.type === 'gate' ? 'gates' : 'scores', cell = d[b]?.[factorId];
  if (!cell) return { errors: [`${dirId} 에 ${factorId} 셀이 없다`] };
  let value = cell[0], status = 'confirmed', was;
  // 측정이 정한 셀은 뒤집지 않는다 — 판정이 채울 수 없는 측정 기준이면 셀이 적은 by 와 상관없이
  const measuredCell = f.decide.by === 'measure' && (cell[2]?.by === 'measure' || !judgeFills(f, r.pack.format));
  if (opts.value !== undefined && measuredCell) return { errors: [`${dirId} ${factorId} — 측정이 정한 셀은 뒤집지 않는다(다음 finish 가 측정값으로 되돌린다). 기준이 맞지 않으면 팩을 고친다`] };
  if (opts.value !== undefined) {
    let nv;
    try { nv = JSON.parse(opts.value); } catch { return { errors: [`--value '${opts.value}' — ${ALLOWED[f.type].map(String).join(' · ')} 가운데 하나`] }; }
    if (!ALLOWED[f.type].includes(nv)) return { errors: [`--value ${opts.value} — ${ALLOWED[f.type].map(String).join(' · ')} 가운데 하나`] };
    if (jcs(nv) !== jcs(value)) { status = 'overturned'; was = value; value = nv; }
  }
  const meta = { ...(cell[2] || {}) };
  meta.confirm = { need: meta.confirm?.need ?? f.confirm?.need ?? null, status, by: opts.by, at: utcNow(), ...(was !== undefined ? { was } : {}) };
  d[b][factorId] = [value, cell[1], meta];
  d.tally = tally(r.pack, d);
  writeJson(file, s);
  return { errors: [], status, cell: d[b][factorId], tally: d.tally, file };
}

// 맞추기 — 올린 결과(score.json)를 같은 팩 · 같은 라운드 파일로 다시 낸다(§7-8 "같은 결과")
// 다르면 diffs(끝 코드 1): 팩 해시 · 기준 해시 · 측정 셀(값 · 근거 글 · measured) · trials 합치기 · 근거 검사 · 셈
// 다시 재지 못한 측정(needs 없음 · 방향 폴더 없음)은 unverified 로 따로 — 남긴 measured 로 값을 다시 내 맞춰 본다
// 셀이 판정인지 측정인지는 셀 메타 by 가 아니라 기준의 decide.by 로 가른다
const BOX = (f) => (f.type === 'gate' ? 'gates' : 'scores');
// trials 합치기 다시(§7-5) — 셀 메타 trials(하나씩 검사한 값)를 합친 값이 셀 값이어야 하고, trials_short 는 모자란 만큼만 적힌다
export function trialsDiffs(f, value, meta) {
  const out = [], need = f.decide.trials > 1 ? f.decide.trials : 1, how = f.decide.aggregate || (f.type === 'gate' ? 'majority' : 'median');
  let n = 1;
  if (meta.trials !== undefined) {
    if (!Array.isArray(meta.trials) || meta.trials.length < 2 || !meta.trials.every((v) => ALLOWED[f.type].includes(v))) return [`셀 메타 trials 가 값(${ALLOWED[f.type].map(String).join(' · ')}) 둘 이상의 목록이 아니다`];
    n = meta.trials.length;
    const v = aggregate(f.decide.aggregate, f.type, meta.trials);
    if (jcs(v) !== jcs(value)) out.push(`trials 를 합친 값과 다르다 — 결과 ${JSON.stringify(value)} · 다시 합침(${how}) ${JSON.stringify(v)}`);
  }
  const short = n < need ? `${n}/${need}` : undefined;
  if (meta.trials_short !== short) out.push(`trials_short 가 다르다 — 결과 ${JSON.stringify(meta.trials_short ?? null)} · 다시 셈 ${JSON.stringify(short ?? null)}`);
  return out;
}
export async function verify(target, opts = {}) {
  const file = isFile(target) ? path.resolve(target) : path.join(path.resolve(target), 'score.json');
  const round = path.dirname(file);
  let s;
  try { s = readJson(file); } catch (e) { return { errors: [`${rel(file)}: 읽지 못함 — ${e.message}`] }; }
  if (!isObj(s.packs) || !Object.keys(s.packs).length) return { errors: [`${rel(file)}: packs 칸이 없다 — finish 로 만든 score.json 만 맞춘다`] };
  const ctx = opts.ctx || context();
  if (ctx.errs.length) return { errors: [...ctx.errs] };
  const diffs = [], unverified = [], packs = {}, tallies = {};
  for (const [kind, meta] of Object.entries(s.packs)) {
    const r = resolvePack(meta?.ref ?? '', { ctx, from: round });
    if (r.errors.length) { diffs.push(`팩 ${kind} → ${meta?.ref}: 풀지 못함 — ${r.errors.join(' · ')}`); continue; }
    if (meta.hash !== r.pack.hash) diffs.push(`팩 ${kind} → ${meta.ref}: 팩 해시가 다르다 — 결과 ${meta.hash} · 지금 ${r.pack.hash}`);
    packs[kind] = r.pack;
  }
  let folders = new Map();
  try { folders = new Map(directionDirs(round).map((d) => [readIf(path.join(d, 'direction.json'))?.id || path.basename(d), d])); } catch { /* directions/ 없음 */ }
  for (const [id, d] of Object.entries(s.directions || {})) {
    const pack = packs[d?.kind];
    if (!pack) { if (!s.packs[d?.kind]) diffs.push(`${id}: kind '${d?.kind}' 의 팩이 packs 에 없다`); continue; }
    const strict = isStrict(pack.format);
    const cellOf = (f) => d[BOX(f)]?.[f.id];
    // 측정 셀 다시 재기
    let fresh = null;
    if (!folders.has(id)) unverified.push(`${id}: 방향 폴더가 없다 — 측정 셀을 다시 재지 못함`);
    else {
      const t = directionOf(folders.get(id), d.kind);
      fresh = await measureCells(pack, t.target, { ctx, dir: t.dir, out: path.join(round, '.criteria') });
    }
    for (const f of fresh ? pack.factors.filter((x) => x.decide.by === 'measure') : []) {
      const c = cellOf(f), now = fresh[f.id];
      if (now[0] === null) { if (c?.[0] != null && c[2]?.by === 'measure') unverified.push(`${id} ${f.id}: 다시 재지 못함 — ${(now[2].unavailable || []).join(' · ') || '값 없음'}`); continue; }
      if (!Array.isArray(c) || jcs(c[0]) !== jcs(now[0]) || c[1] !== now[1]) diffs.push(`${id} ${f.id}: 측정 셀이 다르다 — 결과 ${JSON.stringify(Array.isArray(c) ? c.slice(0, 2) : null)} · 다시 잼 ${JSON.stringify(now.slice(0, 2))}`);
      else if (jcs(c[2]?.measured ?? {}) !== jcs(now[2].measured)) diffs.push(`${id} ${f.id}: 측정값(measured)이 다르다`);
    }
    // 셀마다 — 메타 · 사람 확인 · 근거 검사. 판 2 의 메타 없는 옛 셀만 근거 검사를 하지 않는다
    for (const f of pack.factors) {
      const c = cellOf(f);
      if (c === undefined || c === null) continue;
      if (!Array.isArray(c)) { diffs.push(`${id} ${f.id}: 셀이 [값, 근거, 메타] 모양이 아니다`); continue; }
      const meta = isObj(c[2]) ? c[2] : null;
      if (meta?.factor && meta.factor !== f.hash) diffs.push(`${id} ${f.id}: 기준 해시가 다르다 — 다른 판의 기준으로 매긴 셀`);
      if (c[0] === null) continue; // 안 봄 — 셈만 본다
      if (!meta || typeof meta.factor !== 'string') {
        if (strict) diffs.push(`${id} ${f.id}: 셀 메타(by · factor)가 없다 — 판 3 결과의 셀은 finish 가 [값, 근거, 메타]로 쓴다`);
        continue; // 판 2 — 메타 없는 옛 셀
      }
      if (isObj(meta.confirm) && CONFIRM_DONE.includes(meta.confirm.status) && !personMark(meta.confirm)) diffs.push(`${id} ${f.id}: 사람 확인(${meta.confirm.status})에 by · at 이 없다 — confirm 명령이 쓴다`);
      // 측정 기준은 사람 표시보다 먼저 본다 — 측정이 정한 셀 · 판정이 채울 수 없는 셀은 사람도 뒤집지 않는다(§7-5)
      if (f.decide.by === 'measure') {
        if (fresh?.[f.id]?.[0] != null) continue; // 다시 잰 값과 위에서 맞췄다
        if (meta.by === 'measure') { // 다른 곳에서 잰 셀 — 남긴 measured 로 값 · 근거 글을 다시 낸다
          const re = fromMeasured(f, meta.measured, ctx);
          if (jcs(re.value) !== jcs(c[0]) || (re.evidence !== null && re.evidence !== c[1])) diffs.push(`${id} ${f.id}: 남긴 측정값(measured)으로 다시 낸 셀과 다르다 — 결과 ${JSON.stringify(c.slice(0, 2))} · 다시 냄 ${JSON.stringify([re.value, re.evidence ?? c[1]])}`);
          continue;
        }
        if (!judgeFills(f, pack.format)) { diffs.push(`${id} ${f.id}: 측정으로 정하는 기준을 판정으로 채웠다(판 ${pack.format} · fallback 없음 — 측정 못 하면 안 봄)`); continue; }
      }
      if (personMark(meta.confirm) === 'overturned') continue; // 사람이 뒤집은 판정 셀
      for (const t of trialsDiffs(f, c[0], meta)) diffs.push(`${id} ${f.id}: ${t}`);
      const k = checkOne(f, [c[0], c[1]], pack.format);
      if (jcs(k.v) !== jcs(c[0])) diffs.push(`${id} ${f.id}: 근거 검사와 다르다 — ${k.cut}(결과 ${JSON.stringify(c[0])})`);
    }
    // 셈 다시
    const t = tally(pack, d);
    tallies[id] = t;
    if (!isObj(d.tally)) diffs.push(`${id}: 셈(tally)이 없다 — 다시 셈 ${JSON.stringify(t)}`);
    else if (jcs(d.tally) !== jcs(t)) diffs.push(`${id}: 셈이 다르다 — 결과 ${JSON.stringify(d.tally)} · 다시 셈 ${JSON.stringify(t)}`);
  }
  return { errors: [], diffs, unverified, tallies, file };
}

// ── 명령 ──
const USAGE = `쓰는 법: node <스킬 폴더>/scripts/criteria.mjs <명령>
  validate [폴더…]                  기준 팩 · 측정기 · 참조 묶음 · 시험 값 검사(폴더를 주면 그 아래 팩 · use.json 만)
  resolve <팩 ref | 팩 폴더> [--json] [--factor <id>] [--from <폴더>]
                                    상속을 푼 기준 목록 — 예: tinysolver/logo · brand/packs/acme/logo
  measure <방향 폴더> [--kind k] [--pack ref]
                                    방향 하나의 측정 셀 + 판정 재료(JSON)
  prepare <라운드 폴더> [--kind k] [--pack kind=ref]…
                                    측정 → .criteria/ 에 판정 과제 · answers.json · board.html
  finish <라운드 폴더> [--judge <모델 이름>] [--independent]
                                    answers.json → 근거 검사 · 셈 → score.json
  confirm <라운드 폴더 | score.json> <방향> <기준> --by <이름> [--value <값>]
                                    사람 확인(값을 주면 뒤집기) — 사람만
  verify <라운드 폴더 | score.json> [--json]
                                    팩 해시 · 측정 셀 다시 재기 · trials 합치기 · 근거 검사 · 셈 다시 — 다르면 끝 코드 1`;
function args(argv) {
  const pos = [], flags = { packs: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '--independent') flags[a.slice(2)] = true;
    else if (a === '--pack') { const v = argv[++i] || ''; const m = v.match(/^([a-z][a-z0-9-]*)=(.+)$/); if (m) flags.packs[m[1]] = m[2]; else flags.pack = v; }
    else if (['--kind', '--factor', '--from', '--judge', '--by', '--value'].includes(a)) flags[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { pos, flags };
}
const fail = (errs, head) => { console.error(`${head} — 문제 ${errs.length}`); errs.forEach((e) => console.error(`  ✗ ${e}`)); return 1; };
function toc(p) {
  const L = [];
  if (p.status === 'draft') L.push('초안 팩 — 결과를 말할 때 "초안 팩"이라고 먼저 말한다');
  L.push(`${p.id}@${p.version} · ${p.name} (kind ${p.kind})`, `  ${p.description}`, `  상속 차례 ${p.chain.join(' → ')} · 규격 ${p.format}${p.license ? ` · ${p.license}` : ''} · 팩 해시 ${p.hash}`);
  L.push(`  권장 — 문턱 모두 통과 · 점수마다 ${p.recommend.score_min} 이상 · 합계 ${Math.round(p.recommend.total_ratio * 100)}% 이상`);
  for (const [id, why] of Object.entries(p.disabled)) L.push(`  끔 ${id} — ${why}`);
  for (const [type, head] of [['gate', '문턱'], ['score', '점수']]) {
    const fs_ = p.factors.filter((f) => f.type === type);
    if (!fs_.length) continue;
    L.push(`${head} ${fs_.length}${type === 'score' ? ` · 만점 ${fs_.reduce((n, f) => n + 2 * f.weight, 0)}` : ''}`);
    for (const f of fs_) {
      const by = f.decide.by === 'measure' ? `측정 ${f.measure.map((m) => m.use).join(' · ')}` : `판정${f.decide.trials > 1 ? ` ×${f.decide.trials}` : ''}`;
      L.push(`  ${f.id.padEnd(16)} ${f.name}${type === 'score' && f.weight !== 1 ? ` (무게 ${f.weight})` : ''} — ${f.ask}`);
      L.push(`  ${''.padEnd(16)} ${by}${f.confirm ? ' · 사람 확인' : ''} · ${f.origin}${f.origin === 'base' ? '' : ` ${f.from}`} · ${f.hash.slice(0, 19)}…`);
    }
  }
  L.push(`규칙`, ...p.rules.map((r) => `  - ${r}`));
  return L.join('\n');
}
const STATE_WORD = { ok: '권장할 만함', below: '바닥선 밑', unseen: '안 본 칸 있음', blocked: '막힌 문턱' };
function tallyLine(id, t) {
  const bits = [];
  if (t.blocked.length) bits.push(`막힘 ${t.blocked.join(' · ')}`);
  if (t.unseen.length) bits.push(`안 봄 ${t.unseen.join(' · ')}`);
  if (t.below.length) bits.push(`바닥 밑 ${t.below.join(' · ')}`);
  if (t.confirm.length) bits.push(`사람 확인 남음 ${t.confirm.join(' · ')}`);
  return `  ${id.padEnd(12)} ${t.state.padEnd(8)} ${`${t.total}/${t.max}`.padEnd(7)} ${STATE_WORD[t.state]}${bits.length ? ` — ${bits.join(' / ')}` : ''}`;
}
export async function main(argv = process.argv.slice(2)) {
  const [cmd, ...rest] = argv;
  const { pos, flags } = args(rest);
  if (cmd === 'validate') {
    const r = await validateAll(pos);
    if (r.errors.length) return fail(r.errors, '검사 실패');
    const nf = r.packs.reduce((n, p) => n + p.factors.length, 0);
    console.log(`문제 없음 — 팩 ${r.packs.length}(${r.packs.map((p) => `${p.id}@${p.version}`).join(' · ')}) · 기준 ${nf}${pos.length ? '' : ` · 측정기 ${r.measures} · 참조 묶음 ${r.refs} · 시험 값 ${r.vectors}`}`);
    for (const x of r.skipped) console.log(`  시험 값 건너뜀 ${x}`);
    return 0;
  }
  if (cmd === 'resolve') {
    if (pos.length !== 1) { console.error(USAGE); return 2; }
    const r = resolvePack(pos[0], { from: flags.from || process.cwd() });
    if (r.errors.length) return fail(r.errors, `풀기 실패: ${pos[0]}`);
    if (flags.factor) {
      const f = r.pack.factors.find((x) => x.id === flags.factor);
      if (!f) return fail([`'${flags.factor}' — 이 팩의 기준: ${r.pack.factors.map((x) => x.id).join(' · ')}`], '기준이 없다');
      console.log(factorSheet(r.pack, f));
      return 0;
    }
    console.log(flags.json ? JSON.stringify(r.pack, null, 1) : toc(r.pack));
    return 0;
  }
  if (cmd === 'measure') {
    if (pos.length !== 1) { console.error(USAGE); return 2; }
    let d;
    try { d = directionOf(pos[0], flags.kind); } catch (e) { return fail([e.message], '측정 실패'); }
    const ref = packFor(d.kind, d.dir, flags.pack || flags.packs[d.kind]);
    const ctx = context(), r = resolvePack(ref, { ctx, from: d.dir });
    if (r.errors.length) return fail([...ctx.errs, ...r.errors], `풀기 실패: ${ref}`);
    if (r.pack.kind !== d.kind) return fail([`${ref} 는 kind '${r.pack.kind}' — 방향은 '${d.kind}'`], '측정 실패');
    const where = { ctx, dir: d.dir, out: path.join(d.round, '.criteria') };
    const cells = await measureCells(r.pack, d.target, where);
    const out = { direction: rel(d.dir), kind: d.kind, pack: `${r.pack.id}@${r.pack.version}`, hash: r.pack.hash, gates: {}, scores: {}, inputs: await judgeInputs(r.pack, d.target, where) };
    for (const f of r.pack.factors) if (cells[f.id]) out[f.type === 'gate' ? 'gates' : 'scores'][f.id] = cells[f.id];
    console.log(JSON.stringify(out, null, 1));
    for (const f of r.pack.factors) if (cells[f.id]?.[0] === null) console.error(`안 봄 ${f.id}: ${cells[f.id][1]} (${!judgeFills(f, r.pack.format) ? '측정으로 정하는 기준 — 판정으로 채우지 않는다' : hasFallback(f) ? '그 기준 fallback 대로 판정하는 쪽이 채운다' : "판 2 — 그 기준 본문 '## 하는 일' 대로 판정하는 쪽이 채운다"})`);
    return 0;
  }
  if (cmd === 'prepare') {
    if (pos.length !== 1) { console.error(USAGE); return 2; }
    const r = await prepare(pos[0], { kind: flags.kind, packs: flags.packs });
    if (r.errors.length) return fail(r.errors, '준비 실패');
    for (const p of Object.values(r.packs)) if (p.status === 'draft') console.log(`초안 팩 — ${p.id}@${p.version}`);
    console.log(`${rel(r.out)}/ ← 방향 ${Object.keys(r.measured).length} · 팩 ${Object.values(r.packs).map((p) => `${p.id}@${p.version}`).join(' · ')}`);
    console.log(`  비교판 ${rel(path.join(r.out, 'board.html'))} — 실제 크기로 본다`);
    console.log(`  판정할 기준 ${r.todo.length} — 과제 ${rel(path.join(r.out, 'tasks'))}/<kind>/<기준>.md 를 하나씩 열고 답을 ${rel(path.join(r.out, 'answers.json'))} 에 쓴다`);
    for (const t of r.todo) console.log(`    ${t.kind}/${t.id}${t.trials > 1 ? ` ×${t.trials}` : ''} — ${t.dirs.join(' · ')}`);
    if (r.unseen.length) console.log('  측정 못 해 안 봄(null)으로 남는 기준 — 판정으로 채우지 않는다');
    for (const u of r.unseen) console.log(`    ${u.kind}/${u.id} — ${u.dirs.join(' · ')}${u.why.length ? ` (${u.why.join(' · ')})` : ''}`);
    console.log(`  다 쓰면: finish ${rel(path.resolve(pos[0]))}`);
    return 0;
  }
  if (cmd === 'finish') {
    if (pos.length !== 1) { console.error(USAGE); return 2; }
    const r = finish(pos[0], { judge: flags.judge, independent: flags.independent });
    if (r.errors.length) return fail(r.errors, '마무리 실패');
    r.warn.forEach((w) => console.error(`  ! ${w}`));
    for (const p of Object.values(r.packs)) if (p.status === 'draft') console.log(`초안 팩 — ${p.id}@${p.version}`);
    console.log(`${rel(r.file)} ← ${Object.values(r.score.packs).map((p) => p.ref).join(' · ')}`);
    for (const [id, d] of Object.entries(r.score.directions)) if (d.tally) console.log(tallyLine(id, d.tally));
    if (r.cuts.length) { console.log('  근거 검사로 바뀐 셀'); r.cuts.forEach((c) => console.log(`    ${c}`)); }
    return 0;
  }
  if (cmd === 'confirm') {
    if (pos.length !== 3) { console.error(USAGE); return 2; }
    const r = confirmCell(pos[0], pos[1], pos[2], { by: flags.by, value: flags.value });
    if (r.errors.length) return fail(r.errors, '확인 실패');
    console.log(`${pos[1]} ${pos[2]} — ${r.status === 'overturned' ? `뒤집음 ${JSON.stringify(r.cell[2].confirm.was)} → ${JSON.stringify(r.cell[0])}` : '확인함'} (${flags.by})`);
    console.log(tallyLine(pos[1], r.tally));
    return 0;
  }
  if (cmd === 'verify') {
    if (pos.length !== 1) { console.error(USAGE); return 2; }
    const r = await verify(pos[0]);
    if (r.errors.length) return fail(r.errors, '맞추기 실패');
    if (flags.json) console.log(JSON.stringify({ file: rel(r.file), same: !r.diffs.length, diffs: r.diffs, unverified: r.unverified, tallies: r.tallies }, null, 1));
    else {
      r.unverified.forEach((u) => console.log(`  ? ${u}`));
      if (r.diffs.length) return fail(r.diffs, `${rel(r.file)} — 다시 낸 것과 다르다`);
      console.log(`${rel(r.file)} — 다시 낸 것과 같다(팩 해시 · 측정 셀 · 근거 검사 · 셈)${r.unverified.length ? ` · 다시 재지 못한 것 ${r.unverified.length}` : ''}`);
    }
    return r.diffs.length ? 1 : 0;
  }
  console.error(USAGE);
  return cmd && !['-h', '--help', 'help'].includes(cmd) ? 2 : 0;
}

// 바로 실행했나 — 두 쪽 다 실제 경로로 풀어 비교한다. 심볼릭 링크(npx skills 설치 · 링크로 둔 설정 폴더 · macOS /tmp)를 거쳐 불러도
// main 이 돈다. import.meta.url 은 Node 가 실제 경로로 푼 값이고 argv[1] 은 부른 그대로라 문자열로는 다를 수 있다.
export function ranDirectly(metaUrl, argv1 = process.argv[1]) {
  if (!argv1) return false;
  try {
    const a = fs.realpathSync(path.resolve(argv1)), b = fs.realpathSync(fileURLToPath(metaUrl));
    return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  } catch { return false; }
}
// 맨 위 await 를 쓰지 않는다 — 다른 모듈이 이 파일을 불러올 때 평가가 끝나 있어야 한다
if (ranDirectly(import.meta.url)) main().then((code) => { process.exitCode = code; }, (e) => { console.error(e); process.exitCode = 1; });
