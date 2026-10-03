// 굽는 코드 — render@1 · safe-area@1 · local-similar@1 이 같이 쓴다.
// playwright-core 로 브라우저를 띄워 SVG · PNG · JPG · WebP · GIF 를 캔버스에 그리고, PNG 또는 RGBA 픽셀을 낸다.
// 브라우저 찾는 순서: 환경 변수 CHROME(실행 파일) → playwright 가 받아 둔 chromium → 설치된 Chrome → Edge.
// 같은 브라우저 판이면 같은 픽셀이다 — 판이 다르면 비스듬한 가장자리(안티에일리어싱) 픽셀이 조금 다를 수 있다.
import fs from 'node:fs';
import path from 'node:path';

export const IMAGE_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif' };
export const NO_BROWSER = '브라우저 없음 — CHROME=<Chrome 실행 파일> 또는 npx playwright install chromium';

// 파일 자리 — ctx.dir(방향 폴더) 기준. ctx.dir 가 없으면 측정기 폴더 기준(시험 값의 fixtures/ 가 이렇게 풀린다)
export const baseDir = (ctx, here) => (ctx && typeof ctx.dir === 'string' ? path.resolve(ctx.dir) : here);
export const textList = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]).filter((x) => typeof x === 'string' && x);

// 역할 표에서 앞에서부터 있는 판 — 역할 하나(all 이면 있는 역할 전부) · 값이 목록(아이콘 가족)이면 파일 전부
export function pickRoles(files, roles, { all = false } = {}) {
  const got = [];
  if (!files || typeof files !== 'object' || Array.isArray(files)) return got;
  for (const role of roles) {
    const list = textList(files[role]);
    if (!list.length) continue;
    got.push({ role, files: list });
    if (!all) break;
  }
  return got;
}

// ── SVG 뿌리 — 크기를 W × H 로 박는다(viewBox 가 없으면 width · height 로 만든다 · 비율은 SVG 의 preserveAspectRatio 대로)
const attrOf = (open, name) => {
  const m = open.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[1] ?? m[2]) : null;
};
const dropAttr = (open, name) => open.replace(new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi'), '');
const lengthOf = (s) => (s != null && !/%\s*$/.test(s) && Number.isFinite(parseFloat(s)) && parseFloat(s) > 0 ? parseFloat(s) : null);
function svgBox(text) {
  const open = text.match(/<svg\b[^>]*>/i)?.[0];
  if (!open) return null;
  const vb = attrOf(open, 'viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return { open, vb, w: vb[2], h: vb[3] };
  const w = lengthOf(attrOf(open, 'width')), h = lengthOf(attrOf(open, 'height'));
  return { open, vb: w && h ? [0, 0, w, h] : null, w: w || 300, h: h || 150 };
}
export function svgSized(text, W, H) {
  const box = svgBox(text);
  let open = box.open;
  for (const a of ['width', 'height', 'viewBox']) open = dropAttr(open, a);
  if (!/\sxmlns\s*=/.test(open)) open = open.replace(/<svg\b/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  open = open.replace(/<svg\b/i, `<svg width="${W}" height="${H}"${box.vb ? ` viewBox="${box.vb.join(' ')}"` : ''}`);
  return text.replace(box.open, open);
}
// 그림 머리에서 크기 {w, h} — PNG(IHDR) · JPG(SOF) · GIF(논리 화면) · WebP(VP8 · VP8L · VP8X). 못 읽으면 null
export function rasterSize(buf, type) {
  const ok = (w, h) => (w > 0 && h > 0 ? { w, h } : null);
  try {
    if (type === 'image/png') return buf.length > 24 && buf.readUInt32BE(12) === 0x49484452 ? ok(buf.readUInt32BE(16), buf.readUInt32BE(20)) : null;
    if (type === 'image/gif') return buf.length > 10 && buf.toString('latin1', 0, 3) === 'GIF' ? ok(buf.readUInt16LE(6), buf.readUInt16LE(8)) : null;
    if (type === 'image/jpeg') {
      // 표지(marker)를 따라가 SOF0–SOF15(DHT C4 · JPG C8 · DAC CC 빼고)에서 높이 · 너비
      for (let i = 2; i + 9 < buf.length;) {
        if (buf[i] !== 0xff) return null;
        const m = buf[i + 1];
        if (m === 0xff) { i++; continue; }
        if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
        const len = buf.readUInt16BE(i + 2);
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return ok(buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5));
        i += 2 + len;
      }
      return null;
    }
    if (type === 'image/webp') {
      if (buf.length < 30 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WEBP') return null;
      const kind = buf.toString('latin1', 12, 16);
      if (kind === 'VP8X') return ok(1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3));
      if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return ok(1 + (b & 0x3fff), 1 + ((b >>> 14) & 0x3fff)); }
      if (kind === 'VP8 ') return ok(buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
    }
  } catch { /* 머리가 짧다 */ }
  return null;
}

// 파일 자리(base 기준) → 실제로 쓸 파일 {file, abs}. 없으면 같은 이름의 다른 그림 형식을 이 순서로 찾는다(SVG → PNG → JPG · JPEG → WebP → GIF)
// file 은 찾은 파일의 자리(입력과 같은 폴더 · 바뀐 확장자) — 없으면 입력 그대로(loadImage 가 '없음'을 낸다)
const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
export function findImage(base, file) {
  const abs = path.resolve(base, file);
  if (isFile(abs) || !IMAGE_TYPES[path.extname(file).toLowerCase()]) return { file, abs };
  const stem = file.slice(0, file.length - path.extname(file).length);
  for (const ext of Object.keys(IMAGE_TYPES)) {
    const alt = path.resolve(base, stem + ext);
    if (isFile(alt)) return { file: stem + ext, abs: alt };
  }
  return { file, abs };
}

// 파일 하나 → 그릴 거리 {svg | url, aspect} 또는 {error}
export function loadImage(abs) {
  const type = IMAGE_TYPES[path.extname(abs).toLowerCase()];
  if (!type) return { error: '그림 형식이 아니다' };
  let buf;
  try { buf = fs.readFileSync(abs); } catch { return { error: '없음' }; }
  if (type === 'image/svg+xml') {
    const svg = buf.toString('utf8'), box = svgBox(svg);
    if (!box) return { error: 'SVG 뿌리 없음' };
    // <text> 는 그 머신에 깔린 글꼴로 그려진다 — 머신마다 픽셀이 다를 수 있어 굽는 쪽이 notes 에 적는다
    return { svg, aspect: box.w / box.h, text: /<text\b/i.test(svg) };
  }
  const s = rasterSize(buf, type);
  return { url: `data:${type};base64,${buf.toString('base64')}`, aspect: s ? s.w / s.h : null };
}
const srcAt = (img, W, H) => (img.svg ? `data:image/svg+xml;base64,${Buffer.from(svgSized(img.svg, W, H)).toString('base64')}` : img.url);

// ── 브라우저 — fn(draw) 를 부른다. 못 띄우면 {unavailable}
// 브라우저 하나를 이어 부르는 측정끼리 같이 쓰고(시험 값 · 방향 여럿), 마지막 측정이 끝나고 잠깐 아무도 안 쓰면 닫는다.
// 못 띄운 이유도 프로세스 동안 기억한다 — 측정마다 다시 찾지 않는다.
const IDLE_MS = 100;
let shared = null; // {browser, page(Promise), users, timer} | {unavailable} | {launching}
async function launch() {
  let pw;
  try { pw = await import('playwright-core'); } catch { return { unavailable: 'playwright-core 없음' }; }
  const chromium = pw.chromium || pw.default?.chromium;
  const tries = [...(process.env.CHROME ? [{ executablePath: process.env.CHROME }] : []), {}, { channel: 'chrome' }, { channel: 'msedge' }];
  for (const t of tries) {
    try { return { browser: await chromium.launch({ headless: true, ...t }), page: null, users: 0, timer: null }; } catch { /* 다음 후보 */ }
  }
  return { unavailable: NO_BROWSER };
}
async function acquire() {
  while (shared?.launching) await shared.launching;
  if (!shared) {
    const launching = launch();
    shared = { launching };
    shared = await launching;
  }
  if (shared.browser) { clearTimeout(shared.timer); shared.users++; }
  return shared;
}
function release(s) {
  if (--s.users > 0) return;
  s.timer = setTimeout(() => {
    if (s.users > 0 || shared !== s) return;
    shared = null;
    s.browser.close().catch(() => {});
  }, IDLE_MS);
}
export async function withBrowser(fn) {
  const s = await acquire();
  if (s.unavailable) return { unavailable: s.unavailable };
  try {
    // 쪽 하나를 같이 쓴다 — 그리기는 쪽 안 상태를 남기지 않는다(캔버스는 그릴 때마다 새로)
    let page;
    try {
      if (!s.page) s.page = s.browser.newPage();
      page = await s.page;
      if (page.isClosed()) { s.page = s.browser.newPage(); page = await s.page; }
    } catch {
      s.page = null;
      return { unavailable: '브라우저 쪽을 열지 못함' };
    }
    // opts.fit(0–1) = 그림을 캔버스의 그 비율 상자에 가운데 맞춘다(둘레는 바탕) — 플랫폼이 아이콘을 안전 영역 안으로 줄여 놓는 것과 같다
    // opts.crop = {x, y, w, h}(fit 1 로 그린 캔버스 대비 비율) — 그 상자만 잘라 fit 상자에 맞춘다(투명 둘레를 자르고 놓는 키트 방식)
    // SVG 는 놓일 크기로 다시 그려 1:1 로 찍는다 — 줄여 그린 그림을 다시 줄이지 않는다
    const draw = (img, W, H, opts = {}) => {
      const fit = typeof opts.fit === 'number' && opts.fit > 0 && opts.fit < 1 ? opts.fit : 1;
      const crop = opts.crop && opts.crop.w > 0 && opts.crop.h > 0 ? opts.crop : null;
      const t = crop ? fit / Math.max(crop.w, crop.h) : fit;
      const w = Math.max(1, Math.round(W * t)), h = Math.max(1, Math.round(H * t));
      return page.evaluate(PAGE_DRAW, { src: srcAt(img, w, h), W, H, fit, crop, bg: opts.bg ?? null, mode: opts.mode ?? null, out: opts.out ?? 'rgba' });
    };
    return { value: await fn(draw) };
  } finally {
    release(s);
  }
}

// 브라우저 안에서 — W × H 캔버스에 바탕(bg)을 칠하고 그림을(crop 이 있으면 그 상자만) 가운데 맞춰(비율 유지 · fit 배) 그린다.
// mode gray = 밝기만(0.2126 R + 0.7152 G + 0.0722 B) · invert = 밝기를 거꾸로(255 − 밝기). out png = PNG data URL · rgba = RGBA 바이트 base64
const PAGE_DRAW = async ({ src, W, H, fit, crop, bg, mode, out }) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  const nw = img.naturalWidth || W, nh = img.naturalHeight || H;
  if (crop) {
    // fit 1 일 때 그림이 놓이는 자리(k1 · ox · oy)로 캔버스 비율 상자를 원본 픽셀 상자로 바꾼다
    const k1 = Math.min(W / nw, H / nh), ox = (W - nw * k1) / 2, oy = (H - nh * k1) / 2;
    const t = (fit || 1) / Math.max(crop.w, crop.h), dw = crop.w * W * t, dh = crop.h * H * t;
    g.drawImage(img, (crop.x * W - ox) / k1, (crop.y * H - oy) / k1, (crop.w * W) / k1, (crop.h * H) / k1, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const k = Math.min(W / nw, H / nh) * (fit || 1);
    g.drawImage(img, (W - nw * k) / 2, (H - nh * k) / 2, nw * k, nh * k);
  }
  if (mode === 'gray' || mode === 'invert') {
    const d = g.getImageData(0, 0, W, H), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      let y = Math.round(0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]);
      if (mode === 'invert') y = 255 - y;
      p[i] = p[i + 1] = p[i + 2] = y;
    }
    g.putImageData(d, 0, 0);
  }
  if (out === 'png') return c.toDataURL('image/png');
  const p = g.getImageData(0, 0, W, H).data;
  let s = '';
  for (let i = 0; i < p.length; i += 0x8000) s += String.fromCharCode.apply(null, p.subarray(i, i + 0x8000));
  return btoa(s);
};

// ── 픽셀 — 바탕색 찾기 · 칠한 픽셀
// 바탕까지 칠한 판(타일): 둘레 픽셀 가운데 불투명(알파 ≥ 250)한 것이 둘레의 25% 이상이고 그 90% 이상이 한 색이면 그 색이 바탕이다.
// 둥근 모서리 타일도 잡힌다(모서리는 투명 · 변의 곧은 부분이 바탕색). 그림이 둘레에 몇 점 닿는 것은 바탕으로 보지 않는다.
export function bgOf(px, W, H) {
  const counts = new Map();
  let border = 0, opaque = 0;
  const visit = (x, y) => {
    border++;
    const i = (y * W + x) * 4;
    if (px[i + 3] < 250) return;
    opaque++;
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (let x = 0; x < W; x++) { visit(x, 0); if (H > 1) visit(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { visit(0, y); if (W > 1) visit(W - 1, y); }
  if (!opaque || opaque < border * 0.25) return null;
  let best = null;
  for (const [key, n] of counts) if (!best || n > best.n || (n === best.n && key < best.key)) best = { key, n };
  if (best.n < opaque * 0.9) return null;
  return [(best.key >> 16) & 255, (best.key >> 8) & 255, best.key & 255];
}
// 바탕까지 칠한 판(타일)인가 — 둘레 픽셀 가운데 불투명(알파 ≥ 250)한 것이 25% 이상이면 그 판은 제 바탕을 가진다(둥근 모서리 타일 포함 · 색이 여럿이어도)
export function ownsBg(px, W, H) {
  let border = 0, opaque = 0;
  const visit = (x, y) => { border++; if (px[(y * W + x) * 4 + 3] >= 250) opaque++; };
  for (let x = 0; x < W; x++) { visit(x, 0); if (H > 1) visit(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { visit(0, y); if (W > 1) visit(W - 1, y); }
  return border > 0 && opaque >= border * 0.25;
}
export const hexOf = (rgb) => (rgb ? '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('') : null);

// 바탕 모델 — 바탕까지 칠한 판(타일)의 바탕을 한 색 또는 고른 그라데이션(채널마다 색 = a + b·x + c·y)으로 본다.
// null = 타일이 아니다(둘레 불투명 픽셀이 25% 미만 — 투명 바탕) · {at(x, y) → [r, g, b], label} = 바탕 · {mixed: true} = 바탕을 모른다
// 한 색 = bgOf. 선형 = 둘레 불투명 픽셀에 평면을 맞춰(남는 차가 큰 15% 를 빼고 다시 — 세 번까지) 90% 이상이 채널마다 4 안에 들면.
// 선형 그라데이션은 어느 방향이든 평면이다. 원형 그라데이션 · 여러 색 · 사진 · 무늬 바탕은 mixed.
const LINEAR_TOL = 4;
export function bgModel(px, W, H) {
  const pts = [];
  let border = 0;
  const visit = (x, y) => {
    border++;
    const i = (y * W + x) * 4;
    if (px[i + 3] >= 250) pts.push([x + 0.5, y + 0.5, px[i], px[i + 1], px[i + 2]]);
  };
  for (let x = 0; x < W; x++) { visit(x, 0); if (H > 1) visit(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { visit(0, y); if (W > 1) visit(W - 1, y); }
  if (!pts.length || pts.length < border * 0.25) return null;
  const flat = bgOf(px, W, H);
  if (flat) return { flat, at: () => flat, label: hexOf(flat) };
  let use = pts;
  for (let pass = 0; pass < 3 && use.length >= 3; pass++) {
    const coef = fitPlane(use);
    if (!coef) break;
    const at = (x, y) => coef.map(([a, b, c]) => a + b * x + c * y);
    const res = pts.map(([x, y, r, g, b]) => { const p = at(x, y); return Math.max(Math.abs(r - p[0]), Math.abs(g - p[1]), Math.abs(b - p[2])); });
    if (res.filter((d) => d <= LINEAR_TOL).length >= pts.length * 0.9) {
      // 이름표 — 색 차가 가장 큰 마주 보는 모서리 둘
      const ends = [[[0, 0], [W, H]], [[W, 0], [0, H]]].map(([p, q]) => [at(...p), at(...q)]);
      const span = ([p, q]) => Math.max(...p.map((v, k) => Math.abs(v - q[k])));
      const [p, q] = span(ends[0]) >= span(ends[1]) ? ends[0] : ends[1];
      return { linear: coef, at, label: `${hexOf(p)}→${hexOf(q)}` };
    }
    const cut = [...res].sort((a, b) => a - b)[Math.floor(pts.length * 0.85)];
    use = pts.filter((_, k) => res[k] <= cut);
  }
  return { mixed: true };
}
// 최소 제곱 평면 — 채널마다 [a, b, c] (색 = a + b·x + c·y). 점이 한 줄에 몰려 풀 수 없으면 null
function fitPlane(pts) {
  let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  const sv = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const [x, y, ...v] of pts) {
    n++; sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y;
    for (let k = 0; k < 3; k++) { sv[k][0] += v[k]; sv[k][1] += x * v[k]; sv[k][2] += y * v[k]; }
  }
  const M = [[n, sx, sy], [sx, sxx, sxy], [sy, sxy, syy]];
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M);
  if (!Number.isFinite(D) || Math.abs(D) < 1e-9) return null;
  // 크라메르 — 열 하나를 우변으로 바꾼 행렬식 / D
  return sv.map((r) => [0, 1, 2].map((col) => det(M.map((row, i) => row.map((v, j) => (j === col ? r[i] : v)))) / D));
}

// 칠한 픽셀 = 알파 > 8 이고 바탕과 다른 픽셀. bg = [r, g, b](한 색) · 바탕 모델(at(x, y) — 픽셀 가운데 점에서의 바탕색) · null(투명 바탕).
// 반투명 픽셀은 캔버스가 색을 알파로 곱해 8비트로 두었다가 되돌려 주어 색이 최대 255 / 알파 만큼 틀어진다 —
// 허용 차를 3 + 255 / 알파 로 넓힌다(알파 255 면 4, 알파 10 이면 28.5)
export function paintedOf(px, W, H, bg) {
  const out = new Uint8Array(W * H);
  const at = Array.isArray(bg) ? () => bg : typeof bg?.at === 'function' ? bg.at : null;
  for (let j = 0, i = 0; j < W * H; j++, i += 4) {
    const a = px[i + 3];
    if (a <= 8) continue;
    if (at) {
      const c = at((j % W) + 0.5, Math.floor(j / W) + 0.5), tol = 3 + 255 / a;
      if (Math.abs(px[i] - c[0]) <= tol && Math.abs(px[i + 1] - c[1]) <= tol && Math.abs(px[i + 2] - c[2]) <= tol) continue;
    }
    out[j] = 1;
  }
  return out;
}
// 둘레에서 이어진 바탕 영역이 캔버스 가장자리에서 얼마나 깊이 들어오나(px) — 칠하지 않은 픽셀(painted 0 · 알파 > 8)을 둘레에서부터 4방향으로 잇는다.
// 바탕이 둘레 띠(테두리)뿐이면 얕다 — 그 안이 타일 몸인지 그림인지 가르지 못한다
export function bgDepth(painted, px, W, H) {
  const seen = new Uint8Array(W * H), q = new Int32Array(W * H);
  let head = 0, tail = 0, deep = -1;
  const push = (j) => { if (!seen[j] && !painted[j] && px[j * 4 + 3] > 8) { seen[j] = 1; q[tail++] = j; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (head < tail) {
    const j = q[head++], x = j % W, y = (j - x) / W;
    deep = Math.max(deep, Math.min(x, y, W - 1 - x, H - 1 - y));
    if (x > 0) push(j - 1);
    if (x < W - 1) push(j + 1);
    if (y > 0) push(j - W);
    if (y < H - 1) push(j + W);
  }
  return deep;
}
export const fromBase64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));
// 알파가 0 이 아닌 픽셀의 상자 → 캔버스 대비 비율 {x, y, w, h} (없으면 null) — 키트가 투명 둘레를 잘라 재는 것과 같다
export function inkBox(px, W, H) {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0, i = 3; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    if (!px[i]) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H };
}
