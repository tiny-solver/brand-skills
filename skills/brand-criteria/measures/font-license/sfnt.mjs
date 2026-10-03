// 글꼴 파일 읽기 — font-license@1 · glyph-coverage@1 이 같이 쓴다. 의존성 0.
// TTF · OTF(sfnt) 와 TTC(첫 글꼴)의 표 셋만 읽는다: name(이름 · 라이선스) · OS/2(fsType) · cmap(글자 → 글리프).
// WOFF · WOFF2 는 읽지 않는다 — 원본 TTF · OTF 를 넘긴다.
// 잘리거나 깨진 파일: openFont 는 {error} 를 내고, names · cmap 은 '글꼴 표가 깨졌다 — <표>' 를 던진다(측정기가 잡아 missing 에 적는다).
import fs from 'node:fs';

const TAG = (b, o) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

// 파일 → {tables: Map(tag → {offset, length}), buf} 또는 {error}
export function openFont(abs) {
  let buf;
  try { buf = fs.readFileSync(abs); } catch { return { error: '없음' }; }
  return parseFont(buf);
}
const BROKEN = '글꼴 표가 깨졌다';
const broken = (what) => new Error(`${BROKEN} — ${what}`);
export function parseFont(buf) {
  if (buf.length < 12) return { error: '글꼴 파일이 아니다' };
  let at = 0;
  const head = TAG(buf, 0);
  if (head === 'wOFF' || head === 'wOF2') return { error: 'WOFF 는 읽지 않는다 — TTF · OTF 를 넘긴다' };
  if (head === 'ttcf') {
    if (buf.length < 16 || buf.readUInt32BE(8) < 1) return { error: `${BROKEN} — TTC 머리` };
    at = buf.readUInt32BE(12);
    if (at + 12 > buf.length) return { error: `${BROKEN} — TTC 첫 글꼴 자리` };
  }
  const ver = buf.readUInt32BE(at);
  if (!(ver === 0x00010000 || TAG(buf, at) === 'OTTO' || TAG(buf, at) === 'true')) return { error: '글꼴 파일이 아니다' };
  const n = buf.readUInt16BE(at + 4), tables = new Map();
  for (let i = 0; i < n; i++) {
    const r = at + 12 + i * 16;
    if (r + 16 > buf.length) return { error: `${BROKEN} — 표 목록` };
    const offset = buf.readUInt32BE(r + 8), length = buf.readUInt32BE(r + 12);
    if (offset + length > buf.length) return { error: `${BROKEN} — ${TAG(buf, r).trim()}` };
    tables.set(TAG(buf, r), { offset, length });
  }
  return { buf, tables };
}

// ── name — 이름 기록 하나를 고른다: Windows 영어 → Windows 다른 말 → Unicode → Mac 영어 → Mac
const MAC_ROMAN = 'ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';
function decodeName(bytes, platform) {
  if (platform === 1) return [...bytes].map((b) => (b < 128 ? String.fromCharCode(b) : MAC_ROMAN[b - 128])).join('');
  let s = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  return s;
}
function rank(p, e, l) {
  if (p === 3 && (e === 1 || e === 10)) return l === 0x409 ? 0 : 1;
  if (p === 3 && e === 0) return 2;
  if (p === 0) return 3;
  if (p === 1 && e === 0) return l === 0 ? 4 : 5;
  return 9;
}
export function names(font) {
  const t = font.tables.get('name');
  if (!t) return {};
  if (t.length < 6) throw broken('name');
  const b = font.buf, o = t.offset, count = b.readUInt16BE(o + 2), str = o + b.readUInt16BE(o + 4), best = {};
  for (let i = 0; i < count; i++) {
    const r = o + 6 + i * 12;
    if (r + 12 > o + t.length) break;
    const p = b.readUInt16BE(r), e = b.readUInt16BE(r + 2), l = b.readUInt16BE(r + 4), id = b.readUInt16BE(r + 6), len = b.readUInt16BE(r + 8), off = b.readUInt16BE(r + 10);
    const k = rank(p, e, l);
    if (k === 9 || (best[id] && best[id].k <= k)) continue;
    if (str + off + len > b.length) continue;
    best[id] = { k, value: decodeName(b.subarray(str + off, str + off + len), p) };
  }
  return Object.fromEntries(Object.entries(best).map(([id, v]) => [id, v.value.replace(/\u0000/g, '').trim()]).filter(([, v]) => v));
}

// ── OS/2 fsType
export function fsType(font) {
  const t = font.tables.get('OS/2');
  return t && t.length >= 10 ? font.buf.readUInt16BE(t.offset + 8) : null;
}

// ── cmap — 유니코드 하위 표(플랫폼 0 · 플랫폼 3 인코딩 1 · 10)를 모두 합쳐 글자 → 글리프 번호(0 = 없음)
export function cmap(font) {
  const t = font.tables.get('cmap');
  if (!t) return null;
  if (t.length < 4) throw broken('cmap');
  const b = font.buf, o = t.offset, n = b.readUInt16BE(o + 2), subs = [], seen = new Set();
  for (let i = 0; i < n; i++) {
    const r = o + 4 + i * 8;
    if (r + 8 > o + t.length) throw broken('cmap');
    const p = b.readUInt16BE(r), e = b.readUInt16BE(r + 2), at = o + b.readUInt32BE(r + 4);
    if (!(p === 0 || (p === 3 && (e === 1 || e === 10))) || seen.has(at)) continue;
    seen.add(at);
    const f = readSub(b, at);
    if (f) subs.push(f);
  }
  if (!subs.length) return null;
  return (cp) => { for (const f of subs) { const g = f(cp); if (g) return g; } return 0; };
}
// 하위 표 하나 → 글자 → 글리프 번호 함수(모르는 형식이면 null). 머리 · 목록이 파일 밖이면 던진다 · 찾을 때 파일 밖을 가리키면 0
function readSub(b, at) {
  const need = (end) => { if (end > b.length) throw broken('cmap'); };
  need(at + 2);
  const format = b.readUInt16BE(at);
  if (format === 0) { need(at + 6 + 256); return (cp) => (cp < 256 ? b[at + 6 + cp] : 0); }
  if (format === 4) {
    need(at + 14);
    const segX2 = b.readUInt16BE(at + 6), ends = at + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    need(ranges + segX2);
    return (cp) => {
      if (cp > 0xffff) return 0;
      for (let s = 0; s < segX2; s += 2) {
        if (cp > b.readUInt16BE(ends + s)) continue;
        const start = b.readUInt16BE(starts + s);
        if (cp < start) return 0;
        const delta = b.readInt16BE(deltas + s), ro = b.readUInt16BE(ranges + s);
        if (!ro) return (cp + delta) & 0xffff;
        const gi = ranges + s + ro + (cp - start) * 2;
        if (gi + 2 > b.length) return 0;
        const g = b.readUInt16BE(gi);
        return g ? (g + delta) & 0xffff : 0;
      }
      return 0;
    };
  }
  if (format === 6) {
    need(at + 10);
    const first = b.readUInt16BE(at + 6), count = b.readUInt16BE(at + 8);
    need(at + 10 + count * 2);
    return (cp) => (cp >= first && cp < first + count ? b.readUInt16BE(at + 10 + (cp - first) * 2) : 0);
  }
  if (format === 12 || format === 13) {
    need(at + 16);
    const groups = b.readUInt32BE(at + 12);
    need(at + 16 + groups * 12);
    return (cp) => {
      let lo = 0, hi = groups - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1, g = at + 16 + mid * 12, s = b.readUInt32BE(g), e = b.readUInt32BE(g + 4);
        if (cp < s) hi = mid - 1;
        else if (cp > e) lo = mid + 1;
        else return format === 12 ? b.readUInt32BE(g + 8) + (cp - s) : b.readUInt32BE(g + 8);
      }
      return 0;
    };
  }
  return null;
}
