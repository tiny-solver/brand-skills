---
{
  "id": "contrast",
  "version": 1,
  "access": "open",
  "in": {
    "pairs": "잴 색 쌍 [{fg, bg, role: shape | text, label?}] — role 이 없으면 shape",
    "tiles": "아이콘 가족 타일 [{id, fg, bg}] — 각각 label 이 id 인 모양 쌍이 된다",
    "shape_min": "모양 쌍 문턱 — 없으면 3",
    "text_min": "글자 쌍 문턱 — 없으면 4.5"
  },
  "out": {
    "pass": { "type": "boolean" },
    "shape_min": { "type": "number", "digits": 4, "display": 2 },
    "text_min": { "type": "number", "digits": 4, "display": 2 },
    "pairs": { "type": "array" },
    "missing": { "type": "array" },
    "text": { "type": "string" }
  }
}
---
WCAG 2.x 대비 — `(밝은 쪽 L + 0.05) / (어두운 쪽 L + 0.05)`, `L = 0.2126 R + 0.7152 G + 0.0722 B`(sRGB 선형화: `c ≤ 0.04045 → c / 12.92`, 아니면 `((c + 0.055) / 1.055) ^ 2.4`).

- `shape_min` · `text_min`(출력) = 잰 모양 쌍 · 글자 쌍 가운데 가장 낮은 비율. 글자 쌍이 없으면 `text_min` 은 null.
- `pass` = 모양 쌍이 모두 문턱 이상 · 글자 쌍이 모두 문턱 이상(글자 쌍이 없으면 모양만). 쌍 하나라도 색이 없으면 null, 모양 쌍이 하나도 없으면 null.
- `text` = `[<label> ]<fg> / <bg> <비율 소수 둘째>:1` 을 ` · ` 로 잇는다 — 근거 글이 어느 표면에서나 글자까지 같다.
- 색은 `#rrggbb` 만 받고 소문자로 낸다.

코드는 같은 폴더 `measure.mjs`. 시험 값은 `vectors.json`.
