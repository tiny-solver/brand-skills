---
{
  "id": "common-distance",
  "type": "score",
  "name": "흔한 파랑과 거리",
  "ask": "업계에 흔한 파랑과 한눈에 갈리나?",
  "two": "가장 가까운 흔한 파랑까지 ΔE2000 {{two_min}} 이상 — 한눈에 갈린다.",
  "one": "ΔE2000 {{one_min}} 이상 {{two_min}} 미만 — 나란히 놓으면 갈리지만 따로 보면 닮아 보인다.",
  "zero": "ΔE2000 {{one_min}} 미만 — 흔한 파랑과 닮아 이름을 가리면 누구 것인지 헷갈린다.",
  "how": "참조 묶음 {{ref}} 의 색마다 CIEDE2000 거리를 재고 가장 가까운 값을 본다.",
  "params": {
    "ref": { "default": "common-blues@2026-10", "note": "견줄 참조 묶음 — refs/<이름>@<YYYY-MM>.json" },
    "two_min": { "default": 10 },
    "one_min": { "default": 6 }
  },
  "measure": [
    { "use": "color-distance@1", "as": "blue", "with": { "hex": "$color.hex", "ref": "{{ref}}" } }
  ],
  "decide": {
    "by": "measure",
    "bands": [
      { "score": 2, "when": { "m": "blue.de_min", "op": ">=", "p": "two_min" } },
      { "score": 1, "when": { "m": "blue.de_min", "op": ">=", "p": "one_min" } },
      { "score": 0 }
    ]
  },
  "evidence": { "template": "흔한 파랑 {{blue.nearest}} 까지 ΔE {{blue.de_min}}", "example": "흔한 파랑 #004ea1 까지 ΔE 8.1" },
  "sources": ["CIE 142-2001 — CIEDE2000 색차"]
}
---
## 하는 일
측정기 `color-distance@1` 이 정한다. 참조 묶음은 색 값만 담는다.

## 하지 않는 것
- 근거에 누구의 색인지 이름을 적지 않는다 — 색 값만 적는다.
