// dark-variant@1 — 어두운 바탕(ink)에 놓을 판의 대비 · 정해 둔 판이 없으면 흰색 쪽으로 섞어 만든다 · 의존성 0 · 순수 함수
// 계약: MEASURE.md · 시험 값 vectors.json

const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const fixed = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? round(x, d).toFixed(d) : '—');
const isHex = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = rgbOf(hex).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrastRatio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// 같은 색을 흰색 쪽으로 0.02 씩 섞어 바탕 대비 target 에 처음 닿는 색 — 끝까지 못 닿으면 흰색
export function darkOf(hex, ink, target) {
  const c = rgbOf(hex);
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const h = hexOf(c.map((v) => v + (255 - v) * t));
    if (contrastRatio(h, ink) >= target) return h;
  }
  return '#ffffff';
}

export default async function measure(input = {}) {
  const ink = isHex(input.ink) ? input.ink.toLowerCase() : '#000000';
  const target = typeof input.target === 'number' ? input.target : 7;
  if (!isHex(input.hex)) return { dark: null, ratio: null, made: null, missing: ['hex'], text: '색 없음' };
  const hex = input.hex.toLowerCase(), given = isHex(input.dark);
  const dark = given ? input.dark.toLowerCase() : darkOf(hex, ink, target);
  const made = !given && dark !== hex;
  const ratio = round(contrastRatio(dark, ink));
  return { dark, ratio, made, missing: [], text: `${dark}${made ? '(만듦)' : ''} / ${ink} ${fixed(ratio, 1)}:1` };
}
