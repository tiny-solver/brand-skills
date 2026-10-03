---
{
  "id": "light-contrast",
  "type": "score",
  "name": "흰 바탕에서 읽히나",
  "ask": "밝은 바탕({{paper}})에 그대로 놓아도 읽히나?",
  "two": "대비 {{two_min}}:1 이상 — 글자 · 버튼까지 써도 된다.",
  "one": "대비 {{one_min}}:1 이상 {{two_min}}:1 미만 — 그림에만 쓴다. 글자로 쓰려면 더 어둡게.",
  "zero": "대비 {{one_min}}:1 미만 — 너무 옅다. 밝은 바탕 판을 따로 둬야 한다.",
  "how": "색과 밝은 바탕의 대비를 계산한다(WCAG 상대 휘도).",
  "params": {
    "paper": { "default": "#ffffff", "note": "밝은 바탕 색 — 내 브랜드 바탕 색으로 바꿔도 된다" },
    "two_min": { "default": 4.5, "min": 4.5, "unit": ":1", "note": "글자까지 쓸 대비 — WCAG 대비(최소) 밑으로 내릴 수 없다" },
    "one_min": { "default": 3, "min": 3, "unit": ":1", "note": "그림에 쓸 대비 — WCAG 비글자 대비 밑으로 내릴 수 없다" }
  },
  "measure": [
    { "use": "contrast@1", "as": "c", "with": { "pairs": [{ "fg": "$color.hex", "bg": "{{paper}}", "role": "shape" }] } }
  ],
  "decide": {
    "by": "measure",
    "bands": [
      { "score": 2, "when": { "m": "c.shape_min", "op": ">=", "p": "two_min" } },
      { "score": 1, "when": { "m": "c.shape_min", "op": ">=", "p": "one_min" } },
      { "score": 0 }
    ]
  },
  "evidence": { "template": "{{c.text}}", "example": "#34447b / #ffffff 9.30:1" },
  "sources": ["WCAG 2.2 SC 1.4.3 대비(최소)", "WCAG 2.2 SC 1.4.11 비글자 대비"]
}
---
## 하는 일
측정기 `contrast@1` 이 정한다. 색이 없으면 null(안 봄).

## 하지 않는 것
- 화면 캡처에서 색을 뽑아 재지 않는다 — direction.json 의 색 값으로 잰다.
