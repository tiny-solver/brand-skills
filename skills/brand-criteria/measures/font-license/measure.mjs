// font-license@1 — 글꼴 파일의 라이선스 칸(name 13 · 14) · OS/2 fsType · 함께 온 라이선스 파일에서 SPDX 후보와 로고 · 윤곽 · 상업 사용 허락을 고른다.
// 의존성 0 · 순수 함수(파일만 읽는다). 계약: MEASURE.md · 시험 값: vectors.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fsType, names, openFont } from './sfnt.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const baseDir = (ctx) => (ctx && typeof ctx.dir === 'string' ? path.resolve(ctx.dir) : HERE);
const textList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]).filter((x) => typeof x === 'string' && x);

// SPDX 후보 — 앞에서부터 처음 맞는 것. allows = [상업, 로고, 윤곽 변환] (true 허락 · false 금지 · null 라이선스 글만으로는 모름)
const Y = [true, true, true], CHECK = [true, null, null];
export const LICENSES = [
  { id: 'OFL-1.1', re: /open\s*font\s*licen[cs]e|\bOFL\b|scripts\.sil\.org\/ofl|openfontlicense\.org|오픈\s*폰트\s*라이[선센]스/i, allows: Y },
  { id: 'Apache-2.0', re: /apache\s+licen[cs]e|apache\.org\/licenses\/license-2\.0/i, allows: Y },
  { id: 'UFL-1.0', re: /ubuntu\s+font\s+licen[cs]e/i, allows: Y },
  { id: 'MIT', re: /\bmit\s+licen[cs]e\b|opensource\.org\/licenses\/mit\b|permission is hereby granted, free of charge/i, allows: Y },
  { id: 'CC0-1.0', re: /creativecommons\.org\/publicdomain\/zero|\bcc0\b/i, allows: Y },
  { id: 'Unlicense', re: /unlicense\.org|free and unencumbered software released into the public domain/i, allows: Y },
  { id: 'CC-BY-NC-4.0', re: /creativecommons\.org\/licenses\/by-nc|\bcc[ -]by[ -]nc\b|noncommercial/i, allows: [false, null, null] },
  { id: 'CC-BY-ND-4.0', re: /creativecommons\.org\/licenses\/by-nd|\bcc[ -]by[ -]nd\b|noderivatives/i, allows: CHECK },
  { id: 'CC-BY-SA-4.0', re: /creativecommons\.org\/licenses\/by-sa|\bcc[ -]by[ -]sa\b|sharealike/i, allows: CHECK },
  { id: 'CC-BY-4.0', re: /creativecommons\.org\/licenses\/by\/|\bcc[ -]by\b|creative commons attribution/i, allows: Y },
  // GPL 판을 font exception 보다 먼저 가른다 — 'version 3 with font exception' 은 GPL-3 이다
  { id: 'GPL-3.0-or-later WITH Font-exception-2.0', re: /^(?=[\s\S]*font[\s-]exception)(?=[\s\S]*gnu general public licen[cs]e[\s\S]{0,40}version 3)/i, allows: CHECK },
  { id: 'GPL-2.0-or-later WITH Font-exception-2.0', re: /font[\s-]exception/i, allows: CHECK },
  { id: 'GPL-3.0-or-later', re: /gnu general public licen[cs]e[\s\S]{0,40}version 3/i, allows: CHECK },
  { id: 'GPL-2.0-or-later', re: /gnu general public licen[cs]e/i, allows: CHECK },
];
// 함께 허락하는 말 — '상업 · 비상업 모두' · '개인 · 상업 모두' 는 금지 문구를 보기 전에 지운다
const BOTH = [
  /(?:non[-\s]?commercial|commercial|personal)(?:\s+use)?\s*(?:and|or|&|\/|,\s*and|as well as)\s*(?:non[-\s]?commercial|commercial|personal)(?:\s+use)?/gi,
  /(?:비\s*)?상업(?:적|용)?\s*(?:[·ㆍ・,/]|및|과|와|이나|또는)?\s*(?:비\s*)?상업(?:적|용)?/g,
  /(?:개인|상업)(?:적|용)?\s*(?:[·ㆍ・,/]|및|과|와|이나|또는)\s*(?:개인|상업)(?:적|용)?/g,
];
// 같은 절(쉼표 · 마침표 · ; · / · 가운뎃점 · 줄바꿈 전) 안에서 바로 뒤에 금지 · 부정이 오면 함께 허락하는 말이 아니다('개인 및 상업적 용도로 사용할 수 없습니다')
// ('구분 없이' · '제한 없음' 은 부정이 아니다 — '수 없' 만 본다)
const CLAUSE_NEG = /^[^,.;/·ㆍ・\n]{0,24}?(?:수\s*없|불가|금지|안\s*됩|하지\s*않|못\s*합|\bnot\b|\bcannot\b|can't|prohibited|forbidden)/i;
const unBoth = (text) => BOTH.reduce((t, re) => t.replace(re, (m, ...a) => (CLAUSE_NEG.test(t.slice(a[a.length - 2] + m.length)) ? m : ' ')), text);
// 한국어 금지 — 같은 절 안에서 주제어 뒤에 금지 말이 오고, 그 사이에 '가능' · '허용' · '허락' 이 없을 때만('로고 사용 가능, 재판매 불가' 는 로고 금지가 아니다)
const koDeny = (subject, deny = '불가|금지|할\\s*수\\s*없') => `${subject}(?:(?!가능|허용|허락)[^,.;/·ㆍ・\\n]){0,16}?(?:${deny})`;
// 금지 문구 — 라이선스 이름과 따로, 글에 있으면 그 허락을 false 로 둔다(함께 허락하는 말을 지운 뒤에 본다).
// 괄호 안 말은 절을 끊지 않게 괄호를 뺀 글로도 본다('로고(CI · BI) 사용은 불가' → '로고 사용은 불가')
const DENY = [
  [0, new RegExp(`non[-\\s]?commercial|personal use only|for personal use|not for commercial|no commercial use|commercial use (?:is )?(?:not (?:permitted|allowed)|prohibited|forbidden)|개인\\s*(?:용|사용)\\s*(?:만|으로만)|비\\s*상업|${koDeny('상업(?:적|용)?')}`, 'i')],
  [1, new RegExp(`(?:not|never)\\s+(?:be\\s+)?(?:used\\s+)?(?:in|for|as)\\s+(?:a\\s+|any\\s+)?logos?\\b|logo\\s+use\\s+(?:is\\s+)?(?:not\\s+(?:permitted|allowed)|prohibited)|${koDeny('로고')}|${koDeny('\\bCI\\b', '불가|금지')}`, 'i')],
  [2, new RegExp(`outlin\\w*.{0,40}(?:not\\s+(?:permitted|allowed)|prohibited)|${koDeny('윤곽', '불가|금지')}|${koDeny('아웃라인', '불가|금지')}`, 'i')],
];
const denied = (re, text) => { const plain = unBoth(text); return re.test(plain) || re.test(plain.replace(/\([^()]*\)/g, '')); };
const KEYS = ['commercial', 'logo', 'outline'];
const LICENSE_FILE = /^(ofl|license|licence|copying)([-_.][^/]*)?$/i;
const FS_TYPE = { 0: '설치 허락', 2: '내장 제한', 4: '미리보기 · 인쇄', 8: '편집 가능' };

// 글 하나 → {guess, allows[], deny[]}
export function judgeText(text) {
  if (!text) return { guess: null, allows: [null, null, null] };
  const hit = LICENSES.find((l) => l.re.test(text));
  const allows = hit ? [...hit.allows] : [null, null, null];
  for (const [i, re] of DENY) if (denied(re, text)) allows[i] = false;
  let guess = hit?.id ?? null;
  if (guess === 'OFL-1.1' && /open font licen[cs]e,?\s*version\s*1\.0\b/i.test(text)) guess = 'OFL-1.0';
  return { guess, allows };
}
// 세 값 그리고 — false 가 하나라도 있으면 false, null 이 있으면 null, 다 true 면 true
const and = (xs) => (xs.includes(false) ? false : xs.includes(null) ? null : true);
const word = (v) => (v === true ? '허락' : v === false ? '금지' : '모름');
const fsWord = (v) => {
  if (v == null) return 'fsType 없음';
  const low = v & 0xf, bits = [FS_TYPE[low] ?? `알 수 없는 값 ${low}`];
  if (v & 0x100) bits.push('부분 내장 금지');
  if (v & 0x200) bits.push('비트맵만');
  return `fsType ${v}(${bits.join(' · ')})`;
};

// 라이선스 파일 — 이름 순, FAQ 는 뒤로(OFL-FAQ.txt 가 OFL.txt 보다 먼저 읽히지 않게)
function licenseFiles(dir) {
  const faq = (f) => (/faq/i.test(f) ? 1 : 0);
  try { return fs.readdirSync(dir).filter((f) => LICENSE_FILE.test(f) && /^(|\.txt|\.md)$/i.test(path.extname(f)) && fs.statSync(path.join(dir, f)).isFile()).sort((a, b) => faq(a) - faq(b) || (a < b ? -1 : a > b ? 1 : 0)); } catch { return []; }
}

export default async function measure(input = {}, ctx = {}) {
  const base = baseDir(ctx), missing = [];
  const files = textList(input.fonts);
  const fonts = [];
  if (!files.length) missing.push('글꼴 파일 없음');
  for (const file of files) {
    const abs = path.resolve(base, file);
    if (!/\.(ttf|otf|ttc)$/i.test(file)) { missing.push(`${file} 형식 — TTF · OTF · TTC 만`); continue; }
    const f = openFont(abs);
    if (f.error) { missing.push(`${file} ${f.error}`); continue; }
    let n, fsT;
    try { n = names(f); fsT = fsType(f); } catch { missing.push(`${file} 글꼴 표가 깨졌다 — name · OS/2`); continue; }
    const text = n[13] ?? null, url = n[14] ?? null;
    // 판단 순서: 라이선스 글(name 13) → 라이선스 주소(name 14) → 같은 폴더 라이선스 파일(OFL.txt · LICENSE …)
    let source = null, license_file = null, j = { guess: null, allows: [null, null, null] };
    for (const [label, t] of [['name 13', text], ['name 14', url]]) {
      const k = judgeText(t);
      if (k.guess || k.allows.some((v) => v !== null)) { j = k; source = label; break; }
    }
    if (!source) {
      for (const lf of licenseFiles(path.dirname(abs))) {
        let t = '';
        try { t = fs.readFileSync(path.join(path.dirname(abs), lf), 'utf8').slice(0, 20000); } catch { continue; }
        const k = judgeText(t);
        if (k.guess || k.allows.some((v) => v !== null)) { j = k; source = lf; license_file = path.posix.join(path.posix.dirname(file.split(path.sep).join('/')), lf); break; }
      }
    }
    // 이름 글 · 주소의 금지 문구는 다른 곳에서 라이선스를 찾았어도 남긴다
    for (const t of [text, url]) for (const [i, re] of DENY) if (t && denied(re, t)) j.allows[i] = false;
    const allows = Object.fromEntries(KEYS.map((k, i) => [k, j.allows[i]]));
    fonts.push({ file, name: n[16] ?? n[1] ?? null, license_text: text, license_url: url, fs_type: fsT, guess: j.guess, source, license_file, allows, allowed: and(j.allows) });
  }
  const first = fonts[0] ?? null;
  const allowsAll = Object.fromEntries(KEYS.map((k) => [k, fonts.length && fonts.length === files.length ? and(fonts.map((x) => x.allows[k])) : fonts.some((x) => x.allows[k] === false) ? false : null]));
  return {
    license_text: first?.license_text ?? null,
    license_url: first?.license_url ?? null,
    fs_type: first?.fs_type ?? null,
    guess: first?.guess ?? null,
    allows: allowsAll,
    allowed: and(Object.values(allowsAll)),
    fonts,
    text: fonts.map((x) => `${x.name ?? x.file} — ${x.guess ?? '라이선스 모름'}(${x.source ?? (x.license_text || x.license_url ? '이름을 알아보지 못한 글' : '라이선스 글 없음')}) · 상업 ${word(x.allows.commercial)} · 로고 ${word(x.allows.logo)} · 윤곽 ${word(x.allows.outline)} · ${fsWord(x.fs_type)}`).join(' / '),
    missing,
  };
}
