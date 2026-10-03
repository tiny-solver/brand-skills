// contrast@1 — 색 쌍(pairs) + 아이콘 타일(tiles)의 WCAG 2.x 대비 · 의존성 0 · 순수 함수(같은 입력 → 같은 출력)
// 계약: MEASURE.md(입력 · 출력 · 표시 자리) · 시험 값 vectors.json

const round = (x, d = 4) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
const fixed = (x, d) => (typeof x === 'number' && Number.isFinite(x) ? round(x, d).toFixed(d) : '—');
const isHex = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.slice(i, i + 2), 16))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
// (밝은 쪽 L + 0.05) / (어두운 쪽 L + 0.05)
export const contrastRatio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export default async function measure(input = {}) {
  const shapeMin = typeof input.shape_min === 'number' ? input.shape_min : 3;
  const textMin = typeof input.text_min === 'number' ? input.text_min : 4.5;
  const list = [
    ...(Array.isArray(input.pairs) ? input.pairs : []).map((p) => ({ label: p?.label ?? null, role: p?.role === 'text' ? 'text' : 'shape', fg: p?.fg, bg: p?.bg })),
    ...(Array.isArray(input.tiles) ? input.tiles : []).map((t) => ({ label: t?.id ?? null, role: 'shape', fg: t?.fg, bg: t?.bg })),
  ];
  const missing = [];
  const pairs = list.map((p) => {
    const ok = isHex(p.fg) && isHex(p.bg);
    if (!ok) missing.push(`${p.label ? p.label + ' ' : ''}${p.role} 쌍 색 없음`);
    return { label: p.label, role: p.role, fg: ok ? p.fg.toLowerCase() : p.fg ?? null, bg: ok ? p.bg.toLowerCase() : p.bg ?? null, ratio: ok ? round(contrastRatio(p.fg, p.bg)) : null };
  });
  const shape = pairs.filter((p) => p.role === 'shape'), text = pairs.filter((p) => p.role === 'text');
  if (!shape.length) missing.push('모양 쌍 없음');
  const minOf = (xs) => (xs.length && xs.every((p) => p.ratio != null) ? Math.min(...xs.map((p) => p.ratio)) : null);
  const sMin = minOf(shape), tMin = minOf(text);
  const pass = missing.length ? null : sMin >= shapeMin && (!text.length || tMin >= textMin);
  const words = pairs.map((p) => `${p.label ? p.label + ' ' : ''}${p.ratio == null ? `${p.role} 쌍 색 없음` : `${p.fg} / ${p.bg} ${fixed(p.ratio, 2)}:1`}`);
  return { pass, shape_min: sMin, text_min: tMin, pairs, missing, text: words.join(' · ') };
}
