// render@1 — 판을 크기 × 바탕 × (회색조 · 반전) PNG 로 굽는다. 계약: MEASURE.md · 시험 값: vectors.json
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseDir, findImage, fromBase64, loadImage, ownsBg, pickRoles, textList, withBrowser } from './raster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HEX = /^#[0-9a-f]{6}$/i;
const FALLBACK = { light: '#ffffff', dark: '#000000' };
// 어두운 바탕용 판의 역할 — <역할>_dark · <역할>_reverse
const DARK_ROLE = /_(dark|reverse)$/;

// 바탕 이름 → 칠할 색(none = 투명). light · dark 는 토큰 bg, 없으면 흰색 · 검정으로 굽고 notes 에 적는다
function bgColor(name, tokens, notes) {
  if (name === 'none') return null;
  if (HEX.test(name)) return name.toLowerCase();
  const hex = tokens?.[name]?.bg;
  if (typeof hex === 'string' && HEX.test(hex)) return hex.toLowerCase();
  notes.push(`tokens.${name}.bg 없음 — ${FALLBACK[name]} 로 구움`);
  return FALLBACK[name];
}
const stem = (f) => f.replace(/\.[^./]+$/, '').replace(/[\\/]+/g, '_');

export default async function measure(input = {}, ctx = {}) {
  const base = baseDir(ctx, HERE), missing = [], notes = [];
  const roles = textList(input.roles);
  const sizeIn = Array.isArray(input.sizes) ? input.sizes : input.sizes == null ? [] : [input.sizes];
  const okSize = (s) => Number.isInteger(s) && s > 0 && s <= 4096;
  const sizes = [...new Set(sizeIn.filter(okSize))];
  const badSizes = sizeIn.filter((s) => !okSize(s));
  if (badSizes.length) notes.push(`sizes 에서 뺀 값 — ${badSizes.map((s) => JSON.stringify(s)).join(' · ')}(1–4096 정수만)`);
  const bgIn = textList(input.bgs);
  const bgs = bgIn.filter((b) => ['light', 'dark', 'none'].includes(b) || HEX.test(b));
  if (bgs.length < bgIn.length) notes.push(`bgs 에서 뺀 값 — ${bgIn.filter((b) => !bgs.includes(b)).join(' · ')}(light · dark · none · #rrggbb 만)`);
  const bgNames = bgs.length ? [...new Set(bgs.map((b) => (HEX.test(b) ? b.toLowerCase() : b)))] : ['light'];
  const modes = [null, ...(input.gray === true ? ['gray'] : []), ...(input.invert === true ? ['invert'] : [])];
  if (!roles.length) missing.push('roles 없음');
  if (!sizes.length) missing.push('sizes 없음');
  const done = (images, text) => ({ images, count: images.length, text, missing: [...new Set(missing)], notes: [...new Set(notes)] });

  // 구울 판 — 있는 역할 전부, 역할 순서대로. 역할 값이 목록이면 파일 전부 · 같은 길이의 <역할>_dark 목록과 순서대로 짝짓는다
  const picked = pickRoles(input.files, roles, { all: true });
  if (roles.length && !picked.length) missing.push(`판 없음 — ${roles.join(' · ')}`);
  const plan = [];
  for (const { role, files } of picked) {
    const darks = textList(input.files?.[`${role}_dark`]);
    if (darks.length && darks.length !== files.length) notes.push(`${role}_dark ${darks.length}개 · ${role} ${files.length}개 — 길이가 달라 짝짓지 않음`);
    files.forEach((file, i) => plan.push({ role, file, dark: darks.length === files.length ? darks[i] : null }));
  }
  if (!plan.length || !sizes.length) return done([], '');

  // 파일 → {file(실제로 쓴 파일), img} 또는 {error} — 없으면 같은 이름의 다른 그림 형식을 찾는다
  const loaded = new Map();
  const load = (file) => {
    if (!loaded.has(file)) {
      const f = findImage(base, file), img = loadImage(f.abs);
      loaded.set(file, img.error ? { error: `${file} ${img.error}` } : { file: f.file, img });
      if (img.text) notes.push(`${f.file} SVG 에 글자(<text>)가 있다 — 그 머신의 글꼴로 그려져 머신마다 다를 수 있음(글자는 윤곽으로)`);
    }
    return loaded.get(file);
  };
  // 구울 수 있는 판이 하나도 없으면 브라우저를 띄우지 않는다
  if (plan.every((p) => load(p.file).error)) {
    for (const p of plan) missing.push(load(p.file).error);
    return done([], '');
  }

  const dirName = ctx.dir ? path.basename(path.resolve(ctx.dir)) : 'direction';
  const outDir = typeof ctx.out === 'string' ? path.join(path.resolve(ctx.out), 'renders', dirName) : null;
  const r = await withBrowser(async (draw) => {
    // 판마다 제 바탕을 가졌나(타일) — 타일은 어느 바탕에 놓아도 제 바탕이 보이므로 짝 판 없이 굽는다
    const tile = new Map();
    const isTile = async (L) => {
      if (!tile.has(L.file)) {
        let v = null;
        try { v = ownsBg(fromBase64(await draw(L.img, 64, 64, { out: 'rgba' })), 64, 64); } catch { /* 굽기에서 '그리지 못함' */ }
        tile.set(L.file, v);
      }
      return tile.get(L.file);
    };
    // 판(실제 파일) → {role, file, img, bgs} — 같은 파일은 한 번(바탕을 합친다)
    const byFile = new Map();
    const add = (role, L, bg) => {
      const j = byFile.get(L.file);
      if (j) { j.bgs = bgNames.filter((b) => j.bgs.includes(b) || b === bg); return; }
      byFile.set(L.file, { role, file: L.file, img: L.img, bgs: [bg] });
    };
    for (const { role, file, dark } of plan) {
      const L = load(file);
      if (L.error) { missing.push(L.error); continue; }
      for (const bg of bgNames) {
        // dark 바탕: <역할>_dark 짝 판 → (짝이 없으면) 타일이거나 어두운 바탕용 역할이면 그 판 → 아니면 굽지 않는다
        if (bg === 'dark') {
          if (dark) { const D = load(dark); if (D.error) missing.push(D.error); else add(role, D, bg); continue; }
          if (DARK_ROLE.test(role) || (await isTile(L)) !== false) add(role, L, bg);
          else missing.push(`${L.file} 어두운 바탕 판 없음 — ${role}_dark`);
          continue;
        }
        // light 바탕: 어두운 바탕용 역할(<역할>_dark · _reverse)은 타일이 아니면 굽지 않는다
        if (bg === 'light' && DARK_ROLE.test(role) && (await isTile(L)) === false) { missing.push(`${L.file} 어두운 바탕용 판 — light 바탕에 굽지 않음`); continue; }
        add(role, L, bg);
      }
    }
    const jobs = [...byFile.values()];
    const colorOf = Object.fromEntries(bgNames.filter((n) => jobs.some((j) => j.bgs.includes(n))).map((name) => [name, bgColor(name, input.tokens, notes)]));
    const images = [], baked = [];
    let unwritten = false;
    for (const { role, file, img, bgs } of jobs) {
      const mine = [];
      try {
        for (const size of sizes) {
          // 가로 로고(lockup)는 높이 = 크기, 나머지는 크기 × 크기 정사각에 가운데 맞춘다
          const W = role === 'lockup' && img.aspect ? Math.max(1, Math.round(size * img.aspect)) : size, H = size;
          for (const name of bgs) for (const mode of modes) {
            const color = colorOf[name];
            const url = await draw(img, W, H, { bg: color, mode, out: 'png' });
            const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
            mine.push({ buf, name: `${stem(file)}-${size}-${name.replace('#', '')}${mode ? `-${mode}` : ''}.png`, row: { role, file, size, width: W, height: H, bg: name, color, gray: mode === 'gray', invert: mode === 'invert' } });
          }
        }
      } catch {
        missing.push(`${file} 그리지 못함`);
        continue;
      }
      // 판 하나를 다 구운 뒤에 쓴다 — 못 그린 판의 PNG 는 남기지 않는다. 쓰지 못하면 path 없이 낸다
      for (const { buf, name, row } of mine) {
        let rel = null;
        if (outDir && !unwritten) {
          try {
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, name), buf);
            rel = path.posix.join('renders', dirName, name);
          } catch { unwritten = true; }
        }
        images.push({ ...row, path: rel, sha256: crypto.createHash('sha256').update(buf).digest('hex') });
      }
      baked.push({ file, bgs });
    }
    if (unwritten) missing.push(`renders/${dirName} 에 쓰지 못함 — 그림 자리(path) 없이 냄`);
    return { images, baked };
  });
  if (r.unavailable) return { unavailable: r.unavailable, missing: [...new Set(missing)] };
  const extra = `${input.gray === true ? ' +회색조' : ''}${input.invert === true ? ' +반전' : ''}`;
  return done(r.value.images, r.value.baked.map((d) => `${d.file} ${sizes.join('/')}px ${d.bgs.join('/')}${extra}`).join(' · '));
}
