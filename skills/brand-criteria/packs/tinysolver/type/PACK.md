---
{
  "id": "tinysolver/type",
  "version": "2",
  "name": "글꼴 기준",
  "description": "브랜드 글꼴 — 로고로 써도 되는 라이선스인가 · 이름 · 슬로건 글자가 다 있나",
  "kind": "type",
  "lang": "ko",
  "status": "draft",
  "date": "2026-10-02",
  "license": "Apache-2.0",
  "format": "3",
  "factors": ["license", "glyphs"],
  "recommend": { "score_min": 1, "total_ratio": 0.75 }
}
---
## 규칙
- 문턱 둘 다 통과(true)여야 그 글꼴을 로고 · 브랜드에 쓴다 — 하나라도 막히면(false) 다른 글꼴을 고른다.
- 라이선스 통과는 판정이고, 제조사 약관 확인은 사람 몫이다 — 확인 전에는 '사람 확인 남음'으로 보인다.
- 판정마다 근거 한 줄 — 무엇을 보고 매겼나(파일 · 약관 주소). 근거 없는 문턱 통과는 안 봄(null)으로 본다(규격 판 3). glyphs 는 측정 못 하면 안 봄(null)이다.

## 대상
방향의 글꼴 파일 — direction.json `files.fonts`, 없으면 방향 폴더 `fonts/*.ttf` · `fonts/*.otf`. 글자는 round.json `context.name` · `context.tagline`.
