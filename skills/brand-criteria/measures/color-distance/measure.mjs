// color-distance@1 — CIEDE2000(CIE 142-2001) · 참조 묶음(ref) 또는 색 목록(colors) 안에서 가장 가까운 거리 · 의존성 0 · 순수 함수
// 계약: MEASURE.md · 시험 값 vectors.json · 참조 묶음은 ctx.ref(id) 로 읽는다

const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const isHex = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

// sRGB → CIELAB(D65)
function lab(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16)));
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function deltaE2000(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2), rad = Math.PI / 180;
  const C = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2, G = 0.5 * (1 - Math.sqrt(C ** 7 / (C ** 7 + 25 ** 7)));
  const A1 = a1 * (1 + G), A2 = a2 * (1 + G), C1 = Math.hypot(A1, b1), C2 = Math.hypot(A2, b2);
  const hh = (b, a) => { const h = Math.atan2(b, a) / rad; return h < 0 ? h + 360 : h; };
  const H1 = hh(b1, A1), H2 = hh(b2, A2);
  let dh = C1 * C2 === 0 ? 0 : H2 - H1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dL = L2 - L1, dC = C2 - C1, dH = 2 * Math.sqrt(C1 * C2) * Math.sin((dh / 2) * rad);
  const Lm = (L1 + L2) / 2, Cm = (C1 + C2) / 2;
  let Hm = H1 + H2; if (C1 * C2 !== 0) Hm = Math.abs(H1 - H2) > 180 ? (H1 + H2 + (H1 + H2 < 360 ? 360 : -360)) / 2 : (H1 + H2) / 2;
  const T = 1 - 0.17 * Math.cos((Hm - 30) * rad) + 0.24 * Math.cos(2 * Hm * rad) + 0.32 * Math.cos((3 * Hm + 6) * rad) - 0.2 * Math.cos((4 * Hm - 63) * rad);
  const SL = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + 0.045 * Cm, SH = 1 + 0.015 * Cm * T;
  const RT = -2 * Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((Hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

export default async function measure(input = {}, ctx = {}) {
  const missing = [];
  let set = Array.isArray(input.colors) ? input.colors : null;
  if (!set && typeof input.ref === 'string') set = ctx.ref?.(input.ref)?.colors ?? null;
  if (!set) missing.push(input.ref ? `참조 묶음 없음: ${input.ref}` : 'colors · ref 없음');
  if (!isHex(input.hex)) missing.push('hex');
  set = (set || []).filter(isHex).map((c) => c.toLowerCase());
  const hex = isHex(input.hex) ? input.hex.toLowerCase() : null;
  if (missing.length || !set.length) return { hex, de_min: null, nearest: null, missing: missing.length ? missing : ['비교할 색 없음'] };
  let best = null;
  for (const c of set) { const d = deltaE2000(hex, c); if (best == null || d < best.d) best = { d, c }; }
  return { hex, de_min: round(best.d), nearest: best.c, missing: [] };
}
