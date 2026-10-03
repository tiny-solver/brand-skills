---
{
  "id": "tinysolver/color",
  "version": "3",
  "name": "브랜드 색 기준",
  "description": "브랜드 색 하나 — 흰 · 검정 바탕 대비와 흔한 파랑 · 유행 보라와의 거리를 재서 매긴다",
  "kind": "color",
  "lang": "ko",
  "status": "stable",
  "date": "2026-10-02",
  "license": "Apache-2.0",
  "format": "3",
  "factors": ["light-contrast", "dark-variant", "common-distance", "trend-distance"],
  "recommend": { "score_min": 1, "total_ratio": 0.75 }
}
---
## 규칙
- 넷 다 측정이 정한다 — 판정하는 쪽이 값을 뒤집지 않는다.
- 점수는 바닥선이다 — 고르는 건 사람. 바닥선을 넘은 색끼리는 로고에 입혀 밝은 · 어두운 바탕에 놓아 보고 고른다.
- 참조 묶음(흔한 파랑 · 유행 보라)은 날짜가 박힌 작은 사본이다 — 낡으면 새 날짜 묶음을 만들고 팩 판을 올린다.
- 측정 못 하면(색이 없음 · 측정기 없음) 안 봄(null)이다 — 판정으로 채우지 않는다(규격 판 3).
- 바탕은 흰색 `#ffffff` · 검정 `#000000` 으로 잰다 — 내 바탕 색으로 재려면 내 팩에서 light-contrast `paper` · dark-variant `ink` 를 바꾼다.

## 대상
방향의 direction.json `color` — `{"hex": "#rrggbb", "dark": "#rrggbb"(있으면)}`. 어두운 바탕 판을 정해 두지 않았으면 측정기가 만든다.
