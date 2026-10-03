---
{
  "id": "similar-logos",
  "version": 1,
  "access": "api",
  "endpoint": "/v1/measure/similar-logos",
  "in": {
    "files": "방향의 파일 역할 표($files)",
    "roles": "보낼 판의 역할 — 앞에서부터 있는 판 하나를 256px PNG(image)로 구워 보낸다(아이콘 가족이면 판마다)",
    "industry": "업계 한 줄($context.industry)",
    "classes": "상품류 번호 목록 — 없으면 거르지 않는다",
    "k": "돌려받을 수"
  },
  "out": {
    "top": { "type": "array" },
    "max_score": { "type": "number", "digits": 4, "display": 2 },
    "sources": { "type": "array" },
    "not_checked": { "type": "array" },
    "notice": { "type": "string" }
  }
}
---
유사 로고 색인에서 가까운 k 개를 돌려준다. 서비스 안에만 있다.

- 보내는 것: `image`(볼 판 하나를 256px PNG 로) · `industry` · `classes` · `k` — 그림 파일 경로 · 이름 · 근거 글은 보내지 않는다.
- 출력: `top[{ref, source, number?, link, score, band, why}]`(`why` = 채널별 근거 — 외관 · 호칭 · 관념) · `max_score` · `sources[{id, as_of}]`(데이터 원천 · 기준일) · `not_checked`(못 본 것) · `notice`(고지 한 줄). 순위 · 닮은 정도 · 근거만 낸다 — 등록 가능 · 침해 여부는 판정하지 않는다.
- 실행기는 부르지 않음 — API 가 열리면 `--api` 로 부른다. 지금 출력은 `{"unavailable": "부르지 않음 — API 가 열리면 --api"}` 이고 셀 메타 `unavailable` 에 남는다. 아무것도 밖으로 보내지 않는다.
- 이 측정기를 부르는 기준은 판정 기준이고 `fallback` 이 있다 — 못 쓰면 판정하는 쪽이 손 비교판 · 이미지 역검색으로 같은 칸을 채운다.
