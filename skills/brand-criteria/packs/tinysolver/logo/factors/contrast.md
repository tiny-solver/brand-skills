---
{
  "id": "contrast",
  "type": "gate",
  "name": "바탕과 대비",
  "ask": "밝은 바탕 · 어두운 바탕 둘 다에서 또렷한가?",
  "pass": "모양과 바탕의 대비 {{shape_min}}:1 이상(WCAG 비글자 기준) · 글자는 {{text_min}}:1 이상.",
  "how": "토큰 색(light · dark 의 accent · ink 와 bg)으로 대비를 계산한다(WCAG 상대 휘도).",
  "params": {
    "shape_min": { "default": 3, "min": 3, "unit": ":1", "note": "모양 대비 — WCAG 비글자 대비 3:1 밑으로 내릴 수 없다" },
    "text_min": { "default": 4.5, "min": 4.5, "unit": ":1", "note": "글자 대비 — WCAG 대비(최소) 4.5:1 밑으로 내릴 수 없다" },
    "pairs": {
      "default": [
        { "fg": "$tokens.light.accent", "bg": "$tokens.light.bg", "role": "shape" },
        { "fg": "$tokens.dark.accent", "bg": "$tokens.dark.bg", "role": "shape" },
        { "fg": "$tokens.light.ink", "bg": "$tokens.light.bg", "role": "text" },
        { "fg": "$tokens.dark.ink", "bg": "$tokens.dark.bg", "role": "text" }
      ],
      "note": "잴 색 쌍 — $ 경로는 direction.json 칸"
    }
  },
  "measure": [
    { "use": "contrast@1", "as": "c", "with": { "pairs": "{{pairs}}", "tiles": "$tiles", "shape_min": "{{shape_min}}", "text_min": "{{text_min}}" } }
  ],
  "decide": { "by": "measure", "pass": { "m": "c.pass", "op": "==", "v": true } },
  "evidence": {
    "template": "{{c.text}}",
    "pattern": "\\d+\\.\\d{2}:1",
    "example": "#9b2c2c / #ffffe5 7.41:1 · #f36868 / #231710 5.82:1 · #281815 / #ffffe5 16.80:1 · #f6f2cb / #231710 15.38:1"
  },
  "sources": ["WCAG 2.2 SC 1.4.11 비글자 대비", "WCAG 2.2 SC 1.4.3 대비(최소)"]
}
---
## 하는 일
측정기 `contrast@1` 이 정한다 — 판정하는 쪽은 뒤집지 않는다. 쌍의 색 값이 하나라도 없거나 모양 쌍이 하나도 없으면 null(안 봄)이다.

## 하지 않는 것
- 화면 캡처 · PNG 에서 색을 뽑아 재지 않는다 — 가장자리가 섞여 옅게 나온다.
- '예뻐 보이나'는 보지 않는다 — 점수 밖이고 고르는 사람 몫이다.
