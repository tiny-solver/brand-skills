---
{
  "id": "trademark",
  "version": 1,
  "access": "api",
  "endpoint": "/v1/measure/trademark",
  "in": {
    "name": "이름($context.name) — 글자 상표를 찾는다",
    "files": "방향의 파일 역할 표($files)",
    "roles": "도형 상표로 찾을 판의 역할 — 앞에서부터 있는 판 하나를 256px PNG(image)로 구워 보낸다. 판이 없으면 이름으로만 찾는다",
    "markets": "볼 나라 — ISO 3166 두 글자 목록",
    "classes": "상품류 번호 목록 — 없으면 거르지 않는다"
  },
  "out": {
    "hits": { "type": "array" },
    "sources": { "type": "array" },
    "not_checked": { "type": "array" },
    "notice": { "type": "string" }
  }
}
---
상표 DB 검색 요약. 서비스 안에만 있다.

- 보내는 것: `name` · `image`(볼 판 하나를 256px PNG 로 — 있으면) · `markets` · `classes` — 그림 파일 경로 · 근거 글은 보내지 않는다.
- 출력: `hits[{office, number, mark, class, status}]` · `sources[{id, as_of}]` · `not_checked` · `notice`. 검색 결과를 보일 뿐 등록 가능 · 침해 여부는 판정하지 않는다.
- 실행기는 부르지 않음 — API 가 열리면 `--api` 로 부른다. 지금 출력은 `{"unavailable": "부르지 않음 — API 가 열리면 --api"}` 이고 셀 메타 `unavailable` 에 남는다. 아무것도 밖으로 보내지 않는다.
- 출원 전 공식 상표 DB 재검색은 사람 확인(confirm) 몫이다 — 이 측정기가 대신하지 않는다.
