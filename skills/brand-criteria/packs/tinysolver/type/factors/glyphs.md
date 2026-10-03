---
{
  "id": "glyphs",
  "type": "gate",
  "name": "글자가 다 있다",
  "ask": "이름 · 슬로건에 쓰는 글자가 글꼴에 다 있나?",
  "pass": "이름 · 슬로건의 글자가 모든 글꼴에 다 있다 — 빠진 글자 0.",
  "how": "이름 · 슬로건의 글자를 글꼴 파일의 글자 표(cmap)에서 찾는다.",
  "measure": [
    { "use": "glyph-coverage@1", "as": "g", "with": { "fonts": "$files.fonts", "texts": ["$context.name", "$context.tagline"] } }
  ],
  "decide": { "by": "measure", "pass": { "m": "g.missing_count", "op": "==", "v": 0 } },
  "evidence": {
    "template": "{{g.text}}",
    "example": "IBMPlexSans-SemiBold.ttf — 글자 24 · 빠진 글자 0"
  }
}
---
## 하는 일
측정기 `glyph-coverage@1` 이 정한다 — 빠진 글자가 하나도 없으면 통과. 글꼴 파일이나 이름이 없거나 측정기를 못 쓰면 null(안 봄)이다.

## 하지 않는 것
- 다른 글꼴로 대신 그려진(폴백) 글자를 '있다'로 보지 않는다 — 그 글꼴 파일의 글자 표만 본다.
