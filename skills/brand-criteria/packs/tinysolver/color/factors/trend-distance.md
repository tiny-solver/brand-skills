---
{
  "id": "trend-distance",
  "type": "score",
  "name": "유행 색과 거리",
  "ask": "요즘 유행하는 색과 멀어 오래가나?",
  "two": "가장 가까운 유행 보라까지 ΔE2000 {{two_min}} 이상 — 유행과 멀어 오래간다.",
  "one": "ΔE2000 {{one_min}} 이상 {{two_min}} 미만 — 유행 색과 이웃한다.",
  "zero": "ΔE2000 {{one_min}} 미만 — 요즘 AI 서비스에 흔한 보라와 가깝다. 몇 년 뒤 낡아 보일 수 있다.",
  "how": "참조 묶음 {{ref}} 의 색마다 CIEDE2000 거리를 재고 가장 가까운 값을 본다.",
  "params": {
    "ref": { "default": "trend-purples@2026-10", "note": "견줄 참조 묶음 — refs/<이름>@<YYYY-MM>.json" },
    "two_min": { "default": 10 },
    "one_min": { "default": 6 }
  },
  "measure": [
    { "use": "color-distance@1", "as": "trend", "with": { "hex": "$color.hex", "ref": "{{ref}}" } }
  ],
  "decide": {
    "by": "measure",
    "bands": [
      { "score": 2, "when": { "m": "trend.de_min", "op": ">=", "p": "two_min" } },
      { "score": 1, "when": { "m": "trend.de_min", "op": ">=", "p": "one_min" } },
      { "score": 0 }
    ]
  },
  "evidence": { "template": "유행 보라 {{trend.nearest}} 까지 ΔE {{trend.de_min}}", "example": "유행 보라 #6d28d9 까지 ΔE 18.3" },
  "sources": ["CIE 142-2001 — CIEDE2000 색차"]
}
---
## 하는 일
측정기 `color-distance@1` 이 정한다. 유행 묶음은 날짜가 박힌 사본이라 낡는다 — 새 날짜 묶음으로 바꾸면 팩 판을 올린다.

## 하지 않는 것
- 근거에 누구의 색인지 이름을 적지 않는다 — 색 값만 적는다.
