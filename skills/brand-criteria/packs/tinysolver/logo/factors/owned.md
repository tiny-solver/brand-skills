---
{
  "id": "owned",
  "type": "gate",
  "name": "우리 것이다",
  "ask": "남의 로고 · 상표와 닮지 않았고, 글꼴 · 그림을 상업으로 써도 되나?",
  "pass": "같은 업계 로고와 나란히 봐도 닮은 게 없고, 글꼴 라이선스(OFL 등)가 윤곽 변환 · 상업 사용을 허락한다.",
  "how": "이미지 역검색 · 같은 업계 로고 {{peers}}개 비교판 · 글꼴 라이선스 파일.",
  "params": {
    "peers": { "default": 10, "min": 5, "max": 30, "note": "나란히 놓을 같은 업계 로고 수" },
    "roles": { "default": ["mark"], "note": "남의 것과 견줄 판 — 앞에서부터 있는 판(아이콘 팩은 icon)" }
  },
  "measure": [
    { "use": "font-license@1", "as": "f", "with": { "fonts": "$files.fonts" } },
    { "use": "similar-logos@1", "as": "s", "with": { "files": "$files", "roles": "{{roles}}", "industry": "$context.industry", "k": "{{peers}}" } },
    { "use": "trademark@1", "as": "t", "with": { "name": "$context.name", "files": "$files", "roles": "{{roles}}", "markets": ["KR", "US"] } }
  ],
  "decide": { "by": "judge" },
  "fallback": "같은 업계 로고 {{peers}}개 비교판을 만들어 나란히 보고, 이미지 역검색 결과를 출처 주소 · 날짜와 함께 적는다. 글꼴은 font-license 측정값과 라이선스 파일을 본다.",
  "evidence": {
    "must": ["글꼴 라이선스 이름과 로고 · 윤곽 · 상업 사용 허락", "무엇과 나란히 봤나(비교판 · 역검색 · 상표 검색)와 닮은 것"],
    "example": "글꼴은 OFL-1.1(로고 · 윤곽 변환 · 상업 사용 허락). 같은 업계 로고 10개 비교판 · 이미지 역검색 · 상표 검색(날짜 · 주소 적음)에 같은 이름 상표 · 같은 꼴 로고 없음 — 공식 상표 DB 재검색은 출원 때"
  },
  "confirm": { "need": "출원 전에 공식 상표 DB 에서 다시 검색" }
}
---
## 받는 것
- 글꼴 측정 `f` — 글꼴 파일의 라이선스 글 · 주소 · 내장 허락 비트 · SPDX 후보.
- 유사 로고 `s`(볼 판 — 기본 심볼) · 상표 `t` — 서비스 측정기. 못 쓰면 `unavailable` 이고 fallback 대로 채운다.
- 이름 · 업계 — round.json `context.name` · `context.industry`.

## 하는 일
1. 글꼴마다 라이선스가 로고(윤곽 변환) · 상업 사용을 허락하나 본다. 모르면 null.
2. 같은 업계 로고 {{peers}}개와 나란히 놓고, 이미지 역검색 · 상표 검색 결과를 본다 — 모양 · 이름이 닮은 게 있으면 false.
3. 둘 다 깨끗하면 true. 볼 것을 못 봤으면 null.

## 근거 한 줄
글꼴 라이선스 한 마디 + 무엇과 나란히 봤고 닮은 게 있었나.

## 하지 않는 것
- 검색 한 번으로 '상표 문제 없음'이라 쓰지 않는다 — 공식 상표 DB 재검색은 confirm 몫이다.
- 남의 로고 그림을 결과 파일 · 공개 글에 붙이지 않는다 — 출처 주소만 적는다.
