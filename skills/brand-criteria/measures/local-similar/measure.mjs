// local-similar@1 — 사용자가 준 비교 로고 폴더와 내 판의 지각 해시(dHash · pHash) 거리. 계약: MEASURE.md · 시험 값: vectors.json
// 아무것도 밖으로 보내지 않는다 — 비교 로고도 해시도 이 컴퓨터 안에서만 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_TYPES, baseDir, bgOf, findImage, fromBase64, hexOf as rgbHex, loadImage, ownsBg, pickRoles, textList, withBrowser } from '../render/raster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const N = 256;          // 굽는 정사각 한 변(px)
const MAX_FILES = 2000; // 비교 판 최대 수
const INK = 24;         // 바탕 밝기와 이만큼 넘게 다르면 그린 것
const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const fixed = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? round(x, d).toFixed(d) : '—');

// ── RGBA → 밝기 — '밝은 바탕에 어두운 그림'으로 맞춘다
// how = {transparent, invert} — 처음 굽기에서 정하고, 그린 것만 잘라 다시 구울 때 그대로 쓴다(잘라 낸 판은 둘레가 바탕이 아닐 수 있다)
//   투명 바탕(둘레의 불투명 픽셀 25% 미만): 그린 픽셀(알파 > 8)의 알파 가중 평균 밝기가 128 넘으면 밝은 그림 → 검정 위에 얹어 뒤집는다(255 − 알파 × 밝기),
//     아니면 흰 바탕에 얹는다(알파 × 밝기 + (1 − 알파) × 255). 투명 픽셀은 늘 255 — 흰 그림 투명 판과 먹 그림 투명 판이 같은 모양이 된다
//   제 바탕을 가진 판: 흰 바탕에 얹고, 둘레 평균 밝기가 128 보다 어두우면 뒤집는다
const lumAt = (px, i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
export function grayOf(px, W, H, how = null) {
  if (!how) {
    if (!ownsBg(px, W, H)) {
      let s = 0, w = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 8) { const a = px[i + 3] / 255; s += a * lumAt(px, i); w += a; }
      how = { transparent: true, invert: w > 0 && s / w > 128 };
    } else {
      let sum = 0, n = 0;
      const at = (x, y) => { const i = (y * W + x) * 4, a = px[i + 3] / 255; sum += a * lumAt(px, i) + (1 - a) * 255; n++; };
      for (let x = 0; x < W; x++) { at(x, 0); at(x, H - 1); }
      for (let y = 1; y < H - 1; y++) { at(0, y); at(W - 1, y); }
      how = { transparent: false, invert: sum / n < 128 };
    }
  }
  const g = new Float64Array(W * H);
  for (let j = 0, i = 0; j < W * H; j++, i += 4) {
    const a = px[i + 3] / 255, y = lumAt(px, i);
    const v = how.transparent && how.invert ? a * y : a * y + (1 - a) * 255;
    g[j] = how.invert ? 255 - v : v;
  }
  // 바탕 밝기 — 투명 바탕은 255, 제 바탕을 가진 판은 둘레 평균
  let bg = 255;
  if (!how.transparent) {
    let sum = 0, n = 0;
    for (let x = 0; x < W; x++) { sum += g[x] + g[(H - 1) * W + x]; n += 2; }
    for (let y = 1; y < H - 1; y++) { sum += g[y * W] + g[y * W + W - 1]; n += 2; }
    bg = sum / n;
  }
  return { g, bg, how };
}
// 그린 것의 상자 → 가운데 맞춘 정사각 {x, y, side} (그린 것이 없으면 null)
export function squareBox(g, W, H, bg) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (Math.abs(g[y * W + x] - bg) <= INK) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  return { x: (x0 + x1 + 1) / 2 - side / 2, y: (y0 + y1 + 1) / 2 - side / 2, side };
}
// 정사각 자리를 outW × outH 칸으로 넓이 평균(칸이 그림 밖이면 바탕 밝기)
export function resample(g, W, H, box, outW, outH, fill) {
  const out = new Float64Array(outW * outH), cw = box.side / outW, ch = box.side / outH;
  for (let r = 0; r < outH; r++) for (let c = 0; c < outW; c++) {
    const sx0 = box.x + c * cw, sx1 = sx0 + cw, sy0 = box.y + r * ch, sy1 = sy0 + ch;
    let sum = 0, area = 0;
    for (let y = Math.floor(sy0); y < Math.ceil(sy1); y++) {
      const hy = Math.min(sy1, y + 1) - Math.max(sy0, y);
      if (hy <= 0) continue;
      for (let x = Math.floor(sx0); x < Math.ceil(sx1); x++) {
        const wx = Math.min(sx1, x + 1) - Math.max(sx0, x);
        if (wx <= 0) continue;
        const v = x >= 0 && x < W && y >= 0 && y < H ? g[y * W + x] : fill;
        sum += v * wx * hy;
        area += wx * hy;
      }
    }
    out[r * outW + c] = area ? sum / area : fill;
  }
  return out;
}
const COS = Array.from({ length: 32 }, (_, k) => Array.from({ length: 32 }, (_, n) => Math.cos((Math.PI / 32) * (n + 0.5) * k)));
// dHash — 9 × 8 칸에서 왼쪽 칸이 오른쪽 칸보다 DH_EPS 넘게 밝으면 1 (64비트)
// DH_EPS — 바탕만 든 칸끼리 가장자리 안티에일리어싱 찌꺼기(밝기 1–2)로 비트가 뒤집히지 않게
const DH_EPS = 2;
export function dhash(cells) {
  const bits = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) bits.push(cells[r * 9 + c] - cells[r * 9 + c + 1] > DH_EPS ? 1 : 0);
  return bits;
}
// pHash — 32 × 32 칸의 2차원 DCT-II 에서 낮은 주파수 8 × 8 이 그 64개의 가운데 값보다 크면 1 (64비트)
export function phash(cells) {
  const rows = Array.from({ length: 32 }, (_, r) => COS.slice(0, 8).map((ck) => ck.reduce((s, cos, n) => s + cos * cells[r * 32 + n], 0)));
  const low = [];
  for (let k = 0; k < 8; k++) for (let c = 0; c < 8; c++) low.push(COS[k].reduce((s, cos, n) => s + cos * rows[n][c], 0));
  const sorted = [...low].sort((a, b) => a - b), med = (sorted[31] + sorted[32]) / 2;
  return low.map((v) => (v > med ? 1 : 0));
}
export const hexOf = (bits) => Array.from({ length: 16 }, (_, i) => parseInt(bits.slice(i * 4, i * 4 + 4).join(''), 2).toString(16)).join('');
export const hamming = (a, b) => a.reduce((s, v, i) => s + (v !== b[i] ? 1 : 0), 0);
const hashCells = (g, W, H, box, bg) => ({ dhash: dhash(resample(g, W, H, box, 9, 8, bg)), phash: phash(resample(g, W, H, box, 32, 32, bg)) });
// RGBA 한 장 → {dhash, phash} 비트 또는 null(그린 것 없음) — 굽기 한 번(시험 · 브라우저 없이 쓰는 자리)
export function hashesOf(px, W, H) {
  const { g, bg } = grayOf(px, W, H), box = squareBox(g, W, H, bg);
  return box ? hashCells(g, W, H, box, bg) : null;
}
// 판 하나 → {dhash, phash} 또는 null — 처음 굽기에서 그린 것의 정사각을 찾고, 그 정사각만 잘라 N × N 에 다시 구워 해시한다
// (작게 그린 판도 같은 해상도로 본다). 바탕이 한 색이 아닌 불투명 판은 다시 굽지 않고 처음 굽기에서 해시한다
async function hashImage(draw, img) {
  const px = fromBase64(await draw(img, N, N, { out: 'rgba' }));
  const first = grayOf(px, N, N), box = squareBox(first.g, N, N, first.bg);
  if (!box) return null;
  const fill = first.how.transparent ? null : bgOf(px, N, N);
  if (!first.how.transparent && !fill) return hashCells(first.g, N, N, box, first.bg);
  const crop = { x: box.x / N, y: box.y / N, w: box.side / N, h: box.side / N };
  const px2 = fromBase64(await draw(img, N, N, { out: 'rgba', crop, bg: fill ? rgbHex(fill) : null }));
  // 다시 구운 판에서 그린 것의 정사각을 한 번 더 찾는다(처음 굽기의 1px 어긋남을 줄인다)
  const bg2 = first.how.transparent ? 255 : first.bg, { g } = grayOf(px2, N, N, first.how);
  return hashCells(g, N, N, squareBox(g, N, N, bg2) ?? { x: 0, y: 0, side: N }, bg2);
}

// 비교할 판 — 폴더면 그 안 그림 파일(이름 순 · 하위 폴더 · 숨은 파일은 안 봄), 파일이면 그 파일
function compareFiles(list, base, missing) {
  const out = [];
  for (const item of list) {
    const abs = path.resolve(base, item);
    let st;
    try { st = fs.statSync(abs); } catch { missing.push(`${item} 없음`); continue; }
    if (st.isDirectory()) {
      let names = [];
      try { names = fs.readdirSync(abs).filter((f) => !f.startsWith('.') && IMAGE_TYPES[path.extname(f).toLowerCase()]).sort(); } catch { missing.push(`${item} 읽지 못함`); continue; }
      if (!names.length) missing.push(`${item} 에 그림 없음`);
      for (const f of names) {
        const file = path.posix.join(item.replace(/\/+$/, ''), f), p = path.join(abs, f);
        // 끊긴 링크 · 읽지 못하는 파일은 missing 에 적고 넘어간다
        let ok = false;
        try { ok = fs.statSync(p).isFile(); } catch { missing.push(`${file} 없음`); continue; }
        if (ok) out.push({ file, abs: p });
      }
    } else if (IMAGE_TYPES[path.extname(abs).toLowerCase()]) out.push({ file: item, abs });
    else missing.push(`${item} 그림 형식이 아니다`);
  }
  return out;
}

export default async function measure(input = {}, ctx = {}) {
  const base = baseDir(ctx, HERE), missing = [], notes = [];
  const roles = textList(input.roles), cmpIn = textList(input.compare);
  const k = input.k == null ? 5 : Number.isInteger(input.k) ? Math.min(Math.max(input.k, 1), 50) : 5;
  if (input.k != null && k !== input.k) notes.push(`k 는 1–50 정수 — ${k} 로 냄`);
  const empty = { top: [], nearest: null, max_score: null, min_dhash: null, min_phash: null, count: 0, mine: [], text: '', missing, notes };
  if (!roles.length) missing.push('roles 없음');
  if (!cmpIn.length) missing.push('compare 없음 — 비교 로고 폴더');
  const picked = roles.length ? pickRoles(input.files, roles)[0] : null;
  if (roles.length && !picked) missing.push(`판 없음 — ${roles.join(' · ')}`);
  const mine = [];
  for (const want of picked?.files ?? []) {
    const { file, abs } = findImage(base, want), img = loadImage(abs);
    if (img.error) missing.push(`${want} ${img.error}`);
    else mine.push({ file, abs, img });
  }
  const mineAbs = new Set(mine.map((m) => m.abs));
  let cmp = compareFiles(cmpIn, base, missing).filter((c) => !mineAbs.has(c.abs));
  if (cmp.length > MAX_FILES) { missing.push(`비교 판이 ${cmp.length}장 — 앞 ${MAX_FILES}장만 봄`); cmp = cmp.slice(0, MAX_FILES); }
  if (!mine.length || !cmp.length) return empty;

  const r = await withBrowser(async (draw) => {
    const hashOf = (img) => hashImage(draw, img);
    const mh = [], ch = [];
    for (const m of mine) {
      let h = null;
      try { h = await hashOf(m.img); } catch { missing.push(`${m.file} 그리지 못함`); continue; }
      if (h) mh.push({ file: m.file, ...h }); else missing.push(`${m.file} 그린 것 없음`);
    }
    for (const c of cmp) {
      const img = loadImage(c.abs);
      if (img.error) { missing.push(`${c.file} ${img.error}`); continue; }
      let h = null;
      try { h = await hashOf(img); } catch { missing.push(`${c.file} 그리지 못함`); continue; }
      if (h) ch.push({ file: c.file, ...h }); else missing.push(`${c.file} 그린 것 없음`);
    }
    return { mh, ch };
  });
  if (r.unavailable) return { unavailable: r.unavailable, missing };
  const { mh, ch } = r.value;
  const mineOut = mh.map((m) => ({ file: m.file, dhash: hexOf(m.dhash), phash: hexOf(m.phash) }));
  if (!mh.length || !ch.length) return { ...empty, mine: mineOut, count: ch.length };
  const pairs = [];
  for (const m of mh) for (const c of ch) {
    const d = hamming(m.dhash, c.dhash), p = hamming(m.phash, c.phash);
    pairs.push({ mine: m.file, file: c.file, dhash: d, phash: p, score: round(1 - (d + p) / 128) });
  }
  pairs.sort((a, b) => b.score - a.score || a.dhash - b.dhash || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0) || (a.mine < b.mine ? -1 : a.mine > b.mine ? 1 : 0));
  const top = pairs.slice(0, k);
  return {
    top,
    nearest: top[0].file,
    max_score: top[0].score,
    min_dhash: Math.min(...pairs.map((x) => x.dhash)),
    min_phash: Math.min(...pairs.map((x) => x.phash)),
    count: ch.length,
    mine: mineOut,
    text: `비교 ${ch.length}장 · 가까운 순 ${top.slice(0, 3).map((x) => `${path.posix.basename(x.file)} ${fixed(x.score, 2)}(dHash ${x.dhash} · pHash ${x.phash})`).join(' · ')}`,
    missing,
    notes,
  };
}
