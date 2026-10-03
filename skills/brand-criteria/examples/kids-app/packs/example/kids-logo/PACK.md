---
{
  "id": "example/kids-logo",
  "version": "1",
  "name": "예시 — 아이 앱 로고 기준",
  "description": "예시 커스텀 팩 — 기본 로고 팩을 물려받아 '아이가 따라 그린다' 문턱을 더하고 오래감을 끈다.",
  "kind": "logo",
  "lang": "ko",
  "date": "2026-10-02",
  "extends": "tinysolver/logo@3",
  "add": ["trace"],
  "disable": {
    "lasting": "아이 앱은 캐릭터 · 색을 철마다 바꾼다 — 5년 가는 모양보다 지금 아이에게 맞는 모양이 먼저다"
  }
}
---
## 이 팩이 바꾼 것
- 더함 — 문턱 `trace`(아이가 따라 그린다). 문턱이 일곱이 된다.
- 끔 — 점수 `lasting`(오래감). 점수가 다섯 · 만점 10 이 된다.
- 나머지 기준 · 규칙 · 셈 숫자는 `tinysolver/logo@3` 그대로 — 글이 같아 기준 해시도 같다.
