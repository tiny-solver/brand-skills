// glyph-coverage@1 — 이름 · 슬로건의 글자가 글꼴마다 cmap 에 다 있나. 의존성 0 · 순수 함수(파일만 읽는다).
// 계약: MEASURE.md · 시험 값: vectors.json
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cmap, openFont } from '../font-license/sfnt.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const baseDir = (ctx) => (ctx && typeof ctx.dir === 'string' ? path.resolve(ctx.dir) : HERE);
const textList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]).filter((x) => typeof x === 'string' && x);

// 글들 → 찾을 글자(NFC · 빈칸 · 줄바꿈 · 보이지 않는 조절 문자 빼고 · 처음 나온 순서로 한 번씩)
// 보이지 않는 조절 문자(유니코드 Default_Ignorable — ZWJ · ZWNJ · 변이 선택자 · 태그 · 소프트 하이픈 …)는 글꼴이 글리프를 갖지 않아도 된다.
// NFC 뒤에 남은 결합 문자는 찾는다 — 앞 글자에 붙여 그리는 글리프라 글꼴에 있어야 한다
const SKIP = /[\s\p{Default_Ignorable_Code_Point}]/u;
export function charsOf(texts) {
  const seen = new Set();
  for (const t of texts) for (const c of t.normalize('NFC')) if (!SKIP.test(c)) seen.add(c);
  return [...seen];
}

export default async function measure(input = {}, ctx = {}) {
  const base = baseDir(ctx), missing = [];
  const files = textList(input.fonts), chars = charsOf(textList(input.texts));
  if (!files.length) missing.push('글꼴 파일 없음');
  if (!chars.length) missing.push('글 없음');
  const rows = [];
  for (const file of files) {
    if (!/\.(ttf|otf|ttc)$/i.test(file)) { missing.push(`${file} 형식 — TTF · OTF · TTC 만`); continue; }
    const f = openFont(path.resolve(base, file));
    if (f.error) { missing.push(`${file} ${f.error}`); continue; }
    // 깨진 표는 던지지 않고 missing 에 — cmap 머리 · 하위 표가 파일 밖이면 '글꼴 표가 깨졌다 — cmap'
    let lost;
    try {
      const map = cmap(f);
      if (!map) { missing.push(`${file} 유니코드 cmap 없음`); continue; }
      lost = chars.filter((c) => !map(c.codePointAt(0)));
    } catch (e) {
      missing.push(`${file} ${/^글꼴 표가 깨졌다/.test(e.message) ? e.message : '글꼴 표가 깨졌다 — cmap'}`);
      continue;
    }
    rows.push({ file, lost });
  }
  if (!chars.length || !rows.length) return { chars: chars.length || null, missing_count: null, missing_chars: null, missing, text: '' };
  // 어느 글꼴에서든 빠진 글자 — 찾을 글자 순서대로
  const lostAll = chars.filter((c) => rows.some((r) => r.lost.includes(c)));
  // 못 읽은 글꼴이 있으면: 빠진 글자가 이미 있으면 그 수(막힘), 없으면 null(다 보지 못함)
  const partial = rows.length < files.length;
  return {
    chars: chars.length,
    missing_count: partial && !lostAll.length ? null : lostAll.length,
    missing_chars: partial && !lostAll.length ? null : lostAll.join(''),
    missing,
    text: rows.map((r) => `${path.basename(r.file)} — 글자 ${chars.length} · 빠진 글자 ${r.lost.length}${r.lost.length ? ` (${r.lost.join('')})` : ''}`).join(' · '),
  };
}
