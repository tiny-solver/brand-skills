---
{
  "id": "dark-variant",
  "type": "score",
  "name": "어두운 바탕 판",
  "ask": "어두운 바탕({{ink}})에 놓을 판이 또렷한가?",
  "two": "어두운 바탕 판의 대비 {{two_min}}:1 이상 — 정해 둔 판이 없으면 같은 색을 밝혀 만든 판으로 잰다.",
  "one": "대비 {{one_min}}:1 이상 {{two_min}}:1 미만 — 그림에만 쓴다.",
  "zero": "대비 {{one_min}}:1 미만 — 어두운 바탕에서 흐리다.",
  "how": "정해 둔 어두운 판(color.dark)이 있으면 그 색, 없으면 같은 색을 흰색 쪽으로 2%씩 섞어 {{two_min}}:1 에 처음 닿는 판을 만들어 잰다.",
  "params": {
    "ink": { "default": "#000000", "note": "어두운 바탕 색 — 내 브랜드 어두운 바탕 색으로 바꿔도 된다" },
    "two_min": { "default": 7, "min": 4.5, "unit": ":1", "note": "만들 판이 닿을 대비 · 2점 바닥" },
    "one_min": { "default": 4.5, "min": 3, "unit": ":1" }
  },
  "measure": [
    { "use": "dark-variant@1", "as": "d", "with": { "hex": "$color.hex", "dark": "$color.dark", "ink": "{{ink}}", "target": "{{two_min}}" } }
  ],
  "decide": {
    "by": "measure",
    "bands": [
      { "score": 2, "when": { "m": "d.ratio", "op": ">=", "p": "two_min" } },
      { "score": 1, "when": { "m": "d.ratio", "op": ">=", "p": "one_min" } },
      { "score": 0 }
    ]
  },
  "evidence": { "template": "{{d.text}}", "example": "#8d96b5(만듦) / #000000 7.2:1" },
  "sources": ["WCAG 2.2 SC 1.4.6 대비(향상)"]
}
---
## 하는 일
측정기 `dark-variant@1` 이 정한다. 만든 판은 근거에 `(만듦)` 이 붙는다 — 그 색을 어두운 바탕 토큰으로 쓰면 된다.

## 하지 않는 것
- 만든 판이 원래 색과 다르다고 깎지 않는다 — 어두운 바탕용 판을 따로 두는 게 기본이다.
