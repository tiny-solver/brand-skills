// safe-area@1 — 판을 정사각으로 구워 마스크마다 밖에 칠한 픽셀 수와 가장자리 여백을 잰다. 계약: MEASURE.md · 시험 값: vectors.json
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baseDir, bgDepth, bgModel, findImage, fromBase64, hexOf, inkBox, loadImage, paintedOf, pickRoles, textList, withBrowser } from '../render/raster.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const fixed = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? round(x, d).toFixed(d) : '—');
const TOL = 1; // 경계에 걸친 안티에일리어싱 한 줄 — 픽셀 가운데 점이 경계에서 1px 넘게 밖이어야 '밖'
const FRAME = 0.1; // 타일 바탕이 가장자리에서 한 변의 10% 안쪽까지만 이어지면(테두리 띠) 타일 몸과 그림을 가르지 못한다

// 마스크 — 캔버스 S 기준. sd(dx, dy) = 경계까지 부호 거리(px, 밖이 +) · norm = 여백을 나눌 반지름(px)
const circle = (r) => ({ sd: (dx, dy) => Math.hypot(dx, dy) - r, norm: r });
export const MASKS = {
  circle: (S) => circle(S / 2),
  'ios-corner': (S) => {
    const h = S / 2, rc = 0.225 * S;
    return {
      sd: (dx, dy) => {
        const qx = Math.abs(dx) - (h - rc), qy = Math.abs(dy) - (h - rc);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rc;
      },
      norm: h,
    };
  },
  'android-adaptive': (S) => circle((S * 33) / 108),
  maskable: (S) => circle(S * 0.4),
};

// 칠한 픽셀(painted) 하나 판에서 마스크마다 {outside_px, margin}
export function maskStats(painted, S, names) {
  const c = S / 2, out = {};
  for (const name of names) {
    const { sd, norm } = MASKS[name](S);
    let outside = 0, worst = -Infinity;
    for (let y = 0, j = 0; y < S; y++) {
      const dy = y + 0.5 - c;
      for (let x = 0; x < S; x++, j++) {
        if (!painted[j]) continue;
        const d = sd(x + 0.5 - c, dy);
        if (d > TOL) outside++;
        if (d > worst) worst = d;
      }
    }
    // 여백 = 가장 바깥 칠한 픽셀에서 경계까지 / 반지름. 밖으로 센 픽셀이 없으면 0 밑으로 내리지 않는다(경계에 걸친 한 줄)
    const margin = -worst / norm;
    out[name] = { outside_px: outside, margin: round(outside ? margin : Math.max(0, margin)) };
  }
  return out;
}

export default async function measure(input = {}, ctx = {}) {
  // missing = 못 잰 것(입력 · 판 · 파일 없음 · 그리지 못함 · 칠한 것 없음) → 셀 머리 '측정 못 함'
  // undecided = 쟀지만 정하지 않은 것(바탕을 가르지 못한 타일 · 정하지 않는 마스크 밖 픽셀) → '정하지 않음'
  const base = baseDir(ctx, HERE), missing = [], undecided = [], notes = [];
  const roles = textList(input.roles);
  const maskIn = input.masks == null ? Object.keys(MASKS) : textList(input.masks);
  const masks = [...new Set(maskIn.filter((m) => m in MASKS))];
  if (masks.length < maskIn.length) notes.push(`모르는 마스크 — ${maskIn.filter((m) => !(m in MASKS)).join(' · ')}`);
  const S = Number.isInteger(input.size) && input.size >= 64 && input.size <= 2048 ? input.size : 512;
  if (input.size != null && S !== input.size) notes.push(`size 는 64–2048 정수 — 512 로 잼`);
  // fit — 마스크마다 그림을 놓는 비율(플랫폼이 판을 안전 영역 안으로 줄여 놓는 자리) · 숫자면 모든 마스크 · {마스크: 비율} 이면 그 마스크만
  // 숫자(1 포함)면 늘 투명 둘레를 잘라 그 비율 상자에 놓는다 · 없으면(null) 파일 그대로
  const fitOf = {};
  for (const m of masks) {
    let f = typeof input.fit === 'number' ? input.fit : input.fit && typeof input.fit === 'object' ? input.fit[m] : undefined;
    if (f === undefined) f = null;
    if (f !== null && !(typeof f === 'number' && f >= 0.1 && f <= 1)) { notes.push(`fit ${m} 는 0.1–1 — 파일 그대로 잼`); f = null; }
    fitOf[m] = f;
  }
  // as_is — 파일 그대로가 실제 자리인 마스크(없으면 없음). 정하는 마스크 = fit 을 준 마스크 + as_is 마스크
  // 그 밖의 마스크(놓일 자리를 모르고 파일 그대로 잰 값)는 판단 재료다 — 밖 픽셀이 있어도 막지 않고 outside_px 를 null 로 낸다
  const asIs = textList(input.as_is);
  if (asIs.some((m) => !(m in MASKS))) notes.push(`as_is 의 모르는 마스크 — ${asIs.filter((m) => !(m in MASKS)).join(' · ')}`);
  const decides = (m) => fitOf[m] !== null || asIs.includes(m);
  const label = (m) => (fitOf[m] === null ? m : `${m}@${fitOf[m]}`);
  const empty = { file: null, outside_px: null, margin_min: null, margin_max: null, masks: {}, count: 0, files: [], text: '', missing, undecided, notes };
  if (!roles.length) missing.push('roles 없음');
  if (!masks.length) missing.push('masks 없음');
  if (!roles.length || !masks.length) return empty;

  // 잴 판 — 앞에서부터 있는 역할 하나. 그 역할이 목록(아이콘 가족)이면 파일 전부를 재고 가장 나쁜 판을 낸다
  const picked = pickRoles(input.files, roles)[0];
  if (!picked) { missing.push(`판 없음 — ${roles.join(' · ')}`); return empty; }
  const jobs = [];
  for (const want of picked.files) {
    const { file, abs } = findImage(base, want), img = loadImage(abs);
    if (img.error) missing.push(`${want} ${img.error}`);
    else jobs.push({ file, img });
  }
  if (!jobs.length) return empty;

  const r = await withBrowser(async (draw) => {
    const rows = [];
    for (const { file, img } of jobs) {
      let px;
      try { px = fromBase64(await draw(img, S, S, { out: 'rgba' })); } catch { missing.push(`${file} 그리지 못함`); continue; }
      // 바탕 — 타일이 아니면(투명 바탕) 알파만 본다. 타일 바탕이 한 색 · 고른 그라데이션이 아니거나 둘레 띠뿐이면 그 판은 못 잰다
      const bg = bgModel(px, S, S);
      if (bg?.mixed) { undecided.push(`${file} 타일 바탕이 한 색 · 고른 그라데이션이 아니다 — 바탕과 그림을 가르지 못함`); continue; }
      const painted = paintedOf(px, S, S, bg);
      if (!painted.some(Boolean)) { missing.push(`${file} 칠한 것 없음`); continue; }
      if (bg && bgDepth(painted, px, S, S) < FRAME * S) { undecided.push(`${file} 타일 바탕(${bg.label})이 둘레 띠뿐이다 — 타일 몸과 그림을 가르지 못함`); continue; }
      // fit 이 있는 마스크는 투명 둘레를 자른 그림을 그 비율 상자에 맞춰 다시 굽는다 — 둘레는 타일 바탕색(바탕 겹)으로 칠한다
      // 그라데이션 타일은 둘레를 칠하지 않고(투명) 바탕 모델을 놓인 자리로 옮겨 본다
      const crop = inkBox(px, S, S);
      const byFit = new Map();
      for (const m of masks) byFit.set(fitOf[m], [...(byFit.get(fitOf[m]) || []), m]);
      const got = {};
      let failed = false;
      for (const [f, ms] of byFit) {
        let p = painted;
        if (f !== null) {
          const flat = bg?.flat ?? null;
          let placed = bg;
          if (bg && !flat) {
            const t = f / Math.max(crop.w, crop.h), ox = (S - crop.w * S * t) / 2, oy = (S - crop.h * S * t) / 2;
            placed = { at: (x, y) => bg.at(crop.x * S + (x - ox) / t, crop.y * S + (y - oy) / t) };
          }
          try { p = paintedOf(fromBase64(await draw(img, S, S, { out: 'rgba', fit: f, crop, bg: hexOf(flat) })), S, S, placed); } catch { failed = true; break; }
        }
        for (const [m, v] of Object.entries(maskStats(p, S, ms))) got[m] = { ...v, ...(f === null ? {} : { fit: f }), ...(decides(m) ? {} : { decides: false }) };
      }
      if (failed) { missing.push(`${file} 그리지 못함`); continue; }
      const ms = Object.fromEntries(masks.map((m) => [m, got[m]])), vals = Object.values(ms);
      const of = (want) => Math.max(0, ...masks.filter((m) => decides(m) === want).map((m) => ms[m].outside_px));
      rows.push({
        file,
        bg: bg?.label ?? null,
        outside_px: Math.max(...vals.map((v) => v.outside_px)),
        margin_min: Math.min(...vals.map((v) => v.margin)),
        margin_max: Math.max(...vals.map((v) => v.margin)),
        masks: ms,
        hard: of(true),
        soft: of(false),
      });
    }
    return rows;
  });
  if (r.unavailable) return { unavailable: r.unavailable, missing };
  const rows = r.value;
  // 정하지 않는 마스크에 밖 픽셀이 있으면 마스크마다 한 줄 — 가장 많은 판 · 몇 장
  for (const m of masks.filter((x) => !decides(x))) {
    const hit = rows.filter((x) => x.masks[m].outside_px > 0);
    if (!hit.length) continue;
    const top = hit.reduce((a, b) => (b.masks[m].outside_px > a.masks[m].outside_px ? b : a));
    undecided.push(`${top.file} ${label(m)} 밖 ${top.masks[m].outside_px}px${rows.length > 1 ? `(${hit.length}/${rows.length}장)` : ''} — 파일 그대로 잰 값이라 정하지 않음(as_is 밖 · fit 없음)`);
  }
  if (!rows.length) return empty;
  // 가장 나쁜 판 — 정하는 마스크의 밖 픽셀이 가장 많은 판, 같으면 모든 마스크의 밖 픽셀이 가장 많은 판, 같으면 여백이 가장 좁은 판, 같으면 앞 판
  const worst = rows.reduce((a, b) => (b.hard > a.hard || (b.hard === a.hard && (b.outside_px > a.outside_px || (b.outside_px === a.outside_px && b.margin_min < a.margin_min))) ? b : a));
  const text = rows.map((x) => `${x.file} — ${masks.map((m) => `${label(m)} ${x.masks[m].outside_px}px ${fixed(x.masks[m].margin, 2)}`).join(' · ')}`).join(' / ');
  // outside_px — 정하는 마스크 밖 픽셀이 있으면 그 값(막는다). 없을 때 판 하나라도 못 잼(파일 없음 · 그리지 못함 · 칠한 것 없음 · 바탕을 가르지 못함)이거나
  // 정하지 않는 마스크(파일 그대로 잰 값)에만 밖 픽셀이 있으면 null — 다 재지 않고 · 놓일 자리를 모르고 통과로 보지 않는다
  const partial = rows.length < picked.files.length;
  const unsure = partial || rows.some((x) => x.soft > 0);
  return {
    file: worst.file,
    outside_px: worst.hard > 0 ? worst.hard : unsure ? null : 0,
    margin_min: worst.margin_min,
    margin_max: worst.margin_max,
    masks: worst.masks,
    count: rows.length,
    files: rows.map(({ file, bg, outside_px, margin_min, margin_max }) => ({ file, bg, outside_px, margin_min, margin_max })),
    text,
    missing,
    undecided,
    notes,
  };
}
